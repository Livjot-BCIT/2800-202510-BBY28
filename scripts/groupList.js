let page = 1;
let isLoading = false;
let currentSearch = "";

async function loadGroups() {
    if (isLoading) return;
    isLoading = true;

    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'block';

    try {
        const res = await fetch(`/api/groups?page=${page}`);
        const groups = await res.json();

        if (groups.length === 0) {
            window.removeEventListener('scroll', handleScroll);
            if (loader) loader.textContent = 'No more groups.';
            return;
        }

        const container = document.getElementById('groupContainer');

        groups.forEach(group => {
            const card = document.createElement('div');
            card.className = 'group-card d-flex gap-3 mb-4';
            card.innerHTML = `
                <img class="group-img" src="${group.image}" alt="Group image" style="width:120px;height:120px;object-fit:cover;border-radius:10px;">
                <div class="group-content">
                    <div class="group-title fw-semibold fs-5">${group.name}</div>
                    <div class="group-description text-muted">${group.description}</div>
                    <div class="group-meta text-secondary">👥 ${group.memberCount} members • 🏷️ ${group.type}</div>
                    <button class="btn btn-outline-primary btn-sm mt-2">View Group</button>
                </div>
            `;
            container.appendChild(card);
        });

        if (currentSearch !== "") {
            filterCards(currentSearch);
        }

        page++;
    } catch (err) {
        console.error("Error loading groups:", err);
    } finally {
        isLoading = false;
        if (loader) loader.style.display = 'none';
    }
}

function filterCards(keyword) {
    const search = keyword.toLowerCase();
    document.querySelectorAll('.group-card').forEach(card => {
        const title = card.querySelector('.group-title')?.textContent.toLowerCase() || "";
        const desc = card.querySelector('.group-description')?.textContent.toLowerCase() || "";
        const meta = card.querySelector('.group-meta')?.textContent.toLowerCase() || "";
        const matches = title.includes(search) || desc.includes(search) || meta.includes(search);

        card.classList.toggle('d-none', !matches);
    });
}

function initSearch() {
    const input = document.getElementById('searchInput');
    const button = document.getElementById('searchBtn');

    if (!input) {
        console.warn("❗ searchInput not found");
        return;
    }

    function applySearch() {
        currentSearch = input.value.trim();
        filterCards(currentSearch);
    }

    input.addEventListener('keyup', applySearch);
    if (button) {
        button.addEventListener('click', applySearch);
    } else {
        console.warn("❗ searchBtn not found");
    }
}


function handleScroll() {
    const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
    if (nearBottom) {
        loadGroups();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initSearch();
    loadGroups();
    window.addEventListener('scroll', handleScroll);
});
