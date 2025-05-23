document.addEventListener("DOMContentLoaded", () => {
  // find all the countdown spans and their container
  document.querySelectorAll(".bet-rectangle").forEach(rect => {
    const endTs = Number(rect.dataset.endTs);
    if (!endTs) return;

    const span = rect.querySelector(".countdown");
    // update every second
    const iv = setInterval(() => {
      const now = Date.now();
      let diff = endTs - now;
      if (diff <= 0) {
        span.textContent = "Expired";
        clearInterval(iv);
        return;
      }
      // hh:mm:ss
      const h = Math.floor(diff/3600000);
      diff %= 3600000;
      const m = Math.floor(diff/60000);
      const s = Math.floor((diff%60000)/1000);
      span.textContent = 
        String(h).padStart(2,"0") + ":" +
        String(m).padStart(2,"0") + ":" +
        String(s).padStart(2,"0");
    }, 1000);
  });

  const filterSelect = document.getElementById("filterSelect");
  const container    = document.getElementById("groupContainer");

  filterSelect.addEventListener("change", () => {
    const filter = filterSelect.value; // "" | "joined" | "created"
    const rects  = Array.from(container.querySelectorAll(".bet-rectangle"));

    if (filter) {
      rects.sort((a, b) => {
        const aCat = a.dataset.category;
        const bCat = b.dataset.category;
        if (aCat === filter && bCat !== filter) return -1;
        if (aCat !== filter && bCat === filter) return 1;
        return 0;
      });
      rects.forEach(r => container.appendChild(r));
    } else {
      // “no filter” – do nothing (they stay in original order)
    }
  });
});

app.get("/groups", sessionValidation, async (req, res, next) => {
  try {
    // 1) load the user and populate the bets they’re participating in,
    //    and for each of those bets also populate the betPoster
    const user = await User.findById(req.session.userId)
      .populate({
        path: "participatedBets",
        populate: { path: "betPoster", select: "firstName lastName" }
      })
      .lean();

    // 2) render, passing the fully‑populated user
    res.render("groups", {
      title: "My Bets",
      css: "/styles/groupList.css",
      currentUser: user
    });
  } catch (err) {
    next(err);
  }
});

