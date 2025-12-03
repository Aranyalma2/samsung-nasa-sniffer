# Samsung NASA Protocol Packet Sniffer

A Samsung NASA protocol packet sniffer with support for both COM port and TCP interfaces, featuring real-time web UI, packet export/import, and advanced graph visualization.

## Features

- **Multiple Interface Support**: COM port (serial) and TCP client
- **Real-time Web UI**: Live packet monitoring with filtering and pagination
- **Flexible Logging**: None, compact, verbose, and report formats
- **Packet Export/Import**: Save packets to optimized JSON format and replay offline
- **Graph Viewer**: Visualize message values over time with multi-source color coding
- **Packet Analysis**: Intelligent grouping and statistics

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```env
# Interface Mode: COM or TCP
INTERFACE_MODE=COM

# COM Port Configuration
COM_PORT=COM7
BAUD_RATE=9600
PARITY=even

# TCP Configuration
TCP_HOST=localhost
TCP_PORT=5000

# Logging
OUTPUT_DIR=./nasa_logs
LOG_FORMAT=compact    # Options: compact, verbose, none

# Web UI
WEB_PORT=8080
```

### Log Format Options

- **`compact`** (default): Multi-line format with all packet details (4 lines per packet)
- **`verbose`**: Full formatted output with complete message details
- **`none`**: Disable file logging (useful for GUI-only monitoring)

## Usage

### CLI Mode (Default)
```bash
npm start
# or
node index.js
```

### GUI Mode (Web Interface)
```bash
npm run gui
# or
node index.js --gui
```

Web UI will be available at `http://localhost:8080`

### View Mode (Offline Packet Replay)
Load and view previously exported packets without connecting to any interface:

```bash
node index.js --view <packet-file.json>
# or
npm run gui -- --view nasa_logs/nasa_packets_2025-11-14.json
```

View mode features:
- Opens web UI in read-only mode
- No live data capture
- Browse exported packet history
- Full filtering and analysis capabilities
- Access to graph viewer

### Keyboard Commands (CLI/GUI Mode)

- **Ctrl+C** - Exit application
- **Ctrl+S** - Save report (grouped statistics)
- **Ctrl+P** - Print statistics to console
- **Ctrl+E** - Export verbose log file
- **Ctrl+X** - Export packets to JSON format

## Interface Modes

### COM Port Mode
Connect directly to a serial port (USB/RS485 adapter):
```env
INTERFACE_MODE=COM
COM_PORT=COM7
BAUD_RATE=9600
PARITY=even
```

### TCP Client Mode
Connect to a TCP server that streams NASA packets:
```env
INTERFACE_MODE=TCP
TCP_HOST=192.168.1.100
TCP_PORT=5000
```

The TCP mode is useful for:
- Remote monitoring
- Network bridges/gateways
- Multiple clients monitoring the same source
- Testing with simulated packet sources

## Logging Formats

### Compact Format (Default)
Compact multi-line format (4 lines per packet) with all packet details:
```
[2025-11-11 17:55:50.123] Indoor(20.00.00) → WiredRemote(50.00.00)
  Type: Normal | Data: Response | Pkt#: 10 | Proto: v2 | Retry: 0
  Msgs: 3 | operation_power=ON, operation_mode=Cool, temp_target_f=22.0°C
  Raw: 32 00 15 20 00 00 50 00 00 C0 11 05 03 40 00 01 40 01 02 42 01 DC FF 7B 34
```

Includes all information: timestamp, addresses, packet type, data type, packet number, protocol version, retry count, messages with values, and raw hex data.

### Verbose Format
Full formatted output with all details and raw hex data. Always logged to file, optionally on console:
```env
LOG_FORMAT=verbose
```

### Report Format
Grouped statistics with example packets. Generated manually with Ctrl+S.

## Web UI Features

### Real-time Packet Display
- Live packet feed with automatic updates
- Configurable pagination (50/100/200/500/1000 packets per page)
- Click to expand/collapse packet details

### Filters
- **Source Address**: Filter by source device address (e.g., `20.00.00` or `Indoor`)
- **Destination Address**: Filter by destination address
- **Data Type**: Filter by packet data type (Read, Write, Request, Response, etc.)
- **Message Name**: Filter by message name (e.g., `temp`, `power`, `0x4000`)
- **Message Value**: Filter by message value
- **Raw Value**: Filter by hexadecimal raw packet data

### Packet Export
Export captured packets to optimized JSON format:
- Press **Ctrl+X** to export
- Minimized attribute names for reduced file size
- Compatible with view mode for offline analysis

### Graph Viewer
Visualize message values over time with advanced charting:
- Access via **"Graphs"** button in main UI
- Create multiple graphs with independent filters
- Support for line, scatter, and bar charts
- Real-time updates with live data
- Color-coded lines for multiple source addresses

#### Graph Features
- **Multi-address filtering**: Comma-separated addresses (e.g., `20.00.00, 20.01.00`)
- **Source separation**: Each source address gets a unique color
- **Message filtering**: Filter by message ID or name
- **Data type filtering**: Filter by packet data type
- **Auto-refresh**: Automatically update graphs with new data
- **Statistics**: Min/Max/Average values displayed
- **Time-series display**: X-axis shows timestamps
- **Interactive tooltips**: Hover to see detailed information

### Statistics
- Total packets captured
- Filtered packets count
- Graphs count (in graph viewer)

### Packet Details
Each packet shows:
- Timestamp
- Source and destination addresses (with readable names)
- Data type badge (color-coded)
- Packet information (type, number, protocol version, retry count)
- All messages with readable values
- Raw hexadecimal data