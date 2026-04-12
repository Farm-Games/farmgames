const fs = require('fs');
const path = require('path');
const { PAGES_DIR, IMAGES_DIR, MEDIA_DIR } = require('./paths');

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|svg|webp)$/i;
const MEDIA_EXTENSIONS = /\.(mp4|webm|ogg|mp3|wav|m4a)$/i;

const readAllPageContent = () => {
  const pages = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.md'));
  return pages.map((f) => fs.readFileSync(path.join(PAGES_DIR, f), 'utf8')).join('\n');
};

const cleanUnusedFiles = (dir, extensionRegex) => {
  if (!fs.existsSync(dir)) return 0;
  const files = fs.readdirSync(dir).filter((f) => extensionRegex.test(f));
  if (files.length === 0) return 0;

  const allContent = readAllPageContent();
  let removed = 0;
  for (const file of files) {
    if (!allContent.includes(file)) {
      fs.unlinkSync(path.join(dir, file));
      removed++;
    }
  }
  return removed;
};

const cleanUnusedImages = () => cleanUnusedFiles(IMAGES_DIR, IMAGE_EXTENSIONS);

const cleanUnusedMedia = () => cleanUnusedFiles(MEDIA_DIR, MEDIA_EXTENSIONS);

module.exports = { cleanUnusedImages, cleanUnusedMedia };
