document.addEventListener('DOMContentLoaded', () => {
  const wrap = document.querySelector('.reset-card');
  const token = wrap?.getAttribute('data-token');
  const newPw = document.getElementById('newPassword');
  const confirmPw = document.getElementById('confirmPassword');
  const btn = document.getElementById('submitReset');
  const msg = document.getElementById('msg');

  if (!wrap || !token || !btn) return;

  const COMPLEXITY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=]).{8,}$/;

  function show(m, ok=false) {
    if (!msg) return;
    msg.textContent = m;
    msg.style.color = ok ? 'green' : 'crimson';
  }

  btn.addEventListener('click', async () => {
    const p1 = newPw.value || '';
    const p2 = confirmPw.value || '';

    if (p1 !== p2) { show('Passwords do not match.'); return; }
    if (!COMPLEXITY.test(p1)) {
      show('Password must be ≥8 chars and include uppercase, lowercase, a number, and a symbol (@#$%^&+=).');
      return;
    }

    btn.disabled = true;
    const oldLabel = btn.textContent;
    btn.textContent = 'Saving...';
    show('');

    try {
      const resp = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: p1 })
      });

      const data = await resp.json().catch(() => ({}));
      if (resp.ok) {
        show(data.message || 'Password has been reset.', true);
        setTimeout(() => { window.location.href = '/'; }, 1200);
      } else {
        show(data.message || `Reset failed (HTTP ${resp.status}).`);
        btn.disabled = false;
        btn.textContent = oldLabel;
      }
    } catch (e) {
      console.error(e);
      show('Network error. Please try again.');
      btn.disabled = false;
      btn.textContent = oldLabel;
    }
  });

  // enter to submit
  confirmPw.addEventListener('keydown', e => {
    if (e.key === 'Enter') btn.click();
  });
});
