// --- CONFIGURATION: THE PITCH ---
const strategyDescriptions = {
  // Matches the filename category determined by Python
  "Trend Continuation":
    "A low-drawdown Trend Continuation strategy. It identifies established market direction and enters on pullbacks, ensuring high-probability entries with tight risk management. Ideal for long-term capital preservation.",

  // Matches the other filename category
  "Trendline Scalper":
    "A high-frequency Scalping strategy targeting 5.0x ATR zones. Utilizes RSI filtering to catch rapid reversals and short-term corrections in volatile markets.",

  // Fallback description
  default:
    "Algorithmic trading system utilizing technical indicators for optimal market entry.",
};

document.addEventListener("DOMContentLoaded", () => {
  const strategyContainer = document.getElementById("strategy-container");

  // 1. Safety Check: Only run this logic if we are on the Strategy Page
  if (!strategyContainer) return;

  // 2. Detect which strategy category was clicked
  const urlParams = new URLSearchParams(window.location.search);
  const selectedCategory = urlParams.get("type"); // e.g., "Trendline Scalper"

  // Redirect to home if someone accesses this page directly without a type
  if (!selectedCategory) {
    window.location.href = "index.html";
    return;
  }

  // 3. Fetch Data
  fetch("data.json")
    .then((response) => response.json())
    .then((data) => {
      // Filter data for the specific category
      const filteredData = data.filter(
        (item) => item.category === selectedCategory
      );
      setupStrategyPage(selectedCategory, filteredData);
    })
    .catch((error) => console.error("Error loading data:", error));
});

function setupStrategyPage(categoryName, strategies) {
  // Update Page Header
  document.getElementById("strategy-name").innerText = categoryName;
  document.getElementById("strategy-desc").innerText =
    strategyDescriptions[categoryName] || strategyDescriptions["default"];

  // Variables for Totals
  let totalProfit = 0;
  let totalBalance = 0;

  const container = document.getElementById("strategy-container");
  container.innerHTML = "";

  // Handle empty data
  if (strategies.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #6b7280;">
            <h3>No active bots found for this category.</h3>
            <p>Please check your parser.py categorization rules.</p>
        </div>`;
    return;
  }

  strategies.forEach((strategy, index) => {
    // 1. Parse Numbers (Remove '$' and ',' for math)
    let profitNum = parseFloat(
      strategy.stats.net_profit.replace(/[^0-9.-]+/g, "")
    );
    let balanceNum = parseFloat(
      strategy.stats.final_balance.replace(/[^0-9.-]+/g, "")
    );
    let ddNum = parseFloat(
      strategy.stats.max_drawdown.replace(/[^0-9.-]+/g, "")
    );

    totalProfit += profitNum;
    totalBalance += balanceNum;

    // 2. Determine Risk Profile Badge based on Drawdown
    let riskBadge = "";
    if (Math.abs(ddNum) < 20) {
      riskBadge =
        '<span class="badge" style="background:#d1fae5; color:#065f46">Conservative</span>';
    } else if (Math.abs(ddNum) < 50) {
      riskBadge =
        '<span class="badge" style="background:#fef3c7; color:#92400e">Balanced</span>';
    } else {
      riskBadge =
        '<span class="badge" style="background:#fee2e2; color:#991b1b">Aggressive</span>';
    }

    // 3. Construct the File Link
    // We assume the reports are in 'site/reports/', but from inside index.html, the relative link is 'reports/...'
    const reportLink = `reports/${strategy.filename}`;

    // 4. Render Card
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
            <div class="card-header">
                <div>
                    <h3>${strategy.name}</h3>
                    <div style="margin-top:5px; font-size:0.75rem;">${riskBadge} <span class="status">Live</span></div>
                </div>
            </div>
            
            <div class="card-stats">
                <div class="stat">
                    <div>Net Profit</div>
                    <div class="${
                      profitNum >= 0 ? "text-green" : "text-danger"
                    }">${strategy.stats.net_profit}</div>
                </div>
                <div class="stat">
                    <div>Win Rate</div>
                    <div>${strategy.stats.win_rate}</div>
                </div>
                <div class="stat">
                    <div>Max DD</div>
                    <div style="color: #ef4444">${
                      strategy.stats.max_drawdown
                    }</div>
                </div>
                <div class="stat">
                    <div>Total Trades</div>
                    <div>${strategy.stats.total_trades}</div>
                </div>
            </div>

            <div class="chart-container">
                <canvas id="chart-${index}"></canvas>
            </div>

            <a href="${reportLink}" target="_blank" class="audit-btn">
                <i class="ph-bold ph-file-text"></i> View Full Audit Report
            </a>
        `;
    container.appendChild(card);

    // 5. Draw the Chart
    renderChart(`chart-${index}`, strategy.equity_curve);
  });

  // 6. Update Header Totals
  document.getElementById("total-stats").innerHTML = `
        <div class="sum-item">
            <label>Total Balance</label>
            <span>$${totalBalance.toFixed(2)}</span>
        </div>
        <div class="sum-item">
            <label>Total Net Return</label>
            <span class="text-green">+$${totalProfit.toFixed(2)}</span>
        </div>
    `;
}

function renderChart(canvasId, dataPoints) {
  const ctx = document.getElementById(canvasId).getContext("2d");

  // Create a nice gradient for the area under the line
  const gradient = ctx.createLinearGradient(0, 0, 0, 100);
  gradient.addColorStop(0, "rgba(16, 185, 129, 0.2)"); // Greenish transparent
  gradient.addColorStop(1, "rgba(16, 185, 129, 0)"); // Fade to clear

  new Chart(ctx, {
    type: "line",
    data: {
      labels: dataPoints.map((_, i) => i),
      datasets: [
        {
          data: dataPoints,
          borderColor: "#10b981",
          borderWidth: 2,
          pointRadius: 0, // Clean line without dots
          tension: 0.1, // Slight curve
          fill: true,
          backgroundColor: gradient,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: "index",
          intersect: false,
          displayColors: false,
          callbacks: {
            label: function (context) {
              return "$" + context.parsed.y.toFixed(2);
            },
          },
        },
      },
      scales: {
        x: { display: false }, // Hide axes for clean look
        y: { display: false },
      },
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false,
      },
    },
  });
}
