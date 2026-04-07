import { $ } from './dom.js';
import { postJson } from './api.js';
import { showToast } from './helpers.js';

const RELOAD_DELAY_MS = 3000;

export const initUpdateButton = () => {
  $('#btnUpdate').addEventListener('click', async () => {
    if (!confirm('This will pull the latest changes and restart the editor. Continue?')) return;
    const btn = $('#btnUpdate');
    btn.disabled = true;
    btn.textContent = 'Updating...';
    try {
      await postJson('/api/update', {});
      showToast('Update complete -- editor is restarting...', 'success');
      setTimeout(() => window.location.reload(), RELOAD_DELAY_MS);
    } catch (err) {
      showToast('Update failed: ' + err.message, 'error');
      btn.disabled = false;
      btn.textContent = '\u{1F504} Update';
    }
  });
};
