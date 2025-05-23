document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBetBtn");
  const timerSection = document.querySelector(".match-timer");
  const display = document.getElementById("matchTimer");
  const noticeDisplay = document.getElementById("noticeDisplay");
  const noticeForm    = document.getElementById("noticeForm");

  if (noticeDisplay && noticeForm) {
    // when owner clicks the display div, swap to the form
    noticeDisplay.addEventListener("click", () => {
      noticeDisplay.style.display = "none";
      noticeForm.style.display    = "block";
      noticeForm.querySelector("textarea").focus();
    });

    // if they blur out of the textarea without saving, revert
    noticeForm.querySelector("textarea").addEventListener("blur", (e) => {
      // only if they didn't just click "Save"
      // give a slight timeout to allow click on the button
      setTimeout(() => {
        if (!document.activeElement.closest("#noticeForm")) {
          noticeForm.style.display    = "none";
          noticeDisplay.style.display = "block";
        }
      }, 150);
    });
  }
  
  // only show timer if bet already started
  if (window.startTs) {
    timerSection.style.display = "";
    initTimer();
  } else {
    timerSection.style.display = "none";
  }

  // Start‑bet button (creator only)
  if (startBtn) {
    startBtn.addEventListener("click", async () => {
      startBtn.disabled = true;
      startBtn.textContent = "Starting…";
      try {
        const res = await fetch(`/api/bets/${window.betId}/start`, {
          method: "POST",
        });
        if (!res.ok) throw new Error("Start failed");
        const { startedAt } = await res.json();

        // compute new timestamps
        window.startTs = new Date(startedAt).getTime();
        const units = { hours: 3600, days: 86400, weeks: 604800, months: 2592000 };
        window.betEndTs = window.startTs +
          window.durationValue * units[window.durationUnit] * 1000;

        // hide start button, show timer
        startBtn.style.display = "none";
        timerSection.style.display = "";

        initTimer();
      } catch (err) {
        console.error(err);
        alert("Could not start bet right now");
        startBtn.disabled = false;
        startBtn.textContent = "Start Bet";
      }
    });
  }

  // core countdown logic
  function initTimer() {
    if (!window.betEndTs || !display) return;
    clearInterval(window._matchIv);
    window._matchIv = setInterval(() => {
      const diff = window.betEndTs - Date.now();
      if (diff <= 0) {
        display.textContent = "Expired";
        clearInterval(window._matchIv);
        return;
      }
      const h = Math.floor(diff / 3600000),
            m = Math.floor((diff % 3600000) / 60000),
            s = Math.floor((diff % 60000) / 1000);
      display.textContent =
        String(h).padStart(2, "0") + ":" +
        String(m).padStart(2, "0") + ":" +
        String(s).padStart(2, "0");
    }, 1000);
  }
});