import { $ } from '../lib/dom.js';
import { api } from '../lib/api.js';
import { openModalFn } from '../lib/ui.js';
import { renderPreview } from '../lib/preview.js';

export const initSettingsModal = (editor) => {
  $('#btnSettings').addEventListener('click', async () => {
    $('#settingsFeedback').textContent = '';
    $('#settingsFeedback').className = 'deploy-feedback';
    try {
      const config = await api('/api/config');
      $('#settingSiteTitle').value = config.siteTitle || '';
      $('#settingPageTitle').value = config.pageTitle || '';
      $('#faviconPreview').src = config.favicon ? '/site-css/' + config.favicon : '';
    } catch {
      $('#settingSiteTitle').value = '';
      $('#settingPageTitle').value = '';
      $('#faviconPreview').src = '';
    }
    openModalFn($('#settingsModal'));
  });

  $('#btnSaveSettings').addEventListener('click', async () => {
    try {
      await api('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteTitle: $('#settingSiteTitle').value.trim(),
          pageTitle: $('#settingPageTitle').value.trim(),
        }),
      });
      $('#settingsFeedback').textContent = 'Settings saved.';
      $('#settingsFeedback').className = 'deploy-feedback success';
      renderPreview(editor);
    } catch (err) {
      $('#settingsFeedback').textContent = 'Save failed: ' + err.message;
      $('#settingsFeedback').className = 'deploy-feedback error';
    }
  });

  $('#btnUploadFavicon').addEventListener('click', () => $('#faviconFileInput').click());

  $('#faviconFileInput').addEventListener('change', async () => {
    const input = $('#faviconFileInput');
    if (!input.files.length) return;
    const formData = new FormData();
    formData.append('favicon', input.files[0]);
    try {
      const result = await api('/api/config/favicon', { method: 'POST', body: formData });
      $('#faviconPreview').src = '/site-css/' + result.favicon;
      $('#settingsFeedback').textContent = 'Favicon uploaded.';
      $('#settingsFeedback').className = 'deploy-feedback success';
    } catch (err) {
      $('#settingsFeedback').textContent = 'Upload failed: ' + err.message;
      $('#settingsFeedback').className = 'deploy-feedback error';
    }
    input.value = '';
  });
};
