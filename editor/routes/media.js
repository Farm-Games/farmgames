const fs = require('fs');
const { Router } = require('express');
const { MEDIA_DIR } = require('../lib/paths');
const { mediaUpload } = require('../lib/upload');

const MEDIA_EXTENSIONS = /\.(mp4|webm|ogg|mp3|wav|m4a)$/i;

const router = Router();

router.get('/', (req, res) => {
  try {
    if (!fs.existsSync(MEDIA_DIR)) return res.json([]);
    const files = fs.readdirSync(MEDIA_DIR).filter((f) => MEDIA_EXTENSIONS.test(f));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', mediaUpload.array('media', 10), (req, res) => {
  const uploaded = (req.files || []).map((f) => ({
    name: f.filename,
    url: '/media/' + f.filename,
  }));
  if (uploaded.length) {
    console.log(
      `  ✓ Uploaded ${uploaded.length} media file(s): ${uploaded.map((u) => u.name).join(', ')}`,
    );
  }
  res.json(uploaded);
});

module.exports = router;
