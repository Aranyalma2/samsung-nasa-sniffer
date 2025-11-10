/*
 * Samsung AC NASA Protocol Sniffer for Node.js
 * Captures and logs all NASA protocol traffic with intelligent grouping
 *
 * Installation:
 * npm install serialport
 *
 * Usage:
 * node index.js
 */

const { SerialPort } = require("serialport");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

// ==================== Constants ====================

const NASA_START_BYTE = 0x32;
const NASA_END_BYTE = 0x34;

// Address Classes
const AddressClass = {
	Outdoor: 0x10,
	HTU: 0x11,
	Indoor: 0x20,
	ERV: 0x30,
	Diffuser: 0x35,
	MCU: 0x38,
	RMC: 0x40,
	WiredRemote: 0x50,
	PIM: 0x58,
	SIM: 0x59,
	Peak: 0x5a,
	PowerDivider: 0x5b,
	OnOffController: 0x60,
	WiFiKit: 0x62,
	MIM: 0x63,
	CentralController: 0x65,
	DMS: 0x6a,
	JIGTester: 0x80,
	BroadcastSelfLayer: 0xb0,
	BroadcastControlLayer: 0xb1,
	BroadcastSetLayer: 0xb2,
	BroadcastControlAndSetLayer: 0xb3,
	BroadcastModuleLayer: 0xb4,
	BroadcastCSM: 0xb7,
	BroadcastLocalLayer: 0xb8,
	BroadcastCSML: 0xbf,
	Undefined: 0xff,
};

const AddressClassName = {
	0x10: "Outdoor",
	0x11: "HTU",
	0x20: "Indoor",
	0x30: "ERV",
	0x35: "Diffuser",
	0x38: "MCU",
	0x40: "RMC",
	0x50: "WiredRemote",
	0x58: "PIM",
	0x59: "SIM",
	0x5a: "Peak",
	0x5b: "PowerDivider",
	0x60: "OnOffController",
	0x62: "WiFiKit",
  0x63: "MIM",
	0x65: "CentralController",
	0x6a: "DMS",
	0x80: "JIGTester",
	0xb0: "BroadcastSelfLayer",
	0xb1: "BroadcastControlLayer",
	0xb2: "BroadcastSetLayer",
	0xb3: "BroadcastControlAndSetLayer",
	0xb4: "BroadcastModuleLayer",
	0xb7: "BroadcastCSM",
	0xb8: "BroadcastLocalLayer",
	0xbf: "BroadcastCSML",
	0xff: "Undefined",
};

// Packet Types
const PacketType = {
	StandBy: 0,
	Normal: 1,
	Gathering: 2,
	Install: 3,
	Download: 4,
};

const PacketTypeName = {
	0: "StandBy",
	1: "Normal",
	2: "Gathering",
	3: "Install",
	4: "Download",
};

// Data Types
const DataType = {
	Undefined: 0,
	Read: 1,
	Write: 2,
	Request: 3,
	Notification: 4,
	Response: 5,
	Ack: 6,
	Nack: 7,
};

const DataTypeName = {
	0: "Undefined",
	1: "Read",
	2: "Write",
	3: "Request",
	4: "Notification",
	5: "Response",
	6: "Ack",
	7: "Nack",
};

// Message Set Types
const MessageSetType = {
	Enum: 0,
	Variable: 1,
	LongVariable: 2,
	Structure: 3,
};

const MessageSetTypeName = {
	0: "Enum",
	1: "Variable",
	2: "LongVariable",
	3: "Structure",
};

// Message Numbers with names
const MessageNumberNames = {
	0x4000: "ENUM_in_operation_power",
	0x4001: "ENUM_in_operation_mode",
	0x4006: "ENUM_in_fan_mode",
	0x4007: "ENUM_in_fan_mode_real",
	0x4011: "ENUM_in_louver_hl_swing",
	0x4038: "ENUM_in_state_humidity_percent",
	0x4060: "ENUM_in_alt_mode",
	0x4065: "ENUM_in_water_heater_power",
	0x4066: "ENUM_in_water_heater_mode",
	0x407e: "ENUM_in_louver_lr_swing",
	0x4111: "ENUM_in_operation_automatic_cleaning",
	0x4201: "VAR_in_temp_target_f",
	0x4203: "VAR_in_temp_room_f",
	0x4205: "VAR_in_temp_eva_in_f",
	0x4206: "VAR_in_temp_eva_out_f",
	0x4235: "VAR_in_temp_water_heater_target_f",
	0x4237: "VAR_in_temp_water_tank_f",
	0x4247: "VAR_in_temp_water_outlet_target_f",
	0x8204: "VAR_out_sensor_airout",
	0x8217: "VAR_OUT_SENSOR_CT1",
	0x8235: "VAR_out_error_code",
	0x8413: "LVAR_OUT_CONTROL_WATTMETER_1W_1MIN_SUM",
	0x8414: "LVAR_OUT_CONTROL_WATTMETER_ALL_UNIT_ACCUM",
	0x24fc: "LVAR_NM_OUT_SENSOR_VOLTAGE",
};

// ==================== Utility Functions ====================

function crc16(data, startIndex, length) {
	let crc = 0;
	for (let index = startIndex; index < startIndex + length; index++) {
		crc = crc ^ (data[index] << 8);
		for (let i = 0; i < 8; i++) {
			if (crc & 0x8000) {
				crc = (crc << 1) ^ 0x1021;
			} else {
				crc <<= 1;
			}
		}
	}
	return crc & 0xffff;
}

function byteToHex(byte) {
	return byte.toString(16).padStart(2, "0").toUpperCase();
}

function bufferToHex(buffer, spacer = " ") {
	return Array.from(buffer).map(byteToHex).join(spacer);
}

function getCurrentTimestamp() {
	const now = new Date();
	return now.toISOString().replace("T", " ").substring(0, 23);
}

// ==================== Address Class ====================

class Address {
	constructor(klass = AddressClass.Undefined, channel = 0, address = 0) {
		this.klass = klass;
		this.channel = channel;
		this.address = address;
		this.size = 3;
	}

	decode(data, index) {
		this.klass = data[index];
		this.channel = data[index + 1];
		this.address = data[index + 2];
	}

	encode() {
		return [this.klass, this.channel, this.address];
	}

	toString() {
		return `${byteToHex(this.klass)}.${byteToHex(this.channel)}.${byteToHex(this.address)}`;
	}

	toReadableString() {
		const className = AddressClassName[this.klass] || "Unknown";
		return `${className}(${this.toString()})`;
	}
}

// ==================== Command Class ====================

class Command {
	constructor() {
		this.packetInformation = true;
		this.protocolVersion = 2;
		this.retryCount = 0;
		this.packetType = PacketType.StandBy;
		this.dataType = DataType.Undefined;
		this.packetNumber = 0;
		this.size = 3;
	}

	decode(data, index) {
		this.packetInformation = (data[index] & 0x80) >> 7 === 1;
		this.protocolVersion = (data[index] & 0x60) >> 5;
		this.retryCount = (data[index] & 0x18) >> 3;
		this.packetType = (data[index + 1] & 0xf0) >> 4;
		this.dataType = data[index + 1] & 0x0f;
		this.packetNumber = data[index + 2];
	}

	encode() {
		const byte1 = ((this.packetInformation ? 1 : 0) << 7) + (this.protocolVersion << 5) + (this.retryCount << 3);
		const byte2 = (this.packetType << 4) + this.dataType;
		return [byte1, byte2, this.packetNumber];
	}
}

// ==================== MessageSet Class ====================

class MessageSet {
	constructor(messageNumber) {
		this.messageNumber = messageNumber;
		this.type = (messageNumber & 0x0600) >> 9;
		this.value = 0;
		this.structure = null;
		this.size = 2;
	}

	static decode(data, index, capacity) {
		const messageNumber = (data[index] << 8) | data[index + 1];
		const set = new MessageSet(messageNumber);

		switch (set.type) {
			case MessageSetType.Enum:
				set.value = data[index + 2];
				set.size = 3;
				break;

			case MessageSetType.Variable:
				set.value = (data[index + 2] << 8) | data[index + 3];
				set.size = 4;
				break;

			case MessageSetType.LongVariable:
				set.value = (data[index + 2] << 24) | (data[index + 3] << 16) | (data[index + 4] << 8) | data[index + 5];
				set.size = 6;
				break;

			case MessageSetType.Structure:
				set.size = data.length - index - 3;
				break;
		}

		return set;
	}

	getReadableValue() {
		const msgName = MessageNumberNames[this.messageNumber];

		// Temperature values
		if (msgName && msgName.includes("temp")) {
			return `${(this.value / 10.0).toFixed(1)}°C`;
		}

		// Power status
		if (msgName && msgName.includes("power")) {
			return this.value ? "ON" : "OFF";
		}

		// Operation mode
		if (this.messageNumber === 0x4001) {
			const modes = ["Auto", "Cool", "Dry", "Fan", "Heat"];
			return modes[this.value] || `Unknown(${this.value})`;
		}

		// Fan mode
		if (this.messageNumber === 0x4006 || this.messageNumber === 0x4007) {
			const fans = ["Auto", "Low", "Mid", "High", "Turbo"];
			return fans[this.value] || `Unknown(${this.value})`;
		}

		// Default
		return this.value.toString();
	}

	toString() {
		const typeName = MessageSetTypeName[this.type];
		const msgName = MessageNumberNames[this.messageNumber] || "UNKNOWN";
		const readableValue = this.getReadableValue();

		return `${typeName} [0x${this.messageNumber.toString(16).padStart(4, "0")}] ${msgName} = ${readableValue} (raw: ${this.value})`;
	}
}

// ==================== Packet Class ====================

class Packet {
	constructor() {
		this.sa = new Address();
		this.da = new Address();
		this.command = new Command();
		this.messages = [];
		this.rawData = null;
		this.timestamp = null;
	}

	decode(data) {
		this.rawData = Buffer.from(data);
		this.timestamp = getCurrentTimestamp();

		if (data[0] !== NASA_START_BYTE) {
			return { success: false, error: "Invalid start byte" };
		}

		if (data.length < 16 || data.length > 1500) {
			return { success: false, error: "Unexpected size" };
		}

		const size = (data[1] << 8) | data[2];
		if (size + 2 !== data.length) {
			return { success: false, error: "Size mismatch" };
		}

		if (data[data.length - 1] !== NASA_END_BYTE) {
			return { success: false, error: "Invalid end byte" };
		}

		const crcActual = crc16(data, 3, size - 4);
		const crcExpected = (data[data.length - 3] << 8) | data[data.length - 2];
		if (crcExpected !== crcActual) {
			return { success: false, error: `CRC error: expected ${crcExpected}, got ${crcActual}` };
		}

		let cursor = 3;

		this.sa.decode(data, cursor);
		cursor += this.sa.size;

		this.da.decode(data, cursor);
		cursor += this.da.size;

		this.command.decode(data, cursor);
		cursor += this.command.size;

		const capacity = data[cursor];
		cursor++;

		this.messages = [];
		for (let i = 0; i < capacity; i++) {
			const message = MessageSet.decode(data, cursor, capacity);
			this.messages.push(message);
			cursor += message.size;
		}

		return { success: true };
	}

	getSignature() {
		// Create a unique signature for grouping similar packets
		const msgSignature = this.messages.map((m) => m.messageNumber.toString(16).padStart(4, "0")).join(",");

		return `${this.sa.toString()}->${this.da.toString()}:${DataTypeName[this.command.dataType]}:[${msgSignature}]`;
	}

	toFormattedString(includeRaw = true) {
		let output = [];

		output.push("┌─────────────────────────────────────────────────────────────────");
		output.push(`│ Timestamp: ${this.timestamp}`);
		output.push("├─────────────────────────────────────────────────────────────────");
		output.push(`│ Source:      ${this.sa.toReadableString()}`);
		output.push(`│ Destination: ${this.da.toReadableString()}`);
		output.push("├─────────────────────────────────────────────────────────────────");
		output.push(`│ Packet Type: ${PacketTypeName[this.command.packetType] || "Unknown"}`);
		output.push(`│ Data Type:   ${DataTypeName[this.command.dataType] || "Unknown"}`);
		output.push(`│ Packet #:    ${this.command.packetNumber}`);
		output.push(`│ Protocol:    v${this.command.protocolVersion}`);
		output.push(`│ Retry Count: ${this.command.retryCount}`);
		output.push("├─────────────────────────────────────────────────────────────────");
		output.push(`│ Messages (${this.messages.length}):`);

		for (let i = 0; i < this.messages.length; i++) {
			output.push(`│   ${i + 1}. ${this.messages[i].toString()}`);
		}

		if (includeRaw) {
			output.push("├─────────────────────────────────────────────────────────────────");
			output.push("│ Raw Packet Data:");
			const hexData = bufferToHex(this.rawData, " ");
			const chunks = hexData.match(/.{1,48}/g) || [];
			chunks.forEach((chunk) => {
				output.push(`│   ${chunk}`);
			});
		}

		output.push("└─────────────────────────────────────────────────────────────────");
		output.push("");

		return output.join("\n");
	}
}

// ==================== Packet Grouper ====================

class PacketGrouper {
	constructor() {
		this.groups = new Map();
		this.totalPackets = 0;
	}

	addPacket(packet) {
		this.totalPackets++;
		const signature = packet.getSignature();

		if (!this.groups.has(signature)) {
			this.groups.set(signature, {
				signature: signature,
				count: 0,
				firstSeen: packet.timestamp,
				lastSeen: packet.timestamp,
				examplePacket: packet,
				allPackets: [],
			});
		}

		const group = this.groups.get(signature);
		group.count++;
		group.lastSeen = packet.timestamp;
		group.allPackets.push(packet);
	}

	generateReport() {
		let report = [];

		report.push("═══════════════════════════════════════════════════════════════════════");
		report.push("                    NASA PROTOCOL SNIFFER REPORT");
		report.push("═══════════════════════════════════════════════════════════════════════");
		report.push(`Generated: ${getCurrentTimestamp()}`);
		report.push(`Total Packets Captured: ${this.totalPackets}`);
		report.push(`Unique Packet Types: ${this.groups.size}`);
		report.push("═══════════════════════════════════════════════════════════════════════");
		report.push("");

		// Sort groups by count (most frequent first)
		const sortedGroups = Array.from(this.groups.values()).sort((a, b) => b.count - a.count);

		sortedGroups.forEach((group, index) => {
			report.push("");
			report.push(`╔═══════════════════════════════════════════════════════════════════════`);
			report.push(`║ GROUP #${index + 1}`);
			report.push(`╠═══════════════════════════════════════════════════════════════════════`);
			report.push(`║ Signature: ${group.signature}`);
			report.push(`║ Occurrences: ${group.count} times`);
			report.push(`║ First Seen: ${group.firstSeen}`);
			report.push(`║ Last Seen:  ${group.lastSeen}`);
			report.push(`╠═══════════════════════════════════════════════════════════════════════`);
			report.push(`║ EXAMPLE PACKET:`);
			report.push(`╚═══════════════════════════════════════════════════════════════════════`);
			report.push("");

			// Add the formatted example packet
			const formatted = group.examplePacket.toFormattedString(true);
			report.push(formatted);

			// If there are multiple occurrences, show timestamps of all
			if (group.count > 1 && group.count <= 10) {
				report.push("All Occurrences:");
				group.allPackets.forEach((pkt, i) => {
					report.push(`  ${i + 1}. ${pkt.timestamp}`);
				});
				report.push("");
			} else if (group.count > 10) {
				report.push(`(Too many occurrences to list individually - ${group.count} total)`);
				report.push("");
			}

			report.push("─".repeat(75));
		});

		return report.join("\n");
	}

	reset() {
		this.groups.clear();
		this.totalPackets = 0;
	}
}

// ==================== NASA Protocol Sniffer ====================

class NasaSniffer {
	constructor(portPath, baudRate = 9600, parity= "none",outputDir = "./nasa_logs", webSocketServer = null) {
		this.port = new SerialPort({
			path: portPath,
			baudRate: baudRate,
			dataBits: 8,
			parity: parity,
			stopBits: 1,
		});

		this.responseBuffer = Buffer.alloc(0);
		this.grouper = new PacketGrouper();
		this.outputDir = outputDir;
		this.rawLogStream = null;
		this.startTime = new Date();
		this.webSocketServer = webSocketServer;

		// Create output directory
		if (!fs.existsSync(this.outputDir)) {
			fs.mkdirSync(this.outputDir, { recursive: true });
		}

		// Create raw log file
		const timestamp = this.startTime.toISOString().replace(/:/g, "-").split(".")[0];
		const rawLogPath = path.join(this.outputDir, `nasa_raw_${timestamp}.log`);
		this.rawLogStream = fs.createWriteStream(rawLogPath, { flags: "a" });

		console.log(`\n${"═".repeat(75)}`);
		console.log("         NASA PROTOCOL SNIFFER - STARTED");
		console.log(`${"═".repeat(75)}`);
		console.log(`Port: ${portPath}`);
		console.log(`Baud Rate: ${baudRate}`);
		console.log(`Output Directory: ${this.outputDir}`);
		console.log(`Raw Log: ${rawLogPath}`);
		console.log(`${"═".repeat(75)}\n`);

		this.port.on("open", () => {
			console.log(`✓ Serial port opened successfully at ${getCurrentTimestamp()}\n`);
		});

		this.port.on("data", (data) => {
			this.handleIncomingData(data);
		});

		this.port.on("error", (err) => {
			console.error(`✗ Serial port error: ${err.message}`);
		});
	}

	handleIncomingData(data) {
		this.responseBuffer = Buffer.concat([this.responseBuffer, data]);

		// Try to decode packet
		while (this.responseBuffer.length > 0) {
			if (this.responseBuffer[0] !== NASA_START_BYTE) {
				// Invalid start byte, skip to next potential start
				const nextStart = this.responseBuffer.indexOf(NASA_START_BYTE, 1);
				if (nextStart === -1) {
					this.responseBuffer = Buffer.alloc(0);
					break;
				} else {
					this.responseBuffer = this.responseBuffer.slice(nextStart);
					continue;
				}
			}

			if (this.responseBuffer.length >= 3) {
				const expectedSize = (this.responseBuffer[1] << 8) | this.responseBuffer[2];
				const totalSize = expectedSize + 2;

				if (this.responseBuffer.length >= totalSize) {
					const packetData = this.responseBuffer.slice(0, totalSize);
					this.responseBuffer = this.responseBuffer.slice(totalSize);

					this.processPacketData(packetData);
				} else {
					// Wait for more data
					break;
				}
			} else {
				// Wait for more data
				break;
			}
		}
	}

	processPacketData(data) {
		const packet = new Packet();
		const result = packet.decode(data);

		if (result.success) {
			// Add to grouper
			this.grouper.addPacket(packet);

			// Log to console (summary)
			console.log(
				`[${packet.timestamp}] Packet #${this.grouper.totalPackets}: ${packet.sa.toReadableString()} → ${packet.da.toReadableString()} | ${
					DataTypeName[packet.command.dataType]
				} | ${packet.messages.length} msg(s)`,
			);

			// Log to raw file (detailed)
			if (this.rawLogStream) {
				this.rawLogStream.write(packet.toFormattedString(true));
				this.rawLogStream.write("\n");
			}
			
			// Broadcast to WebSocket clients if GUI mode is enabled
			if (this.webSocketServer) {
				this.webSocketServer.broadcastPacket(packet);
			}
		} else {
			console.error(`[${getCurrentTimestamp()}] ✗ Decode error: ${result.error}`);
			console.error(`   Raw data: ${bufferToHex(data)}`);

			if (this.rawLogStream) {
				this.rawLogStream.write(`[${getCurrentTimestamp()}] ERROR: ${result.error}\n`);
				this.rawLogStream.write(`Raw data: ${bufferToHex(data)}\n\n`);
			}
		}
	}

	saveReport() {
		const timestamp = new Date().toISOString().replace(/:/g, "-").split(".")[0];
		const reportPath = path.join(this.outputDir, `nasa_report_${timestamp}.txt`);

		const report = this.grouper.generateReport();
		fs.writeFileSync(reportPath, report, "utf8");

		console.log(`\n✓ Report saved: ${reportPath}\n`);
		return reportPath;
	}

	printStats() {
		console.log(`\n${"═".repeat(75)}`);
		console.log("                    CURRENT STATISTICS");
		console.log(`${"═".repeat(75)}`);
		console.log(`Total Packets Captured: ${this.grouper.totalPackets}`);
		console.log(`Unique Packet Types: ${this.grouper.groups.size}`);
		console.log(`Runtime: ${Math.floor((new Date() - this.startTime) / 1000)}s`);
		console.log(`${"═".repeat(75)}\n`);
	}

	close() {
		return new Promise((resolve) => {
			clearInterval(this.autoSaveInterval);

			// Save final report
			const reportPath = this.saveReport();
			console.log(`\n✓ Final report saved: ${reportPath}`);

			// Close log stream
			if (this.rawLogStream) {
				this.rawLogStream.end();
			}

			// Print final stats
			this.printStats();

			this.port.close(() => {
				console.log("✓ Serial port closed");
				resolve();
			});
		});
	}
}

// ==================== Main ====================

async function main() {
	// Parse command line arguments
	const args = process.argv.slice(2);
	const guiMode = args.includes('--gui');
	
	// Configuration
	const COM_PORT = process.env.COM_PORT || "COM7";
	const BAUD_RATE = parseInt(process.env.BAUD_RATE || "9600");
	const PARITY = process.env.PARITY || "even";
	const OUTPUT_DIR = process.env.OUTPUT_DIR || "./nasa_logs";
	const WEB_PORT = parseInt(process.env.WEB_PORT || "8080");

	// Initialize WebSocket server if GUI mode is enabled
	let webSocketServer = null;
	if (guiMode) {
		const WebSocketServer = require('./websocket-server');
		webSocketServer = new WebSocketServer(WEB_PORT);
		await webSocketServer.start();
	}

	const sniffer = new NasaSniffer(COM_PORT, BAUD_RATE, PARITY, OUTPUT_DIR, webSocketServer);

	// Wait for port to open
	await new Promise((resolve) => setTimeout(resolve, 1000));

	console.log("Listening for NASA protocol packets...");
	console.log("Commands:");
	console.log("  Ctrl+C : Save report and exit");
	console.log("  Ctrl+S : Save current report (keep running)");
	console.log("  Ctrl+P : Print statistics\n");

	// Handle keyboard input
	let isShuttingDown = false;

	const shutdown = async () => {
		if (isShuttingDown) return;
		isShuttingDown = true;
		console.log("\n\nShutting down...");
		if (process.stdin.isTTY) {
			process.stdin.setRawMode(false);
		}
		await sniffer.close();
		if (webSocketServer) {
			await webSocketServer.close();
		}
		process.exit(0);
	};

	process.stdin.on("data", (key) => {
		if (key[0] === 3 && !isShuttingDown) {
			// Ctrl+C
			shutdown();
		} else if (key[0] === 19) {
			// Ctrl+S
			sniffer.saveReport();
		} else if (key[0] === 16) {
			// Ctrl+P
			sniffer.printStats();
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

module.exports = {
	NasaSniffer,
	Packet,
	PacketGrouper,
	PacketTypeName,
	DataTypeName,
	MessageSetTypeName,
	MessageNumberNames
};
