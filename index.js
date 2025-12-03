/*
 * Samsung AC NASA Protocol Packet Sniffer for Node.js
 * Modular architecture with support for COM port and TCP interfaces
 *
 * Installation:
 * npm install serialport dotenv ws
 *
 * Usage:
 * node index.js           - CLI mode
 * node index.js --gui     - Web UI mode
 */

const dotenv = require("dotenv");
dotenv.config();

const InterfaceFactory = require("./src/interfaces/interface-factory");
const { PacketAnalyzer } = require("./src/packet-decoder");
const Logger = require("./src/logger");

// ==================== NASA Protocol Packet Sniffer ====================

class NasaSniffer {
	constructor(interfaceInstance, logger, webSocketServer = null) {
		this.interface = interfaceInstance;
		this.logger = logger;
		this.webSocketServer = webSocketServer;
		this.isRunning = false;
	}

	async start() {
		console.log(`\n${"═".repeat(75)}`);
		console.log("         NASA PROTOCOL PACKET SNIFFER - STARTED");
		console.log(`${"═".repeat(75)}`);

		// Setup event listeners BEFORE connecting
		this.interface.on("connected", (info) => {
			console.log(`✓ Connected to ${info.interface} interface`);
			if (info.interface === "COM") {
				console.log(`  Port: ${info.port}`);
				console.log(`  Baud Rate: ${info.baudRate}`);
				console.log(`  Parity: ${info.parity}`);
			} else if (info.interface === "TCP") {
				console.log(`  Host: ${info.host}`);
				console.log(`  Port: ${info.port}`);
			}
			console.log(`${"═".repeat(75)}\n`);
			console.log("Listening for NASA protocol packets...");
			console.log("Commands:");
			console.log("  Ctrl+C : Exit");
			console.log("  Ctrl+S : Save report");
			console.log("  Ctrl+P : Print statistics");
			console.log("  Ctrl+E : Export verbose log");
			console.log("  Ctrl+X : Export packets (JSON)\n");
		});

		this.interface.on("data", () => {
			this.processBuffer();
		});

		this.interface.on("error", (err) => {
			console.error(`✗ Interface error: ${err.message}`);
		});

		this.interface.on("disconnected", () => {
			console.log("✗ Interface disconnected");
		});

		this.interface.on("reconnecting", (delay) => {
			console.log(`⟳ Attempting to reconnect in ${delay / 1000}s...`);
		});

		// Connect to interface
		try {
			await this.interface.connect();
		} catch (err) {
			console.error(`✗ Failed to connect: ${err.message}`);
			throw err;
		}

		this.isRunning = true;
	}

	processBuffer() {
		const buffer = this.interface.getBuffer();
		const result = PacketAnalyzer.analyzeBuffer(buffer);

		// Clear processed data from buffer
		if (result.packets.length > 0 || result.errors.length > 0) {
			const consumed = buffer.length - result.remainingBuffer.length;
			this.interface.clearBuffer(consumed);
		}

		// Process packets
		result.packets.forEach((packet) => {
			this.logger.logPacket(packet);

			// Broadcast to WebSocket clients if GUI mode is enabled
			if (this.webSocketServer) {
				this.webSocketServer.broadcastPacket(packet);
			}
		});

		// Log errors
		result.errors.forEach((error) => {
			this.logger.logError(error);
		});
	}

	async stop() {
		console.log("\n\nShutting down...");
		this.isRunning = false;

		// Print final stats
		this.logger.printStats();

		// Close logger
		this.logger.close();

		// Close interface
		await this.interface.close();
		console.log("✓ Interface closed");

		// Close WebSocket server
		if (this.webSocketServer) {
			await this.webSocketServer.close();
		}
	}
}

// ==================== Main ====================

async function main() {
	// Parse command line arguments
	const args = process.argv.slice(2);
	const guiMode = args.includes("--gui");
	const viewModeIndex = args.findIndex((arg) => arg === "--view");
	const viewMode = viewModeIndex !== -1;
	const viewFile = viewMode && args[viewModeIndex + 1] ? args[viewModeIndex + 1] : null;

	// Configuration from environment
	const OUTPUT_DIR = process.env.OUTPUT_DIR || "./nasa_logs";
	const WEB_PORT = parseInt(process.env.WEB_PORT || "8080");
	const LOG_FORMAT = process.env.LOG_FORMAT || "compact"; // 'compact', 'verbose', or 'none'

	// ==================== VIEW MODE ====================
	if (viewMode) {
		if (!viewFile) {
			console.error("✗ Error: --view requires a filename");
			console.error("Usage: node index.js --view <packet-file.json>");
			process.exit(1);
		}

		try {
			const WebSocketServer = require("./src/websocket-server");
			const webSocketServer = new WebSocketServer(WEB_PORT, true); // true = view mode

			// Load packets from file
			webSocketServer.loadPacketsFromFile(viewFile);

			// Start server
			await webSocketServer.start();

			console.log("View mode active. Press Ctrl+C to exit.\n");

			// Handle shutdown
			const shutdown = async () => {
				console.log("\n\nShutting down view mode...");
				await webSocketServer.close();
				process.exit(0);
			};

			process.on("SIGINT", shutdown);
			process.on("SIGTERM", shutdown);

			return; // Exit main function for view mode
		} catch (err) {
			console.error(`✗ Failed to start view mode: ${err.message}`);
			process.exit(1);
		}
	}

	// ==================== NORMAL/GUI MODE ====================

	// Initialize WebSocket server if GUI mode is enabled
	let webSocketServer = null;
	if (guiMode) {
		try {
			const WebSocketServer = require("./src/websocket-server");
			webSocketServer = new WebSocketServer(WEB_PORT, false); // false = live mode
			await webSocketServer.start();
		} catch (err) {
			console.error(`✗ Failed to start WebSocket server: ${err.message}`);
			console.error(`  Make sure port ${WEB_PORT} is not already in use.`);
			process.exit(1);
		}
	}

	// Create interface using factory
	let interfaceInstance;
	try {
		interfaceInstance = InterfaceFactory.createFromEnv(process.env);
	} catch (err) {
		console.error(`✗ Failed to create interface: ${err.message}`);
		console.error(`\nMake sure to set INTERFACE_MODE in .env file to either 'COM' or 'TCP'`);
		process.exit(1);
	}

	// Create logger
	const logger = new Logger(OUTPUT_DIR, {
		consoleLog: true,
		fileLog: true,
		format: LOG_FORMAT,
	});

	// Create and start sniffer
	const sniffer = new NasaSniffer(interfaceInstance, logger, webSocketServer);

	try {
		await sniffer.start();
	} catch (err) {
		console.error(`✗ Failed to start sniffer: ${err.message}`);
		logger.close();
		if (webSocketServer) {
			await webSocketServer.close();
		}
		process.exit(1);
	}

	// Handle keyboard input
	let isShuttingDown = false;

	const shutdown = async () => {
		if (isShuttingDown) return;
		isShuttingDown = true;

		// Set a timeout to force exit if shutdown takes too long
		const forceExitTimeout = setTimeout(() => {
			console.error("\n✗ Shutdown timed out, forcing exit...");
			process.exit(1);
		}, 5000); // 5 seconds timeout

		try {
			if (process.stdin.isTTY) {
				process.stdin.setRawMode(false);
			}
			await sniffer.stop();
			clearTimeout(forceExitTimeout);
			process.exit(0);
		} catch (err) {
			console.error(`✗ Error during shutdown: ${err.message}`);
			clearTimeout(forceExitTimeout);
			process.exit(1);
		}
	};

	process.stdin.on("data", (key) => {
		if (key[0] === 3 && !isShuttingDown) {
			// Ctrl+C
			shutdown();
		} else if (key[0] === 19) {
			// Ctrl+S
			logger.exportReport();
		} else if (key[0] === 16) {
			// Ctrl+P
			logger.printStats();
		} else if (key[0] === 5) {
			// Ctrl+E
			logger.exportVerbose();
		} else if (key[0] === 24) {
			// Ctrl+X
			logger.exportPackets();
		}
	});

	// Handle Ctrl+C signal (fallback)
	process.on("SIGINT", shutdown);

	// Handle termination signals
	process.on("SIGTERM", shutdown);

	if (process.stdin.isTTY) {
		process.stdin.setRawMode(true);
	}
	process.stdin.resume();
}

// Run the sniffer
main().catch(console.error);

// Export for use as module
module.exports = {
	NasaSniffer,
	InterfaceFactory,
	Logger,
};
