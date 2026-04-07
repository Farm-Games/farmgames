const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const PAGES_DIR = path.join(ROOT_DIR, 'src', 'pages');
const IMAGES_DIR = path.join(ROOT_DIR, 'src', 'images');
const MEDIA_DIR = path.join(ROOT_DIR, 'src', 'media');
const CSS_DIR = path.join(ROOT_DIR, 'src');
const CONFIG_PATH = path.join(ROOT_DIR, 'site.config.json');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = 3456;
const PREVIEW_PORT = 4000;

module.exports = {
  ROOT_DIR,
  PAGES_DIR,
  IMAGES_DIR,
  MEDIA_DIR,
  CSS_DIR,
  CONFIG_PATH,
  PUBLIC_DIR,
  PORT,
  PREVIEW_PORT,
};
