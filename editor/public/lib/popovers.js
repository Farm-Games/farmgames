/* global FloatingUIDOM */
import { $ } from './dom.js';
import { state } from './state.js';
import { api, uploadImageFile, putJson } from './api.js';
import { showToast, escapeRegex } from './helpers.js';
import { updateUI } from './ui.js';
import { renderPreview } from './preview.js';

const POPOVER_PLACEMENT = 'bottom-start';
const POPOVER_MIDDLEWARE = [
  FloatingUIDOM.offset(4),
  FloatingUIDOM.flip(),
  FloatingUIDOM.shift({ padding: 8 }),
];

const positionPopover = (reference, floating) =>
  FloatingUIDOM.autoUpdate(reference, floating, () => {
    FloatingUIDOM.computePosition(reference, floating, {
      placement: POPOVER_PLACEMENT,
      middleware: POPOVER_MIDDLEWARE,
    }).then(({ x, y }) => {
      Object.assign(floating.style, { left: x + 'px', top: y + 'px' });
    });
  });

let cleanupImagePopover = null;
let cleanupLinkPopover = null;
let replaceTarget = null;

export const showImagePopover = (imgEl, editor) => {
  const imagePopover = $('#imagePopover');
  state.activePopoverImg = imgEl;
  $('#popoverAltInput').value = imgEl.alt || '';

  const src = imgEl.getAttribute('src') || '';
  const md = state.savedContent || editor.getMarkdown();
  const escapedSrc = escapeRegex(src);
  const htmlMatch = md.match(
    new RegExp(`<img[^>]*src="${escapedSrc}"[^>]*class="([^"]*)"[^>]*/?>`, 'i'),
  );
  const classes = htmlMatch ? htmlMatch[1] : imgEl.className || '';
  const sizeMatch = classes.match(/img-(small|medium|large|full)/);
  const alignMatch = classes.match(/img-(left|center|right)/);
  $('#popoverSize').value = sizeMatch ? sizeMatch[0] : '';
  $('#popoverAlign').value = alignMatch ? alignMatch[0] : '';

  imagePopover.classList.add('active');
  if (cleanupImagePopover) cleanupImagePopover();
  cleanupImagePopover = positionPopover(imgEl, imagePopover);
};

export const hideImagePopover = () => {
  $('#imagePopover').classList.remove('active');
  state.activePopoverImg = null;
  if (cleanupImagePopover) {
    cleanupImagePopover();
    cleanupImagePopover = null;
  }
};

export const showLinkPopover = (linkEl) => {
  const linkPopover = $('#linkPopover');
  state.activePopoverLink = linkEl;
  $('#linkPopoverText').value = linkEl.textContent || '';
  $('#linkPopoverUrl').value = linkEl.getAttribute('href') || '';
  linkPopover.classList.add('active');
  if (cleanupLinkPopover) cleanupLinkPopover();
  cleanupLinkPopover = positionPopover(linkEl, linkPopover);
};

export const hideLinkPopover = () => {
  $('#linkPopover').classList.remove('active');
  state.activePopoverLink = null;
  if (cleanupLinkPopover) {
    cleanupLinkPopover();
    cleanupLinkPopover = null;
  }
};

export const initPopovers = (editor) => {
  const wwEl = document.querySelector('.toastui-editor-ww-container .ProseMirror');
  if (!wwEl) return;

  wwEl.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (e.target.tagName === 'IMG') {
      hideLinkPopover();
      showImagePopover(e.target, editor);
    } else if (link) {
      e.preventDefault();
      hideImagePopover();
      showLinkPopover(link);
    } else {
      hideImagePopover();
      hideLinkPopover();
    }
  });

  initImagePopoverActions(editor);
  initLinkPopoverActions(editor);

  document.addEventListener('click', (e) => {
    if (!$('#imagePopover').contains(e.target) && e.target.tagName !== 'IMG') {
      hideImagePopover();
    }
    if (!$('#linkPopover').contains(e.target) && !e.target.closest('a')) {
      hideLinkPopover();
    }
  });
};

const initImagePopoverActions = (editor) => {
  $('#popoverReplace').addEventListener('click', () => {
    replaceTarget = state.activePopoverImg;
    hideImagePopover();
    $('#imageReplaceInput').click();
  });

  $('#imageReplaceInput').addEventListener('change', async () => {
    const input = $('#imageReplaceInput');
    if (!input.files.length || !replaceTarget) return;
    try {
      const img = await uploadImageFile(input.files[0]);
      const md = editor.getMarkdown();
      const oldSrc = replaceTarget.getAttribute('src');
      const oldAlt = replaceTarget.alt || img.name;
      const updated = md.replace(
        new RegExp(`!\\[([^\\]]*)\\]\\(${escapeRegex(oldSrc)}\\)`),
        `![${oldAlt}](${img.url})`,
      );
      editor.setMarkdown(updated);
      showToast('Image replaced', 'success');
    } catch (err) {
      showToast('Replace failed: ' + err.message, 'error');
    }
    input.value = '';
    replaceTarget = null;
  });

  $('#popoverDelete').addEventListener('click', () => {
    if (!state.activePopoverImg) return;
    const md = editor.getMarkdown();
    const src = state.activePopoverImg.getAttribute('src');
    const updated = md.replace(
      new RegExp(`\\n?!\\[([^\\]]*)\\]\\(${escapeRegex(src)}\\)\\n?`),
      '\n',
    );
    editor.setMarkdown(updated);
    hideImagePopover();
    showToast('Image removed', 'success');
  });

  $('#popoverSave').addEventListener('click', async () => {
    if (!state.activePopoverImg || !state.currentPage) return;
    const src = state.activePopoverImg.getAttribute('src');
    const newAlt = $('#popoverAltInput').value;
    const size = $('#popoverSize').value;
    const align = $('#popoverAlign').value;
    const classes = [size, align].filter(Boolean).join(' ');
    const escapedSrc = escapeRegex(src);
    const mdImgRegex = new RegExp(`\\n?!\\[([^\\]]*)\\]\\(${escapedSrc}\\)\\n?`);
    const htmlImgRegex = new RegExp(`\\n?<img[^>]*src="${escapedSrc}"[^>]*/?>\\n?`, 'i');

    try {
      const page = await api('/api/pages/' + encodeURIComponent(state.currentPage));
      let md = page.content;
      if (classes) {
        const htmlTag = `\n<img src="${src}" alt="${newAlt}" class="${classes}" />\n`;
        md = htmlImgRegex.test(md)
          ? md.replace(htmlImgRegex, htmlTag)
          : md.replace(mdImgRegex, htmlTag);
      } else {
        const plainImg = `\n![${newAlt}](${src})\n`;
        if (htmlImgRegex.test(md)) {
          md = md.replace(htmlImgRegex, plainImg);
        } else {
          md = md.replace(
            new RegExp(`!\\[([^\\]]*)\\]\\(${escapedSrc}\\)`),
            `![${newAlt}](${src})`,
          );
        }
      }
      await putJson('/api/pages/' + encodeURIComponent(state.currentPage), { content: md });
      state.savedContent = md;
      editor.setMarkdown(md);
      state.dirty = false;
      updateUI(editor);
      hideImagePopover();
      renderPreview(editor);
      showToast('Image updated', 'success');
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error');
    }
  });
};

const initLinkPopoverActions = (editor) => {
  $('#linkPopoverSave').addEventListener('click', () => {
    if (!state.activePopoverLink) return;
    const md = editor.getMarkdown();
    const oldHref = state.activePopoverLink.getAttribute('href');
    const oldText = state.activePopoverLink.textContent;
    const newText = $('#linkPopoverText').value || oldText;
    const newUrl = $('#linkPopoverUrl').value || oldHref;
    const updated = md.replace(
      new RegExp(`\\[${escapeRegex(oldText)}\\]\\(${escapeRegex(oldHref)}\\)`),
      `[${newText}](${newUrl})`,
    );
    editor.setMarkdown(updated);
    hideLinkPopover();
    showToast('Link updated', 'success');
  });

  $('#linkPopoverDelete').addEventListener('click', () => {
    if (!state.activePopoverLink) return;
    const md = editor.getMarkdown();
    const href = state.activePopoverLink.getAttribute('href');
    const text = state.activePopoverLink.textContent;
    const updated = md.replace(
      new RegExp(`\\[${escapeRegex(text)}\\]\\(${escapeRegex(href)}\\)`),
      text,
    );
    editor.setMarkdown(updated);
    hideLinkPopover();
    showToast('Link removed', 'success');
  });
};
