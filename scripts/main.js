document.addEventListener("DOMContentLoaded", () => {
  // — Timezone selector (unchanged) —
  const select = document.getElementById("regionSelect");
  const savedZone = localStorage.getItem("timezone");
  if (savedZone) select.value = savedZone;
  function updateTimestamps() {
    const tz = select.value;
    document.querySelectorAll(".timestamp").forEach(el => {
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
  const modal            = document.getElementById("betModal");
  const hdrAvatar        = document.getElementById("modalAvatar");
  const hdrUser          = document.getElementById("modalUsername");
  const hdrTime          = document.getElementById("modalTimestamp");
  const hdrDurValue      = document.getElementById("modalDurationValue");
  const hdrDurUnit       = document.getElementById("modalDurationUnit");
  const hdrParts         = document.getElementById("modalParticipants");
  const modalTitle       = document.getElementById("modalTitle");
  const modalDescription = document.getElementById("modalDescription");
  const membersContainer = document.getElementById("modalMembers");
  const btnModalJoin     = document.getElementById("modalJoin");
  const btnClose         = modal.querySelector(".modal-close");

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
  list.forEach(u => {
    const avatar = u.profilePictureUrl || "/images/icons/userprofile.svg";
    const name   = `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Unknown";

    const div = document.createElement("div");
    div.className = "member-item";
    div.innerHTML = `
      <img src="${avatar}"
           class="member-avatar" />
      <span class="member-name">${name}</span>
      ${u._id === creatorId ? '<span class="member-owner">👑</span>' : ''}
    `;
    membersContainer.appendChild(div);
  });
}

  // — single pass over cards —
  document.querySelectorAll(".bet-card").forEach(card => {
    const betId   = card.dataset.betId;
    const creator = card.dataset.creator;

    // 1) card-level join button
    const joinBtn = card.querySelector(".join-button");
    joinBtn.addEventListener("click", async e => {
      e.stopPropagation(); // don’t open the modal
      try {
        const res = await fetch(`/api/bets/${betId}/join`, { method: "POST" });
        if (!res.ok) throw new Error("join failed");
        const { participants } = await res.json();
        const cnt = participants.length;
        const short = cnt>999
          ? cnt.toString().slice(0,3)+"…"
          : cnt;
        card.querySelector(".participants").textContent = `👥 ${short}`;
        // update card.dataset.members for future modal opens
        card.dataset.members = JSON.stringify(participants);
        // if this card’s modal is open, re-render
        if (modal.style.display==="flex"
            && modal.dataset.currentBet===betId) {
          hdrParts.textContent = short;
          renderMembers(participants, creator);
        }
      } catch(err) {
        console.error(err);
        alert("Could not join right now");
      }
    });

    // 2) card click opens modal
    card.addEventListener("click", () => {
      modal.dataset.currentBet = betId;
      // header
      hdrAvatar.src        = card.querySelector(".avatar").src;
      hdrUser.textContent  = card.querySelector(".username").textContent;
      hdrTime.textContent  = card.querySelector(".timestamp").textContent;
      hdrDurValue.textContent = card.dataset.durationValue;
      hdrDurUnit .textContent = card.dataset.durationUnit;
      hdrParts.textContent    = card.dataset.participants;
      // body
      modalTitle.textContent       = card.querySelector(".bet-title").textContent;
      modalDescription.textContent = card.dataset.description;
      // members
      const membersData = JSON.parse(card.dataset.members||"[]");
      renderMembers(membersData, creator);

      openModal();
    });
  });

  // 3) modal’s Join button (same endpoint, same re-render)
  btnModalJoin.addEventListener("click", async e => {
    e.stopPropagation();
    const betId = modal.dataset.currentBet;
    const creator = document.querySelector(`.bet-card[data-bet-id="${betId}"]`)
                             .dataset.creator;
    try {
      const res = await fetch(`/api/bets/${betId}/join`, { method: "POST" });
      if (!res.ok) throw new Error("join failed");
      const { participants } = await res.json();
      const cnt = participants.length;
      const short = cnt>999
        ? cnt.toString().slice(0,3)+"…"
        : cnt;
      hdrParts.textContent = short;
      // update feed card too
      const card = document.querySelector(`.bet-card[data-bet-id="${betId}"]`);
      card.querySelector(".participants").textContent = `👥 ${short}`;
      card.dataset.members = JSON.stringify(participants);
      renderMembers(participants, creator);
    } catch(err) {
      console.error(err);
      alert("Could not join right now");
    }
  });

  // close handlers
  btnClose.addEventListener("click", closeModal);
  window.addEventListener("click", e => {
    if (e.target===modal) closeModal();
  });
});
