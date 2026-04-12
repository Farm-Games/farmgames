const fs = require('fs');
const { Router } = require('express');
const { IMAGES_DIR } = require('../lib/paths');
const { imageUpload } = require('../lib/upload');

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|svg|webp)$/i;

const router = Router();

router.get('/', (req, res) => {
  try {
    if (!fs.existsSync(IMAGES_DIR)) return res.json([]);
    const files = fs.readdirSync(IMAGES_DIR).filter((f) => IMAGE_EXTENSIONS.test(f));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', imageUpload.array('images', 20), (req, res) => {
  const uploaded = (req.files || []).map((f) => ({
    name: f.filename,
    url: '/images/' + f.filename,
  }));
  if (uploaded.length) {
    console.log(
      `  ✓ Uploaded ${uploaded.length} image(s): ${uploaded.map((u) => u.name).join(', ')}`,
    );
  }
  res.json(uploaded);
});

module.exports = router;
