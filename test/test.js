'use strict'
const expect = require('chai').expect
const { SimplyWS } = require('../dist/index.js')
const expressWs = require('express-ws')
const WSWebSocket = require('ws')

const SERVER_PORT = 3001
const TEST_ENDPOINT = '/test'
const WS_URL = `ws://localhost:${SERVER_PORT}${TEST_ENDPOINT}`

const WS_READY_STATE = {
	CONNECTING: 0,
	OPEN: 1,
	CLOSING: 2,
	CLOSED: 3
}

const executeAsync = (action, done, ...args) => {
	try {
		action(...args)
		done()
	} catch (e) {
		done(e)
	}
}

const mochaAsync = (done, action) => {
	return (...args) => {
		try {
			action(...args)
			done()
		} catch (e) {
			done(e)
		}
	}
}

describe('SimplyWS tests', () => {
	let server = null
	let simplyWSClient

	before(() => {
		const app = require('express')()
		expressWs(app)
		app.ws(TEST_ENDPOINT, async (clientWs, request) => {
			const simplyWS = new SimplyWS({ socket: clientWs })
			simplyWS.on('echo', message => simplyWS.emit('echo-response', message))
			simplyWS.on('greet', ({ name, age }) => simplyWS.send(`Hi ${name}, ${age} years old`))
		})
		server = app.listen(SERVER_PORT)
	})

	after(() => {
		if (server != null) {
			console.log('Closing server...')
			server.close()
		}
	})

	beforeEach(() => {
		simplyWSClient = new SimplyWS({ socket: new WSWebSocket(WS_URL) })
	})

	afterEach(() => {
		simplyWSClient.close()
	})

	it('readyState should be OPEN on open', done => {		
		simplyWSClient.on('open', () => executeAsync(() => expect(simplyWSClient.readyState).to.equal(WS_READY_STATE.OPEN), done))
	})

	it('client emits "echo" event and server replies with "echo-response" event', done => {
		const testMessage = 'Demo'
		simplyWSClient.on('echo-response', message =>
			executeAsync(() => expect(message).to.equal(testMessage), done, message)
		)
		simplyWSClient.on('open', () => simplyWSClient.emit('echo', testMessage))
	})

	it('client emits "echo" event and server replies with "echo-response" event 2', done => {
		const simplyWSClient = new SimplyWS({ url: WS_URL, socketBuilder: url => new WSWebSocket(url) })
		const testMessage = 'Demo2'
		simplyWSClient.on('echo-response', mochaAsync(done, message => expect(message).to.equal(testMessage)))
		simplyWSClient.on('open', () => simplyWSClient.emit('echo', testMessage))
	})

	it('client emits "echo" event and server replies with "echo-response" event 3', function() {
		const testMessage = 'Demo3'
		simplyWSClient.on('open', () => simplyWSClient.emit('echo', testMessage))

		const testPromise = new Promise(function(resolve, reject) {
			simplyWSClient.on('echo-response', message => resolve(message))
		})

		return testPromise.then(function(message) {
			expect(message).to.equal(testMessage)
		})
	})

	it('send() will result in a "message" event', done => {
		const testMessage = 'Hi Mike, 30 years old'
		simplyWSClient.on('message', mochaAsync(done, message => expect(message).to.equal(testMessage)))
		simplyWSClient.on('open', () => simplyWSClient.emit('greet', { name: 'Mike', age: 30 }))
	})

	it('a registered handler will be called at most maxCalls times', () => {
		const testMessage = 'Demo3'
		const maxCalls = 5
		simplyWSClient.on('open', () => {
			for (let i = 0; i < maxCalls * 2; i++) {
				simplyWSClient.emit('echo', testMessage)
			}
		})

		var resolveCount = 0
		simplyWSClient.on('echo-response', message => resolveCount++, maxCalls)

		const testPromise = new Promise((resolve, reject) => {
			setTimeout(() => resolve(), 1000)
		})

		return testPromise.then(() => {
			expect(resolveCount).to.equal(maxCalls)
		})
	})
})

describe('WebSocket tests', () => {
	let server = null
	let wsClient

	before(() => {
		const app = require('express')()
		expressWs(app)
		app.ws(TEST_ENDPOINT, async (clientWs, request) => {
			clientWs.on('message', message => {
				// throw 'Demo'
				clientWs.send(message)
			})
		})
		server = app.listen(SERVER_PORT)
	})

	after(() => {
		if (server != null) {
			console.log('Closing server...')
			server.close()
		}
	})

	beforeEach(() => {
		wsClient = new WSWebSocket(WS_URL)
	})

	afterEach(() => {
		wsClient.close()
	})

	it('Send 1', done => {
		wsClient.on('open', () => {
			wsClient.send('Test')
			done()
		})
	})

	it('Send 2', done => {
		wsClient.on('open', () => {
			wsClient.send('Test')
			done()
		})
	})
})

// eslint-disable-next-line mocha/no-mocha-arrows
describe('Common tests', () => {
	it('Type of exception should be string', () => {
		try {
			throw 'Demo'			
		} catch (e) {
			expect(typeof e).to.equal('string')
		}
	})

	// eslint-disable-next-line mocha/no-mocha-arrows
	it('Type of exception should be Error', () => {
		try {
			throw { name: 'Demo' }
		} catch (e) {
			expect(typeof e).to.equal('object')
		}
	})

})
