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
    const groupContainer = document.getElementById('groupContainer');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const loader = document.getElementById('loader');

    let allGroups = [];

    // Load groups when the page loads
    loadGroups();

    // Search functionality
    searchBtn.addEventListener('click', filterGroups);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            filterGroups();
        }
    });

    // Load all groups from the server
    async function loadGroups() {
        try {
            loader.style.display = 'block';
            
            const response = await fetch('/api/groups');
            if (!response.ok) {
                throw new Error('Failed to fetch groups');
            }
            
            allGroups = await response.json();
            displayGroups(allGroups);
        } catch (error) {
            console.error('Error loading groups:', error);
            groupContainer.innerHTML = `<p class="text-center text-danger">Failed to load groups. Please try again later.</p>`;
        } finally {
            loader.style.display = 'none';
        }
    }

    // Display groups in the container
    function displayGroups(groups) {
        if (groups.length === 0) {
            groupContainer.innerHTML = '<p class="text-center">No groups found</p>';
            return;
        }

        let html = '<div class="row">';
        
        groups.forEach(group => {
            html += `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card h-100">
                        <div class="card-body">
                            <h5 class="card-title">${group.title}</h5>
                            <p class="card-text">${group.description || 'No description available'}</p>
                            <p class="card-text"><small class="text-muted">${group.memberCount || 0} members</small></p>
                            <div class="d-grid">
                                <a href="/group/${group._id}" class="btn btn-primary join-chat-btn">Join Chat</a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        groupContainer.innerHTML = html;
    }

    // Filter groups based on search input
    function filterGroups() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        
        if (!searchTerm) {
            displayGroups(allGroups);
            return;
        }
        
        const filteredGroups = allGroups.filter(group => 
            group.title.toLowerCase().includes(searchTerm) || 
            (group.description && group.description.toLowerCase().includes(searchTerm))
        );
        
        displayGroups(filteredGroups);
    }
});
