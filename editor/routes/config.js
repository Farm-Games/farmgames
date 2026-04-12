const fs = require('fs');
const path = require('path');
const { Router } = require('express');
const { CSS_DIR } = require('../lib/paths');
const { loadSiteConfig, saveSiteConfig } = require('../lib/config');
const { faviconUpload } = require('../lib/upload');

const router = Router();

router.get('/', (req, res) => {
  res.json(loadSiteConfig());
});

router.put('/', (req, res) => {
  try {
    const config = loadSiteConfig();
    Object.assign(config, req.body);
    saveSiteConfig(config);
    console.log('  ✓ Settings saved');
    res.json(config);
  } catch (err) {
    console.log('  ✗ Settings save failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/favicon', faviconUpload.single('favicon'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No valid favicon file (ico, png, svg)' });
  try {
    const config = loadSiteConfig();
    config.favicon = req.file.filename;
    saveSiteConfig(config);
    console.log(`  ✓ Favicon uploaded: ${req.file.filename}`);
    res.json({ favicon: req.file.filename });
  } catch (err) {
    console.log('  ✗ Favicon upload failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const serveFavicon = (req, res) => {
  const config = loadSiteConfig();
  if (config.favicon) {
    const faviconPath = path.join(CSS_DIR, config.favicon);
    if (fs.existsSync(faviconPath)) return res.sendFile(faviconPath);
  }
  res.status(404).end();
};

module.exports = { configRouter: router, serveFavicon };
