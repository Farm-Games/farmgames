import { $ } from './lib/dom.js';
import { state } from './lib/state.js';
import { updateUI, initModalClose, openModalFn } from './lib/ui.js';
import { renderPreview } from './lib/preview.js';
import { loadPageList, savePage, deletePage } from './lib/pages.js';
import { initPopovers } from './lib/popovers.js';
import { createEditor } from './lib/editor-setup.js';
import { initNewPageModal } from './modals/new-page.js';
import { initOpenPageModal, renderPageList } from './modals/open-page.js';
import { openLinkPageModal, initLinkPageModal } from './modals/link-page.js';
import { openLinkAcrossModal, initLinkAcrossModal } from './modals/link-across.js';
import { initSettingsModal } from './modals/settings.js';
import { initDeployModal } from './modals/deploy.js';
import { initConflictModal } from './modals/conflicts.js';
import { initKeyboardShortcuts } from './lib/keyboard.js';
import { initMobile } from './lib/mobile.js';
import { initPreviewServer } from './lib/preview-server.js';
import { initUpdateButton } from './lib/update.js';

const POPOVER_INIT_DELAY_MS = 500;

const editor = createEditor();

editor.addCommand('wysiwyg', 'wikiLink', () => {
  openLinkPageModal(editor);
  return true;
});
editor.addCommand('markdown', 'wikiLink', () => {
  openLinkPageModal(editor);
  return true;
});

initModalClose();
setTimeout(() => initPopovers(editor), POPOVER_INIT_DELAY_MS);

initOpenPageModal(editor);
initNewPageModal(editor);
initLinkPageModal(editor);
initLinkAcrossModal();
initSettingsModal(editor);
initDeployModal(editor);
initConflictModal();
initUpdateButton();
initPreviewServer();
initKeyboardShortcuts(editor, openLinkAcrossModal);
initMobile(editor);

$('#btnNew').addEventListener('click', () => {
  state.saveAfterNaming = false;
  $('#newPageName').value = '';
  $('#newPageHint').textContent = '';
  $('#btnCreatePage').disabled = true;
  openModalFn($('#newModal'));
  setTimeout(() => $('#newPageName').focus(), 100);
});

$('#btnOpen').addEventListener('click', async () => {
  $('#openSearch').value = '';
  await loadPageList();
  renderPageList(editor);
  openModalFn($('#openModal'));
  setTimeout(() => $('#openSearch').focus(), 100);
});

$('#btnSave').addEventListener('click', () => savePage(editor));
$('#btnDelete').addEventListener('click', () => deletePage(editor));
$('#btnLinkAcross').addEventListener('click', openLinkAcrossModal);

updateUI(editor);
renderPreview(editor);
