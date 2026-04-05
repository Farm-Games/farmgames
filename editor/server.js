const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const showdown = require('showdown');
const { execSync } = require('child_process');
const { fileNameToTitle, SHOWDOWN_OPTIONS, renderPage } = require('../shared/template');

const ROOT_DIR = path.resolve(__dirname, '..');
const PAGES_DIR = path.join(ROOT_DIR, 'src', 'pages');
const IMAGES_DIR = path.join(ROOT_DIR, 'src', 'images');
const CSS_DIR = path.join(ROOT_DIR, 'src');
const PORT = 3456;

const converter = new showdown.Converter(SHOWDOWN_OPTIONS);

const previewExtraHead = `
        <base href="http://localhost:${PORT}/" />
        <style>
          body { margin: 0 auto; padding: 0 10px; }
          article { margin-top: 10px; }
          a { pointer-events: none; }
        </style>`;

// --- Image upload storage ---
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, IMAGES_DIR),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safeName);
  },
});
const upload = multer({ storage });

// --- Express app ---
const app = express();
app.use(express.json());

// Static: editor UI
app.use(express.static(path.join(__dirname, 'public')));

// Static: site CSS for preview iframe
app.use('/site-css', express.static(CSS_DIR));

// Static: images for preview iframe
app.use('/images', express.static(IMAGES_DIR));

// ======= PAGE API =======

app.get('/api/pages', (req, res) => {
  try {
    const files = fs.readdirSync(PAGES_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace('.md', ''));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pages/:name', (req, res) => {
  const filePath = path.join(PAGES_DIR, req.params.name + '.md');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Page not found' });
  }
  const content = fs.readFileSync(filePath, 'utf8');
  res.json({ name: req.params.name, content });
});

app.put('/api/pages/:name', (req, res) => {
  const name = req.params.name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  const filePath = path.join(PAGES_DIR, name + '.md');
  try {
    fs.writeFileSync(filePath, req.body.content || '');
    res.json({ name, saved: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/pages/:name', (req, res) => {
  const filePath = path.join(PAGES_DIR, req.params.name + '.md');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Page not found' });
  }
  try {
    fs.unlinkSync(filePath);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======= PREVIEW API =======

app.post('/api/preview', (req, res) => {
  const { markdown, pageName } = req.body;
  const html = converter.makeHtml(markdown || '');
  res.send(renderPage({
    cssRoot: '/site-css/',
    navRoot: '#',
    fileName: pageName || 'Untitled',
    content: html,
    extraHead: previewExtraHead,
  }));
});

// ======= IMAGE API =======

app.get('/api/images', (req, res) => {
  try {
    if (!fs.existsSync(IMAGES_DIR)) {
      return res.json([]);
    }
    const files = fs.readdirSync(IMAGES_DIR).filter((f) => /\.(jpe?g|png|gif|svg|webp)$/i.test(f));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/images', upload.array('images', 20), (req, res) => {
  const uploaded = (req.files || []).map((f) => ({
    name: f.filename,
    url: '/images/' + f.filename,
  }));
  res.json(uploaded);
});

// ======= DEPLOY API =======

function runGit(args) {
  return execSync(`git ${args}`, { cwd: ROOT_DIR, encoding: 'utf8', timeout: 30000 });
}

app.get('/api/deploy/summary', (req, res) => {
  try {
    const raw = runGit('status --porcelain');
    const lines = raw.split('\n').filter(Boolean);
    const summary = { created: [], edited: [], deleted: [] };
    for (const line of lines) {
      const code = line.substring(0, 2);
      const file = line.substring(3);
      const isPage = file.startsWith('src/pages/') && file.endsWith('.md');
      const isImage = file.startsWith('src/images/');
      const label = isPage
        ? file.replace('src/pages/', '').replace('.md', '')
        : isImage
          ? file.replace('src/images/', '')
          : file;
      const type = isPage ? 'page' : isImage ? 'image' : 'file';
      if (code === '??' || code.includes('A')) {
        summary.created.push({ label, type });
      } else if (code.includes('D')) {
        summary.deleted.push({ label, type });
      } else {
        summary.edited.push({ label, type });
      }
    }
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function cleanUnusedImages() {
  if (!fs.existsSync(IMAGES_DIR)) return 0;
  const imageFiles = fs.readdirSync(IMAGES_DIR).filter((f) => /\.(jpe?g|png|gif|svg|webp)$/i.test(f));
  if (imageFiles.length === 0) return 0;

  const pages = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.md'));
  const allContent = pages.map((f) => fs.readFileSync(path.join(PAGES_DIR, f), 'utf8')).join('\n');

  let removed = 0;
  for (const img of imageFiles) {
    if (!allContent.includes(img)) {
      fs.unlinkSync(path.join(IMAGES_DIR, img));
      removed++;
    }
  }
  return removed;
}

app.post('/api/deploy', (req, res) => {
  const message = (req.body.message || 'Update from editor').replace(/"/g, "'");
  const steps = [];
  try {
    const removed = cleanUnusedImages();
    if (removed > 0) {
      steps.push('Removed ' + removed + ' unused image(s)');
    }

    runGit('add -A');
    steps.push('Staged all changes');

    const status = runGit('status --porcelain');
    if (!status.trim()) {
      return res.json({ deployed: false, steps, message: 'Nothing to deploy -- no changes found.' });
    }

    runGit(`commit -m "${message}"`);
    steps.push('Committed: ' + message);

    try {
      runGit('pull --rebase origin master');
      steps.push('Synced with remote');
    } catch (pullErr) {
      const msg = pullErr.message || '';
      if (msg.includes('CONFLICT') || msg.includes('could not apply')) {
        runGit('rebase --abort');
        return res.status(500).json({
          deployed: false,
          steps,
          error: 'Your changes conflict with changes on the website. Please ask for help resolving this.',
        });
      }
      throw pullErr;
    }

    runGit('push origin master');
    steps.push('Pushed to origin/master');

    res.json({ deployed: true, steps });
  } catch (err) {
    steps.push('Error: ' + err.message);
    res.status(500).json({ deployed: false, steps, error: err.message });
  }
});

// ======= START =======

app.listen(PORT, async () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  Farm Games Wiki Editor running at: ${url}\n`);
  try {
    const open = (await import('open')).default;
    open(url);
  } catch {
    console.log('  (could not auto-open browser)');
  }
});
