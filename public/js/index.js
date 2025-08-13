

document.addEventListener('DOMContentLoaded', () => {
  const forgotLink = document.getElementById('forgotPasswordLink');
  const modal      = document.getElementById('forgotModal');
  const closeBtn   = document.getElementById('forgotClose');
  const cancelBtn  = document.getElementById('forgotCancel');
  const submitBtn  = document.getElementById('forgotSubmit');
  const inputField = document.getElementById('emailOrUsername');

  if (!forgotLink || !modal) return;

  const openModal = () => {
    modal.style.display = 'block';
    setTimeout(() => inputField && inputField.focus(), 0);
  };
  const closeModal = () => {
    modal.style.display = 'none';
    if (inputField) inputField.value = '';
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send link';
    }
  };

  forgotLink.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  // Submit on Enter
  inputField.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitBtn.click(); });

  submitBtn.addEventListener('click', async () => {
    const v = (inputField.value || '').trim();
    if (!v) { alert('Please enter your email or username.'); inputField.focus(); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      await fetch('/api/users/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername: v })
      });
      // Always generic to avoid user enumeration
      alert('If an account exists, a reset link has been sent.');
      closeModal();
    } catch (e) {
      console.error(e);
      alert('Something went wrong. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send link';
    }
  });
});
