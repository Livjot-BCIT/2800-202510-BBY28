document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('.post-card').forEach(card => {
        const betId = card.getAttribute("data-id");

        // 🏁 Accept Challenge
        const acceptBtn = card.querySelector(".accept-btn");
        acceptBtn.addEventListener("click", async (e) => {
            e.stopPropagation(); // prevent triggering card click
            try {
                const res = await fetch(`/posts/${betId}/accept`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                });
                const updated = await res.json();
                acceptBtn.textContent = "✅ Accepted";
                acceptBtn.disabled = true;

                const meta = card.querySelector(".post-meta");
                if (meta) {
                    meta.innerHTML = `${updated.duration} • ${updated.betType} • ${updated.participants.length} joined`;
                }
            } catch (err) {
                console.error("Error accepting challenge:", err);
            }
        });

        // 📌 Click to expand/collapse details
        card.addEventListener("click", async (e) => {
            if (e.target.closest("button")) return; // don't collapse on button clicks

            const extra = card.querySelector(".post-extra");
            const isVisible = extra.style.display === "block";
            extra.style.display = isVisible ? "none" : "block";
        });
    });
});
// Live search filter
const searchInput = document.getElementById("search");
searchInput.addEventListener("input", () => {
    const keyword = searchInput.value.toLowerCase();
    const cards = document.querySelectorAll(".post-card");

    cards.forEach(card => {
        const title = card.querySelector(".post-header strong")?.textContent.toLowerCase() || "";
        const match = title.includes(keyword);
        card.style.display = match ? "block" : "none";
    });
});
