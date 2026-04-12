/* global toastui */
import { $ } from './dom.js';
import { state } from './state.js';
import { uploadImageFile } from './api.js';
import { showToast } from './helpers.js';
import { updateUI } from './ui.js';
import { schedulePreview } from './preview.js';

const TOOLBAR_ITEMS = [
  ['heading', 'bold', 'italic', 'strike'],
  ['hr', 'quote'],
  ['ul', 'ol', 'task'],
  [
    'table',
    'image',
    {
      name: 'wikiLink',
      tooltip: 'Link to Wiki Page',
      text: '',
      className: 'toastui-editor-toolbar-icons link',
      command: 'wikiLink',
    },
  ],
  ['code', 'codeblock'],
];

const appendNewlineAfterTable = () => {
  const wwEl = document.querySelector('.toastui-editor-ww-container .ProseMirror');
  if (!wwEl) return;
  const lastChild = wwEl.lastElementChild;
  if (lastChild && lastChild.tagName === 'TABLE') {
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    wwEl.appendChild(p);
  }
};

export const createEditor = () => {
  const editor = new toastui.Editor({
    el: $('#editor'),
    initialEditType: 'wysiwyg',
    previewStyle: 'tab',
    height: '100%',
    usageStatistics: false,
    toolbarItems: TOOLBAR_ITEMS,
    hooks: {
      addImageBlobHook: async (blob, callback) => {
        try {
          const img = await uploadImageFile(blob);
          callback(img.url, img.name);
        } catch (err) {
          showToast('Image upload failed: ' + err.message, 'error');
        }
      },
    },
  });

  editor.on('change', () => {
    if (editor.isWysiwygMode()) appendNewlineAfterTable();
  });

  editor.on('change', () => {
    state.dirty = true;
    updateUI(editor);
    schedulePreview(editor);
  });

  return editor;
};
