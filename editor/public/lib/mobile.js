import { $, $$ } from './dom.js';
import { closeToolbarMenu } from './ui.js';
import { renderPreview } from './preview.js';

export const initMobile = (editor) => {
  $$('.mobile-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      $$('.mobile-toggle-btn').forEach((b) => b.classList.toggle('active', b === btn));
      if (view === 'editor') {
        $('#editorPane').classList.remove('mobile-hidden');
        $('#previewPane').classList.add('mobile-hidden');
      } else {
        $('#editorPane').classList.add('mobile-hidden');
        $('#previewPane').classList.remove('mobile-hidden');
        renderPreview(editor);
      }
    });
  });

  $('#previewPane').classList.add('mobile-hidden');

  $('#hamburgerBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    $('#toolbarActions').classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!$('#toolbarActions').contains(e.target) && e.target !== $('#hamburgerBtn')) {
      closeToolbarMenu();
    }
  });
};
