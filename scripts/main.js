document.addEventListener("DOMContentLoaded", () => {
  // — Timezone selector (unchanged) —
  const select = document.getElementById("regionSelect");
  const savedZone = localStorage.getItem("timezone");
  if (savedZone) select.value = savedZone;
  function updateTimestamps() {
    const tz = select.value;
    document.querySelectorAll(".timestamp").forEach((el) => {
      const iso = el.dataset.createdAt;
      if (!iso) return;
      el.textContent = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(iso));
    });
  }
  select.addEventListener("change", () => {
    localStorage.setItem("timezone", select.value);
    updateTimestamps();
  });
  updateTimestamps();

  // — modal elements & helpers —
  const modal = document.getElementById("betModal");
  const hdrAvatar = document.getElementById("modalAvatar");
  const hdrUser = document.getElementById("modalUsername");
  const hdrTime = document.getElementById("modalTimestamp");
  const hdrDurValue = document.getElementById("modalDurationValue");
  const hdrDurUnit = document.getElementById("modalDurationUnit");
  const hdrParts = document.getElementById("modalParticipants");
  const modalTitle = document.getElementById("modalTitle");
  const modalDescription = document.getElementById("modalDescription");
  const membersContainer = document.getElementById("modalMembers");
  const btnModalJoin = document.getElementById("modalJoin");
  const btnClose = modal.querySelector(".modal-close");

  function openModal() {
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    modal.style.display = "none";
    document.body.style.overflow = "";
  }

  function renderMembers(list, creatorId) {
    membersContainer.innerHTML = "";
    list.forEach((u) => {
      const div = document.createElement("div");
      div.className = "member-item";
      div.innerHTML = `
        <img src="${u.avatar || "/images/icons/userProfile.svg"}"
             class="member-avatar" />
        <span class="member-name">${u.firstName} ${u.lastName}</span>
        ${u._id === creatorId ? '<span class="member-owner">👑</span>' : ""}
      `;
      membersContainer.appendChild(div);
    });
  }

  // — single pass over cards —
  document.querySelectorAll(".bet-card").forEach((card) => {
    const betId = card.dataset.betId;
    const creator = card.dataset.creator;
    const joinedFlag = card.dataset.joined === "true";

    // 1) card-level join button
     // 1) card‑level join/manage/go‑to‑group button
    const joinBtn = card.querySelector(".join-button");
    joinBtn.addEventListener("click", async (e) => {
      e.stopPropagation();

      const isJoined = joinBtn.dataset.joined === "true";
      const isOwner  = joinBtn.dataset.owner  === "true";

      if (isJoined) {
        // if you're already in the bet, jump straight to the right page
        const dest = isOwner
          ? `/bets/${betId}/match_leaderboard`
          : `/bets/${betId}/match_leaderboard`;
        return window.location.href = dest;
      }

      // otherwise, do the AJAX join as before
      try {
        const res = await fetch(`/api/bets/${betId}/join`, { method: "POST" });
        if (!res.ok) throw new Error("join failed");
        const { participants } = await res.json();
        const cnt = participants.length;
        const short = cnt > 999
          ? cnt.toString().slice(0,3) + "…"
          : cnt;
        card.querySelector(".participants").textContent = `👥 ${short}`;
        card.dataset.members = JSON.stringify(participants);

        // if its modal is open, re‑render members too
        if ( modal.style.display === "flex"
          && modal.dataset.currentBet === betId
        ) {
          hdrParts.textContent = short;
          renderMembers(participants, creator);
          // now we’re joined:
          modal.dataset.joined = "true";
        }

        // and mark the button as joined:
        joinBtn.dataset.joined = "true";
        joinBtn.classList.add("joined");
        joinBtn.textContent = "Go to group";
      } catch (err) {
        console.error(err);
        alert("Could not join right now");
      }
    });

    // 2) card click opens modal
    card.addEventListener("click", () => {
      modal.dataset.currentBet = betId;
      modal.dataset.joined  = joinBtn.dataset.joined;
      modal.dataset.creator = creator;

      // header
      hdrAvatar.src = card.querySelector(".avatar").src;
      hdrUser.textContent = card.querySelector(".username").textContent;
      hdrTime.textContent = card.querySelector(".timestamp").textContent;
      hdrDurValue.textContent = card.dataset.durationValue;
      hdrDurUnit.textContent = card.dataset.durationUnit;
      hdrParts.textContent = card.dataset.participants;
      // body
      modalTitle.textContent = card.querySelector(".bet-title").textContent;
      modalDescription.textContent = card.dataset.description;
      // members
      const membersData = JSON.parse(card.dataset.members || "[]");
      renderMembers(membersData, creator);

       const meId = window.currentUserId;
     // use the `creator` you already pulled above, and the btnModalJoin you declared
     if (creator === meId) {
       btnModalJoin.textContent = "Manage";
       btnModalJoin.classList.add("joined");
     } else if (joinedFlag) {
       btnModalJoin.textContent = "Go to group";
       btnModalJoin.classList.add("joined");
     } else {
       btnModalJoin.textContent = "Join";
       btnModalJoin.classList.remove("joined");
     }

      openModal();
    });
  });

  // 3) modal’s Join button (same endpoint, same re-render)
  btnModalJoin.addEventListener("click", async (e) => {
    e.stopPropagation();
    const betId    = modal.dataset.currentBet;
    const isJoined = modal.dataset.joined === "true";
    const isOwner  = modal.dataset.creator === window.currentUserId;

    if (isJoined) {
      // already joined → navigate
      const dest = isOwner
        ? `/bets/${betId}/match_leaderboard`
        : `/bets/${betId}/chat`;
      return window.location.href = dest;
    }

    // else perform the join exactly like the card button
    try {
      const res = await fetch(`/api/bets/${betId}/join`, { method: "POST" });
      if (!res.ok) throw new Error("join failed");
      const { participants } = await res.json();
      const cnt   = participants.length;
      const short = cnt > 999 ? cnt.toString().slice(0,3) + "…" : cnt;

      hdrParts.textContent = short;
      const card = document.querySelector(`.bet-card[data-bet-id="${betId}"]`);
      card.querySelector(".participants").textContent = `👥 ${short}`;
      card.dataset.members = JSON.stringify(participants);
      renderMembers(participants, modal.dataset.creator);

      // now mark joined everywhere
      modal.dataset.joined = "true";
      joinBtn.dataset.joined = "true";
      btnModalJoin.classList.add("joined");
      btnModalJoin.textContent = "Go to group";
    } catch (err) {
      console.error(err);
      alert("Could not join right now");
    }
  });

  // close handlers
  btnClose.addEventListener("click", closeModal);
  window.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
});
