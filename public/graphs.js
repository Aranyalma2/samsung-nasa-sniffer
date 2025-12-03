// Graph Viewer - Independent Module
// Uses packets from WebSocket as data source

// Color palette for multiple source addresses
const COLOR_PALETTE = [
	"#4fc3f7", // Cyan (default)
	"#81c784", // Green
	"#ffb74d", // Orange
	"#e57373", // Red
	"#ba68c8", // Purple
	"#64b5f6", // Blue
	"#ffd54f", // Yellow
	"#a1887f", // Brown
	"#90a4ae", // Blue Grey
	"#f06292", // Pink
];

// WebSocket connection
let ws = null;
let packets = [];
let isConnected = false;
let viewMode = false;
let autoRefresh = true;

// Graph management
let graphs = [];
let nextGraphId = 1;
let editingGraphId = null;

// DOM elements
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const totalPacketsEl = document.getElementById("totalPackets");
const graphCountEl = document.getElementById("graphCount");
const viewModeBadge = document.getElementById("viewModeBadge");
const graphsContainer = document.getElementById("graphsContainer");

// Toolbar
const addGraphBtn = document.getElementById("addGraphBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const refreshBtn = document.getElementById("refreshBtn");
const autoRefreshCheckbox = document.getElementById("autoRefresh");

// Modal
const graphModal = document.getElementById("graphModal");
const modalTitle = document.getElementById("modalTitle");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelModalBtn = document.getElementById("cancelModalBtn");
const saveGraphBtn = document.getElementById("saveGraphBtn");

// Form fields
const graphTitleInput = document.getElementById("graphTitle");
const filterSourceInput = document.getElementById("filterSource");
const filterDestinationInput = document.getElementById("filterDestination");
const filterDataTypeSelect = document.getElementById("filterDataType");
const filterMessageIdsInput = document.getElementById("filterMessageIds");
const chartTypeSelect = document.getElementById("chartType");
const showPointsCheckbox = document.getElementById("showPoints");

// ====================Connect to WebSocket ====================
function connect() {
	const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
	const wsUrl = `${protocol}//${window.location.host}`;

	ws = new WebSocket(wsUrl);

	ws.onopen = () => {
		isConnected = true;
		statusDot.classList.add("connected");
		statusText.textContent = "Connected";
		console.log("WebSocket connected");
	};

	ws.onclose = () => {
		isConnected = false;
		statusDot.classList.remove("connected");
		statusText.textContent = "Disconnected";
		console.log("WebSocket disconnected");

		// Attempt to reconnect after 2 seconds
		setTimeout(connect, 2000);
	};

	ws.onerror = (error) => {
		console.error("WebSocket error:", error);
	};

	ws.onmessage = (event) => {
		const message = JSON.parse(event.data);

		if (message.type === "init") {
			viewMode = message.viewMode;
			packets = message.packets || [];

			if (viewMode) {
				viewModeBadge.style.display = "block";
			}

			updateStats();
			if (autoRefresh) {
				refreshAllGraphs();
			}
		} else if (message.type === "history") {
			packets = message.packets || [];
			updateStats();
			if (autoRefresh) {
				refreshAllGraphs();
			}
		} else if (message.type === "packet") {
			packets.push(message.data);
			updateStats();
			if (autoRefresh) {
				refreshAllGraphs();
			}
		}
	};
}

// ==================== Stats ====================
function updateStats() {
	totalPacketsEl.textContent = packets.length;
	graphCountEl.textContent = graphs.length;
}

// ==================== Graph Management ====================
function openAddGraphModal() {
	editingGraphId = null;
	modalTitle.textContent = "Add New Graph";

	// Clear form
	graphTitleInput.value = "";
	filterSourceInput.value = "";
	filterDestinationInput.value = "";
	filterDataTypeSelect.value = "";
	filterMessageIdsInput.value = "";
	chartTypeSelect.value = "line";
	showPointsCheckbox.checked = true;

	graphModal.classList.add("open");
}

function openEditGraphModal(graphId) {
	const graph = graphs.find((g) => g.id === graphId);
	if (!graph) return;

	editingGraphId = graphId;
	modalTitle.textContent = "Edit Graph";

	// Fill form
	graphTitleInput.value = graph.config.title;
	filterSourceInput.value = graph.config.filters.source || "";
	filterDestinationInput.value = graph.config.filters.destination || "";
	filterDataTypeSelect.value = graph.config.filters.dataType || "";
	filterMessageIdsInput.value = graph.config.filters.messageIds.join(", ");
	chartTypeSelect.value = graph.config.chartType;
	showPointsCheckbox.checked = graph.config.showPoints;

	graphModal.classList.add("open");
}

function closeModal() {
	graphModal.classList.remove("open");
	editingGraphId = null;
}

function saveGraph() {
	const config = {
		title: graphTitleInput.value.trim() || "Untitled Graph",
		filters: {
			source: filterSourceInput.value.trim(),
			destination: filterDestinationInput.value.trim(),
			dataType: filterDataTypeSelect.value,
			messageIds: filterMessageIdsInput.value
				.split(",")
				.map((id) => id.trim())
				.filter((id) => id.length > 0),
		},
		chartType: chartTypeSelect.value,
		showPoints: showPointsCheckbox.checked,
	};

	if (config.filters.messageIds.length === 0) {
		alert("Please specify at least one message ID");
		return;
	}

	if (editingGraphId) {
		// Update existing graph
		const graph = graphs.find((g) => g.id === editingGraphId);
		if (graph) {
			graph.config = config;

			// Update the card's title and filters in DOM
			const card = document.querySelector(`[data-graph-id="${editingGraphId}"]`);
			if (card) {
				// Update title
				const titleEl = card.querySelector(".graph-title");
				if (titleEl) {
					titleEl.textContent = config.title;
				}

				// Update filter tags
				const filtersEl = card.querySelector(".graph-filters");
				if (filtersEl) {
					const filterTags = [];
					if (config.filters.source) {
						filterTags.push(`Src: ${config.filters.source}`);
					}
					if (config.filters.destination) {
						filterTags.push(`Dst: ${config.filters.destination}`);
					}
					if (config.filters.dataType) {
						filterTags.push(`Type: ${config.filters.dataType}`);
					}
					if (config.filters.messageIds.length > 0) {
						filterTags.push(`Msgs: ${config.filters.messageIds.join(", ")}`);
					}
					filtersEl.innerHTML = filterTags.map((tag) => `<span class="filter-tag">${escapeHtml(tag)}</span>`).join("");
				}
			}

			// Re-render the chart with new config
			renderGraph(graph);
		}
	} else {
		// Create new graph
		const graph = {
			id: nextGraphId++,
			config: config,
			chart: null,
		};
		graphs.push(graph);
		renderGraphCard(graph);
	}

	closeModal();
	updateStats();
}

function deleteGraph(graphId) {
	if (!confirm("Delete this graph?")) return;

	const index = graphs.findIndex((g) => g.id === graphId);
	if (index !== -1) {
		// Destroy chart
		if (graphs[index].chart) {
			graphs[index].chart.destroy();
		}

		// Remove from DOM
		const card = document.querySelector(`[data-graph-id="${graphId}"]`);
		if (card) {
			card.remove();
		}

		// Remove from array
		graphs.splice(index, 1);

		updateStats();
		checkEmptyState();
	}
}

function clearAllGraphs() {
	if (graphs.length === 0) return;
	if (!confirm("Delete all graphs?")) return;

	// Destroy all charts
	graphs.forEach((graph) => {
		if (graph.chart) {
			graph.chart.destroy();
		}
	});

	graphs = [];
	renderAllGraphs();
	updateStats();
}

function refreshAllGraphs() {
	graphs.forEach((graph) => renderGraph(graph));
}

// ==================== Filtering ====================
function filterPackets(filters) {
	return packets.filter((packet) => {
		// Source filter - support comma-separated addresses
		if (filters.source) {
			const sourceAddresses = filters.source
				.split(",")
				.map((s) => s.trim())
				.filter((s) => s.length > 0);
			if (sourceAddresses.length > 0) {
				const hasMatch = sourceAddresses.some(
					(addr) => packet.source.toLowerCase().includes(addr.toLowerCase()) || packet.sourceReadable.toLowerCase().includes(addr.toLowerCase()),
				);
				if (!hasMatch) return false;
			}
		}

		// Destination filter - support comma-separated addresses
		if (filters.destination) {
			const destAddresses = filters.destination
				.split(",")
				.map((s) => s.trim())
				.filter((s) => s.length > 0);
			if (destAddresses.length > 0) {
				const hasMatch = destAddresses.some(
					(addr) =>
						packet.destination.toLowerCase().includes(addr.toLowerCase()) || packet.destinationReadable.toLowerCase().includes(addr.toLowerCase()),
				);
				if (!hasMatch) return false;
			}
		}

		// Data type filter
		if (filters.dataType && packet.dataTypeName !== filters.dataType) {
			return false;
		}

		// Message ID filter
		if (filters.messageIds.length > 0) {
			const hasMatchingMessage = packet.messages.some((msg) => {
				return filters.messageIds.some((filterId) => {
					const filterLower = filterId.toLowerCase();
					const msgName = msg.name.toLowerCase();
					const msgHex = msg.messageNumberHex.toLowerCase();
					const msgNum = msg.messageNumber.toString();

					return msgName.includes(filterLower) || msgHex === filterLower || msgNum === filterId;
				});
			});

			if (!hasMatchingMessage) {
				return false;
			}
		}

		return true;
	});
}

function extractDataPoints(packets, filters) {
	// Group data by source address and message ID
	const dataGroups = {};

	packets.forEach((packet) => {
		const timestamp = new Date(packet.timestamp);
		const sourceAddr = packet.sourceReadable || packet.source;

		packet.messages.forEach((msg) => {
			// Check if this message matches our filter
			const matches = filters.messageIds.some((filterId) => {
				const filterLower = filterId.toLowerCase();
				const msgName = msg.name.toLowerCase();
				const msgHex = msg.messageNumberHex.toLowerCase();
				const msgNum = msg.messageNumber.toString();

				return msgName.includes(filterLower) || msgHex === filterLower || msgNum === filterId;
			});

			if (matches) {
				// Try to extract numeric value
				let value = msg.value;
				if (typeof value === "string") {
					// Try to parse as number
					const parsed = parseFloat(value);
					if (!isNaN(parsed)) {
						value = parsed;
					}
				}

				if (typeof value === "number" && !isNaN(value)) {
					// Create unique key for source + message combination
					const groupKey = `${sourceAddr}|${msg.messageNumberHex}`;

					if (!dataGroups[groupKey]) {
						dataGroups[groupKey] = {
							source: sourceAddr,
							messageId: msg.messageNumberHex,
							messageName: msg.name,
							points: [],
						};
					}

					dataGroups[groupKey].points.push({
						x: timestamp,
						y: value,
						label: msg.name,
						messageId: msg.messageNumberHex,
						source: sourceAddr,
					});
				}
			}
		});
	});

	// Sort points in each group by timestamp
	Object.values(dataGroups).forEach((group) => {
		group.points.sort((a, b) => a.x - b.x);
	});

	return dataGroups;
}

// ==================== Rendering ====================
function checkEmptyState() {
	if (graphs.length === 0) {
		graphsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📈</div>
                <div>No graphs created yet</div>
                <div class="empty-hint">Click "Add Graph" to start visualizing packet data</div>
            </div>
        `;
	}
}

function renderAllGraphs() {
	graphsContainer.innerHTML = "";

	if (graphs.length === 0) {
		checkEmptyState();
		return;
	}

	graphs.forEach((graph) => renderGraphCard(graph));
}

function renderGraphCard(graph) {
	if (graphs.length === 1 && graphsContainer.querySelector(".empty-state")) {
		graphsContainer.innerHTML = "";
	}

	const card = document.createElement("div");
	card.className = "graph-card";
	card.setAttribute("data-graph-id", graph.id);

	// Build filter summary
	const filterTags = [];
	if (graph.config.filters.source) {
		filterTags.push(`Src: ${graph.config.filters.source}`);
	}
	if (graph.config.filters.destination) {
		filterTags.push(`Dst: ${graph.config.filters.destination}`);
	}
	if (graph.config.filters.dataType) {
		filterTags.push(`Type: ${graph.config.filters.dataType}`);
	}
	if (graph.config.filters.messageIds.length > 0) {
		filterTags.push(`Msgs: ${graph.config.filters.messageIds.join(", ")}`);
	}

	card.innerHTML = `
        <div class="graph-header">
            <div class="graph-title">${escapeHtml(graph.config.title)}</div>
            <div class="graph-actions">
                <button class="icon-btn" onclick="refreshGraph(${graph.id})" title="Refresh">Refresh</button>
                <button class="icon-btn" onclick="openEditGraphModal(${graph.id})" title="Edit">Edit</button>
                <button class="icon-btn delete" onclick="deleteGraph(${graph.id})" title="Delete">Delete</button>
            </div>
        </div>
        <div class="graph-filters">
            ${filterTags.map((tag) => `<span class="filter-tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
        <div class="graph-body">
            <div class="graph-canvas-container">
                <canvas id="chart-${graph.id}"></canvas>
            </div>
            <div class="graph-info">
                <span id="info-${graph.id}">Loading...</span>
                <span id="stats-${graph.id}"></span>
            </div>
        </div>
    `;

	graphsContainer.appendChild(card);

	// Render the chart
	setTimeout(() => renderGraph(graph), 100);
}

function renderGraph(graph) {
	const canvas = document.getElementById(`chart-${graph.id}`);
	if (!canvas) return;

	const infoEl = document.getElementById(`info-${graph.id}`);
	const statsEl = document.getElementById(`stats-${graph.id}`);

	// Filter packets
	const filteredPackets = filterPackets(graph.config.filters);
	const dataGroups = extractDataPoints(filteredPackets, graph.config.filters);

	// Convert groups to array and assign colors
	const groupsArray = Object.values(dataGroups);
	const totalPoints = groupsArray.reduce((sum, group) => sum + group.points.length, 0);

	// Update info
	infoEl.textContent = `${totalPoints} data points from ${filteredPackets.length} packets`;

	if (totalPoints > 0) {
		const allValues = groupsArray.flatMap((group) => group.points.map((p) => p.y));
		const min = Math.min(...allValues);
		const max = Math.max(...allValues);
		const avg = allValues.reduce((a, b) => a + b, 0) / allValues.length;
		statsEl.textContent = `Min: ${min.toFixed(2)} | Max: ${max.toFixed(2)} | Avg: ${avg.toFixed(2)}`;
	} else {
		statsEl.textContent = "No data";
	}

	// Destroy existing chart
	if (graph.chart) {
		graph.chart.destroy();
	}

	// Create datasets for each source + message combination
	const datasets = groupsArray.map((group, index) => {
		const color = COLOR_PALETTE[index % COLOR_PALETTE.length];
		const label = groupsArray.length > 1 ? `${group.messageName} [${group.messageId}] from ${group.source}` : `${group.messageName} [${group.messageId}]`;

		// Convert hex color to rgba with transparency
		let bgColor;
		if (color.startsWith("#")) {
			const r = parseInt(color.slice(1, 3), 16);
			const g = parseInt(color.slice(3, 5), 16);
			const b = parseInt(color.slice(5, 7), 16);
			bgColor = `rgba(${r}, ${g}, ${b}, 0.1)`;
		} else {
			bgColor = color;
		}

		return {
			label: label,
			data: group.points,
			borderColor: color,
			backgroundColor: bgColor,
			borderWidth: 2,
			pointRadius: graph.config.showPoints ? 3 : 0,
			pointHoverRadius: 5,
			tension: 0.1,
			fill: false,
		};
	});

	// Create new chart
	const ctx = canvas.getContext("2d");

	const chartConfig = {
		type: graph.config.chartType,
		data: {
			datasets: datasets,
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			animation: false,
			interaction: {
				mode: "nearest",
				axis: "x",
				intersect: false,
			},
			plugins: {
				legend: {
					display: groupsArray.length > 1,
					position: "top",
					labels: {
						color: "#d4d4d4",
						padding: 10,
						font: {
							size: 11,
						},
						usePointStyle: true,
						pointStyle: "circle",
					},
				},
				tooltip: {
					backgroundColor: "#2d2d30",
					titleColor: "#4fc3f7",
					bodyColor: "#d4d4d4",
					borderColor: "#3e3e42",
					borderWidth: 1,
					callbacks: {
						title: function (context) {
							const point = context[0].raw;
							return point.x.toLocaleString();
						},
						label: function (context) {
							const point = context.raw;
							return [`Source: ${point.source}`, `${point.label} [${point.messageId}]`, `Value: ${point.y}`];
						},
					},
				},
			},
			scales: {
				x: {
					type: "time",
					time: {
						displayFormats: {
							millisecond: "HH:mm:ss.SSS",
							second: "HH:mm:ss",
							minute: "HH:mm",
							hour: "HH:mm",
						},
					},
					ticks: {
						color: "#858585",
					},
					grid: {
						color: "#3e3e42",
					},
				},
				y: {
					beginAtZero: false,
					ticks: {
						color: "#858585",
					},
					grid: {
						color: "#3e3e42",
					},
				},
			},
		},
	};

	graph.chart = new Chart(ctx, chartConfig);
}

function refreshGraph(graphId) {
	const graph = graphs.find((g) => g.id === graphId);
	if (graph) {
		renderGraph(graph);
	}
}

// ==================== Utility ====================
function escapeHtml(text) {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}

// ==================== Event Listeners ====================
addGraphBtn.addEventListener("click", openAddGraphModal);
clearAllBtn.addEventListener("click", clearAllGraphs);
refreshBtn.addEventListener("click", refreshAllGraphs);

autoRefreshCheckbox.addEventListener("change", (e) => {
	autoRefresh = e.target.checked;
});

closeModalBtn.addEventListener("click", closeModal);
cancelModalBtn.addEventListener("click", closeModal);
saveGraphBtn.addEventListener("click", saveGraph);

// Close modal on outside click
graphModal.addEventListener("click", (e) => {
	if (e.target === graphModal) {
		closeModal();
	}
});

// ==================== Initialize ====================
connect();
checkEmptyState();
