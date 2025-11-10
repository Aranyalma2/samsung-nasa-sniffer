// WebSocket connection
let ws = null;
let packets = [];
let filteredPackets = [];
let isConnected = false;
let isPaused = false;
let selectedPacketTimestamp = null; // Track by timestamp instead of index

// DOM elements
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const totalPacketsEl = document.getElementById('totalPackets');
const filteredPacketsEl = document.getElementById('filteredPackets');
const packetListEl = document.getElementById('packetList');
const detailsPanel = document.getElementById('detailsPanel');
const detailsContent = document.getElementById('detailsContent');

// Filter elements
const filterSource = document.getElementById('filterSource');
const filterDestination = document.getElementById('filterDestination');
const filterDataType = document.getElementById('filterDataType');
const filterMessageName = document.getElementById('filterMessageName');
const filterMessageValue = document.getElementById('filterMessageValue');
const filterRawValue = document.getElementById('filterRawValue');
const clearFiltersBtn = document.getElementById('clearFilters');
const clearPacketsBtn = document.getElementById('clearPackets');
const pauseBtn = document.getElementById('pauseBtn');
const toggleDetailsBtn = document.getElementById('toggleDetails');
const closeDetailsBtn = document.getElementById('closeDetails');

// Connect to WebSocket
function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        isConnected = true;
        statusDot.classList.add('connected');
        statusText.textContent = 'Connected';
        console.log('WebSocket connected');
    };
    
    ws.onclose = () => {
        isConnected = false;
        statusDot.classList.remove('connected');
        statusText.textContent = 'Disconnected';
        console.log('WebSocket disconnected');
        
        // Attempt to reconnect after 2 seconds
        setTimeout(connect, 2000);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        if (message.type === 'history') {
            // Load historical packets
            packets = message.packets;
            applyFilters();
        } else if (message.type === 'packet') {
            // Add new packet (backend always logs, even when UI is paused)
            packets.push(message.data);
            
            // Only update UI if not paused
            if (!isPaused) {
                applyFilters();
            }
        }
    };
}

// Apply filters
function applyFilters() {
    const sourceFilter = filterSource.value.toLowerCase().trim();
    const destFilter = filterDestination.value.toLowerCase().trim();
    const dataTypeFilter = filterDataType.value;
    const msgNameFilter = filterMessageName.value.toLowerCase().trim();
    const msgValueFilter = filterMessageValue.value.toLowerCase().trim();
    const rawValueFilter = filterRawValue.value.toLowerCase().trim();
    
    filteredPackets = packets.filter(packet => {
        // Source filter
        if (sourceFilter && !packet.source.toLowerCase().includes(sourceFilter) && 
            !packet.sourceReadable.toLowerCase().includes(sourceFilter)) {
            return false;
        }
        
        // Destination filter
        if (destFilter && !packet.destination.toLowerCase().includes(destFilter) && 
            !packet.destinationReadable.toLowerCase().includes(destFilter)) {
            return false;
        }
        
        // Data type filter
        if (dataTypeFilter && packet.dataTypeName !== dataTypeFilter) {
            return false;
        }
        
        // Message name filter (supports both name and hex like 0x4000)
        if (msgNameFilter) {
            const hasMatchingMessage = packet.messages.some(msg => {
                const nameMatch = msg.name.toLowerCase().includes(msgNameFilter);
                const hexMatch = msg.messageNumberHex.toLowerCase().includes(msgNameFilter);
                return nameMatch || hexMatch;
            });
            if (!hasMatchingMessage) {
                return false;
            }
        }
        
        // Message value filter
        if (msgValueFilter) {
            const hasMatchingValue = packet.messages.some(msg => {
                const readableValueMatch = msg.readableValue.toLowerCase().includes(msgValueFilter);
                const rawValueMatch = msg.value.toString().toLowerCase().includes(msgValueFilter);
                return readableValueMatch || rawValueMatch;
            });
            if (!hasMatchingValue) {
                return false;
            }
        }
        
        // Raw value filter
        if (rawValueFilter) {
            if (!packet.rawDataHex.toLowerCase().includes(rawValueFilter)) {
                return false;
            }
        }
        
        return true;
    });
    
    updateUI();
}

// Update UI
function updateUI() {
    totalPacketsEl.textContent = packets.length;
    filteredPacketsEl.textContent = filteredPackets.length;
    
    // Render packets (show last 500 for performance, single line each)
    const packetsToShow = filteredPackets.slice(-500).reverse();
    
    if (packetsToShow.length === 0) {
        packetListEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <div>No packets match the filters</div>
            </div>
        `;
        selectedPacketTimestamp = null;
        return;
    }
    
    packetListEl.innerHTML = packetsToShow.map((packet, index) => 
        createPacketElement(packet, index, packet.timestamp === selectedPacketTimestamp)
    ).join('');
    
    // Add click handlers
    document.querySelectorAll('.packet-item').forEach((el, index) => {
        el.addEventListener('click', () => {
            // Remove previous selection
            document.querySelectorAll('.packet-item').forEach(item => item.classList.remove('selected'));
            
            // Select this item
            el.classList.add('selected');
            selectedPacketTimestamp = packetsToShow[index].timestamp;
            
            // Show details panel
            showPacketDetails(packetsToShow[index]);
        });
    });
}

// Create packet element (single line)
function createPacketElement(packet, index, isSelected) {
    const badgeClass = `badge-${packet.dataTypeName.toLowerCase()}`;
    const time = packet.timestamp.split(' ')[1]; // Show only time part
    const selectedClass = isSelected ? ' selected' : '';
    
    // Create message summary
    const msgSummary = packet.messages.length > 0 
        ? packet.messages.map(m => m.name.split('_').pop()).join(', ').substring(0, 30)
        : 'no messages';
    
    return `
        <div class="packet-item${selectedClass}" data-index="${index}">
            <span class="packet-time">${time}</span>
            <span class="packet-badge ${badgeClass}">${packet.dataTypeName}</span>
            <span class="packet-flow">${packet.sourceReadable}<span class="packet-arrow">→</span>${packet.destinationReadable}</span>
            <span class="packet-msgs">(${packet.messages.length}) ${msgSummary}</span>
        </div>
    `;
}

// Show packet details in panel
function showPacketDetails(packet) {
    detailsPanel.classList.add('open');
    toggleDetailsBtn.textContent = 'Details ◀';
    
    detailsContent.innerHTML = `
        <div class="detail-section">
            <div class="section-title">Connection</div>
            <div class="detail-row">
                <div class="detail-label">Timestamp:</div>
                <div class="detail-value">${packet.timestamp}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Source:</div>
                <div class="detail-value">${packet.sourceReadable} (${packet.source})</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Destination:</div>
                <div class="detail-value">${packet.destinationReadable} (${packet.destination})</div>
            </div>
        </div>
        
        <div class="detail-section">
            <div class="section-title">Packet Info</div>
            <div class="detail-row">
                <div class="detail-label">Packet Type:</div>
                <div class="detail-value">${packet.packetTypeName}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Data Type:</div>
                <div class="detail-value">${packet.dataTypeName}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Packet Number:</div>
                <div class="detail-value">${packet.packetNumber}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Protocol Version:</div>
                <div class="detail-value">v${packet.protocolVersion}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Retry Count:</div>
                <div class="detail-value">${packet.retryCount}</div>
            </div>
        </div>
        
        <div class="detail-section">
            <div class="section-title">Messages (${packet.messages.length})</div>
            <div class="message-list">
                ${packet.messages.map(msg => `
                    <div class="message-item">
                        <div><span class="message-name">${msg.name}</span> [${msg.messageNumberHex}]</div>
                        <div>Type: ${msg.typeName} | Value: <span class="message-value">${msg.readableValue}</span> (raw: ${msg.value})</div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="detail-section">
            <div class="section-title">Raw Data (${packet.rawData.length} bytes)</div>
            <div class="raw-data">${packet.rawDataHex}</div>
        </div>
    `;
}

// Event listeners
filterSource.addEventListener('input', applyFilters);
filterDestination.addEventListener('input', applyFilters);
filterDataType.addEventListener('change', applyFilters);
filterMessageName.addEventListener('input', applyFilters);
filterMessageValue.addEventListener('input', applyFilters);
filterRawValue.addEventListener('input', applyFilters);

clearFiltersBtn.addEventListener('click', () => {
    filterSource.value = '';
    filterDestination.value = '';
    filterDataType.value = '';
    filterMessageName.value = '';
    filterMessageValue.value = '';
    filterRawValue.value = '';
    applyFilters();
});

clearPacketsBtn.addEventListener('click', () => {
    if (confirm('Clear all packets from the display?')) {
        packets = [];
        selectedPacketTimestamp = null;
        applyFilters();
        detailsPanel.classList.remove('open');
        toggleDetailsBtn.textContent = 'Details ▶';
    }
});

pauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    if (isPaused) {
        pauseBtn.textContent = '▶ Resume';
        pauseBtn.classList.add('paused');
    } else {
        pauseBtn.textContent = '⏸ Pause';
        pauseBtn.classList.remove('paused');
        // Update UI with any packets received while paused
        applyFilters();
    }
});

toggleDetailsBtn.addEventListener('click', () => {
    if (detailsPanel.classList.contains('open')) {
        detailsPanel.classList.remove('open');
        toggleDetailsBtn.textContent = 'Details ▶';
    } else {
        detailsPanel.classList.add('open');
        toggleDetailsBtn.textContent = 'Details ◀';
    }
});

closeDetailsBtn.addEventListener('click', () => {
    detailsPanel.classList.remove('open');
    toggleDetailsBtn.textContent = 'Details ▶';
    selectedPacketTimestamp = null;
    document.querySelectorAll('.packet-item').forEach(item => item.classList.remove('selected'));
});

// Connect on load
connect();
