# simplyws
A simple wrapper of WebSocket-compatible objects (i.e. any object that has readyState property, send() and close() methods) to provide some convenient Socket.io-like methods (such as on(), off(), emit()). It is designed to be used at both client and server sides.

# How to use
```
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
const testMessage = 'Demo'
simplyWSClient.on('echo-response', message => console.log(message))
simplyWSClient.on('open', () => simplyWSClient.emit('echo', testMessage))
```

# References
- https://medium.com/@nilayvishwakarma/build-an-npm-package-with-typescript-by-nilay-vishwakarma-f303d7072f80
- https://codeburst.io/https-chidume-nnamdi-com-npm-module-in-typescript-12b3b22f0724
- https://staxmanade.com/2015/11/testing-asyncronous-code-with-mochajs-and-es7-async-await/