import { $, $$ } from './dom.js';
import { state } from './state.js';
import { closeModalFn } from './ui.js';
import { hideImagePopover, hideLinkPopover } from './popovers.js';
import { savePage } from './pages.js';

export const initKeyboardShortcuts = (editor, openLinkAcrossModal) => {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      savePage(editor);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      $('#btnDeployOpen').click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
      e.preventDefault();
      openLinkAcrossModal();
    }
    if (e.key === 'Escape') {
      $$('.modal-overlay.active').forEach((m) => closeModalFn(m));
      hideImagePopover();
      hideLinkPopover();
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (state.dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
};
