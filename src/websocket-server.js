const WebSocket = require("ws");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { PacketTypeName, DataTypeName, MessageSetTypeName, MessageNumberNames } = require("./packet-decoder");

class WebSocketServer {
	constructor(port = 8080) {
		this.port = port;
		this.clients = new Set();
		this.packetHistory = [];
		this.maxHistory = 1000; // Keep last 1000 packets

		// Create HTTP server for serving static files
		this.httpServer = http.createServer((req, res) => {
			this.handleHttpRequest(req, res);
		});

		// Create WebSocket server
		this.wss = new WebSocket.Server({ server: this.httpServer });

		this.wss.on("connection", (ws) => {
			console.log("New WebSocket client connected");
			this.clients.add(ws);

			// Send packet history to new client
			ws.send(
				JSON.stringify({
					type: "history",
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
				console.log("         NASA PROTOCOL SNIFFER - WEB UI ENABLED");
				console.log(`${"═".repeat(75)}`);
				console.log(`Web UI available at: http://localhost:${this.port}`);
				console.log(`WebSocket server running on port ${this.port}`);
				console.log(`${"═".repeat(75)}\n`);
				resolve();
			});
		});
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
