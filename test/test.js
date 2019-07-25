'use strict'
const expect = require('chai').expect
const { SimplyWS } = require('../dist/index.js')
const expressWs = require('express-ws')
const WSWebSocket = require('ws')

const SERVER_PORT = 3001
const TEST_ENDPOINT = '/test'
const WS_URL = `ws://localhost:${SERVER_PORT}${TEST_ENDPOINT}`

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

describe('Simple tests', () => {
	let server = null

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

	it('client emits "echo" event and server replies with "echo-response" event', done => {
		const simplyWSClient = new SimplyWS({ socket: new WSWebSocket(WS_URL) })
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
		const simplyWSClient = new SimplyWS({ url: WS_URL, socketBuilder: url => new WSWebSocket(url) })
		const testMessage = 'Demo3'
		simplyWSClient.on('open', () => simplyWSClient.emit('echo', testMessage))

		var testPromise = new Promise(function(resolve, reject) {
			simplyWSClient.on('echo-response', message => resolve(message))
        })
        
		return testPromise.then(function(message) {
			expect(message).to.equal(testMessage)
		})
	})
})
