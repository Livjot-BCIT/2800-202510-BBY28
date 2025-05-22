function showModal(type, message, reloadAfter = false) {
    const modalId = type === 'success' ? 'successModal' : 'failModal';
    const messageId = type === 'success' ? 'successMessage' : 'failMessage';

    const modal = document.getElementById(modalId);
    const messageBox = document.getElementById(messageId);

    if (!modal || !messageBox) return;

    messageBox.textContent = message;
    modal.classList.remove('d-none');

    setTimeout(() => {
        modal.classList.add('d-none');
        if (reloadAfter && type === 'success') {
            window.location.reload();
        }
    }, 2000);
}
