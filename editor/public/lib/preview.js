import { $ } from './dom.js';
import { state } from './state.js';
import { api } from './api.js';
import { getTrueMarkdown } from './helpers.js';

const PREVIEW_DEBOUNCE_MS = 400;

export const renderPreview = async (editor) => {
  const markdown = getTrueMarkdown(editor);
  try {
    const html = await api('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown, pageName: state.currentPage || 'Untitled' }),
    });
    $('#previewFrame').srcdoc = html;
  } catch {
    // silently fail preview
  }
};

export const schedulePreview = (editor) => {
  clearTimeout(state.previewTimer);
  state.previewTimer = setTimeout(() => renderPreview(editor), PREVIEW_DEBOUNCE_MS);
};
