// Initial dummy challenges
const challenges = [
    {
        id: 1,
        username: "Alice",
        avatar: "https://randomuser.me/api/portraits/women/21.jpg",
        timestamp: new Date(Date.now() - 300000),
        content: "Run 5km in under 25 minutes!",
        tag: "physical",
        acceptVotes: 7,
        totalVotes: 10
    },
    {
        id: 2,
        username: "Bob",
        avatar: "https://randomuser.me/api/portraits/men/32.jpg",
        timestamp: new Date(Date.now() - 600000),
        content: "Solve a Rubik’s cube in 1 minute!",
        tag: "puzzle",
        acceptVotes: 3,
        totalVotes: 6
    },
    {
        id: 3,
        username: "Carol",
        avatar: "https://randomuser.me/api/portraits/women/44.jpg",
        timestamp: new Date(Date.now() - 120000),
        content: "Drink a liter of water in 10 seconds!",
        tag: "funny",
        acceptVotes: 5,
        totalVotes: 8
    }
];


let currentTag = "all";
let currentTimeZone = localStorage.getItem('selectedRegion') || "America/Vancouver";

// Format timestamp based on selected region
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: currentTimeZone,
        timeZoneName: 'short'
    };
    return date.toLocaleString(undefined, options);
}

// Render challenges on page load
function renderChallenges(list) {
    const feed = document.getElementById('feed');
    feed.innerHTML = '';
    let totalVotes = 0;

    list.forEach(post => {
        totalVotes += post.totalVotes;

        const postDiv = document.createElement('div');
        postDiv.className = 'challenge-post';
        postDiv.onclick = () => window.location.href = `bet.html?postId=${post.id}`;
        postDiv.innerHTML = `
            <div class="post-header">
                <img src="${post.avatar}" class="avatar" />
                <div class="post-meta">
                    <span class="username">${post.username}</span>
                    <span class="timestamp">${formatTimestamp(post.timestamp)}</span>
                </div>
            </div>
            <div class="post-body">
                <p>${post.content}</p>
                <small class="tag-label">#${post.tag}</small>
            </div>
            <div class="post-actions" onclick="event.stopPropagation();">
                <button class="accept">Accept</button>
            </div>
        `;
        feed.appendChild(postDiv);
    });

    // Update the total counts
    document.getElementById('totalChallenges').textContent = `${list.length} challenges`;
    document.getElementById('totalVotes').textContent = `${totalVotes} total votes`;
}

// Handle time zone change
document.getElementById("regionSelect").addEventListener("change", (e) => {
    currentTimeZone = e.target.value;
    localStorage.setItem('selectedRegion', currentTimeZone);
    updateFeed();
});

// Filter by tag
function filterByTag(tag) {
    currentTag = tag;
    updateFeed();
    highlightActiveTag(tag);
}

// Highlight active tag button
function highlightActiveTag(activeTag) {
    const buttons = document.querySelectorAll('.tag-filters button');
    buttons.forEach(button => {
        if (button.textContent.toLowerCase() === activeTag || activeTag === 'all') {
            button.classList.add('active-tag');
        } else {
            button.classList.remove('active-tag');
        }
    });
}

// Handle search input
document.getElementById('search').addEventListener('input', updateFeed);

// Update feed based on search and tag filters
function updateFeed() {
    const keyword = document.getElementById('search').value.toLowerCase();
    let filtered = challenges.filter(ch =>
        ch.content.toLowerCase().includes(keyword) &&
        (currentTag === 'all' || ch.tag === currentTag)
    );
    renderChallenges(filtered);
}

// Initial region setting on page load
document.getElementById("regionSelect").value = currentTimeZone;
updateFeed();
highlightActiveTag('all');
