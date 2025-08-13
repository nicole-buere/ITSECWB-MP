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
});
