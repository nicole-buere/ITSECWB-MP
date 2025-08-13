// public/js/profilefeatures.js
document.addEventListener('DOMContentLoaded', () => {
  // Make navigateTo available to inline onclick handlers in your HBS
  window.navigateTo = function (url) { window.location.href = url; };

  // ===== Delete Account =====
  const deleteAccountButton = document.getElementById("deleteAccountButton");
  if (deleteAccountButton) {
    deleteAccountButton.addEventListener("click", async function (e) {
      e.preventDefault();
      const confirmed = confirm("Are you sure you want to delete your account? This action cannot be undone.");
      if (!confirmed) { alert("Account deletion canceled."); return; }

      try {
        const reservationResponse = await fetch('/api/labs/deleteUserRes', { method: 'DELETE', credentials: 'include' });
        if (!reservationResponse.ok) { alert("Failed to delete reservations associated with your account. Please try again later."); return; }

        const accountResponse = await fetch('/api/users/delete', { method: 'DELETE', credentials: 'include' });
        if (accountResponse.ok) {
          alert("Your account and all associated reservations have been deleted.");
          window.location.href = '/';
        } else {
          alert("Failed to delete your account. Please try again later.");
        }
      } catch (error) {
        console.error("Error occurred while deleting account:", error);
        alert("An error occurred while deleting your account. Please try again later.");
      }
    });
  }

  // ===== Logout =====
  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const resp = await fetch('/api/users/logout', { method: 'POST', credentials: 'include' });
        if (resp.ok) {
          window.location.href = '/';
        } else {
          alert('Logout failed. Please try again.');
        }
      } catch (err) {
        console.error(err);
        alert('Network error during logout.');
      }
    });
  }

  // ===== Change Password =====
  const changePasswordButton        = document.getElementById("changePasswordButton");
  const passwordChangeModal         = document.getElementById("passwordChangeModal");
  const currentPasswordInput        = document.getElementById("currentPasswordInput");
  const newPasswordInput            = document.getElementById("newPasswordInput");
  const confirmNewPasswordInput     = document.getElementById("confirmNewPasswordInput");
  const confirmPasswordChangeButton = document.getElementById("confirmPasswordChangeButton");
  const cancelPasswordChangeButton  = document.getElementById("cancelPasswordChangeButton");
  const closePasswordChangeModal    = document.getElementById("closePasswordChangeModal");

  function openPwModal()  { if (passwordChangeModal) passwordChangeModal.style.display = "block"; }
  function closePwModal() { if (passwordChangeModal) passwordChangeModal.style.display = "none"; }



  function validateNewPassword(pw, confirmPw) {
    if (!pw || pw.trim().length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(pw))          return "Password must include at least 1 uppercase letter.";
    if (!/[a-z]/.test(pw))          return "Password must include at least 1 lowercase letter.";
    if (!/\d/.test(pw))             return "Password must include at least 1 number.";
    if (!/[@#$%^&+=]/.test(pw))     return "Password must include at least 1 special character (@#$%^&+=).";
    if (pw !== confirmPw)           return "Passwords do not match.";
    return null;
  }

  if (changePasswordButton) changePasswordButton.addEventListener("click", openPwModal);
  if (closePasswordChangeModal) closePasswordChangeModal.addEventListener("click", closePwModal);
  if (cancelPasswordChangeButton) cancelPasswordChangeButton.addEventListener("click", closePwModal);
  if (passwordChangeModal) {
    // Close when clicking backdrop (optional)
    passwordChangeModal.addEventListener('click', (e) => {
      if (e.target === passwordChangeModal) closePwModal();
    });
  }

  if (confirmPasswordChangeButton) {
    confirmPasswordChangeButton.addEventListener("click", async function (e) {
      e.preventDefault(); // important if your modal sits inside a <form>

      const currentPassword = currentPasswordInput ? currentPasswordInput.value : "";
      const newPassword     = newPasswordInput ? newPasswordInput.value : "";
      const confirmPw       = confirmNewPasswordInput ? confirmNewPasswordInput.value : "";

      if (!currentPassword || !currentPassword.trim()) {
        alert("Please enter your current password to confirm this change.");
        return;
      }

      const err = validateNewPassword(newPassword, confirmPw);
      if (err) { alert(err); return; }

      // Disable button to prevent double-submits
      confirmPasswordChangeButton.disabled = true;
      const originalText = confirmPasswordChangeButton.textContent;
      confirmPasswordChangeButton.textContent = "Saving...";

      try {
        const resp = await fetch('/api/users/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ currentPassword, newPassword })
        });

        // Try reading JSON, fallback to empty obj
        const data = await resp.json().catch(() => ({}));

        if (resp.ok) {
          alert(data.message || "Password changed successfully.");
          // Clear fields and close modal
          if (currentPasswordInput) currentPasswordInput.value = "";
          if (newPasswordInput) newPasswordInput.value = "";
          if (confirmNewPasswordInput) confirmNewPasswordInput.value = "";
          closePwModal();
        } else {
          // Server codes: 400 (wrong current / reused), 429 (changed too recently), 401 (not auth)
          alert(data.message || `Failed to change password (HTTP ${resp.status}).`);
        }
      } catch (e) {
        console.error(e);
        alert("Network error. Please try again.");
      } finally {
        confirmPasswordChangeButton.disabled = false;
        confirmPasswordChangeButton.textContent = originalText;
      }
    });

    // Submit on Enter in confirm field
    if (confirmNewPasswordInput) {
      confirmNewPasswordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') confirmPasswordChangeButton.click();
      });
    }

  }
// ===== Security Questions (KBA) =====
(async function initKbaSection() {
  const buttonsWrap = document.querySelector('.profile-buttons');
  if (!buttonsWrap) return;

  // Insert the "Set Security Questions" button (only if it doesn't exist yet)
  let kbaBtn = document.getElementById('setupKbaButton');
  if (!kbaBtn) {
    kbaBtn = document.createElement('button');
    kbaBtn.id = 'setupKbaButton';
    kbaBtn.className = 'profile-button';
    kbaBtn.textContent = 'Set Security Questions';
    buttonsWrap.insertBefore(kbaBtn, buttonsWrap.firstChild); // top of the list
  }

  // Status badge under the button
  let kbaStatus = document.getElementById('kbaStatus');
  if (!kbaStatus) {
    kbaStatus = document.createElement('div');
    kbaStatus.id = 'kbaStatus';
    kbaStatus.style.fontSize = '12px';
    kbaStatus.style.margin = '6px 0 12px';
    kbaStatus.style.opacity = '0.85';
    buttonsWrap.insertBefore(kbaStatus, kbaBtn.nextSibling);
  }

  // Build modal container once
  let kbaModal = document.getElementById('kbaModal');
  if (!kbaModal) {
    kbaModal = document.createElement('div');
    kbaModal.id = 'kbaModal';
    kbaModal.className = 'modal';
    kbaModal.style.display = 'none';
    kbaModal.innerHTML = `
      <div class="modal-content">
        <span class="close" id="closeKbaModal">&times;</span>
        <h3 style="margin:0 0 10px 0;">Set Security Questions</h3>
        <p style="margin:0 0 10px 0;font-size:14px;">
          Choose <strong>3 different questions</strong> and provide memorable answers.
        </p>

        <div class="input-container">
          <label style="display:block;margin-bottom:6px;">Question 1</label>
          <select id="kbaQ1" class="kba-select" style="width:100%;padding:8px;"></select>
          <textarea id="kbaA1" rows="2" class="kba-answer" placeholder="Your answer" style="width:100%;padding:8px;margin-top:6px;"></textarea>
          <div id="kbaHint1" style="font-size:12px;opacity:.8;margin-top:4px;"></div>
        </div>

        <div class="input-container">
          <label style="display:block;margin-bottom:6px;">Question 2</label>
          <select id="kbaQ2" class="kba-select" style="width:100%;padding:8px;"></select>
          <textarea id="kbaA2" rows="2" class="kba-answer" placeholder="Your answer" style="width:100%;padding:8px;margin-top:6px;"></textarea>
          <div id="kbaHint2" style="font-size:12px;opacity:.8;margin-top:4px;"></div>
        </div>

        <div class="input-container">
          <label style="display:block;margin-bottom:6px;">Question 3</label>
          <select id="kbaQ3" class="kba-select" style="width:100%;padding:8px;"></select>
          <textarea id="kbaA3" rows="2" class="kba-answer" placeholder="Your answer" style="width:100%;padding:8px;margin-top:6px;"></textarea>
          <div id="kbaHint3" style="font-size:12px;opacity:.8;margin-top:4px;"></div>
        </div>

        <div class="button-container">
          <button id="kbaSave"  type="button">Save</button>
          <button id="kbaCancel" type="button">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(kbaModal);
  }

  const els = {
    modal: kbaModal,
    close: kbaModal.querySelector('#closeKbaModal'),
    save:  kbaModal.querySelector('#kbaSave'),
    cancel:kbaModal.querySelector('#kbaCancel'),
    selects: [kbaModal.querySelector('#kbaQ1'), kbaModal.querySelector('#kbaQ2'), kbaModal.querySelector('#kbaQ3')],
    answers: [kbaModal.querySelector('#kbaA1'), kbaModal.querySelector('#kbaA2'), kbaModal.querySelector('#kbaA3')],
    hints: [kbaModal.querySelector('#kbaHint1'), kbaModal.querySelector('#kbaHint2'), kbaModal.querySelector('#kbaHint3')],
  };

  function openKba()  { els.modal.style.display = 'block'; }
  function closeKba() { els.modal.style.display = 'none'; }

  // Load pool + status
  let pool = [];
  let minLenMap = {};
  async function refreshStatusBadge() {
    try {
      const r = await fetch('/api/users/kba/me', { credentials: 'include' });
      if (!r.ok) throw 0;
      const j = await r.json();
      kbaStatus.textContent = j.enrolled ? 'Security questions: ✓ Set' : 'Security questions: Not set';
    } catch {
      kbaStatus.textContent = 'Security questions: —';
    }
  }
  await refreshStatusBadge();

  async function loadPool() {
    if (pool.length) return pool;
    const r = await fetch('/api/users/kba/questions', { credentials: 'include' });
    pool = await r.json();
    // Build map for min lengths
    minLenMap = Object.fromEntries(pool.map(q => [String(q.id), q.min_answer_len || 10]));
    return pool;
  }

  function fillSelectOptions() {
    els.selects.forEach(sel => {
      sel.innerHTML = `<option value="">— Choose a question —</option>` +
        pool.map(q => `<option value="${q.id}">${q.prompt}</option>`).join('');
    });
    updateHints(); // show default hints if any
  }

  function updateHints() {
    els.selects.forEach((sel, idx) => {
      const qid = sel.value;
      const min = qid ? (minLenMap[qid] ?? 10) : null;
      els.hints[idx].textContent = min ? `Minimum answer length: ${min} characters.` : '';
    });
  }

  function enforceDistinctSelects() {
    const selectedIds = new Set(els.selects.map(s => s.value).filter(Boolean));
    els.selects.forEach(sel => {
      [...sel.options].forEach(opt => {
        if (!opt.value) return; // skip placeholder
        // disable if another select already chose it
        opt.disabled = (opt.value !== sel.value) && selectedIds.has(opt.value);
      });
    });
  }

  // Events for modal & selects
  els.selects.forEach(sel => {
    sel.addEventListener('change', () => {
      enforceDistinctSelects();
      updateHints();
    });
  });

  kbaBtn.addEventListener('click', async () => {
    try {
      await loadPool();
      if (!pool || pool.length < 3) {
        alert('Security questions are not available right now. Please try again later.');
        return;
      }
      fillSelectOptions();
      els.answers.forEach(a => a.value = '');
      openKba();
    } catch (e) {
      console.error(e);
      alert('Could not load security questions.');
    }
  });

  els.close.addEventListener('click', closeKba);
  els.cancel.addEventListener('click', closeKba);
  els.modal.addEventListener('click', (e) => { if (e.target === els.modal) closeKba(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeKba(); });

  els.save.addEventListener('click', async () => {
    // Validate 3 distinct questions
    const ids = els.selects.map(s => s.value).filter(Boolean);
    if (ids.length !== 3 || new Set(ids).size !== 3) {
      alert('Please choose 3 different questions.');
      return;
    }
    // Validate answers min length
    for (let i = 0; i < 3; i++) {
      const id = ids[i];
      const ans = (els.answers[i].value || '').trim();
      const min = minLenMap[id] ?? 10;
      if (ans.length < min) {
        alert(`Answer ${i + 1} must be at least ${min} characters.`);
        els.answers[i].focus();
        return;
      }
    }

    // Submit
    els.save.disabled = true;
    const originalText = els.save.textContent;
    els.save.textContent = 'Saving...';
    try {
      const body = {
        answers: [
          { question_id: Number(ids[0]), answer: els.answers[0].value.trim() },
          { question_id: Number(ids[1]), answer: els.answers[1].value.trim() },
          { question_id: Number(ids[2]), answer: els.answers[2].value.trim() },
        ]
      };
      const resp = await fetch('/api/users/kba/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await resp.json().catch(() => ({}));

      if (resp.ok) {
        alert(data.message || 'Security answers saved.');
        closeKba();
        await refreshStatusBadge();
      } else {
        alert(data.message || `Failed to save (HTTP ${resp.status}).`);
      }
    } catch (e) {
      console.error(e);
      alert('Network error. Please try again.');
    } finally {
      els.save.disabled = false;
      els.save.textContent = originalText;

      // Submit on Enter in the last answer box
els.answers[2].addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    els.save.click();
  }
});

    }
  });
})();

  
});
