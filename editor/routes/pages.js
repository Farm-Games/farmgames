const fs = require('fs');
const path = require('path');
const { Router } = require('express');
const { PAGES_DIR } = require('../lib/paths');

const SANITIZE_REGEX = /[^a-z0-9_-]/gi;

const router = Router();

router.get('/', (req, res) => {
  try {
    const files = fs
      .readdirSync(PAGES_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace('.md', ''));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:name', (req, res) => {
  const filePath = path.join(PAGES_DIR, req.params.name + '.md');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Page not found' });
  }
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`  · Opened: ${req.params.name}`);
  res.json({ name: req.params.name, content });
});

router.put('/:name', (req, res) => {
  const name = req.params.name.replace(SANITIZE_REGEX, '_').toLowerCase();
  const filePath = path.join(PAGES_DIR, name + '.md');
  try {
    fs.writeFileSync(filePath, req.body.content || '');
    console.log(`  ✓ Saved: ${name}`);
    res.json({ name, saved: true });
  } catch (err) {
    console.log(`  ✗ Save failed: ${name} - ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:name', (req, res) => {
  const filePath = path.join(PAGES_DIR, req.params.name + '.md');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Page not found' });
  }
  try {
    fs.unlinkSync(filePath);
    console.log(`  ✓ Deleted: ${req.params.name}`);
    res.json({ deleted: true });
  } catch (err) {
    console.log(`  ✗ Delete failed: ${req.params.name} - ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
