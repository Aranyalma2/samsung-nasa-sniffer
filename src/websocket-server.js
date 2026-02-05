const WebSocket = require("ws");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { PacketTypeName, DataTypeName, MessageSetTypeName, MessageNumberNames, AddressClassName } = require("./packet-decoder");

class WebSocketServer {
	constructor(port = 8080, viewMode = false) {
		this.port = port;
		this.clients = new Set();
		this.packetHistory = [];
		this.maxHistory = 10000; // Keep last 10000 packets
		this.viewMode = viewMode; // View mode flag

		// Create HTTP server for serving static files
		this.httpServer = http.createServer((req, res) => {
			this.handleHttpRequest(req, res);
		});

		// Create WebSocket server
		this.wss = new WebSocket.Server({ server: this.httpServer });

		this.wss.on("connection", (ws) => {
			console.log("New WebSocket client connected");
			this.clients.add(ws);

			// Send view mode status and packet history to new client
			ws.send(
				JSON.stringify({
					type: "init",
					viewMode: this.viewMode,
					packets: this.packetHistory,
				}),
			);

			ws.on("close", () => {
				console.log("WebSocket client disconnected");
				this.clients.delete(ws);
			});

			ws.on("error", (error) => {
				console.error("WebSocket error:", error);
				this.clients.delete(ws);
			});
		});
	}

	handleHttpRequest(req, res) {
		let filePath = req.url === "/" ? "/index.html" : req.url;
		filePath = path.join(__dirname, "../public", filePath);

		const extname = path.extname(filePath);
		const contentTypes = {
			".html": "text/html",
			".js": "text/javascript",
			".css": "text/css",
		};

		const contentType = contentTypes[extname] || "application/octet-stream";

		fs.readFile(filePath, (error, content) => {
			if (error) {
				if (error.code === "ENOENT") {
					res.writeHead(404);
					res.end("404 - File Not Found");
				} else {
					res.writeHead(500);
					res.end("500 - Internal Server Error");
				}
			} else {
				res.writeHead(200, { "Content-Type": contentType });
				res.end(content, "utf-8");
			}
		});
	}

	start() {
		return new Promise((resolve) => {
			this.httpServer.listen(this.port, () => {
				console.log(`\n${"═".repeat(75)}`);
				if (this.viewMode) {
					console.log("         NASA PROTOCOL SNIFFER - VIEW MODE");
				} else {
					console.log("         NASA PROTOCOL SNIFFER - WEB UI ENABLED");
				}
				console.log(`${"═".repeat(75)}`);
				console.log(`Web UI available at: http://localhost:${this.port}`);
				console.log(`WebSocket server running on port ${this.port}`);
				if (this.viewMode) {
					console.log(`View Mode: Read-only packet replay`);
				}
				console.log(`${"═".repeat(75)}\n`);
				resolve();
			});
		});
	}

	/**
	 * Load packets from exported file and add to history
	 * Expands minimized attribute names to full format for UI
	 * Resolves names from decoder const objects dynamically
	 * @param {string} filename - Path to exported packets file
	 */
	loadPacketsFromFile(filename) {
		try {
			const fileContent = fs.readFileSync(filename, "utf8");
			const exportData = JSON.parse(fileContent);

			// Check for both old (full names) and new (minimized) format
			const version = exportData.version || exportData.v;
			const packets = exportData.packets || exportData.p;
			const exportedAt = exportData.exportedAt || exportData.e;

			if (!version || !packets) {
				throw new Error("Invalid packet file format");
			}

			// Helper to format address as readable string
			const formatAddressReadable = (klass, channel, address) => {
				const className = AddressClassName[klass] || "Unknown";
				const hex = (n) => n.toString(16).padStart(2, "0").toUpperCase();
				return `${className}(${hex(klass)}.${hex(channel)}.${hex(address)})`;
			};

			// Helper to format address as hex string
			const formatAddress = (klass, channel, address) => {
				const hex = (n) => n.toString(16).padStart(2, "0").toUpperCase();
				return `${hex(klass)}.${hex(channel)}.${hex(address)}`;
			};

			// Helper to format raw data as hex
			const formatRawDataHex = (rawData) => {
				if (!rawData) return "";
				return rawData.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");
			};

			// Expand minimized attribute names and resolve names from decoder
			this.packetHistory = packets.map((p) => {
				// Handle both v2.0 (new format) and v1.0 (old format)
				const isV2 = version === "2.0";

				// Extract address components
				let sourceClass, sourceChannel, sourceAddress;
				let destClass, destChannel, destAddress;

				if (isV2) {
					// v2.0: separate components
					sourceClass = p.sc;
					sourceChannel = p.sch;
					sourceAddress = p.sa;
					destClass = p.dc;
					destChannel = p.dch;
					destAddress = p.da;
				} else {
					// v1.0: parse from string format
					const sourceStr = p.source || p.s || "00.00.00";
					const destStr = p.destination || p.d || "00.00.00";
					const sParts = sourceStr.split(".").map((s) => parseInt(s, 16));
					const dParts = destStr.split(".").map((s) => parseInt(s, 16));
					sourceClass = sParts[0] || 0;
					sourceChannel = sParts[1] || 0;
					sourceAddress = sParts[2] || 0;
					destClass = dParts[0] || 0;
					destChannel = dParts[1] || 0;
					destAddress = dParts[2] || 0;
				}

				const packetType = p.packetType !== undefined ? p.packetType : p.pt;
				const dataType = p.dataType !== undefined ? p.dataType : p.dt;
				const rawData = p.rawData || p.rd;

				return {
					timestamp: p.timestamp || p.t,
					source: formatAddress(sourceClass, sourceChannel, sourceAddress),
					sourceReadable: formatAddressReadable(sourceClass, sourceChannel, sourceAddress),
					destination: formatAddress(destClass, destChannel, destAddress),
					destinationReadable: formatAddressReadable(destClass, destChannel, destAddress),
					packetType,
					packetTypeName: PacketTypeName[packetType] || "Unknown",
					dataType,
					dataTypeName: DataTypeName[dataType] || "Unknown",
					packetNumber: p.packetNumber !== undefined ? p.packetNumber : p.pn,
					protocolVersion: p.protocolVersion !== undefined ? p.protocolVersion : p.pv,
					retryCount: p.retryCount !== undefined ? p.retryCount : p.rc,
					messages: (p.messages || p.m || []).map((m) => {
						const messageNumber = m.messageNumber !== undefined ? m.messageNumber : m.mn;
						const messageType = m.type !== undefined ? m.type : m.mt;
						const value = m.value !== undefined ? m.value : m.v;

						// Resolve names from decoder
						const messageName = MessageNumberNames[messageNumber] || "UNKNOWN";
						const messageTypeName = MessageSetTypeName[messageType] || "Unknown";

						// Calculate readable value (simplified version of MessageSet.getReadableValue)
						let readableValue;
						if (m.readableValue || m.rv) {
							// Use stored readable value if available (v1.0 format)
							readableValue = m.readableValue || m.rv;
						} else {
							// Generate readable value
							if (messageName && messageName.toLowerCase().includes("temp")) {
								readableValue = `${(value / 10.0).toFixed(1)}°C`;
							} else if (messageName && messageName.toLowerCase().includes("power")) {
								readableValue = value ? "ON" : "OFF";
							} else if (messageNumber === 0x4001) {
								const modes = ["Auto", "Cool", "Dry", "Fan", "Heat"];
								readableValue = modes[value] || `Unknown(${value})`;
							} else if (messageNumber === 0x4006 || messageNumber === 0x4007) {
								const fans = ["Auto", "Low", "Mid", "High", "Turbo"];
								readableValue = fans[value] || `Unknown(${value})`;
							} else {
								readableValue = value.toString();
							}
						}

						return {
							messageNumber,
							messageNumberHex: "0x" + messageNumber.toString(16).padStart(4, "0"),
							type: messageType,
							typeName: messageTypeName,
							value,
							readableValue,
							name: messageName,
						};
					}),
					rawData,
					rawDataHex: formatRawDataHex(rawData),
				};
			});

			console.log(`✓ Loaded ${this.packetHistory.length} packets from ${filename}`);
			console.log(`  Format version: ${version}`);
			console.log(`  Exported at: ${exportedAt}`);

			return this.packetHistory.length;
		} catch (error) {
			throw new Error(`Failed to load packet file: ${error.message}`);
		}
	}

	broadcastPacket(packet) {
		// Convert packet to JSON-friendly format
		const packetData = {
			timestamp: packet.timestamp,
			source: packet.sa.toString(),
			sourceReadable: packet.sa.toReadableString(),
			destination: packet.da.toString(),
			destinationReadable: packet.da.toReadableString(),
			packetType: packet.command.packetType,
			packetTypeName: PacketTypeName[packet.command.packetType] || "Unknown",
			dataType: packet.command.dataType,
			dataTypeName: DataTypeName[packet.command.dataType] || "Unknown",
			packetNumber: packet.command.packetNumber,
			protocolVersion: packet.command.protocolVersion,
			retryCount: packet.command.retryCount,
			messages: packet.messages.map((msg) => ({
				messageNumber: msg.messageNumber,
				messageNumberHex: "0x" + msg.messageNumber.toString(16).padStart(4, "0"),
				type: msg.type,
				typeName: MessageSetTypeName[msg.type],
				value: msg.value,
				readableValue: msg.getReadableValue(),
				name: MessageNumberNames[msg.messageNumber] || "UNKNOWN",
			})),
			rawData: Array.from(packet.rawData),
			rawDataHex: Array.from(packet.rawData)
				.map((b) => b.toString(16).padStart(2, "0").toUpperCase())
				.join(" "),
		};

		// Add to history
		this.packetHistory.push(packetData);
		if (this.packetHistory.length > this.maxHistory) {
			this.packetHistory.shift();
		}

		// Broadcast to all connected clients
		const message = JSON.stringify({
			type: "packet",
			data: packetData,
		});

		this.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(message);
			}
		});
	}

	close() {
		return new Promise((resolve) => {
			// Force close all client connections first
			this.clients.forEach((client) => {
				try {
					client.terminate();
				} catch (e) {
					// Ignore errors during termination
				}
			});
			this.clients.clear();

			// Close WebSocket server
			this.wss.close(() => {
				// Force close the HTTP server with a timeout
				this.httpServer.close(() => {
					console.log("✓ WebSocket server closed");
					resolve();
				});

				// Force close after 1 second if not closed gracefully
				setTimeout(() => {
					// Destroy all remaining connections
					this.httpServer.closeAllConnections?.();
					console.log("✓ WebSocket server force closed");
					resolve();
				}, 1000);
			});
		});
	}
}

module.exports = WebSocketServer;
