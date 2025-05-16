// Initial user balance
let balance = 1000;
const inventory = [];

// Available items in the shop
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
        itemCol.classList.add("col-md-6", "col-lg-4", "mb-4");
        itemCol.innerHTML = `
            <div class="card h-100 shadow-sm">
                <div class="card-body">
                    <h5 class="card-title">${item.name}</h5>
                    <p class="card-text text-success fw-bold">$${item.price}</p>
                    <button class="btn btn-primary w-100" onclick="buyItem('${item.name}', ${item.price})">
                        Buy
                    </button>
                </div>
            </div>
        `;
        itemList.appendChild(itemCol);
    });
}

// Buy an item
function buyItem(name, price) {
    if (balance >= price) {
        balance -= price;
        inventory.push(name);
        updateInventory();
        updateBalance();
        showToast(`🎉 You bought a ${name} for $${price}!`);
    } else {
        showToast("❌ Not enough money!", "danger");
    }
}

// Update balance display
function updateBalance() {
    document.getElementById("balance").textContent = `$${balance}`;
}

// Update inventory display
function updateInventory() {
    const inventoryList = document.getElementById("inventoryList");
    inventoryList.innerHTML = "";
    inventory.forEach(item => {
        const li = document.createElement("li");
        li.classList.add("list-group-item", "list-group-item-action", "list-group-item-success");
        li.textContent = item;
        inventoryList.appendChild(li);
    });
}

// Show toast notification
function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast-message ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("show");
    }, 100);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}


// Initial render
renderShop();
updateBalance();
