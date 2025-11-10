# NASA Protocol Sniffer - with GUI Mode

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

When GUI mode is enabled:
- Web interface will be available at `http://localhost:8080`
- WebSocket server runs on the same port for real-time updates
- All packet data is broadcasted to connected browsers in real-time

## GUI Features

### Real-time Packet Display
- Live packet feed with automatic updates
- Beautiful card-based interface
- Click to expand/collapse packet details
- Shows last 100 packets for performance

### Filters
- **Source Address**: Filter by source device address (e.g., `20.00.00` or `Indoor`)
- **Destination Address**: Filter by destination address
- **Data Type**: Filter by packet data type (Read, Write, Request, Response, etc.)
- **Message Name**: Filter by message name (e.g., `temp`, `power`, `mode`)
- **Raw Value**: Filter by hexadecimal raw packet data

### Statistics
- Total packets captured
- Filtered packets count
- Real-time packets per second rate

### Packet Details
Each packet shows:
- Timestamp
- Source and destination addresses (with readable names)
- Data type badge (color-coded)
- Packet information (type, number, protocol version, retry count)
- All messages with readable values
- Raw hexadecimal data

## Configuration

Environment variables (create a `.env` file):
```
COM_PORT=COM7
BAUD_RATE=9600
PARITY=even
OUTPUT_DIR=./nasa_logs
WEB_PORT=8080
```

## Architecture

The GUI mode is completely independent from the CLI application:
- `index.js` - Main sniffer with optional WebSocket integration
- `websocket-server.js` - WebSocket server and HTTP server for static files
- `public/index.html` - Web interface
- `public/app.js` - Client-side JavaScript for real-time updates and filtering

The WebSocket server serves both static files and WebSocket connections on the same port.
