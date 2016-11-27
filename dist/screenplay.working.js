/*!-----------------------------------------------------------------------------
 * screenplay — A tiny Javascript library to timeline functions
 * v0.0.2 - built 2016-11-27
 * Licensed under the MIT License.
 * http://screenplay.jaysalvat.com/
 * ----------------------------------------------------------------------------
 * Copyright (C) 2016 Jay Salvat
 * http://jaysalvat.com/
 * --------------------------------------------------------------------------*/
(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(['module', 'exports'], factory);
    } else if (typeof exports !== "undefined") {
        factory(module, exports);
    } else {
        var mod = {
            exports: {}
        };
        factory(mod, mod.exports);
        global.screenplayWorking = mod.exports;
    }
})(this, function (module, exports) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var Screenplay = function () {
        function Screenplay() {
            var settings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

            _classCallCheck(this, Screenplay);

            var _settings$async = settings.async,
                async = _settings$async === undefined ? true : _settings$async;


            this.async = async;
            this.steps = [];
            this.waits = [];
            this.index = 0;
            this.loops = 1;
            this.indexes = [];
            this.markers = {};
            this.playing = false;
            this.started = false;
            this.animationEnd = getEventName('animation');
            this.transitionEnd = getEventName('transition');
            this.timer = null;
            this.events = {
                'step': [],
                'play': [],
                'stop': [],
                'loop': [],
                'pause': [],
                'before': [],
                'after': []
            };
            this.finale = function () {};
        }

        _createClass(Screenplay, [{
            key: 'play',
            value: function play() {
                var loops = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.loops;

                this.loops = loops;

                if (!this.playing) {
                    this.playing = true;

                    if (this.started) {
                        this.next();
                    } else {
                        this._run();
                    }

                    this._trigger('play');
                }

                return this;
            }
        }, {
            key: 'pause',
            value: function pause() {
                if (this.playing) {
                    this.playing = false;
                    this._trigger('pause');
                }

                return this;
            }
        }, {
            key: 'toggle',
            value: function toggle() {
                return this.playing ? this.pause() : this.play();
            }
        }, {
            key: 'stop',
            value: function stop() {
                this.loops = 1;
                this.playing = false;
                this.finale.call(this);

                return this._trigger('stop');
            }
        }, {
            key: 'step',
            value: function step(fn) {
                var repeat = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

                for (var i = 0; i < repeat; i++) {
                    this.steps.push(fn);
                }

                return this;
            }
        }, {
            key: 'wait',
            value: function wait(time) {
                this.waits[this.steps.length - 1] = time;

                return this;
            }
        }, {
            key: 'end',
            value: function end(fn) {
                this.finale = fn;

                return this;
            }
        }, {
            key: 'rewind',
            value: function rewind() {
                this.index = 0;

                return this._run();
            }
        }, {
            key: 'marker',
            value: function marker(_marker) {
                this.markers[_marker.toString()] = this.steps.length;

                return this;
            }
        }, {
            key: 'goto',
            value: function goto(marker) {
                if (typeof marker === 'string') {
                    if (this.markers[marker]) {
                        this.index = this.markers[marker];
                    }
                }

                if (typeof marker === 'number') {
                    if (this.steps[marker]) {
                        this.index = this.steps[marker];
                    }
                }

                return this._run();
            }
        }, {
            key: 'loop',
            value: function loop() {
                var loops = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : -1;

                this.loops = loops;

                return this;
            }
        }, {
            key: 'previous',
            value: function previous() {
                var nb = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;

                this.index = this.index - nb;

                return this._run();
            }
        }, {
            key: 'next',
            value: function next() {
                var nb = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;

                this.index = this.index + nb;

                return this._run();
            }
        }, {
            key: 'same',
            value: function same() {
                return this._run();
            }
        }, {
            key: 'on',
            value: function on(key, fn) {
                this.events[key].push(fn);

                return this;
            }
        }, {
            key: 'off',
            value: function off(key, fn) {
                if (fn) {
                    this.events[key] = this.events[key].filter(function (f) {
                        return f !== fn;
                    });
                } else {
                    this.events[key] = [];
                }

                return this;
            }
        }, {
            key: '_trigger',
            value: function _trigger(key) {
                var _this = this;

                this.events[key].forEach(function (fn) {
                    return fn.call(_this);
                });

                return this;
            }
        }, {
            key: '_run',
            value: function _run() {
                var _this2 = this;

                if (this.index < 0) {
                    this.index = 0;
                    return;
                }

                if (this.index >= this.steps.length) {
                    this.index = 0;

                    if (this.loops !== -1) {
                        this.loops--;
                    }

                    if (this.loops === 0) {
                        return this.stop();
                    }
                }

                var go = function go() {
                    if (!_this2.started) {
                        _this2.started = true;
                    }

                    var step = _this2.steps[_this2.index],
                        steps = step;

                    if (typeof step === 'function') {
                        _this2.concurrentSteps = 1;

                        step.call(_this2, _this2._next.bind(_this2));
                    }

                    if (Array.isArray(steps)) {
                        _this2.concurrentSteps = steps.length;

                        steps.forEach(function (step) {
                            step.call(_this2, _this2._next.bind(_this2));
                        });
                    }
                };

                this._trigger('before');

                if (this.async) {
                    setTimeout(go);
                } else {
                    go();
                }

                return this;
            }
        }, {
            key: '_next',
            value: function _next(elements) {
                var _this3 = this;

                var elementCount = 0;

                var done = function done() {
                    var goNext = function goNext() {
                        _this3.index++;
                        _this3._run();
                        _this3._trigger('after');
                    };

                    if (--_this3.concurrentSteps === 0) {
                        if (_this3.playing) {
                            if (_this3.waits[_this3.index]) {
                                setTimeout(function () {
                                    goNext();
                                }, _this3.waits[_this3.index]);
                            } else {
                                goNext();
                            }
                        }
                    }
                };

                if (elements) {
                    elements = Array.isArray(elements) ? elements : [elements];

                    elements.forEach(function (element) {
                        var self = _this3;

                        function callback() {
                            element.removeEventListener(self.animationEnd, callback, false);
                            element.removeEventListener(self.transitionEnd, callback, false);
                            element.removeEventListener("ended", callback, false);

                            if (++elementCount === elements.length) {
                                done();
                            }
                        }

                        if (typeof HTMLElement !== 'undefined' && element instanceof HTMLElement) {
                            element.addEventListener(_this3.animationEnd, callback, false);
                            element.addEventListener(_this3.transitionEnd, callback, false);

                            if (element.tagName === 'AUDIO' || element.tagName === 'VIDEO') {
                                element.addEventListener("ended", callback, false);
                            }
                        }

                        if (typeof element.then === 'function') {
                            element.then(done, done);
                        }
                    });
                } else {
                    done();
                }

                return this;
            }
        }]);

        return Screenplay;
    }();

    function getEventName(key) {
        var map = {
            animation: {
                'animation': 'animationend',
                '-o-animation': 'oAnimationEnd',
                '-moz-animation': 'animationend',
                '-webkit-animation': 'webkitAnimationEnd'
            },
            transition: {
                'transition': 'transitionend',
                '-o-transition': 'oTransitionEnd',
                '-moz-transition': 'transitionend',
                '-webkit-transition': 'webkitTransitionEnd'
            }
        };

        try {
            var div = document.createElement('div');

            for (var eventName in map[key]) {
                if (typeof div.style[eventName] !== 'undefined') {
                    return map[key][eventName];
                }
            }
        } catch (e) {
            return null;
        }
    }

    exports.default = Screenplay;
    module.exports = exports['default'];
});


//# sourceMappingURL=maps/screenplay.working.js.map