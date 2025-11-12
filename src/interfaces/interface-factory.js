/*
 * Interface Factory Module
 * Creates and configures the appropriate interface (COM or TCP) based on configuration
 */

const ComPortInterface = require("./comport-interface");
const TcpInterface = require("./tcp-interface");

class InterfaceFactory {
	/**
	 * Create interface based on configuration
	 * @param {Object} config - Configuration object
	 * @returns {ComPortInterface|TcpInterface}
	 */
	static createInterface(config) {
		const mode = (config.mode || "COM").toUpperCase();

		switch (mode) {
			case "TCP":
				return new TcpInterface({
					host: config.tcpHost || "localhost",
					port: config.tcpPort || 5000,
					reconnectDelay: config.tcpReconnectDelay || 5000,
				});

			case "COM":
			case "COMPORT":
			case "SERIAL":
				return new ComPortInterface({
					path: config.comPort || "COM7",
					baudRate: config.baudRate || 9600,
					dataBits: config.dataBits || 8,
					parity: config.parity || "even",
					stopBits: config.stopBits || 1,
				});

			default:
				throw new Error(`Unknown interface mode: ${mode}. Use 'TCP' or 'COM'.`);
		}
	}

	/**
	 * Create interface from environment variables
	 * @param {Object} env - Process environment variables
	 * @returns {ComPortInterface|TcpInterface}
	 */
	static createFromEnv(env) {
		const config = {
			mode: env.INTERFACE_MODE || "COM",
			// COM Port config
			comPort: env.COM_PORT || "COM7",
			baudRate: parseInt(env.BAUD_RATE || "9600"),
			parity: env.PARITY || "even",
			// TCP config
			tcpHost: env.TCP_HOST || "localhost",
			tcpPort: parseInt(env.TCP_PORT || "5000"),
			tcpReconnectDelay: parseInt(env.TCP_RECONNECT_DELAY || "5000"),
		};

		return InterfaceFactory.createInterface(config);
	}
}

module.exports = InterfaceFactory;
