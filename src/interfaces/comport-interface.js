/*
 * COM Port Interface Module
 * Handles serial port communication for NASA protocol
 */

const { SerialPort } = require("serialport");
const EventEmitter = require("events");

class ComPortInterface extends EventEmitter {
	constructor(config) {
		super();

		this.config = {
			path: config.path || "COM7",
			baudRate: config.baudRate || 9600,
			dataBits: config.dataBits || 8,
			parity: config.parity || "even",
			stopBits: config.stopBits || 1,
		};

		this.port = null;
		this.isConnected = false;
		this.buffer = Buffer.alloc(0);
	}

	async connect() {
		return new Promise((resolve, reject) => {
			try {
				this.port = new SerialPort({
					path: this.config.path,
					baudRate: this.config.baudRate,
					dataBits: this.config.dataBits,
					parity: this.config.parity,
					stopBits: this.config.stopBits,
				});

				let connectionResolved = false;

				this.port.on("open", () => {
					this.isConnected = true;
					connectionResolved = true;
					this.emit("connected", {
						interface: "COM",
						port: this.config.path,
						baudRate: this.config.baudRate,
						parity: this.config.parity,
					});
					resolve();
				});

				this.port.on("data", (data) => {
					this.buffer = Buffer.concat([this.buffer, data]);
					this.emit("data", data);
				});

				this.port.on("error", (err) => {
					this.emit("error", err);
					if (!connectionResolved) {
						reject(err);
					}
				});

				this.port.on("close", () => {
					this.isConnected = false;
					this.emit("disconnected");
				});
			} catch (err) {
				reject(err);
			}
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
			if (this.port && this.isConnected) {
				this.port.close(() => {
					this.isConnected = false;
					resolve();
				});
			} else {
				resolve();
			}
		});
	}

	getInfo() {
		return {
			type: "COM",
			port: this.config.path,
			baudRate: this.config.baudRate,
			parity: this.config.parity,
			connected: this.isConnected,
		};
	}
}

module.exports = ComPortInterface;
