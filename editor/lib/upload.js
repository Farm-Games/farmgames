const fs = require('fs');
const multer = require('multer');
const { IMAGES_DIR, MEDIA_DIR, CSS_DIR } = require('./paths');

const SAFE_FILENAME_REGEX = /[^a-zA-Z0-9._-]/g;

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const createStorage = (destDir) =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, destDir),
    filename: (req, file, cb) => {
      const safeName = file.originalname.replace(SAFE_FILENAME_REGEX, '_');
      cb(null, safeName);
    },
  });

ensureDir(IMAGES_DIR);
ensureDir(MEDIA_DIR);

const imageUpload = multer({ storage: createStorage(IMAGES_DIR) });
const mediaUpload = multer({ storage: createStorage(MEDIA_DIR) });

const faviconUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, CSS_DIR),
    filename: (req, file, cb) => cb(null, 'favicon.ico'),
  }),
  fileFilter: (req, file, cb) => {
    cb(null, /\.(ico|png|svg)$/i.test(file.originalname));
  },
});

module.exports = { imageUpload, mediaUpload, faviconUpload };
