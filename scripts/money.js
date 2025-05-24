// Global chart instances
window.moneyChart = null;
window.spendingChart = null;

// 📊 Apply plan and draw chart
function applyPlan(spendPercent, savePercent) {
    const amount = parseFloat(document.getElementById("moneyInput").value);
    if (isNaN(amount) || amount <= 0) {
        Swal.fire({ icon: 'error', title: 'Invalid Amount', text: 'Please enter a valid number!' });
        return;
    }

    const spend = amount * (spendPercent / 100);
    const save = amount * (savePercent / 100);
    renderPlanChart(spend, save);
}

function renderPlanChart(spend, save) {
    const ctx = document.getElementById("moneyChart").getContext("2d");
    if (window.moneyChart) window.moneyChart.destroy();

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
                legend: { position: "bottom" },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.label}: $${ctx.raw.toFixed(2)}`
                    }
                }
            }
        }
    });
}

// 🔮 Gemini AI Advice
async function triggerGeminiAI() {
    const amount = parseFloat(document.getElementById("moneyInput").value);
    const plan = document.querySelector('input[name="plan"]:checked')?.value;
    const aiResults = document.getElementById("aiResults");
    const aiButton = document.getElementById("aiMagicTrigger");

    if (isNaN(amount) || amount <= 0) {
        Swal.fire({ icon: 'warning', title: 'Enter Money', text: 'Please input a valid amount!' });
        return;
    }
    if (!plan) {
        Swal.fire({ icon: 'warning', title: 'Select Plan', text: 'Please choose a financial plan.' });
        return;
    }

    aiButton.disabled = true;
    aiButton.innerHTML = "⏳ Generating Advice...";
    aiResults.classList.remove("d-none");
    aiResults.innerHTML = `<div class="spinner-border text-warning"></div>`;

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
            <small class="text-muted">Based on your $${data.amount} and ${data.plan}</small>
        `;

        const [_, spendPercent, savePercent] = plan.match(/(\d+)% Spend \/ (\d+)% Save/);
        applyPlan(parseInt(spendPercent), parseInt(savePercent));
    } catch (err) {
        aiResults.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    } finally {
        aiButton.disabled = false;
        aiButton.innerHTML = "🔮 Ask AI for Financial Advice";
    }
}

// 💾 Save spending record
document.getElementById("spendingForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const amount = document.getElementById("spendAmount").value;
    const date = document.getElementById("spendDate").value;

    try {
        const res = await fetch("/api/spend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount, date })
        });

        const data = await res.json();

        if (data.success) {
            Swal.fire({
                icon: "success",
                title: "Saved!",
                text: "Your spending has been recorded.",
                timer: 1500,
                showConfirmButton: false
            });

            document.getElementById("spendingForm").reset();

            // 🔁 Auto reload chart
            await loadSpendingChart();
        } else {
            Swal.fire({
                icon: "error",
                title: "Failed",
                text: data.error || "Unknown error."
            });
        }
    } catch (err) {
        console.error("Saving error:", err);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Something went wrong. Please try again later."
        });
    }
});

// 📈 Load bar chart for spending
async function loadSpendingChart() {
    const mode = document.getElementById("viewFilter").value;
    const res = await fetch("/api/spendings");
    const data = await res.json();

    const grouped = groupSpending(data, mode);
    const labels = Object.keys(grouped).sort();
    const values = labels.map(label => grouped[label]);

    const ctx = document.getElementById("spendingChart").getContext("2d");
    if (window.spendingChart) window.spendingChart.destroy();

    window.spendingChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
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
                    title: { display: true, text: "Amount ($)" }
                }
            }
        }
    });
}

// 🧠 Group spending records by mode
function groupSpending(data, mode) {
    const groups = {};
    data.forEach(entry => {
        const date = new Date(entry.date);
        let key = "";

        switch (mode) {
            case "week":
                key = `${date.getFullYear()}-W${getWeekNumber(date)}`; break;
            case "biweek":
                key = `${date.getFullYear()}-B${Math.floor(getWeekNumber(date) / 2)}`; break;
            case "month":
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; break;
            case "year":
                key = `${date.getFullYear()}`; break;
        }

        groups[key] = (groups[key] || 0) + parseFloat(entry.amount);
    });

    return groups;
}

// 📅 Week number helper
function getWeekNumber(date) {
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

// 🔁 View filter handler
document.getElementById("viewFilter").addEventListener("change", loadSpendingChart);

// ✅ Init on page load
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("moneyInput").value = 100;

    const defaultPlan = document.querySelector('input[name="plan"]:checked');
    if (defaultPlan) {
        const [_, spend, save] = defaultPlan.value.match(/(\d+)% Spend \/ (\d+)% Save/);
        applyPlan(parseInt(spend), parseInt(save));
    }

    document.querySelectorAll('input[name="plan"]').forEach(radio => {
        radio.addEventListener("change", () => {
            const [_, spend, save] = radio.value.match(/(\d+)% Spend \/ (\d+)% Save/);
            applyPlan(parseInt(spend), parseInt(save));
        });
    });

    loadSpendingChart();
});
