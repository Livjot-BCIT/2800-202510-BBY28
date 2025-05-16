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
            card.setAttribute('data-id', group._id);

            card.innerHTML = `
                <img class="group-img" src="${group.image}" alt="Group image" style="width:120px;height:120px;object-fit:cover;border-radius:10px;">
                <div class="group-content">
                    <div class="group-title fw-semibold fs-5">${group.name}</div>
                    <div class="group-description text-muted">${group.description}</div>
                    <div class="group-meta text-secondary">👥 ${group.memberCount} members <br> 🏷️ ${group.type}</div>
                    <button class="btn btn-outline-primary btn-sm mt-2 view-btn">View Group</button>
                </div>
            `;

            const viewBtn = card.querySelector('.view-btn');
            if (viewBtn) {
                viewBtn.addEventListener('click', () => openGroupModal(group));
            }

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
        console.warn("searchInput not found");
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
        console.warn("esearchBtn not found");
    }
}


function handleScroll() {
    const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
    if (nearBottom) {
        loadGroups();
    }
}

function openGroupModal(group) {
    document.getElementById('modalTitle').textContent = group.name;
    document.getElementById('modalImage').src = group.image;
    document.getElementById('modalDescription').textContent = group.description;
    document.getElementById('modalType').textContent = group.type;
    document.getElementById('modalMembers').textContent = group.memberCount;

    document.getElementById('groupModal').classList.remove('d-none');
}

document.addEventListener('DOMContentLoaded', () => {
    initSearch();
    loadGroups();
    window.addEventListener('scroll', handleScroll);

    const closeBtn = document.getElementById('closeModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('groupModal').classList.add('d-none');
        });
    }

    const createBtn = document.getElementById('createGroupBtn');
    const createModal = document.getElementById('createGroupModal');
    const closeCreateBtn = document.getElementById('closeCreateModal');
    const createForm = document.getElementById('createGroupForm');

    if (createBtn) {
        createBtn.addEventListener('click', () => {
            createModal.classList.remove('d-none');
        });
    }

    if (closeCreateBtn) {
        closeCreateBtn.addEventListener('click', () => {
            createModal.classList.add('d-none');
        });
    }


    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(createForm);

            try {
                const res = await fetch('/api/createGroup', {
                    method: 'POST',
                    body: formData
                });

                if (res.ok) {
                    alert('Group created!');
                    createModal.classList.add('d-none');
                    createForm.reset();
                    location.reload();
                } else {
                    alert('Failed to create group.');
                }
            } catch (err) {
                console.error('Error creating group:', err);
                alert('An error occurred while creating the group.');
            }
        });

    }
});
