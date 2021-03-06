'use strict';

class Screenplay {
    constructor (settings = {}) {
        let {
            async = false,
            direction = 1,
            loops = 1,
            loopBackward = false,
        } = settings;

        this.steps = [];
        this.waits = [];
        this.async = async;
        this.index = 0;
        this.loops = loops;
        this.loopBackward = loopBackward;
        this.loopBuffer = loops;
        this.dir = direction;
        this.inited = false;
        this.playing = false;
        this.timer1 = null;
        this.timer2 = null;
        this.markers = {};
        this.animationEnd = getEventName('animation');
        this.transitionEnd = getEventName('transition');
        this.events = {
            'init': [],
            'play': [],
            'stop': [],
            'start': [],
            'loop': [],
            'pause': [],
            'before': [],
            'after': []
        };
        this.finale = () => {};
    }

    init() {
        this.inited = true;
        this.playing = false;

        if (this.dir === -1) {
            this.index = this.steps.length - 1;
        } else {
            this.index = 0;
        }

        this._trigger('init');

        this._run();

        return this;
    }

    play(loops = this.loops) {
        this.loops = loops;
        this.loopBuffer = loops;

        if (!this.playing) {
            this.playing = true;

            this._trigger('play');

            if (this.inited) {
                this.next();
            } else {
                this.inited = true;

                if (this.dir === -1) {
                    this.index = this.steps.length - 1;
                } else {
                    this.index = 0;
                }

                this._run();
            }
        }

        return this;
    }

    pause() {
        if (this.playing) {
            this.playing = false;

            this._break();
            this._trigger('pause');
        }

        return this;
    }

    toggle() {
        return this.playing ? this.pause() : this.play();
    }

    stop() {
        if (this.inited) {
            this.playing = false;
            this.inited = false;

            this._break();
            this._trigger('stop');

            this.finale.call(this);
        }

        return this;
    }

    done(fn) {
        this.finale = fn;

        return this;
    }

    previous(nb = 1) {
        if (this.inited) {
            this.index = this.index - (nb * this.dir);
            this._run();
        }

        return this;
    }

    next(nb = 1) {
        if (this.inited) {
            this.index = this.index + (nb * this.dir);
            this._run();
        }

        return this;
    }

    same() {
        this._run();

        return this;
    }

    rewind() {
        this.index = (this.dir === -1) ? this.steps.length - 1 : 0;

        return this._run();
    }

    loop(loops = -1, loopBackward = this.loopBackward) {
        this.loops = loops;
        this.loopBackward = loopBackward;
        this.loopBuffer = loops;

        return this;
    }

    index(index) {
        if (index === undefined) {
            return this.index;
        }
        this.index = index;

        return this;
    }

    direction(direction) {
        if (direction === undefined) {
            return this.dir;
        }
        this.dir = direction;

        return this;
    }

    reverse() {
        return this.direction(this.dir * -1);
    }

    step(fn, repeat = 1) {
        for (let i = 0; i < repeat; i++) {
            this.steps.push(fn);
        }

        return this;
    }

    wait(time) {
        this.waits[this.steps.length - 1] = time;

        if (time) {
            this.async = true;
        }

        return this;
    }

    marker(marker) {
        this.markers[marker.toString()] = this.steps.length;

        return this;
    }

    goto(marker) {
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

    on(key, fn) {
        this.events[key].push(fn);

        return this;
    }

    off(key, fn) {
        if (fn) {
            this.events[key] = this.events[key].filter((f) => f !== fn);
        } else {
            this.events[key] = [];
        }

        return this;
    }

    _trigger(key) {
        this.events[key].forEach((fn) => fn.call(this));

        return this;
    }

    _break() {
        if (this.started) {
            this.started = false;
            this._trigger('after');
        }

        clearTimeout(this.timer1);
        clearTimeout(this.timer2);
    }

    _run() {
        if (this.index < 0) {
            if (this.loops !== -1) {
                if (this.dir === -1 || (this.dir === 1 && this.loopBackward)) {
                    this.index = this.steps.length - 1;
                    this.loops = this.loops + this.dir;
                } else {
                    return this.stop();
                }
            } else {
                this.index = this.steps.length - 1;
            }

            if (this.loops === 0 || this.loops > this.loopBuffer) {
                return this.stop();
            } else {
                this._trigger('loop');
            }
        }

        if (this.index >= this.steps.length) {
            if (this.loops !== -1) {
                if (this.dir === 1 || (this.dir === -1 && this.loopBackward)) {
                    this.index = 0;
                    this.loops = this.loops - this.dir;
                } else {
                    return this.stop();
                }
            } else {
                this.index = 0;
            }

            if (this.loops === 0 || this.loops > this.loopBuffer) {
                return this.stop();
            } else {
                this._trigger('loop');
            }
        }

        let go = () => {
            let step = this.steps[this.index],
                steps = step;

            this.started = true;
            this._trigger('before');

            if (typeof step === 'function') {
                this.concurrentSteps = 1;

                step.call(this, this._next.bind(this));
            }

            if (Array.isArray(steps)) {
                this.concurrentSteps = steps.length;

                steps.forEach((step) => {
                    step.call(this, this._next.bind(this));
                });
            }
        };

        if (this.async) {
            clearTimeout(this.timer1);

            this.timer1 = setTimeout(go);
        } else {
            go();
        }

        return this;
    }

    _next(elements) {
        let elementCount = 0;

        if (!this.playing) {
            this._trigger('after');
            return;
        }

        let go = () => {
            if (this.started) {
                this.started = false;
                this._trigger('after');
            }

            this.index = this.index + this.dir;
            this._run();
        };

        let done = () => {
            if (--this.concurrentSteps <= 0) {
                if (this.async) {
                    clearTimeout(this.timer2);

                    this.timer2 = setTimeout(go, this.waits[this.index]);
                } else {
                    go();
                }
            }
        };

        if (elements) {
            elements = Array.isArray(elements) ? elements : [ elements ];

            elements.forEach((element) => {
                let self = this;

                function callback () {
                    element.removeEventListener(self.animationEnd,  callback, false);
                    element.removeEventListener(self.transitionEnd, callback, false);
                    element.removeEventListener("ended", callback, false);

                    if (++elementCount === elements.length) {
                        done();
                    }
                }

                if (typeof HTMLElement !== 'undefined' && element instanceof HTMLElement) {
                    element.addEventListener(this.animationEnd,  callback, false);
                    element.addEventListener(this.transitionEnd, callback, false);

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
}

function getEventName (key) {
    const map = {
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
        let div = document.createElement('div');

        for (let eventName in map[key]) {
            if (typeof(div.style[eventName]) !== 'undefined') {
                return map[key][eventName];
            }
        }
    } catch (e) {
        return null;
    }
}

export default Screenplay;
