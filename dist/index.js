"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WS_EVENT = {
    OPEN: 'open',
    ERROR: 'error',
    CLOSE: 'close',
    MESSAGE: 'message'
};
exports.WS_READY_STATE = {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3
};
var WS_EVENT_RUN_MODE;
(function (WS_EVENT_RUN_MODE) {
    /**
     * For example:
     * - If a handler for 'open' is added when readyState = OPEN, then
     * execute that handler immediately.
     * - If a handler for 'close' is added when readyState = CLOSED, then
     * execute that handler immediately.
     * - If a handler for 'message' is added and the corresponding message matches a custom event,
     * then run both the custom event handler and this message handler.
     */
    WS_EVENT_RUN_MODE[WS_EVENT_RUN_MODE["AS_MUCH_AS_POSSIBLE"] = 0] = "AS_MUCH_AS_POSSIBLE";
    /**
     * For example:
     * - If a handler for 'open' is added when readyState = OPEN, then skip
     * executing that handler immediately.
     * - If a handler for 'close' is added when readyState = CLOSED, then skip
     * executing that handler immediately.
     * - If a handler for 'message' is added and the corresponding message matches a custom event,
     * then run only the custom event handler and skip this message handler.
     */
    WS_EVENT_RUN_MODE[WS_EVENT_RUN_MODE["AS_LESS_AS_POSSIBLE"] = 1] = "AS_LESS_AS_POSSIBLE";
})(WS_EVENT_RUN_MODE = exports.WS_EVENT_RUN_MODE || (exports.WS_EVENT_RUN_MODE = {}));
/**
 * An event emitter that allows adding/removing handlers for different events,
 * emitting a specific event, as well as running a specific handler.
 */
class SimplyEventEmitter {
    constructor() {
        this._handlerMap = {};
        this._handlerId = 0;
    }
    /**
     * Add a handler for a specific event and optionally specify the maximum number
     * of times that handler can be called. The handler ID will be returned.
     * @param eventName
     * @param handler
     * @param maxCalls 0 = will be called until it is removed by the caller.
     */
    addHandler(eventName, handler, maxCalls = 0) {
        const handlerId = this._handlerId++;
        handler._tag = {
            id: handlerId,
            maxCalls: maxCalls,
            count: 0
        };
        if (this._handlerMap[eventName] == null) {
            this._handlerMap[eventName] = { [handlerId]: handler };
        }
        else {
            this._handlerMap[eventName][handlerId] = handler;
        }
        return handlerId;
    }
    /**
     * Remove from the specified event all handlers having the specified IDs and
     * return the emitter itself. As a result, it is possible to chain a series of
     * calls to this method.
     * @param eventName
     * @param handlerIds
     */
    removeHandler(eventName, ...handlerIds) {
        if (handlerIds == null || handlerIds.length == 0) {
            delete this._handlerMap[eventName];
            return this;
        }
        const subMap = this._handlerMap[eventName];
        if (subMap == null) {
            return this;
        }
        for (let id of handlerIds) {
            delete subMap[id];
        }
        return this;
    }
    /**
     * Emit an event, which results in the execution of all relevant registered handlers.
     * Besides the arguments passed by the caller, each handler will also receive 1 special
     * argument at last that contains the tag information about this handler.
     * This method will return the emitter itself. As a result, it is possible to chain a series of
     * calls to this method.
     * @param eventName
     * @param args
     */
    emit(eventName, ...args) {
        const subMap = this._handlerMap[eventName];
        if (subMap == null) {
            return this;
        }
        for (let [handlerId, handler] of Object.entries(subMap)) {
            handler(...args, handler._tag);
            handler._tag.count++;
            if (handler._tag.maxCalls > 0 && handler._tag.count >= handler._tag.maxCalls) {
                delete handler._tag;
                delete subMap[handlerId];
            }
        }
        return this;
    }
    /**
     * Run a specified event handler of a specific event.
     * Besides the arguments passed by the caller, the handler will also receive 1 special
     * argument at last that contains the tag information about this handler.
     * This method will return the emitter itself. As a result, it is possible to chain a series of
     * calls to this method.
     * @param eventName
     * @param handlerId
     * @param args
     */
    run(eventName, handlerId, ...args) {
        const subMap = this._handlerMap[eventName];
        if (subMap == null) {
            return this;
        }
        const handler = subMap[handlerId];
        if (handler == null) {
            return this;
        }
        handler(...args, handler._tag);
        handler._tag.count++;
        if (handler._tag.maxCalls > 0 && handler._tag.count >= handler._tag.maxCalls) {
            delete handler._tag;
            delete subMap[handlerId];
        }
        return this;
    }
    /**
     * Reset this emitter.
     * This method will return the emitter itself. As a result, it is possible to chain other methods to
     * the call to this method.
     */
    reset() {
        this._handlerMap = {};
        this._handlerId = 0;
        return this;
    }
}
exports.SimplyEventEmitter = SimplyEventEmitter;
const SEPARATOR = '\n\r'; // This is an intentional wrong order to create a safe separator
/**
 * A simple wrapper of WebSocket-compatible objects (i.e. any object that matches the IWebSocket interface)
 * to provide some convenient Socket.io-like methods (such as on(), off(), emit()).
 * It is designed to be used at both client and server sides.
 */
class SimplyWS {
    constructor(options) {
        this._customEventEmitter = new SimplyEventEmitter();
        this._coreEventEmitter = new SimplyEventEmitter();
        const { url, autoConnects, onError, onLog, socket, socketBuilder, runsHandlersSafely, eventRunMode = WS_EVENT_RUN_MODE.AS_MUCH_AS_POSSIBLE } = options;
        this._url = url;
        this._onError = onError || ((...args) => console.error(...args));
        this._onLog = onLog || ((...args) => console.log(...args));
        this._socketBuilder = socketBuilder || (socket != null ? url => socket : undefined);
        this._eventRunMode = eventRunMode;
        if (runsHandlersSafely || runsHandlersSafely == null) {
            this._handlerBuilder = (handler) => (...args) => {
                try {
                    handler(...args);
                }
                catch (e) {
                    this._onError(e);
                }
            };
        }
        else {
            this._handlerBuilder = (handler) => handler;
        }
        if (socket != null || autoConnects || autoConnects == null) {
            this.open();
        }
    }
    get readyState() {
        return this._socket == null ? undefined : this._socket.readyState;
    }
    /**
     * Initialize the socket if it was created with autoConnect = false and without an underlying socket.
     */
    open() {
        this._reset();
        if (this._socket == null && this._socketBuilder != null) {
            this._socket = this._socketBuilder(this._url);
        }
        this._setUpSocket(this._socket);
        return this;
    }
    // TODO Support ack parameter like Socket.io
    /**
     * Emit an event-based message with the specified arguments.
     * @param {string} eventName
     * @param  {...any} args
     */
    emit(eventName, ...args) {
        const message = eventName + SEPARATOR + JSON.stringify(args);
        this.send(message);
        return this;
    }
    /**
     * Send a raw text message.
     * @param message
     */
    send(message) {
        if (this._socket != null && this._socket.readyState == exports.WS_READY_STATE.OPEN) {
            this._socket.send(message);
        }
    }
    /**
     * Register a one-time handler for the specified event and return the corresponding
     * handlerId which can be used later to unregister this handler. It is a shortcut
     * for on(eventName, handler, 1).
     * @param eventName
     * @param handler
     */
    once(eventName, handler) {
        this.on(eventName, handler, 1);
    }
    /**
     * Register a handler for the specified event and return the corresponding
     * handlerId which can be used later to unregister this handler.
     * For the 'message' event, the handler should have this signature:
     * (message: string, matchesCustomEvent: boolean) => void. When matchesCustomEvent = true,
     * it means this message can be handled by a custom event handler, i.e. this 'message' handler
     * can base on matchesCustomEvent to determine if a message should be handled or not.
     * @param {string} eventName
     * @param {function} handler
     * @param {number} maxCalls The number of times this handler can be used. After that, this handler will
     * 		be off-ed automatically. If 0 or negative, it means this handler can be used until off() is called for it.
     */
    on(eventName, handler, maxCalls = 0) {
        if (handler == null) {
            handler = (handlerTag) => this._log(eventName, handlerTag);
        }
        else if (typeof handler !== 'function') {
            handler = (handlerTag) => this._log(eventName, handler, handlerTag);
        }
        handler = this._handlerBuilder(handler);
        const handlerId = this._customEventEmitter.addHandler(eventName, handler, maxCalls);
        if (this._eventRunMode == WS_EVENT_RUN_MODE.AS_MUCH_AS_POSSIBLE &&
            this._socket != null &&
            ((eventName == exports.WS_EVENT.CLOSE && this._socket.readyState == exports.WS_READY_STATE.CLOSED) ||
                (eventName == exports.WS_EVENT.OPEN && this._socket.readyState == exports.WS_READY_STATE.OPEN))) {
            this._customEventEmitter.run(eventName, handlerId);
        }
        return handlerId;
    }
    /**
     * Unregister the specified handlers from the specified event. If no handler is specified,
     * then unregister all registered handlers.
     * @param {string} eventName
     * @param  {...any} handlerIds
     */
    off(eventName, ...handlerIds) {
        this._customEventEmitter.removeHandler(eventName, ...handlerIds);
        return this;
    }
    close() {
        if (this._socket != null && this._socket.readyState != exports.WS_READY_STATE.CLOSED) {
            this._socket.close();
        }
        this._reset();
        return this;
    }
    _log(...args) {
        this._onLog(...args);
    }
    _setUpSocket(socket) {
        this._addCoreEventHandler(socket, exports.WS_EVENT.OPEN, () => this.executeCustomHandlers(exports.WS_EVENT.OPEN));
        this._addCoreEventHandler(socket, exports.WS_EVENT.CLOSE, () => this.executeCustomHandlers(exports.WS_EVENT.CLOSE));
        this._addCoreEventHandler(socket, exports.WS_EVENT.ERROR, (error) => this.executeCustomHandlers(exports.WS_EVENT.ERROR, error));
        this._addCoreEventHandler(socket, exports.WS_EVENT.MESSAGE, message => {
            const separatorIndex = message.indexOf(SEPARATOR);
            const matchesCustomEvent = separatorIndex > -1;
            if (matchesCustomEvent) {
                if (this._eventRunMode == WS_EVENT_RUN_MODE.AS_MUCH_AS_POSSIBLE) {
                    this.executeCustomHandlers(exports.WS_EVENT.MESSAGE, message, matchesCustomEvent);
                }
                const eventName = message.substring(0, separatorIndex);
                const args = JSON.parse(message.substring(separatorIndex + 1));
                this.executeCustomHandlers(eventName, ...args);
            }
            else {
                this.executeCustomHandlers(exports.WS_EVENT.MESSAGE, message, matchesCustomEvent);
            }
        });
    }
    _addCoreEventHandler(socket, eventName, handler) {
        // WebSocket in ws package
        if (typeof socket.on === 'function') {
            socket.on(eventName, (...args) => {
                try {
                    handler(...args);
                }
                catch (e) {
                    this._onError(eventName, e);
                }
            });
            return -1;
        }
        // WebSocket in browser
        const handlerMethodName = 'on' + eventName;
        if (socket.hasOwnProperty(handlerMethodName) || typeof socket[handlerMethodName] !== undefined) {
            let handlerWrapper;
            switch (eventName) {
                case exports.WS_EVENT.CLOSE:
                case exports.WS_EVENT.OPEN:
                    handlerWrapper = (handlerTag) => {
                        try {
                            handler(handlerTag);
                        }
                        catch (e) {
                            this._onError(eventName, e);
                        }
                    };
                    break;
                case exports.WS_EVENT.ERROR:
                    handlerWrapper = (error, handlerTag) => {
                        try {
                            handler(error, handlerTag);
                        }
                        catch (e) {
                            this._onError(eventName, e, handlerTag);
                        }
                    };
                    break;
                case exports.WS_EVENT.MESSAGE:
                    handlerWrapper = (event, handlerTag) => {
                        try {
                            handler(event.data, handlerTag);
                        }
                        catch (e) {
                            this._onError(eventName, e, handlerTag);
                        }
                    };
                    break;
                default:
                    throw `Unsupported event: ${eventName}`;
            }
            const existingHandler = socket[handlerMethodName];
            if (existingHandler != null) {
                if (existingHandler._tag != null) {
                    return existingHandler._tag.id;
                }
                else {
                    this._coreEventEmitter.addHandler(eventName, existingHandler);
                }
            }
            const handlerId = this._coreEventEmitter.addHandler(eventName, handlerWrapper);
            socket[handlerMethodName] = (...args) => this._executeCoreHandlers(eventName, ...args);
            return handlerId;
        }
    }
    _reset() {
        this._customEventEmitter.reset();
        this._coreEventEmitter.reset();
    }
    executeCustomHandlers(eventName, ...args) {
        this._customEventEmitter.emit(eventName, ...args);
    }
    _executeCoreHandlers(eventName, ...args) {
        this._coreEventEmitter.emit(eventName, ...args);
    }
}
exports.SimplyWS = SimplyWS;
