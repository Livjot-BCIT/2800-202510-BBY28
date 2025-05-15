function applyPlan(spendPercent, savePercent) {
    const amount = parseFloat(document.getElementById('moneyInput').value);
    if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount!");
        return;
    }

    const spend = (amount * spendPercent) / 100;
    const save = (amount * savePercent) / 100;

    const recommendations = getRecommendations(spend);

    // Build the spending table
    document.getElementById('recommendation').innerHTML = `
        <p>
            Based on your choice, you can spend <b style="color:#6d28d9;">$${spend.toFixed(2)}</b>
            and save <b style="color:#10b981;">$${save.toFixed(2)}</b>.
        </p>
        <p>👉 Here's how you should allocate your spending:</p>
        <table>
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Recommended</th>
                    <th>Actual</th>
                    <th>Difference</th>
                </tr>
            </thead>
            <tbody id="spendingTable">
                ${recommendations.map((item, index) => `
                    <tr>
                        <td>${item.label}</td>
                        <td>$${item.recommended.toFixed(2)}</td>
                        <td>
                            <input type="number" min="0" step="0.01" 
                                   data-index="${index}" 
                                   data-recommended="${item.recommended.toFixed(2)}"
                                   placeholder="Enter amount" 
                                   oninput="updateSpending(${index}, ${item.recommended.toFixed(2)})" />
                        </td>
                        <td id="diff-${index}" class="neutral">$0.00</td>
                    </tr>
                `).join("")}
            </tbody>
            <tfoot>
                <tr>
                    <th colspan="2">Total</th>
                    <th id="total-actual">$0.00</th>
                    <th id="total-diff" class="neutral">$0.00</th>
                </tr>
            </tfoot>
        </table>
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

    return tasks.map(task => ({
        label: task.label,
        recommended: (spend * task.percent) / 100,
        actual: 0
    }));
}

function updateSpending(index, recommended) {
    const input = document.querySelector(`input[data-index="${index}"]`);
    const actual = parseFloat(input.value) || 0;
    const difference = actual - recommended;

    // Set color based on difference
    let colorClass = "neutral";
    if (difference > 0) colorClass = "negative"; // Overspent
    else if (difference < 0) colorClass = "positive"; // Saved

    // Update the row difference
    const diffCell = document.getElementById(`diff-${index}`);
    diffCell.textContent = `$${difference.toFixed(2)}`;
    diffCell.className = colorClass;

    // Update total amounts
    updateTotals();
}

function updateTotals() {
    const inputs = document.querySelectorAll("input[data-index]");
    let totalActual = 0;
    let totalRecommended = 0;
    let totalDifference = 0;

    inputs.forEach((input, index) => {
        const actual = parseFloat(input.value) || 0;
        const recommended = parseFloat(input.getAttribute("data-recommended")) || 0;
        totalActual += actual;
        totalDifference += actual - recommended;
    });

    // Set total colors
    const totalDiffCell = document.getElementById("total-diff");
    const totalActualCell = document.getElementById("total-actual");

    totalActualCell.textContent = `$${totalActual.toFixed(2)}`;

    if (totalDifference > 0) {
        totalDiffCell.textContent = `Overspent by $${totalDifference.toFixed(2)}`;
        totalDiffCell.className = "negative";
    } else if (totalDifference < 0) {
        totalDiffCell.textContent = `Saved $${Math.abs(totalDifference).toFixed(2)}`;
        totalDiffCell.className = "positive";
    } else {
        totalDiffCell.textContent = "Perfect Balance ($0.00)";
        totalDiffCell.className = "neutral";
    }
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
