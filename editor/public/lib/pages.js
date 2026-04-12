import { $ } from './dom.js';
import { state } from './state.js';
import { api, putJson } from './api.js';
import { slugToTitle, showToast, getTrueMarkdown } from './helpers.js';
import { updateUI, openModalFn, closeModalFn } from './ui.js';
import { renderPreview } from './preview.js';

const PAGE_LIST_EMPTY = '<li class="page-list-empty">No pages found</li>';

export const renderFilterablePageList = (listEl, searchEl, hideStubsEl, onSelect) => {
  const search = searchEl.value.toLowerCase();
  const hideStubs = hideStubsEl.checked;
  let filtered = state.allPages;
  if (hideStubs) filtered = filtered.filter((p) => !p.startsWith('file_'));
  if (search) {
    filtered = filtered.filter(
      (p) => p.toLowerCase().includes(search) || slugToTitle(p).toLowerCase().includes(search),
    );
  }
  filtered.sort((a, b) => {
    if (a === 'index') return -1;
    if (b === 'index') return 1;
    return a.localeCompare(b);
  });
  if (filtered.length === 0) {
    listEl.innerHTML = PAGE_LIST_EMPTY;
    return;
  }
  listEl.innerHTML = filtered
    .map(
      (p) =>
        `<li data-page="${p}"><span class="page-title">${slugToTitle(p)}</span><span class="page-slug">${p}</span></li>`,
    )
    .join('');
  listEl.querySelectorAll('li[data-page]').forEach((li) => {
    li.addEventListener('click', () => onSelect(li.getAttribute('data-page')));
  });
};

export const loadPageList = async () => {
  try {
    state.allPages = await api('/api/pages');
  } catch (err) {
    showToast('Failed to load pages: ' + err.message, 'error');
  }
};

export const loadPage = async (name, editor) => {
  try {
    const data = await api('/api/pages/' + encodeURIComponent(name));
    state.currentPage = data.name;
    state.savedContent = data.content || '';
    editor.setMarkdown(state.savedContent);
    state.dirty = false;
    updateUI(editor);
    renderPreview(editor);
    showToast('Opened: ' + slugToTitle(name), 'success');
  } catch (err) {
    showToast('Failed to open page: ' + err.message, 'error');
  }
};

export const savePage = async (editor) => {
  if (!state.currentPage) {
    state.saveAfterNaming = true;
    await loadPageList();
    $('#newPageName').value = '';
    $('#newPageHint').textContent = '';
    $('#btnCreatePage').disabled = true;
    openModalFn($('#newModal'));
    setTimeout(() => $('#newPageName').focus(), 100);
    return;
  }
  try {
    const content = getTrueMarkdown(editor);
    await putJson('/api/pages/' + encodeURIComponent(state.currentPage), { content });
    state.savedContent = content;
    state.dirty = false;
    updateUI(editor);
    showToast('Saved: ' + slugToTitle(state.currentPage), 'success');
  } catch (err) {
    showToast('Failed to save: ' + err.message, 'error');
  }
};

export const deletePage = async (editor) => {
  if (!state.currentPage) return;
  const name = state.currentPage;
  if (!confirm('Delete "' + slugToTitle(name) + '"? This cannot be undone.')) return;
  try {
    await api('/api/pages/' + encodeURIComponent(name), { method: 'DELETE' });
    state.currentPage = null;
    editor.setMarkdown('');
    state.dirty = false;
    updateUI(editor);
    renderPreview(editor);
    showToast('Deleted: ' + slugToTitle(name), 'success');
    state.allPages = state.allPages.filter((p) => p !== name);
  } catch (err) {
    showToast('Failed to delete: ' + err.message, 'error');
  }
};
