import { $ } from '../lib/dom.js';
import { closeModalFn } from '../lib/ui.js';
import { renderFilterablePageList, loadPage } from '../lib/pages.js';

const renderPageList = (editor) => {
  renderFilterablePageList($('#pageList'), $('#openSearch'), $('#hideFileStubs'), (slug) => {
    loadPage(slug, editor);
    closeModalFn($('#openModal'));
  });
};

export const initOpenPageModal = (editor) => {
  $('#openSearch').addEventListener('input', () => renderPageList(editor));
  $('#hideFileStubs').addEventListener('change', () => renderPageList(editor));
};

export { renderPageList };
