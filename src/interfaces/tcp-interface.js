/*
 * TCP Interface Module
 * Handles TCP client connection to receive NASA protocol packets
 */

const net = require("net");
const EventEmitter = require("events");

class TcpInterface extends EventEmitter {
	constructor(config) {
		super();

		this.config = {
			host: config.host || "localhost",
			port: config.port || 5000,
			reconnectDelay: config.reconnectDelay || 5000,
		};

		this.client = null;
		this.isConnected = false;
		this.buffer = Buffer.alloc(0);
		this.reconnectTimer = null;
		this.shouldReconnect = true;
	}

	async connect() {
		return new Promise((resolve, reject) => {
			this.client = new net.Socket();

			this.client.connect(this.config.port, this.config.host, () => {
				this.isConnected = true;
				this.emit("connected", {
					interface: "TCP",
					host: this.config.host,
					port: this.config.port,
				});
				resolve();
			});

			this.client.on("data", (data) => {
				this.buffer = Buffer.concat([this.buffer, data]);
				this.emit("data", data);
			});

			this.client.on("error", (err) => {
				this.emit("error", err);
				if (!this.isConnected) {
					reject(err);
				}
			});

			this.client.on("close", () => {
				this.isConnected = false;
				this.emit("disconnected");

				// Auto-reconnect
				if (this.shouldReconnect) {
					this.emit("reconnecting", this.config.reconnectDelay);
					this.reconnectTimer = setTimeout(() => {
						this.connect().catch((err) => {
							// Reconnection failed, will try again
						});
					}, this.config.reconnectDelay);
				}
			});

			// Set a connection timeout
			setTimeout(() => {
				if (!this.isConnected) {
					this.client.destroy();
					reject(new Error(`Connection timeout to ${this.config.host}:${this.config.port}`));
				}
			}, 10000); // 10 second timeout
		});
	}

	getBuffer() {
		return this.buffer;
	}

	clearBuffer(length) {
		if (length >= this.buffer.length) {
			this.buffer = Buffer.alloc(0);
		} else {
			this.buffer = this.buffer.slice(length);
		}
	}

	async close() {
		return new Promise((resolve) => {
			this.shouldReconnect = false;

			if (this.reconnectTimer) {
				clearTimeout(this.reconnectTimer);
				this.reconnectTimer = null;
			}

			if (this.client && this.isConnected) {
				this.client.end(() => {
					this.client.destroy();
					this.isConnected = false;
					resolve();
				});
			} else {
				if (this.client) {
					this.client.destroy();
				}
				resolve();
			}
		});
	}

	getInfo() {
		return {
			type: "TCP",
			host: this.config.host,
			port: this.config.port,
			connected: this.isConnected,
		};
	}
}

module.exports = TcpInterface;
