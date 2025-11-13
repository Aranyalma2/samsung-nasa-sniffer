// WebSocket connection
let ws = null;
let packets = [];
let filteredPackets = [];
let isConnected = false;
let isPaused = false;
let selectedPacketTimestamp = null; // Track by timestamp instead of index
let viewMode = false; // View mode flag

// Pagination
let currentPage = 1;
let packetsPerPage = 500;

// DOM elements
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const totalPacketsEl = document.getElementById('totalPackets');
const filteredPacketsEl = document.getElementById('filteredPackets');
const packetListEl = document.getElementById('packetList');
const detailsPanel = document.getElementById('detailsPanel');
const detailsContent = document.getElementById('detailsContent');
const viewModeBadge = document.getElementById('viewModeBadge');
const packetsPerPageEl = document.getElementById('packetsPerPage');

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

// Pagination elements
const firstPageBtn = document.getElementById('firstPage');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const lastPageBtn = document.getElementById('lastPage');
const pageInfoEl = document.getElementById('pageInfo');

const firstPageBottomBtn = document.getElementById('firstPageBottom');
const prevPageBottomBtn = document.getElementById('prevPageBottom');
const nextPageBottomBtn = document.getElementById('nextPageBottom');
const lastPageBottomBtn = document.getElementById('lastPageBottom');
const pageInfoBottomEl = document.getElementById('pageInfoBottom');

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
        
        if (message.type === 'init') {
            // Initialize with view mode status and history
            viewMode = message.viewMode;
            packets = message.packets || [];
            
            // Update UI for view mode
            if (viewMode) {
                viewModeBadge.style.display = 'block';
                pauseBtn.disabled = true;
                pauseBtn.style.opacity = '0.5';
                pauseBtn.style.cursor = 'not-allowed';
                clearPacketsBtn.disabled = true;
                clearPacketsBtn.style.opacity = '0.5';
                clearPacketsBtn.style.cursor = 'not-allowed';
            }
            
            applyFilters();
        } else if (message.type === 'history') {
            // Legacy support - Load historical packets
            packets = message.packets;
            applyFilters();
        } else if (message.type === 'packet') {
            // Add new packet (backend always logs, even when UI is paused)
            packets.push(message.data);
            
            // Only update UI if not paused and not in view mode
            if (!isPaused && !viewMode) {
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
    
    // Calculate pagination
    const perPage = packetsPerPage === 'all' ? filteredPackets.length : parseInt(packetsPerPage);
    const totalPages = perPage > 0 ? Math.max(1, Math.ceil(filteredPackets.length / perPage)) : 1;
    
    // Adjust current page if needed
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    if (currentPage < 1) {
        currentPage = 1;
    }
    
    // Get packets for current page (newest first)
    const reversedPackets = [...filteredPackets].reverse();
    const startIdx = (currentPage - 1) * perPage;
    const endIdx = packetsPerPage === 'all' ? reversedPackets.length : startIdx + perPage;
    const packetsToShow = reversedPackets.slice(startIdx, endIdx);
    
    // Update pagination info
    const pageText = `Page ${currentPage} of ${totalPages}`;
    pageInfoEl.textContent = pageText;
    pageInfoBottomEl.textContent = pageText;
    
    // Enable/disable pagination buttons
    const enableFirst = currentPage > 1;
    const enableLast = currentPage < totalPages;
    
    firstPageBtn.disabled = !enableFirst;
    prevPageBtn.disabled = !enableFirst;
    nextPageBtn.disabled = !enableLast;
    lastPageBtn.disabled = !enableLast;
    
    firstPageBottomBtn.disabled = !enableFirst;
    prevPageBottomBtn.disabled = !enableFirst;
    nextPageBottomBtn.disabled = !enableLast;
    lastPageBottomBtn.disabled = !enableLast;
    
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
filterSource.addEventListener('input', () => { currentPage = 1; applyFilters(); });
filterDestination.addEventListener('input', () => { currentPage = 1; applyFilters(); });
filterDataType.addEventListener('change', () => { currentPage = 1; applyFilters(); });
filterMessageName.addEventListener('input', () => { currentPage = 1; applyFilters(); });
filterMessageValue.addEventListener('input', () => { currentPage = 1; applyFilters(); });
filterRawValue.addEventListener('input', () => { currentPage = 1; applyFilters(); });

packetsPerPageEl.addEventListener('change', (e) => {
    packetsPerPage = e.target.value;
    currentPage = 1;
    applyFilters();
});

// Pagination controls
firstPageBtn.addEventListener('click', () => { currentPage = 1; updateUI(); });
prevPageBtn.addEventListener('click', () => { currentPage = Math.max(1, currentPage - 1); updateUI(); });
nextPageBtn.addEventListener('click', () => { currentPage++; updateUI(); });
lastPageBtn.addEventListener('click', () => {
    const perPage = packetsPerPage === 'all' ? filteredPackets.length : parseInt(packetsPerPage);
    const totalPages = Math.max(1, Math.ceil(filteredPackets.length / perPage));
    currentPage = totalPages;
    updateUI();
});

firstPageBottomBtn.addEventListener('click', () => { currentPage = 1; updateUI(); });
prevPageBottomBtn.addEventListener('click', () => { currentPage = Math.max(1, currentPage - 1); updateUI(); });
nextPageBottomBtn.addEventListener('click', () => { currentPage++; updateUI(); });
lastPageBottomBtn.addEventListener('click', () => {
    const perPage = packetsPerPage === 'all' ? filteredPackets.length : parseInt(packetsPerPage);
    const totalPages = Math.max(1, Math.ceil(filteredPackets.length / perPage));
    currentPage = totalPages;
    updateUI();
});

clearFiltersBtn.addEventListener('click', () => {
    filterSource.value = '';
    filterDestination.value = '';
    filterDataType.value = '';
    filterMessageName.value = '';
    filterMessageValue.value = '';
    filterRawValue.value = '';
    currentPage = 1;
    applyFilters();
});

clearPacketsBtn.addEventListener('click', () => {
    if (viewMode) return; // Disabled in view mode
    
    if (confirm('Clear all packets from the display?')) {
        packets = [];
        selectedPacketTimestamp = null;
        currentPage = 1;
        applyFilters();
        detailsPanel.classList.remove('open');
        toggleDetailsBtn.textContent = 'Details ▶';
    }
});

pauseBtn.addEventListener('click', () => {
    if (viewMode) return; // Disabled in view mode
    
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
