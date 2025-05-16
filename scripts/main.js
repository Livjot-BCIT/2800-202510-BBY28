// Fetch and Render Bets
async function fetchBets() {
    try {
        const response = await fetch('/posts');
        if (!response.ok) throw new Error("Failed to load bets");

        const bets = await response.json();
        renderBets(bets);
    } catch (error) {
        console.error("Error loading bets:", error);
    }
}

// Render Bets to the Feed
function renderBets(bets) {
    const feed = document.getElementById('feed');
    feed.innerHTML = '';

    bets.forEach(bet => {
        const betCard = document.createElement('div');
        betCard.className = 'bet-card';
        betCard.innerHTML = `
            <h3>${bet.betTitle || "Untitled Challenge"}</h3>
            <p>${bet.description || "No description provided."}</p>
            <span>Type: ${bet.betType || "Unknown"}</span><br>
            <span>Duration: ${bet.duration || "Unknown"}</span><br>
            <span>Participants: ${bet.participants || "0"}</span><br>
            <span>Private: ${bet.privateBet ? "Yes" : "No"}</span>
        `;
        feed.appendChild(betCard);
    });

    // Update totals
    document.getElementById("totalChallenges").textContent = `${bets.length} challenges`;
    const totalVotes = bets.reduce((acc, bet) => acc + (bet.participants || 0), 0);
    document.getElementById("totalVotes").textContent = `${totalVotes} total votes`;
}

// Load Bets on Page Load
fetchBets();
