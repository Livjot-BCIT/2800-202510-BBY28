// Chart initialization
if (typeof window.moneyChart === "undefined") {
    window.moneyChart = null;
}

// Apply selected plan to chart
function applyPlan(spendPercent, savePercent) {
    const amount = parseFloat(document.getElementById("moneyInput").value);
    if (isNaN(amount) || amount <= 0) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Input',
            text: 'Please enter a valid amount!'
        });
        return;
    }

    // Ensure chart canvas exists
    const canvas = document.getElementById("moneyChart");
    if (!canvas) {
        console.error("Chart canvas not found!");
        return;
    }

    const spend = amount * (spendPercent / 100);
    const save = amount * (savePercent / 100);

    renderChart(spend, save);
}

// Generate AI financial advice
async function triggerGeminiAI() {
    const amountInput = document.getElementById("moneyInput");
    const amount = parseFloat(amountInput.value);
    const plan = document.querySelector('input[name="plan"]:checked')?.value;
    const aiResults = document.getElementById("aiResults");
    const aiButton = document.getElementById("aiMagicTrigger");

    if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount!");
        amountInput.focus();
        return;
    }

    if (!plan) {
        alert("Please select a financial plan!");
        return;
    }

    // UI updates
    aiButton.disabled = true;
    aiButton.innerHTML = "⏳ Generating Advice...";
    aiResults.classList.remove("d-none");
    aiResults.innerHTML = '<div class="spinner-border text-warning" role="status"></div>';

    try {
        const response = await fetch("/api/financial-advice", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                amount: amount.toFixed(2),
                plan
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to get financial advice");
        }

        // Update UI with advice
        aiResults.innerHTML = `
            <h4>✨ AI Financial Advice</h4>
            <p>${data.advice}</p>
            <small class="text-muted">Based on your $${amount} and ${plan} plan</small>
        `;

        // Apply the plan to chart
        const percentages = plan.match(/(\d+)% Spend \/ (\d+)% Save/);
        if (percentages) {
            applyPlan(parseInt(percentages[1]), parseInt(percentages[2]));
        }

    } catch (error) {
        console.error("Error:", error);
        aiResults.innerHTML = `
            <div class="alert alert-danger">
                <strong>Error:</strong> ${error.message}
                <button onclick="triggerGeminiAI()" class="btn btn-sm btn-warning mt-2">Try Again</button>
            </div>
        `;
    } finally {
        aiButton.disabled = false;
        aiButton.innerHTML = "🔮 Ask AI for Financial Advice";
    }
}

// Render chart function
function renderChart(spend, save) {
    const ctx = document.getElementById("moneyChart").getContext("2d");

    // Destroy the previous chart if it exists
    if (window.moneyChart instanceof Chart) {
        window.moneyChart.destroy();
        window.moneyChart = null; // Reset the chart instance
    }

    // Create a new chart
    window.moneyChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Spend", "Save"],
            datasets: [{
                data: [spend, save],
                backgroundColor: ["#FF6384", "#36A2EB"],
                hoverBackgroundColor: ["#FF6384", "#36A2EB"],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: "bottom",
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.label}: $${context.raw.toFixed(2)}`;
                        }
                    }
                }
            }
        }
    });
}



// Event listeners
document.addEventListener("DOMContentLoaded", () => {
    // Initialize with default values (optional)
    const defaultAmount = 100; // or whatever default you prefer
    document.getElementById("moneyInput").value = defaultAmount;

    // Apply default plan on load
    const defaultPlan = document.querySelector('input[name="plan"]:checked');
    if (defaultPlan) {
        const percentages = defaultPlan.value.match(/(\d+)% Spend \/ (\d+)% Save/);
        if (percentages) {
            applyPlan(parseInt(percentages[1]), parseInt(percentages[2]));
        }
    }

    // Other event listeners...
    document.querySelectorAll('input[name="plan"]').forEach(radio => {
        radio.addEventListener("change", function () {
            if (this.checked) {
                const percentages = this.value.match(/(\d+)% Spend \/ (\d+)% Save/);
                if (percentages) {
                    applyPlan(parseInt(percentages[1]), parseInt(percentages[2]));
                }
            }
        });
    });
});
// Initial Chart Instances
window.moneyChart = null;
window.spendingChart = null;

// Apply selected plan to chart
function applyPlan(spendPercent, savePercent) {
    const amount = parseFloat(document.getElementById("moneyInput").value);
    if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount!");
        return;
    }

    const spend = amount * (spendPercent / 100);
    const save = amount * (savePercent / 100);

    renderPlanChart(spend, save);
}

function renderPlanChart(spend, save) {
    const ctx = document.getElementById("moneyChart").getContext("2d");

    if (window.moneyChart) {
        window.moneyChart.destroy();
    }

    window.moneyChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Spend", "Save"],
            datasets: [{
                data: [spend, save],
                backgroundColor: ["#FF6384", "#36A2EB"],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: "bottom"
                },
                tooltip: {
                    callbacks: {
                        label: context => `${context.label}: $${context.raw.toFixed(2)}`
                    }
                }
            }
        }
    });
}

// AI Financial Advice
async function triggerGeminiAI() {
    const amountInput = document.getElementById("moneyInput");
    const amount = parseFloat(amountInput.value);
    const plan = document.querySelector('input[name="plan"]:checked')?.value;
    const aiResults = document.getElementById("aiResults");
    const aiButton = document.getElementById("aiMagicTrigger");

    if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount!");
        return;
    }
    if (!plan) {
        alert("Please select a financial plan!");
        return;
    }

    aiButton.disabled = true;
    aiButton.innerHTML = "⏳ Generating Advice...";
    aiResults.classList.remove("d-none");
    aiResults.innerHTML = '<div class="spinner-border text-warning" role="status"></div>';

    try {
        const res = await fetch("/api/financial-advice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount, plan })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        aiResults.innerHTML = `
			<h4>✨ AI Financial Advice</h4>
			<p>${data.advice}</p>
			<small class="text-muted">Based on your $${data.amount} and ${data.plan} plan</small>
		`;

        const [_, spendPercent, savePercent] = plan.match(/(\d+)% Spend \/ (\d+)% Save/);
        applyPlan(parseInt(spendPercent), parseInt(savePercent));
    } catch (error) {
        aiResults.innerHTML = `
			<div class="alert alert-danger">
				<strong>Error:</strong> ${error.message}
			</div>
		`;
    } finally {
        aiButton.disabled = false;
        aiButton.innerHTML = "🔮 Ask AI for Financial Advice";
    }
}

// Submit Spending
document.getElementById("spendingForm").addEventListener("submit", async e => {
    e.preventDefault();

    const amount = document.getElementById("spendAmount").value;
    const date = document.getElementById("spendDate").value;

    const res = await fetch("/api/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, date })
    });

    const data = await res.json();

    if (data.success) {
        alert("✅ Spending saved!");
        document.getElementById("spendingForm").reset();
        loadSpendingChart();
    } else {
        alert("❌ Failed to save: " + (data.error || "Unknown error"));
    }
});

// Chart Loader by Group
async function loadSpendingChart() {
    const mode = document.getElementById("viewFilter").value;
    const res = await fetch("/api/spendings");
    const data = await res.json();

    const grouped = groupSpending(data, mode);
    const labels = Object.keys(grouped).sort();
    const values = labels.map(label => grouped[label]);

    const ctx = document.getElementById("spendingChart").getContext("2d");

    if (window.spendingChart) {
        window.spendingChart.destroy();
    }

    window.spendingChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Money Spent",
                data: values,
                backgroundColor: "#9d4edd"
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Amount ($)"
                    }
                }
            }
        }
    });
}

// Grouping Helper
function groupSpending(data, mode) {
    const groups = {};

    data.forEach(entry => {
        const date = new Date(entry.date);
        let key;

        switch (mode) {
            case "week":
                key = `${date.getFullYear()}-W${getWeekNumber(date)}`;
                break;
            case "biweek":
                key = `${date.getFullYear()}-B${Math.floor(getWeekNumber(date) / 2)}`;
                break;
            case "month":
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                break;
            case "year":
                key = `${date.getFullYear()}`;
                break;
        }

        groups[key] = (groups[key] || 0) + parseFloat(entry.amount);
    });

    return groups;
}

function getWeekNumber(date) {
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

// View mode change
document.getElementById("viewFilter").addEventListener("change", loadSpendingChart);

// Init on Load
document.addEventListener("DOMContentLoaded", () => {
    const defaultAmount = 100;
    document.getElementById("moneyInput").value = defaultAmount;

    // Default plan chart (optional)
    const defaultPlan = document.querySelector('input[name="plan"]:checked');
    if (defaultPlan) {
        const [_, spend, save] = defaultPlan.value.match(/(\d+)% Spend \/ (\d+)% Save/);
        applyPlan(parseInt(spend), parseInt(save));
    }

    loadSpendingChart();
});

