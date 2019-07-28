export declare const WS_EVENT: {
    OPEN: string;
    ERROR: string;
    CLOSE: string;
    MESSAGE: string;
};
export declare const WS_READY_STATE: {
    CONNECTING: number;
    OPEN: number;
    CLOSING: number;
    CLOSED: number;
};
export declare enum WS_EVENT_RUN_MODE {
    /**
     * For example:
     * - If a handler for 'open' is added when readyState = OPEN, then
     * execute that handler immediately.
     * - If a handler for 'close' is added when readyState = CLOSED, then
     * execute that handler immediately.
     * - If a handler for 'message' is added and the corresponding message matches a custom event,
     * then run both the custom event handler and this message handler.
     */
    AS_MUCH_AS_POSSIBLE = 0,
    /**
     * For example:
     * - If a handler for 'open' is added when readyState = OPEN, then skip
     * executing that handler immediately.
     * - If a handler for 'close' is added when readyState = CLOSED, then skip
     * executing that handler immediately.
     * - If a handler for 'message' is added and the corresponding message matches a custom event,
     * then run only the custom event handler and skip this message handler.
     */
    AS_LESS_AS_POSSIBLE = 1
}
export interface IWebSocket {
    readyState: number;
    send(message: any): any;
    close(): any;
}
export interface ISimplyWSOptions {
    url?: string;
    autoConnect?: boolean;
    onError?: (...args: any[]) => void;
    onLog?: (...args: any[]) => void;
    socket?: IWebSocket;
    socketBuilder?: (url: string) => IWebSocket;
    /**
     * Applied to the core WebSocket events (open, error, close, message) only.
     */
    eventRunMode?: WS_EVENT_RUN_MODE;
}
/**
 * An event emitter that allows adding/removing handlers for different events,
 * emitting a specific event, as well as running a specific handler.
 */
export declare class SimplyEventEmitter {
    private _handlerMap;
    private _handlerId;
    /**
     * Add a handler for a specific event and optionally specify the maximum number
     * of times that handler can be called. The handler ID will be returned.
     * @param eventName
     * @param handler
     * @param maxCalls 0 = will be called until it is removed by the caller.
     */
    addHandler(eventName: string, handler: ((...args: any[]) => any) | any, maxCalls?: number): number;
    /**
     * Remove from the specified event all handlers having the specified IDs and
     * return the emitter itself. As a result, it is possible to chain a series of
     * calls to this method.
     * @param eventName
     * @param handlerIds
     */
    removeHandler(eventName: string, ...handlerIds: number[]): SimplyEventEmitter;
    /**
     * Emit an event, which results in the execution of all relevant registered handlers.
     * Besides the arguments passed by the caller, each handler will also receive 1 special
     * argument at last that contains the tag information about this handler.
     * This method will return the emitter itself. As a result, it is possible to chain a series of
     * calls to this method.
     * @param eventName
     * @param args
     */
    emit(eventName: string, ...args: any[]): SimplyEventEmitter;
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
    run(eventName: string, handlerId: number, ...args: any[]): SimplyEventEmitter;
    /**
     * Reset this emitter.
     * This method will return the emitter itself. As a result, it is possible to chain other methods to
     * the call to this method.
     */
    reset(): this;
}
/**
 * A simple wrapper of WebSocket-compatible objects (i.e. any object that matches the IWebSocket interface)
 * to provide some convenient Socket.io-like methods (such as on(), off(), emit()).
 * It is designed to be used at both client and server sides.
 */
export declare class SimplyWS {
    private _url?;
    private _onLog;
    private _onError;
    private _socket?;
    private _socketBuilder?;
    private _customEventEmitter;
    private _coreEventEmitter;
    private _eventRunMode;
    constructor(options: ISimplyWSOptions);
    /**
     * Initialize the socket if it was created with autoConnect = false and without an underlying socket.
     */
    open(): SimplyWS;
    /**
     * Emit an event-based message with the specified arguments.
     * @param {string} eventName
     * @param  {...any} args
     */
    emit(eventName: string, ...args: any[]): SimplyWS;
    /**
     * Send a raw text message.
     * @param message
     */
    send(message: string): void;
    /**
     * Register a one-time handler for the specified event and return the corresponding
     * handlerId which can be used later to unregister this handler. It is a shortcut
     * for on(eventName, handler, 1).
     * @param eventName
     * @param handler
     */
    once(eventName: string, handler: ((...args: any[]) => void) | any): void;
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
    on(eventName: string, handler: ((...args: any[]) => void) | any, maxCalls?: number): number;
    /**
     * Unregister the specified handlers from the specified event. If no handler is specified,
     * then unregister all registered handlers.
     * @param {string} eventName
     * @param  {...any} handlerIds
     */
    off(eventName: string, ...handlerIds: number[]): SimplyWS;
    close(): SimplyWS;
    private _log;
    private _setUpSocket;
    private _addCoreEventHandler;
    private _reset;
    private executeCustomHandlers;
    private _executeCoreHandlers;
}
