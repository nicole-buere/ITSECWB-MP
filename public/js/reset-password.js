document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.container');
  const token = container?.dataset?.token || '';

  const newPw   = document.getElementById('newPassword');
  const confPw  = document.getElementById('confirmPassword');
  const submit  = document.getElementById('submitReset');
  const msgBox  = document.getElementById('msg');

  const kbaSection = document.getElementById('kbaSection');
  const kbaPrompt  = document.getElementById('kbaPrompt');
  const kbaQid     = document.getElementById('kbaQuestionId');
  const kbaAnswer  = document.getElementById('kbaAnswer');

  const COMPLEXITY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=]).{8,}$/;

  function showMsg(text, ok=false) {
    if (!msgBox) return;
    msgBox.textContent = text || '';
    msgBox.style.color = ok ? '#064e3b' : '#7f1d1d';
  }

  // Load a security question for this token (if the account has KBA)
  async function loadKbaQuestion() {
    if (!token) return;
    try {
      const r = await fetch(`/api/users/kba/question-by-token?token=${encodeURIComponent(token)}`);
      if (!r.ok) return; // 404/204 => user has no KBA, skip
      const data = await r.json();
      if (data && data.question_id && data.prompt) {
        kbaSection.style.display = 'block';
        kbaPrompt.textContent = data.prompt;
        kbaQid.value = data.question_id;
      }
    } catch (e) {
      // ignore; page still works with email-only reset
      console.error('KBA fetch failed:', e);
    }
  }
  loadKbaQuestion();

  function validatePasswords() {
    const p1 = newPw.value || '';
    const p2 = confPw.value || '';
    if (!COMPLEXITY.test(p1)) {
      showMsg('Password must be ≥8 chars and include upper, lower, number, and symbol (@#$%^&+=).');
      return false;
    }
    if (p1 !== p2) {
      showMsg('Passwords do not match.');
      return false;
    }
    return true;
  }

  async function doReset() {
    showMsg('');
    if (!token) { showMsg('Missing or invalid reset token.'); return; }
    if (!validatePasswords()) return;

    submit.disabled = true;
    const orig = submit.textContent;
    submit.textContent = 'Resetting...';

    const body = {
      token,
      newPassword: newPw.value
    };

    // If KBA visible, include the answer & question id
    if (kbaSection.style.display !== 'none') {
      const ans = (kbaAnswer.value || '').trim();
      if (!ans) {
        showMsg('Please answer the security question.');
        submit.disabled = false;
        submit.textContent = orig;
        return;
      }
      body.kbaAnswer = ans;
      body.question_id = Number(kbaQid.value);
    }

    try {
      const resp = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await resp.json().catch(() => ({}));

      if (resp.ok) {
        showMsg(data.message || 'Password has been reset. Redirecting to login…', true);
        setTimeout(() => { window.location.href = '/'; }, 1500);
      } else {
        showMsg(data.message || `Reset failed (HTTP ${resp.status}).`);
        submit.disabled = false;
        submit.textContent = orig;
      }
    } catch (e) {
      console.error(e);
      showMsg('Network error. Please try again.');
      submit.disabled = false;
      submit.textContent = orig;
    }
  }

  submit?.addEventListener('click', doReset);
  confPw?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doReset();
  });
});
