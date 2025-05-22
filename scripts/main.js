document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('regionSelect');

  // Try to restore previously saved timezone
  const savedZone = localStorage.getItem('timezone');
  if (savedZone) {
    select.value = savedZone;
  }

  // Timezone formatting
  function updateTimestamps() {
    const tz = select.value;
    document.querySelectorAll('.timestamp').forEach(el => {
      const iso = el.dataset.createdAt;
      if (!iso) return;
      const dt = new Date(iso);
      el.textContent = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(dt);
    });
  }

  //  When they pick a new region, save it & re‐render
  select.addEventListener('change', () => {
    localStorage.setItem('timezone', select.value);
    updateTimestamps();
  });

  // Initial render
  updateTimestamps();


  // Modal logic 
  const modal       = document.getElementById('betModal');
  const modalBody   = document.getElementById('modalBody');
  const modalClose  = modal.querySelector('.modal-close');

  document.querySelectorAll('.bet-card').forEach(card => {
    card.addEventListener('click', () => {
      modalBody.innerHTML = card.innerHTML;
      modal.style.display  = 'block';
    });
  });
  modalClose.addEventListener('click', () => modal.style.display = 'none');
  window.addEventListener('click', e => {
    if (e.target === modal) modal.style.display = 'none';
  });
});
