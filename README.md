# simplyws

A simple wrapper of WebSocket-compatible objects (i.e. any object that has readyState property, send() and close() methods) to provide some convenient Socket.io-like methods (such as on(), off(), emit()). It is designed to be used at both client and server sides.

# How to use
A simple example:
```javascript
const { SimplyWS } = require('simplyws')
const expressWs = require('express-ws')
const WebSocket = require('ws')

const SERVER_PORT = 3001
const TEST_ENDPOINT = '/test'
const WS_URL = `ws://localhost:${SERVER_PORT}${TEST_ENDPOINT}`

// Set up the server side
const app = require('express')()
expressWs(app)
app.ws(TEST_ENDPOINT, async (clientWs, request) => {
	const simplyWS = new SimplyWS({ socket: clientWs })
	simplyWS.on('echo', message => simplyWS.emit('echo-response', message))
	simplyWS.on('greet', ({ name, age }) => simplyWS.send(`Hi ${name}, ${age} years old`))
})
server = app.listen(SERVER_PORT)

// Set up the client side
const simplyWSClient = new SimplyWS({ socket: new WebSocket(WS_URL) })
simplyWSClient.on('echo-response', message => console.log(message)) // You should see: Hello
simplyWSClient.on('message', message => console.log(message)) // You should see: Hi Mike, 30 years old
simplyWSClient.on('open', () => {
	simplyWSClient.emit('echo', 'Hello')
	simplyWSClient.emit('greet', { name: 'Mike', age: 30 })
})
```

# API
```typescript
interface IWebSocket {
    readyState: number;
    send(message: any): any;
    close(): any;
}

interface ISimplyWSOptions {
    url?: string;
    autoConnect?: boolean;
    onError?: (...args: any[]) => void;
    onLog?: (...args: any[]) => void;
    socket?: IWebSocket;
    socketBuilder?: (url: string) => IWebSocket;
}

declare class SimplyEventEmitter {
    addHandler(eventName: string, handler: ((...args: any[]) => any) | any, maxCalls?: number): number;
    removeHandler(eventName: string, ...handlerIds: number[]): SimplyEventEmitter;
    /**
     * Emit an event, which results in the execution of all relevant registered handlers.
     * Besides the arguments passed by the caller, each handler will also receive 1 special
     * argument at last that contains the tag information about this handler.
     * @param eventName
     * @param args
     */
    emit(eventName: string, ...args: any[]): SimplyEventEmitter;
    reset(): void;
}

declare class SimplyWS {
	constructor(options: ISimplyWSOptions);
	
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
}
```

# References

- https://medium.com/@nilayvishwakarma/build-an-npm-package-with-typescript-by-nilay-vishwakarma-f303d7072f80
- https://codeburst.io/https-chidume-nnamdi-com-npm-module-in-typescript-12b3b22f0724
- https://staxmanade.com/2015/11/testing-asyncronous-code-with-mochajs-and-es7-async-await/
