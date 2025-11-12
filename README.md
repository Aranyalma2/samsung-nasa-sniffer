# Samsung NASA Protocol Packet Sniffer

A Samsung NASA protocol packet sniffer with support for both COM port and TCP interfaces, featuring real-time web UI and multiple logging formats.

## Features

- **Multiple Interface Support**: COM port (serial) and TCP client
- **Real-time Web UI**: Live packet monitoring with filtering
- **Flexible Logging**: None, compact, verbose, and report formats
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
LOG_FORMAT=compact

# Web UI
WEB_PORT=8080
```

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

### Keyboard Commands

- **Ctrl+C** - Exit
- **Ctrl+S** - Save report
- **Ctrl+P** - Print statistics
- **Ctrl+E** - Export verbose log

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
Grouped statistics with example packets. Generated manually:
- Ctrl+S to save report

## Web UI Features

### Real-time Packet Display
- Live packet feed with automatic updates
- Click to expand/collapse packet details

### Filters
- **Source Address**: Filter by source device address (e.g., `20.00.00` or `Indoor`)
- **Destination Address**: Filter by destination address
- **Data Type**: Filter by packet data type (Read, Write, Request, Response, etc.)
- **Message Name**: Filter by message name (e.g., `temp`, `power`, `0x4000`)
- **Message Value**: Filter by message value
- **Raw Value**: Filter by hexadecimal raw packet data

### Statistics
- Total packets captured
- Filtered packets count

### Packet Details
Each packet shows:
- Timestamp
- Source and destination addresses (with readable names)
- Data type badge (color-coded)
- Packet information (type, number, protocol version, retry count)
- All messages with readable values
- Raw hexadecimal data