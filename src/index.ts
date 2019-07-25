export const WS_EVENT = {
	OPEN: 'open',
	ERROR: 'error',
	CLOSE: 'close',
	MESSAGE: 'message'
}

export const WS_READY_STATE = {
	CONNECTING: 0,
	OPEN: 1,
	CLOSING: 2,
	CLOSED: 3
}

export interface IWebSocket {
	readyState: number
	send(message: any): any
	close(): any
}

export interface ISimplyWSOptions {
	url?: string
	autoConnect?: boolean
	onError?: (...args: any[]) => void
	onLog?: (...args: any[]) => void
	socket?: IWebSocket
	socketBuilder?: (url: string) => IWebSocket
}

export class SimplyWS {
	private _url?: string
	private _onLog: (...args: any[]) => void
	private _onError: (...args: any[]) => void
	private _socket?: IWebSocket
	private _customHandlerId: number = 0
	private _customHandlerMap: { [key: string]: { [subKey: number]: any } } = {}
	private _socketBuilder?: (url: any) => IWebSocket
	private _coreHandlerId: number = 0
	private _coreHandlerMap: { [key: string]: { [subKey: number]: any } } = {}

	constructor(options: ISimplyWSOptions) {
		const { url, autoConnect, onError, onLog, socket, socketBuilder } = options
		this._url = url
		this._onError = onError || ((...args) => console.error(...args))
		this._onLog = onLog || ((...args) => console.log(...args))
		this._socketBuilder = socketBuilder || (socket != null ? url => socket : undefined)
		if (socket != null || autoConnect || autoConnect == null) {
			this.open()
		}
	}

	open(): SimplyWS {
		this._reset()
		if (this._socket == null && this._socketBuilder != null) {
			this._socket = this._socketBuilder(this._url)
		}
		this._setUpSocket(this._socket)
		return this
	}

	// TODO Support ack parameter like Socket.io
	/**
	 * Emit an event-based message with the specified arguments.
	 * @param {string} eventName
	 * @param  {...any} args
	 */
	emit(eventName: string, ...args: any[]): SimplyWS {
		const message = eventName + ':' + JSON.stringify(args)
		this.send(message)
		return this
	}

	/**
	 * Send a raw text message.
	 * @param message 
	 */
	send(message: string): void {
		if (this._socket != null && this._socket.readyState == WS_READY_STATE.OPEN) {
			this._socket.send(message)
		}
	}

	/**
	 * Register a handler for the specified event and return the corresponding
	 * handlerId which can be used later to unregister this handler.
	 * @param {string} eventName
	 * @param {function} handler
	 */
	on(eventName: string, handler: ((...args: any[]) => void) | any) {
		if (handler == null) {
			handler = () => this._log(eventName)
		} else if (typeof handler !== 'function') {
			handler = () => this._log(eventName, handler)
		}

		const handlerId = this._customHandlerId++
		handler._handlerId = handlerId
		if (this._customHandlerMap[eventName] == null) {
			this._customHandlerMap[eventName] = { [handlerId]: handler }
		} else {
			this._customHandlerMap[eventName][handlerId] = handler
		}

		return handlerId
	}

	/**
	 * Unregister the specified handlers from the specified event. If no handler is specified,
	 * then unregister all registered handlers.
	 * @param {string} eventName
	 * @param  {...any} handlerIds
	 */
	off(eventName: string, ...handlerIds: number[]): SimplyWS {
		if (handlerIds == null || handlerIds.length == 0) {
			delete this._customHandlerMap[eventName]
			return this
		}

		const subMap = this._customHandlerMap[eventName]
		if (subMap == null) {
			return this
		}

		for (let id in handlerIds) {
			delete subMap[id]
		}

		return this
	}

	close(): SimplyWS {
		if (this._socket != null && this._socket.readyState != WS_READY_STATE.CLOSED) {
			this._socket.close()
		}
		this._reset()
		return this
	}

	private _log(...args: any[]): void {
		this._onLog(...args)
	}

	private _setUpSocket(socket: any): void {
		this._addCoreEventHandler(socket, WS_EVENT.OPEN, () => this.executeCustomHandlers(WS_EVENT.OPEN))
		this._addCoreEventHandler(socket, WS_EVENT.CLOSE, () => this.executeCustomHandlers(WS_EVENT.CLOSE))
		this._addCoreEventHandler(socket, WS_EVENT.ERROR, (error: Error) =>
			this.executeCustomHandlers(WS_EVENT.ERROR, error)
		)
		this._addCoreEventHandler(socket, WS_EVENT.MESSAGE, message => {
			const separatorIndex = message.indexOf(':')
			if (separatorIndex > -1) {
				const eventName = message.substring(0, separatorIndex)
				const args = JSON.parse(message.substring(separatorIndex + 1))
				this.executeCustomHandlers(eventName, ...args)
			} else {
				this.executeCustomHandlers(WS_EVENT.MESSAGE, message)
			}
		})
	}

	private _addCoreEventHandler(socket: any, eventName: string, handler: (...args: any[]) => void): number {
		const handlerId = this._coreHandlerId++

		if (socket.on) {
			// WebSocket in ws package
			socket.on(eventName, (...args: any[]) => {
				try {
					handler(...args)
				} catch (e) {
					this._onError(eventName, e)
				}
			})

			// TODO Add handlerId to handler consistently
		} else if (socket['on' + eventName]) {
			// WebSocket in browser
			let handlerWrapper: any

			switch (eventName) {
				case WS_EVENT.CLOSE:
					handlerWrapper = () => {
						try {
							handler()
						} catch (e) {
							this._onError(eventName, e)
						}
					}
					break
				case WS_EVENT.ERROR:
					handlerWrapper = (error: Error) => {
						try {
							handler(error)
						} catch (e) {
							this._onError(eventName, e)
						}
					}
					break
				case WS_EVENT.MESSAGE:
					handlerWrapper = (event: any) => {
						try {
							handler(event.data)
						} catch (e) {
							this._onError(eventName, e)
						}
					}
					break
				default:
					throw `Unsupported event: ${eventName}`
			}

			handlerWrapper._handlerId = handlerId
			if (this._coreHandlerMap[eventName] == null) {
				this._coreHandlerMap[eventName] = { [handlerId]: handlerWrapper }
			} else {
				this._coreHandlerMap[eventName][handlerId] = handlerWrapper
			}

			socket['on' + eventName] = (...args: any[]) => this._executeCoreHandlers(eventName, ...args)
		}

		return handlerId
	}

	private _reset() {
		this._customHandlerId = 0
		this._customHandlerMap = {}
	}

	private executeCustomHandlers(eventName: string, ...args: any[]): void {
		const subMap = this._customHandlerMap[eventName]
		if (subMap == null) {
			return
		}

		for (let key in subMap) {
			subMap[key](...args)
		}
	}

	private _executeCoreHandlers(eventName: string, ...args: any[]): void {
		const subMap = this._coreHandlerMap[eventName]
		if (subMap == null) {
			return
		}

		for (let key in subMap) {
			subMap[key](...args)
		}
	}
}
