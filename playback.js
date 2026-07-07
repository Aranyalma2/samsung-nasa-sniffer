#!/usr/bin/env node

/**
 * Samsung AC NASA Protocol Packet Playback Utility
 * Replays packets from a sniffer JSON log file to:
 * 1. A TCP Client (connects to a port)
 * 2. A TCP Server (listens for sniffer clients and broadcasts)
 * 3. A COM Port / UART (using the serialport dependency)
 * 
 * Supports interactive keyboard controls: Pause, Resume, Step, Speed adjustment.
 */

const fs = require("fs");
const path = require("path");
const net = require("net");

// Try importing SerialPort from the installed dependencies
let SerialPort;
try {
	const serialportModule = require("serialport");
	SerialPort = serialportModule.SerialPort;
} catch (err) {
	// Fallback/Warning (will only fail if UART mode is actually chosen)
	SerialPort = null;
}

// Default settings
const DEFAULT_TCP_HOST = "127.0.0.1";
const DEFAULT_TCP_PORT = 5000;
const DEFAULT_UART_BAUD = 9600;
const DEFAULT_UART_PARITY = "even";

// Help usage text
function printUsage() {
	console.log(`
Usage:
  node playback.js [options]

Required Options:
  -f, --file <path>      Path to the exported sniffer JSON packet log file
  -m, --mode <mode>      Transmission mode: 'tcp-server', 'tcp-client', or 'uart'

Optional Settings:
  -p, --port <port/com>  TCP port number (default: ${DEFAULT_TCP_PORT}) or COM Port path (default: COM7 or /dev/ttyUSB0)
  -H, --host <host>      TCP Hostname for client/server (default: ${DEFAULT_TCP_HOST})
  -b, --baud <rate>      Baud rate for UART mode (default: ${DEFAULT_UART_BAUD})
  --parity <parity>      Parity for UART mode: 'even', 'odd', 'none' (default: ${DEFAULT_UART_PARITY})
  -s, --speed <mult>     Playback speed multiplier (default: 1.0. Use 2.0 for double speed, 0.5 for half, 0.0 for max speed)
  -l, --loop             Loop playback infinitely upon reaching the end
  --max-delay <sec>      Cap the delay between packets at a maximum of N seconds (default: unlimited)

Keyboard Controls (during playback):
  [Space]                Pause / Resume playback
  [S] or [Right Arrow]   Step to next packet (when paused)
  [+] / [-]              Increase / Decrease playback speed by 1.5x
  [0]                    Reset playback speed to 1.0x
  [F]                    Fast-forward mode (runs at maximum speed / no delay)
  [Q] or [Ctrl+C]        Quit playback safely
`);
}

// ==================== Parse Command-line Arguments ====================
function parseArguments(argv) {
	const args = {
		file: null,
		mode: null,
		port: null,
		host: DEFAULT_TCP_HOST,
		baud: DEFAULT_UART_BAUD,
		parity: DEFAULT_UART_PARITY,
		speed: 1.0,
		loop: false,
		maxDelay: null,
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		switch (arg) {
			case "-f":
			case "--file":
				args.file = argv[++i];
				break;
			case "-m":
			case "--mode":
				args.mode = argv[++i];
				break;
			case "-p":
			case "--port":
				args.port = argv[++i];
				break;
			case "-H":
			case "--host":
				args.host = argv[++i];
				break;
			case "-b":
			case "--baud":
				args.baud = parseInt(argv[++i], 10);
				break;
			case "--parity":
				args.parity = argv[++i].toLowerCase();
				break;
			case "-s":
			case "--speed":
				args.speed = parseFloat(argv[++i]);
				break;
			case "-l":
			case "--loop":
				args.loop = true;
				break;
			case "--max-delay":
				args.maxDelay = parseFloat(argv[++i]);
				break;
			case "-h":
			case "--help":
				printUsage();
				process.exit(0);
				break;
		}
	}

	return args;
}

const args = parseArguments(process.argv.slice(2));

// Validate Required Arguments
if (!args.file) {
	console.error("✗ Error: Log file is required (-f or --file)");
	printUsage();
	process.exit(1);
}

if (!args.mode || !["tcp-server", "tcp-client", "uart"].includes(args.mode)) {
	console.error("✗ Error: Invalid or missing transmission mode (-m or --mode). Must be: tcp-server, tcp-client, or uart.");
	printUsage();
	process.exit(1);
}

// Assign default port based on mode
if (!args.port) {
	args.port = args.mode === "uart"
		? (process.platform === "win32" ? "COM7" : "/dev/ttyUSB0")
		: DEFAULT_TCP_PORT;
}

// ==================== Interface Connections ====================

// TCP Server Mode Variables
let tcpServer = null;
const connectedClients = new Set();

// TCP Client Mode Variables
let tcpClientSocket = null;
let isTcpClientConnected = false;

// UART Mode Variables
let serialPortInstance = null;

// Initialize the selected interface
async function initInterface() {
	if (args.mode === "tcp-server") {
		return new Promise((resolve) => {
			tcpServer = net.createServer((socket) => {
				console.log(`\n[TCP Server] Client connected from ${socket.remoteAddress}:${socket.remotePort}`);
				connectedClients.add(socket);

				socket.on("close", () => {
					console.log(`\n[TCP Server] Client disconnected`);
					connectedClients.delete(socket);
				});

				socket.on("error", (err) => {
					console.error(`\n[TCP Server] Socket error: ${err.message}`);
					connectedClients.delete(socket);
				});
			});

			tcpServer.listen(parseInt(args.port, 10), args.host, () => {
				console.log(`✓ [TCP Server] Listening on tcp://${args.host}:${args.port}`);
				resolve();
			});
		});
	} else if (args.mode === "tcp-client") {
		return new Promise((resolve) => {
			const portNum = parseInt(args.port, 10);
			console.log(`[TCP Client] Connecting to tcp://${args.host}:${portNum}...`);
			tcpClientSocket = new net.Socket();

			const connectAttempt = () => {
				tcpClientSocket.connect(portNum, args.host, () => {
					console.log(`✓ [TCP Client] Connected to TCP server at ${args.host}:${portNum}`);
					isTcpClientConnected = true;
					resolve();
				});
			};

			tcpClientSocket.on("error", (err) => {
				console.error(`✗ [TCP Client] Socket error: ${err.message}`);
				console.log("  Retrying connection in 3 seconds...");
				setTimeout(connectAttempt, 3000);
			});

			tcpClientSocket.on("close", () => {
				if (isTcpClientConnected) {
					console.log(`✗ [TCP Client] Connection closed by server. Trying to reconnect...`);
					isTcpClientConnected = false;
					setTimeout(connectAttempt, 3000);
				}
			});

			connectAttempt();
		});
	} else if (args.mode === "uart") {
		if (!SerialPort) {
			console.error("✗ Error: 'serialport' module is not available. Ensure dependencies are installed.");
			process.exit(1);
		}
		return new Promise((resolve, reject) => {
			console.log(`[UART] Opening serial port ${args.port} (Baud: ${args.baud}, Parity: ${args.parity})...`);
			serialPortInstance = new SerialPort({
				path: args.port,
				baudRate: args.baud,
				parity: args.parity,
				dataBits: 8,
				stopBits: 1,
			}, (err) => {
				if (err) {
					console.error(`✗ [UART] Failed to open port: ${err.message}`);
					reject(err);
				} else {
					console.log(`✓ [UART] Serial port ${args.port} opened successfully.`);
					resolve();
				}
			});

			serialPortInstance.on("error", (err) => {
				console.error(`✗ [UART] Serial port error: ${err.message}`);
			});
		});
	}
}

// Send raw buffer to the active interface
function transmitBuffer(buffer) {
	if (args.mode === "tcp-server") {
		for (const socket of connectedClients) {
			try {
				socket.write(buffer);
			} catch (err) {
				console.error(`[TCP Server] Failed to write to client: ${err.message}`);
				connectedClients.delete(socket);
			}
		}
	} else if (args.mode === "tcp-client") {
		if (isTcpClientConnected && tcpClientSocket) {
			try {
				tcpClientSocket.write(buffer);
			} catch (err) {
				console.error(`[TCP Client] Failed to write to server: ${err.message}`);
			}
		}
	} else if (args.mode === "uart") {
		if (serialPortInstance && serialPortInstance.isOpen) {
			serialPortInstance.write(buffer, (err) => {
				if (err) {
					console.error(`[UART] Write error: ${err.message}`);
				}
			});
		}
	}
}

// ==================== JSON Log Parsing ====================

console.log(`Loading packet log file: ${args.file}...`);
let logContent;
try {
	logContent = fs.readFileSync(args.file, "utf8");
} catch (err) {
	console.error(`✗ Failed to read log file: ${err.message}`);
	process.exit(1);
}

let parsedLog;
try {
	parsedLog = JSON.parse(logContent);
} catch (err) {
	console.error(`✗ Failed to parse JSON log: ${err.message}`);
	process.exit(1);
}

const rawPackets = parsedLog.p || [];
if (rawPackets.length === 0) {
	console.error("✗ Error: No packets found in the log file (key 'p' is missing or empty).");
	process.exit(1);
}
console.log(`✓ Loaded ${rawPackets.length} total packets.`);

// Preprocess packets: parse timestamps, decode payloads, extract readable addresses
const packets = rawPackets.map((p, idx) => {
	let buffer = null;
	if (p.rd && Array.isArray(p.rd)) {
		buffer = Buffer.from(p.rd);
	} else if (p.rdh) {
		// Clean up spaces in raw data hex string
		buffer = Buffer.from(p.rdh.replace(/\s+/g, ""), "hex");
	} else {
		console.warn(`! Warning: Packet index ${idx} has no raw data payload ('rd' or 'rdh'). Skipping.`);
	}

	// Parse timestamps. NASA timestamps format: YYYY-MM-DD HH:MM:SS.mmm
	// We convert the space to 'T' to make it compatible with JavaScript's ISO-8601 parser.
	let timeMs = 0;
	if (p.t) {
		timeMs = new Date(p.t.replace(" ", "T")).getTime();
		if (isNaN(timeMs)) {
			timeMs = 0;
		}
	}

	return {
		timeStr: p.t || "0000-00-00 00:00:00.000",
		timeMs,
		source: p.sr || p.s || "Unknown",
		dest: p.dr || p.d || "Unknown",
		buffer,
	};
}).filter(p => p.buffer !== null);

if (packets.length === 0) {
	console.error("✗ Error: No valid packets with raw payload data remaining after preprocessing.");
	process.exit(1);
}

// Sort by timestamp just in case they are out of order in the JSON log
packets.sort((a, b) => a.timeMs - b.timeMs);

// ==================== Playback Loop & State ====================

let currentIndex = 0;
let isPaused = false;
let playbackSpeed = args.speed;
let isRunning = true;
let totalSentCount = 0;

// Synchronization drift baselines
let baseRealTime = 0;
let baseLogTime = 0;

function resetBaseline(index) {
	baseRealTime = Date.now();
	baseLogTime = packets[index].timeMs;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function showStatusBar() {
	const speedStr = playbackSpeed === 0 ? "MAX (No Delay)" : `${playbackSpeed.toFixed(2)}x`;
	const pauseStr = isPaused ? " [PAUSED]" : " [PLAYING]";
	const loopStr = args.loop ? " [LOOPING]" : "";
	
	const statusLine = `Status: ${args.mode.toUpperCase()} | Sent: ${totalSentCount}/${packets.length}${pauseStr}${loopStr} | Speed: ${speedStr} | Controls: [Space] Pause/Resume  [+/-] Speed  [S] Step  [Q] Quit`;
	
	// Print carriage return and write updated status
	process.stdout.write(`\r\x1b[K${statusLine}`);
}

function printPacketLog(p, index) {
	const percent = ((index / packets.length) * 100).toFixed(1);
	const hexStr = p.buffer.toString("hex").toUpperCase().match(/.{1,2}/g).join(" ");
	const preview = hexStr.length > 60 ? hexStr.substring(0, 57) + "..." : hexStr;
	
	// Clear the status bar line, log the packet, and rewrite the status bar
	process.stdout.write(`\r\x1b[K`);
	console.log(`[${index + 1}/${packets.length}] (${percent}%) [${p.timeStr}] ${p.source} → ${p.dest} | Bytes: ${p.buffer.length} | ${preview}`);
	showStatusBar();
}

async function startPlayback() {
	console.log("\nStarting playback. Interactive controls are enabled.");
	console.log("---------------------------------------------------------------------------");
	
	resetBaseline(0);
	showStatusBar();

	while (isRunning) {
		if (currentIndex >= packets.length) {
			if (args.loop) {
				console.log(`\n\n[Playback] Looping back to the beginning...`);
				currentIndex = 0;
				resetBaseline(0);
				showStatusBar();
			} else {
				console.log(`\n\n✓ Playback completed successfully.`);
				cleanupAndExit();
				break;
			}
		}

		if (isPaused) {
			await sleep(100);
			continue;
		}

		const currentPacket = packets[currentIndex];
		const logElapsed = currentPacket.timeMs - baseLogTime;
		
		let targetDelay = 0;
		if (playbackSpeed > 0) {
			targetDelay = logElapsed / playbackSpeed;
			if (args.maxDelay && targetDelay > (args.maxDelay * 1000)) {
				targetDelay = args.maxDelay * 1000;
				// Sync base times to prevent accumulation lag after capping
				baseRealTime = Date.now();
				baseLogTime = currentPacket.timeMs;
			}
		}

		const delayMs = (baseRealTime + targetDelay) - Date.now();

		if (delayMs > 0) {
			// Chunked sleep to keep keyboard input responsive
			const sleepStart = Date.now();
			while (Date.now() - sleepStart < delayMs && isRunning && !isPaused) {
				const remaining = delayMs - (Date.now() - sleepStart);
				await sleep(Math.min(10, remaining));
			}
		}

		// Check states again after sleep
		if (!isRunning) break;
		if (isPaused) continue;

		// Transmit packet buffer
		transmitBuffer(currentPacket.buffer);
		totalSentCount++;

		// Print packet log
		printPacketLog(currentPacket, currentIndex);

		currentIndex++;
	}
}

// Single-step packet transmission when paused
function stepToNextPacket() {
	if (currentIndex >= packets.length) {
		if (args.loop) {
			currentIndex = 0;
		} else {
			console.log(`\n\n✓ Playback completed.`);
			cleanupAndExit();
			return;
		}
	}

	const currentPacket = packets[currentIndex];
	transmitBuffer(currentPacket.buffer);
	totalSentCount++;
	printPacketLog(currentPacket, currentIndex);
	currentIndex++;
	
	// Keep baseline updated
	resetBaseline(currentIndex < packets.length ? currentIndex : currentIndex - 1);
}

// ==================== Keyboard Control Listener ====================
function setupKeyboardInput() {
	if (!process.stdin.isTTY) {
		console.log("! Non-TTY environment detected. Interactive controls disabled.");
		return;
	}

	process.stdin.setRawMode(true);
	process.stdin.resume();
	process.stdin.setEncoding("utf8");

	process.stdin.on("data", (key) => {
		// Exit on Ctrl+C or 'q'
		if (key === "\u0003" || key.toLowerCase() === "q") {
			console.log("\n\nExiting playback...");
			cleanupAndExit();
		}
		// Pause/Resume on Spacebar
		else if (key === " ") {
			isPaused = !isPaused;
			if (!isPaused) {
				// Reset baseline to compensate for pause duration
				resetBaseline(currentIndex < packets.length ? currentIndex : packets.length - 1);
			}
			showStatusBar();
		}
		// Speed Up on '+' or '='
		else if (key === "+" || key === "=") {
			if (playbackSpeed === 0) playbackSpeed = 1.0;
			playbackSpeed = parseFloat((playbackSpeed * 1.5).toFixed(2));
			resetBaseline(currentIndex < packets.length ? currentIndex : packets.length - 1);
			showStatusBar();
		}
		// Slow Down on '-'
		else if (key === "-") {
			if (playbackSpeed === 0) playbackSpeed = 1.0;
			playbackSpeed = parseFloat((playbackSpeed / 1.5).toFixed(2));
			if (playbackSpeed < 0.05) playbackSpeed = 0.05;
			resetBaseline(currentIndex < packets.length ? currentIndex : packets.length - 1);
			showStatusBar();
		}
		// Reset Speed to 1.0x on '0'
		else if (key === "0") {
			playbackSpeed = 1.0;
			resetBaseline(currentIndex < packets.length ? currentIndex : packets.length - 1);
			showStatusBar();
		}
		// Fast-Forward on 'f' or 'F'
		else if (key.toLowerCase() === "f") {
			playbackSpeed = 0; // 0 represents no delay / maximum speed
			showStatusBar();
		}
		// Step on 's', 'S', or Right Arrow
		else if (key.toLowerCase() === "s" || key === "\u001b[C" || key === "\u001bOC") {
			if (isPaused) {
				stepToNextPacket();
			} else {
				// Quick pause and step
				isPaused = true;
				stepToNextPacket();
			}
		}
	});
}

// ==================== Shutdown Cleanup ====================
let isClosed = false;
async function cleanupAndExit() {
	if (isClosed) return;
	isClosed = true;
	isRunning = false;

	console.log("\nCleaning up connections...");

	if (process.stdin.isTTY) {
		process.stdin.setRawMode(false);
		process.stdin.pause();
	}

	// Close TCP server
	if (tcpServer) {
		await new Promise((resolve) => {
			tcpServer.close(() => {
				resolve();
			});
		});
		console.log("✓ TCP Server stopped.");
	}

	// Close connected sockets
	for (const socket of connectedClients) {
		socket.destroy();
	}
	connectedClients.clear();

	// Close TCP client
	if (tcpClientSocket) {
		tcpClientSocket.destroy();
		console.log("✓ TCP Client socket disconnected.");
	}

	// Close Serial interface
	if (serialPortInstance && serialPortInstance.isOpen) {
		await new Promise((resolve) => {
			serialPortInstance.close(() => {
				resolve();
			});
		});
		console.log("✓ Serial port interface closed.");
	}

	process.exit(0);
}

// Handle OS signals
process.on("SIGINT", cleanupAndExit);
process.on("SIGTERM", cleanupAndExit);

// ==================== Entry Point ====================
async function main() {
	// Initialize transmission interfaces
	try {
		await initInterface();
	} catch (err) {
		console.error(`✗ Fatal error configuring connection interface: ${err.message}`);
		process.exit(1);
	}

	// Setup controls and begin playback loop
	setupKeyboardInput();
	await startPlayback();
}

main().catch((err) => {
	console.error(`✗ Execution failed: ${err.message}`);
	cleanupAndExit();
});
