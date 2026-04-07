import { $ } from './dom.js';
import { state } from './state.js';

const TOAST_DURATION_MS = 3000;
const ESCAPE_REGEX = /[.*+?^${}()|[\]\\]/g;
const IMG_CLASS_REGEX = /<img[^>]*src="([^"]*)"[^>]*class="[^"]*"[^>]*\/?>/gi;

export const escapeRegex = (str) => str.replace(ESCAPE_REGEX, '\\$&');

export const slugToTitle = (slug) => {
  if (slug === 'index') return 'Homepage';
  return slug
    .split('_')
    .map((w) => {
      try {
        return w[0].toUpperCase() + w.substring(1);
      } catch {
        return w;
      }
    })
    .join(' ');
};

export const sanitizeSlug = (input) =>
  input
    .replace(/[^a-z0-9_-]/gi, '_')
    .toLowerCase()
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');

export const showToast = (message, type) => {
  const toast = $('#toast');
  toast.textContent = message;
  toast.className = 'toast visible' + (type ? ' toast-' + type : '');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.className = 'toast';
  }, TOAST_DURATION_MS);
};

export const getTrueMarkdown = (editor) => {
  let md = editor.getMarkdown();
  if (!state.savedContent) return md;
  let match;
  while ((match = IMG_CLASS_REGEX.exec(state.savedContent)) !== null) {
    const src = match[1];
    const escapedSrc = escapeRegex(src);
    md = md.replace(new RegExp(`<img[^>]*src="${escapedSrc}"[^>]*/?>`, 'i'), match[0]);
    md = md.replace(new RegExp(`!\\[[^\\]]*\\]\\(${escapedSrc}\\)`), match[0]);
  }
  return md;
};
