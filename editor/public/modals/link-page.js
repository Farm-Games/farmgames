import { $, $$ } from '../lib/dom.js';
import { slugToTitle, showToast } from '../lib/helpers.js';
import { closeModalFn, openModalFn } from '../lib/ui.js';
import { renderFilterablePageList, loadPageList } from '../lib/pages.js';

const setLinkMode = (mode) => {
  $$('.link-mode-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.getAttribute('data-mode') === mode);
  });
  $('#linkModeWiki').style.display = mode === 'wiki' ? 'flex' : 'none';
  $('#linkModeUrl').style.display = mode === 'url' ? 'flex' : 'none';
};

const insertLink = (editor, text, url) => {
  if (editor.isWysiwygMode()) {
    editor.exec('addLink', { linkUrl: url, linkText: text });
  } else {
    editor.insertText(`[${text}](${url})`);
  }
  closeModalFn($('#linkPageModal'));
  showToast('Link inserted', 'success');
};

const renderLinkPageList = (editor) => {
  renderFilterablePageList(
    $('#linkPageList'),
    $('#linkPageSearch'),
    $('#linkPageHideStubs'),
    (slug) => insertLink(editor, slugToTitle(slug), slug),
  );
};

export const openLinkPageModal = async (editor) => {
  $('#linkPageSearch').value = '';
  $('#linkUrlText').value = '';
  $('#linkUrlHref').value = '';
  setLinkMode('wiki');
  await loadPageList();
  renderLinkPageList(editor);
  openModalFn($('#linkPageModal'));
  setTimeout(() => $('#linkPageSearch').focus(), 100);
};

export const initLinkPageModal = (editor) => {
  $$('.link-mode-tab').forEach((tab) => {
    tab.addEventListener('click', () => setLinkMode(tab.getAttribute('data-mode')));
  });

  $('#linkPageSearch').addEventListener('input', () => renderLinkPageList(editor));
  $('#linkPageHideStubs').addEventListener('change', () => renderLinkPageList(editor));

  $('#btnInsertUrl').addEventListener('click', () => {
    const text = $('#linkUrlText').value.trim();
    const url = $('#linkUrlHref').value.trim();
    if (!url) {
      showToast('Please enter a URL', 'error');
      return;
    }
    insertLink(editor, text || url, url);
  });

  $('#linkUrlHref').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#btnInsertUrl').click();
  });
};
