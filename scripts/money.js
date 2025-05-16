function applyPlan(spendPercent, savePercent) {
    const amount = parseFloat(document.getElementById('moneyInput').value);
    if (isNaN(amount) || amount <= 0) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Input',
            text: 'Please enter a valid amount!'
        });
        return;
    }

    const spend = (amount * spendPercent) / 100;
    const save = (amount * savePercent) / 100;

    const categories = getRecommendations(spend);

    document.getElementById('recommendation').innerHTML = `
      <p>
        Based on your choice, you can spend <b style="color:#6d28d9;">$${spend.toFixed(2)}</b>
        and save <b style="color:#10b981;">$${save.toFixed(2)}</b>.
      </p>
      <p>👉 Here's how you can manage your spending wisely as a student:</p>
      <ul>
        ${categories.map(c => `<li style="margin-bottom: 8px;">${c}</li>`).join("")}
      </ul>
    `;

    renderChart(spend, save);
}

function getRecommendations(spend) {
    const tasks = [
        { label: "Food (Groceries & Meals)", percent: 20 },
        { label: "Rent / Utilities", percent: 60 },
        { label: "Health (Insurance, Checkups)", percent: 5 },
        { label: "Education (Courses & Supplies)", percent: 10 },
        { label: "Hangout (Friends, Entertainment)", percent: 5 }
    ];

    return tasks.map(task => {
        const amount = (spend * task.percent) / 100;
        return `<b>${task.label}</b> — $${amount.toFixed(2)} (${task.percent}%)`;
    });
}

function renderChart(spend, save, labels = ['Spend', 'Save'], data = [spend, save]) {
    const ctx = document.getElementById('moneyChart').getContext('2d');

    if (window.moneyChart) {
        window.moneyChart.destroy();
    }

    window.moneyChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Money Allocation',
                data: data,
                backgroundColor: [
                    '#f97316', // Food
                    '#4f46e5', // Rent
                    '#10b981', // Health
                    '#ec4899', // Education
                    '#facc15'  // Hangout
                ],
                hoverOffset: 12,
                borderWidth: 1,
                borderColor: "#fff"
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#4c1d95',
                        font: {
                            weight: 'bold',
                            size: 14
                        }
                    }
                }
            }
        }
    });
}


// Report actual spending and update graph
document.getElementById("reportForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const form = e.target;
    const food = parseFloat(form.food.value) || 0;
    const rent = parseFloat(form.rent.value) || 0;
    const health = parseFloat(form.health.value) || 0;
    const education = parseFloat(form.education.value) || 0;
    const hangout = parseFloat(form.hangout.value) || 0;

    const total = food + rent + health + education + hangout;
    if (total === 0) {
        Swal.fire("Please enter at least one amount.");
        return;
    }

    const labels = ["Food", "Rent", "Health", "Education", "Hangout"];
    const data = [food, rent, health, education, hangout];

    renderChart(0, 0, labels, data);
});
document.getElementById("toggleReport").addEventListener("click", () => {
    const tab = document.getElementById("reportTab");
    tab.style.display = tab.style.display === "block" ? "none" : "block";
});
