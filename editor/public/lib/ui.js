import { $, $$ } from './dom.js';
import { state } from './state.js';
import { slugToTitle } from './helpers.js';

const EDITOR_TITLE = 'Farm Games Wiki Editor';

export const updateUI = (editor) => {
  const hasPage = state.currentPage !== null;
  const hasContent = editor.getMarkdown().trim().length > 0;
  $('#btnSave').disabled = !(hasPage || hasContent);
  $('#btnDelete').disabled = !hasPage;
  $('#currentPageLabel').textContent = hasPage
    ? slugToTitle(state.currentPage) + (state.dirty ? ' *' : '')
    : 'No page open';
  document.title = hasPage ? slugToTitle(state.currentPage) + ' - ' + EDITOR_TITLE : EDITOR_TITLE;
};

export const openModalFn = (modal) => {
  modal.classList.add('active');
  closeToolbarMenu();
};

export const closeModalFn = (modal) => {
  modal.classList.remove('active');
};

export const closeToolbarMenu = () => {
  $('#toolbarActions').classList.remove('open');
};

export const initModalClose = () => {
  $$('.modal-close').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      closeModalFn($('#' + modalId));
    });
  });

  $$('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModalFn(overlay);
    });
  });
};
