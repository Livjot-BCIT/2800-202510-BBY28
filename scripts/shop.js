// Initial balance
let balance = 1000;
const inventory = [];

// Shop items
const items = [
    { name: "Golden Badge", price: 300 },
    { name: "Legendary Title", price: 500 },
    { name: "Champion Aura", price: 700 },
    { name: "Mystic Emblem", price: 400 },
    { name: "VIP Badge", price: 600 }
];

// Render shop items
function renderShop() {
    const itemList = document.getElementById("itemList");
    itemList.innerHTML = "";

    items.forEach(item => {
        const itemCol = document.createElement("div");
        itemCol.className = "col-md-6 col-lg-4 mb-4";
        itemCol.innerHTML = `
            <div class="card h-100 shadow-sm">
                <div class="card-body text-center">
                    <h5 class="card-title">${item.name}</h5>
                    <p class="card-text text-success fw-bold">$${item.price}</p>
                    <button class="btn btn-primary w-100" onclick="confirmPurchase('${item.name}', ${item.price})">Buy</button>
                </div>
            </div>
        `;
        itemList.appendChild(itemCol);
    });
}

// Confirm then purchase
function confirmPurchase(name, price) {
    const modal = document.getElementById("confirmModal");
    const message = document.getElementById("confirmMessage");
    message.textContent = `Do you want to buy ${name} for $${price}?`;
    modal.style.display = "flex";

    const confirmYes = document.getElementById("confirmYes");
    const confirmNo = document.getElementById("confirmNo");

    // Clear old handlers
    confirmYes.onclick = null;
    confirmNo.onclick = null;

    // Confirm
    confirmYes.onclick = () => {
        modal.style.display = "none";
        buyItem(name, price);
    };

    // Cancel
    confirmNo.onclick = () => {
        modal.style.display = "none";
    };
}


// Handle purchase
function buyItem(name, price) {
    if (balance >= price) {
        balance -= price;
        inventory.push(name);
        updateBalance();
        showToast(`🎉 You bought ${name} for $${price}!`);
    } else {
        showToast("❌ Not enough balance!", "danger");
    }
}

// Update balance
function updateBalance() {
    document.getElementById("balance").textContent = `$${balance}`;
}

// Show toast
function showToast(message, type = "success") {
    const toastContainer = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast-message ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 100);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Init
renderShop();
updateBalance();
