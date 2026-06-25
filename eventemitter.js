// a base class that gives an object a simple bind/trigger event system plus dispose.
// inherit with: Thing.prototype = new EventEmitter(); and call EventEmitter.call(this) in the constructor.
function EventEmitter() {
    "use strict";

    // event names are prefixed so they can never collide with Object/Array prototype members
    var eventNamePrefix = 'event.';
    this.EventCallbacks = {};

    this.functionName = function (functionReference) {
        return (/(\w+)\(/.exec(functionReference.toString()))[1];
    };

    this.className = function () {
        return this.functionName(this.constructor);
    };

    this.isNothing = function (object) {
        return (object === null || typeof object === 'undefined');
    };

    this.bind = function (eventName, handler, data) {
        var lEventName = eventNamePrefix + eventName,
            lCallbacks = this.EventCallbacks[lEventName];
        if (handler === null) {
            throw ('programmer error: cannot bind a null handler to an event.');
        }
        if (this.isNothing(lCallbacks)) {
            lCallbacks = [];
            this.EventCallbacks[lEventName] = lCallbacks;
        }
        lCallbacks.push({ 'handler': handler, 'data': data });
    };

    this.unbind = function (eventName, handler) {
        var lIndex,
            lCallback = null,
            lEventName = eventNamePrefix + eventName,
            lCallbacks = this.EventCallbacks[lEventName];
        if (handler === null) {
            throw ('programmer error: cannot unbind a null handler from an event.');
        }
        if (!this.isNothing(lCallbacks)) {
            for (lIndex = 0; lIndex < lCallbacks.length; lIndex++) {
                lCallback = lCallbacks[lIndex];
                if (lCallback.handler === handler) {
                    lCallbacks.splice(lIndex, 1);
                    break;
                }
            }
        }
    };

    this.trigger = function (eventName, eventParameters) {
        var lIndex,
            lCallback = null,
            lEventName = eventNamePrefix + eventName,
            lCallbacks = this.EventCallbacks[lEventName],
            lHandlers = [];
        if (!this.isNothing(lCallbacks)) {
            for (lIndex = 0; lIndex < lCallbacks.length; lIndex++) {
                lCallback = lCallbacks[lIndex];
                if (!this.isNothing(lCallback.handler)) {
                    lHandlers.push(lCallback);
                }
            }
            for (lIndex = 0; lIndex < lHandlers.length; lIndex++) {
                lCallback = lHandlers[lIndex];
                lCallback.handler(this, eventParameters, lCallback.data);
            }
        }
    };

    this.dispose = function () {
        var lKeyOuter = null,
            lKeyInner = null,
            lDeletedOuter = true,
            lDeletedInner = true,
            lCallbacks = null;
        while (lDeletedOuter) {
            lDeletedOuter = false;
            for (lKeyOuter in this.EventCallbacks) {
                if (this.EventCallbacks.hasOwnProperty(lKeyOuter)) {
                    lCallbacks = this.EventCallbacks[lKeyOuter];
                    while (lDeletedInner) {
                        lDeletedInner = false;
                        for (lKeyInner = 0; lKeyInner < lCallbacks.length; lKeyInner++) {
                            if (!this.isNothing(lCallbacks[lKeyInner])) {
                                lCallbacks.splice(lKeyInner, 1);
                                lDeletedInner = true;
                                break;
                            }
                        }
                    }
                    delete this.EventCallbacks[lKeyOuter];
                    lDeletedOuter = true;
                    break;
                }
            }
        }
    };
}
