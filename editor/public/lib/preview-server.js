import { $ } from './dom.js';
import { state } from './state.js';
import { api, postJson } from './api.js';
import { showToast } from './helpers.js';

const updatePreviewButton = () => {
  const btn = $('#btnPreview');
  if (state.previewRunning) {
    btn.textContent = '\u{23F9} Stop Preview';
    btn.title = 'Stop the preview server';
  } else {
    btn.textContent = '\u{1F441} Preview';
    btn.title = 'Open site preview';
  }
};

export const initPreviewServer = () => {
  api('/api/preview-server/status')
    .then((s) => {
      state.previewRunning = s.running;
      updatePreviewButton();
    })
    .catch(() => {});

  $('#btnPreview').addEventListener('click', async () => {
    const btn = $('#btnPreview');
    btn.disabled = true;
    if (state.previewRunning) {
      btn.textContent = 'Stopping...';
      try {
        await postJson('/api/preview-server/stop', {});
        state.previewRunning = false;
        if (state.previewWindow && !state.previewWindow.closed) state.previewWindow.close();
        state.previewWindow = null;
        showToast('Preview server stopped', 'success');
      } catch (err) {
        showToast('Stop failed: ' + err.message, 'error');
      }
    } else {
      btn.textContent = 'Starting...';
      try {
        const result = await postJson('/api/preview-server/start', {});
        state.previewRunning = true;
        const host = window.location.hostname;
        state.previewWindow = window.open(`http://${host}:${result.port}`, 'farmgames-preview');
        showToast('Preview server running on port ' + result.port, 'success');
      } catch (err) {
        showToast('Preview failed: ' + err.message, 'error');
      }
    }
    btn.disabled = false;
    updatePreviewButton();
  });
};
