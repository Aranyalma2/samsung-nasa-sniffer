/*
 * Logger Module
 * Handles logging of NASA protocol packets with multiple output formats
 */

const fs = require("fs");
const path = require("path");
const {
	getCurrentTimestamp,
	PacketTypeName,
	DataTypeName,
	MessageNumberNames,
	MessageSetTypeName,
	bufferToHex,
} = require("./packet-decoder");

class Logger {
	constructor(outputDir = "./nasa_logs", options = {}) {
		this.outputDir = outputDir;
		this.options = {
			consoleLog: options.consoleLog !== false, // Default: true
			fileLog: options.fileLog !== false, // Default: true
			format: options.format || "compact", // 'compact', 'verbose', or 'none'
		};

		this.logStream = null;
		this.startTime = new Date();
		this.packetGroups = new Map(); // For report generation
		this.totalPackets = 0;

		// If format is 'none', disable file logging
		if (this.options.format === "none") {
			this.options.fileLog = false;
		}

		// Create output directory only if file logging is enabled
		if (this.options.fileLog && !fs.existsSync(this.outputDir)) {
			fs.mkdirSync(this.outputDir, { recursive: true });
		}

		// Create log file based on format
		const timestamp = this.startTime.toISOString().replace(/:/g, "-").split(".")[0];

		if (this.options.fileLog) {
			const logFilename = `nasa_${this.options.format}_${timestamp}.log`;
			const logPath = path.join(this.outputDir, logFilename);
			this.logStream = fs.createWriteStream(logPath, { flags: "a" });
			console.log(`Logging to: ${logPath}`);
		}
	}

	logPacket(packet) {
		this.totalPackets++;

		// Always maintain packet groups for report generation
		this._addToGroups(packet);

		// Console logging
		if (this.options.consoleLog) {
			if (this.options.format === "verbose") {
				console.log(this._formatPacketVerbose(packet, true));
			} else {
				// Compact format (default)
				console.log(this._formatPacketCompact(packet));
			}
		}

		// File logging based on format
		if (this.options.fileLog && this.logStream) {
			if (this.options.format === "verbose") {
				this.logStream.write(this._formatPacketVerbose(packet, true) + "\n");
			} else {
				// Compact format (default)
				this.logStream.write(this._formatPacketCompact(packet) + "\n");
			}
		}
	}

	logError(error, rawData = null) {
		const errorMsg = `[${getCurrentTimestamp()}] ERROR: ${error}`;

		if (this.options.consoleLog) {
			console.error(errorMsg);
			if (rawData) {
				console.error(`   Raw data: ${rawData}`);
			}
		}

		if (this.options.fileLog && this.logStream) {
			this.logStream.write(errorMsg + "\n");
			if (rawData) {
				this.logStream.write(`Raw data: ${rawData}\n`);
			}
		}
	}

	_addToGroups(packet) {
		const signature = packet.getSignature();

		if (!this.packetGroups.has(signature)) {
			this.packetGroups.set(signature, {
				signature: signature,
				count: 0,
				firstSeen: packet.timestamp,
				lastSeen: packet.timestamp,
				examplePacket: packet,
				allPackets: [],
			});
		}

		const group = this.packetGroups.get(signature);
		group.count++;
		group.lastSeen = packet.timestamp;
		group.allPackets.push(packet);
	}

	exportReport(filename = null) {
		if (!filename) {
			const timestamp = new Date().toISOString().replace(/:/g, "-").split(".")[0];
			filename = path.join(this.outputDir, `nasa_report_${timestamp}.txt`);
		}

		const report = this._generateReport();
		fs.writeFileSync(filename, report, "utf8");

		console.log(`\n✓ Report exported: ${filename}\n`);
		return filename;
	}

	exportVerbose(filename = null) {
		if (!filename) {
			const timestamp = new Date().toISOString().replace(/:/g, "-").split(".")[0];
			filename = path.join(this.outputDir, `nasa_export_verbose_${timestamp}.txt`);
		}

		let output = [];
		output.push("═══════════════════════════════════════════════════════════════════════");
		output.push("                    NASA PROTOCOL VERBOSE EXPORT");
		output.push("═══════════════════════════════════════════════════════════════════════");
		output.push(`Generated: ${getCurrentTimestamp()}`);
		output.push(`Total Packets: ${this.totalPackets}`);
		output.push("═══════════════════════════════════════════════════════════════════════");
		output.push("");

		// Export all packets from groups
		const sortedGroups = Array.from(this.packetGroups.values());
		sortedGroups.forEach((group) => {
			group.allPackets.forEach((packet) => {
				output.push(this._formatPacketVerbose(packet, true));
			});
		});

		fs.writeFileSync(filename, output.join("\n"), "utf8");

		console.log(`\n✓ Verbose export saved: ${filename}\n`);
		return filename;
	}

	/**
	 * Export packets to optimized storage format (JSON)
	 * Attribute names are minimized to reduce file size
	 * @param {string} filename - Optional filename for export
	 * @returns {string} Path to exported file
	 */
	exportPackets(filename = null) {
		if (!filename) {
			const timestamp = new Date().toISOString().replace(/:/g, "-").split(".")[0];
			filename = path.join(this.outputDir, `nasa_packets_${timestamp}.json`);
		}

		// Collect all packets from groups in chronological order
		const allPackets = [];
		const sortedGroups = Array.from(this.packetGroups.values());
		sortedGroups.forEach((group) => {
			allPackets.push(...group.allPackets);
		});

		// Sort by timestamp
		allPackets.sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));

		// Convert to optimized format with minimized attribute names
		// Key mapping: t=timestamp, s=source, sr=sourceReadable, d=destination, dr=destinationReadable,
		// pt=packetType, ptn=packetTypeName, dt=dataType, dtn=dataTypeName, pn=packetNumber,
		// pv=protocolVersion, rc=retryCount, m=messages, mn=messageNumber, mnh=messageNumberHex,
		// mt=type, mtn=typeName, v=value, rv=readableValue, n=name, rd=rawData, rdh=rawDataHex
		const exportData = {
			v: "1.0", // version
			e: getCurrentTimestamp(), // exportedAt
			tp: this.totalPackets, // totalPackets
			p: allPackets.map((packet) => ({
				t: packet.timestamp,
				s: packet.sa.toString(),
				sr: packet.sa.toReadableString(),
				d: packet.da.toString(),
				dr: packet.da.toReadableString(),
				pt: packet.command.packetType,
				ptn: PacketTypeName[packet.command.packetType] || "Unknown",
				dt: packet.command.dataType,
				dtn: DataTypeName[packet.command.dataType] || "Unknown",
				pn: packet.command.packetNumber,
				pv: packet.command.protocolVersion,
				rc: packet.command.retryCount,
				m: packet.messages.map((msg) => ({
					mn: msg.messageNumber,
					mnh: "0x" + msg.messageNumber.toString(16).padStart(4, "0"),
					mt: msg.type,
					mtn: MessageSetTypeName[msg.type],
					v: msg.value,
					rv: msg.getReadableValue(),
					n: MessageNumberNames[msg.messageNumber] || "UNKNOWN",
				})),
				rd: Array.from(packet.rawData),
				rdh: bufferToHex(packet.rawData, " "),
			})),
		};

		fs.writeFileSync(filename, JSON.stringify(exportData), "utf8");

		console.log(`\n✓ Packets exported: ${filename}`);
		console.log(`  Total packets: ${this.totalPackets}`);
		console.log(`  File size: ${(fs.statSync(filename).size / 1024).toFixed(2)} KB\n`);
		return filename;
	}

	_generateReport() {
		let report = [];

		report.push("═══════════════════════════════════════════════════════════════════════");
		report.push("                    NASA PROTOCOL SNIFFER REPORT");
		report.push("═══════════════════════════════════════════════════════════════════════");
		report.push(`Generated: ${getCurrentTimestamp()}`);
		report.push(`Total Packets Captured: ${this.totalPackets}`);
		report.push(`Unique Packet Types: ${this.packetGroups.size}`);
		report.push("═══════════════════════════════════════════════════════════════════════");
		report.push("");

		// Sort groups by count (most frequent first)
		const sortedGroups = Array.from(this.packetGroups.values()).sort((a, b) => b.count - a.count);

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
			const formatted = this._formatPacketVerbose(group.examplePacket, true);
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

	getStats() {
		return {
			totalPackets: this.totalPackets,
			uniqueTypes: this.packetGroups.size,
			runtime: Math.floor((new Date() - this.startTime) / 1000),
		};
	}

	printStats() {
		const stats = this.getStats();
		console.log(`\n${"═".repeat(75)}`);
		console.log("                    CURRENT STATISTICS");
		console.log(`${"═".repeat(75)}`);
		console.log(`Total Packets Captured: ${stats.totalPackets}`);
		console.log(`Unique Packet Types: ${stats.uniqueTypes}`);
		console.log(`Runtime: ${stats.runtime}s`);
		console.log(`${"═".repeat(75)}\n`);
	}

	/**
	 * Format packet as verbose multi-line output with all details
	 * @param {Packet} packet - The packet to format
	 * @param {boolean} includeRaw - Whether to include raw hex data
	 * @returns {string} Formatted packet string
	 */
	_formatPacketVerbose(packet, includeRaw = true) {
		let output = [];

		output.push("┌─────────────────────────────────────────────────────────────────");
		output.push(`│ Timestamp: ${packet.timestamp}`);
		output.push("├─────────────────────────────────────────────────────────────────");
		output.push(`│ Source:      ${packet.sa.toReadableString()}`);
		output.push(`│ Destination: ${packet.da.toReadableString()}`);
		output.push("├─────────────────────────────────────────────────────────────────");
		output.push(`│ Packet Type: ${PacketTypeName[packet.command.packetType] || "Unknown"}`);
		output.push(`│ Data Type:   ${DataTypeName[packet.command.dataType] || "Unknown"}`);
		output.push(`│ Packet #:    ${packet.command.packetNumber}`);
		output.push(`│ Protocol:    v${packet.command.protocolVersion}`);
		output.push(`│ Retry Count: ${packet.command.retryCount}`);
		output.push("├─────────────────────────────────────────────────────────────────");
		output.push(`│ Messages (${packet.messages.length}):`);

		for (let i = 0; i < packet.messages.length; i++) {
			output.push(`│   ${i + 1}. ${packet.messages[i].toString()}`);
		}

		if (includeRaw) {
			output.push("├─────────────────────────────────────────────────────────────────");
			output.push("│ Raw Packet Data:");
			const hexData = bufferToHex(packet.rawData, " ");
			const chunks = hexData.match(/.{1,48}/g) || [];
			chunks.forEach((chunk) => {
				output.push(`│   ${chunk}`);
			});
		}

		output.push("└─────────────────────────────────────────────────────────────────");
		output.push("");

		return output.join("\n");
	}

	/**
	 * Format packet as compact multi-line output
	 * @param {Packet} packet - The packet to format
	 * @returns {string} Formatted packet string
	 */
	_formatPacketCompact(packet) {
		// Compact multi-line format with all packet information
		const msgDetails = packet.messages
			.map((m) => {
				const name = MessageNumberNames[m.messageNumber] || `0x${m.messageNumber.toString(16)}`;
				const value = m.getReadableValue();
				return `${name}=${value}`;
			})
			.join(", ");

		// Format raw data in space-efficient hex format
		const rawHex = bufferToHex(packet.rawData, " ");

		// Build compact multi-line output
		const lines = [];
		lines.push(`[${packet.timestamp}] ${packet.sa.toReadableString()} → ${packet.da.toReadableString()}`);
		lines.push(
			`  Type: ${PacketTypeName[packet.command.packetType]} | Data: ${DataTypeName[packet.command.dataType]} | Pkt#: ${
				packet.command.packetNumber
			} | Proto: v${packet.command.protocolVersion} | Retry: ${packet.command.retryCount}`,
		);
		lines.push(`  Msgs: ${packet.messages.length} | ${msgDetails}`);
		lines.push(`  Raw: ${rawHex}`);

		return lines.join("\n");
	}

	close() {
		if (this.logStream) {
			this.logStream.end();
		}
	}
}

module.exports = Logger;
