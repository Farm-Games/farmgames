import { $ } from '../lib/dom.js';
import { state } from '../lib/state.js';
import { slugToTitle, sanitizeSlug, showToast } from '../lib/helpers.js';
import { updateUI, closeModalFn } from '../lib/ui.js';
import { renderPreview } from '../lib/preview.js';
import { savePage } from '../lib/pages.js';

const validateNewPageName = () => {
  const raw = $('#newPageName').value;
  const slug = sanitizeSlug(raw);
  if (!raw) {
    $('#newPageHint').textContent = '';
    $('#newPageHint').className = 'input-hint';
    $('#btnCreatePage').disabled = true;
    return null;
  }
  if (slug !== raw) {
    $('#newPageHint').textContent = 'Will be saved as: ' + slug;
    $('#newPageHint').className = 'input-hint';
  } else {
    $('#newPageHint').textContent = '';
  }
  if (state.allPages.includes(slug)) {
    $('#newPageHint').textContent = 'A page with this name already exists.';
    $('#newPageHint').className = 'input-hint error';
    $('#btnCreatePage').disabled = true;
    return null;
  }
  $('#btnCreatePage').disabled = false;
  return slug;
};

const createNewPage = (editor) => {
  const slug = validateNewPageName();
  if (!slug) return;
  const shouldSave = state.saveAfterNaming;
  state.saveAfterNaming = false;
  state.currentPage = slug;
  if (!shouldSave) editor.setMarkdown('');
  state.dirty = true;
  state.allPages.push(slug);
  state.allPages.sort();
  updateUI(editor);
  closeModalFn($('#newModal'));
  $('#newPageName').value = '';
  $('#newPageHint').textContent = '';
  if (shouldSave) {
    savePage(editor);
  } else {
    showToast('New page: ' + slugToTitle(slug) + ' (not saved yet)', 'success');
  }
  renderPreview(editor);
};

export const initNewPageModal = (editor) => {
  $('#newPageName').addEventListener('input', validateNewPageName);
  $('#newPageName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createNewPage(editor);
  });
  $('#btnCreatePage').addEventListener('click', () => createNewPage(editor));
};
