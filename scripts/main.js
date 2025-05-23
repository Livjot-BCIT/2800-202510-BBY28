document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('.post-card').forEach(card => {
        const betId = card.getAttribute("data-id");

        // 🏁 Accept Challenge
        const acceptBtn = card.querySelector(".accept-btn");
        acceptBtn?.addEventListener("click", async (e) => {
            e.stopPropagation(); // prevent triggering card click

            try {
                const res = await fetch(`/posts/${betId}/accept`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                });

                if (!res.ok) throw new Error("Failed to accept");

                const updated = await res.json();

                // ✅ Update button
                acceptBtn.textContent = "✅ Accepted";
                acceptBtn.disabled = true;

                // ✅ Update meta
                const meta = card.querySelector(".post-meta");
                if (meta && updated.participants) {
                    meta.textContent = `${updated.duration} • ${updated.betType} • ${updated.participants.length} joined`;
                }

            } catch (err) {
                console.error("Error accepting challenge:", err);
            }
        });

        // 📌 Click to expand/collapse details
        card.addEventListener("click", (e) => {
            if (e.target.closest("button")) return; // don't collapse on button clicks

            const extra = card.querySelector(".post-extra");
            const isVisible = extra?.style.display === "block";
            if (extra) {
                extra.style.display = isVisible ? "none" : "block";
            }
        });
    });
});

// 🔍 Live Search
const searchInput = document.getElementById("search");
if (searchInput) {
    searchInput.addEventListener("input", () => {
        const keyword = searchInput.value.toLowerCase();
        const cards = document.querySelectorAll(".post-card");

        cards.forEach(card => {
            const title = card.querySelector(".post-header strong")?.textContent.toLowerCase() || "";
            const match = title.includes(keyword);
            card.style.display = match ? "block" : "none";
        });
    });
}
