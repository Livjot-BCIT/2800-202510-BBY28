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
        const itemDiv = document.createElement("div");
        itemDiv.classList.add("shop-item");
        itemDiv.innerHTML = `
            <div class="item-name">${item.name}</div>
            <div class="item-price">$${item.price}</div>
            <button onclick="buyItem('${item.name}', ${item.price})">Buy</button>
        `;
        itemList.appendChild(itemDiv);
    });
}

// Buy an item
function buyItem(name, price) {
    if (balance >= price) {
        balance -= price;
        inventory.push(name);
        updateInventory();
        updateBalance();
        alert(`You bought a ${name} for $${price}!`);
    } else {
        alert("Not enough money!");
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
        li.textContent = item;
        inventoryList.appendChild(li);
    });
}

// Initial render
renderShop();
updateBalance();
