const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const showdown = require('showdown');
const { execSync } = require('child_process');
const { fileNameToTitle, SHOWDOWN_OPTIONS, renderPage, wrapTables } = require('../shared/template');
const { replaceLinkInLine } = require('../shared/link-replace');

const ROOT_DIR = path.resolve(__dirname, '..');
const PAGES_DIR = path.join(ROOT_DIR, 'src', 'pages');
const IMAGES_DIR = path.join(ROOT_DIR, 'src', 'images');
const CSS_DIR = path.join(ROOT_DIR, 'src');
const CONFIG_PATH = path.join(ROOT_DIR, 'site.config.json');
const PORT = 3456;

const converter = new showdown.Converter(SHOWDOWN_OPTIONS);

function loadSiteConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { return {}; }
}

function saveSiteConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
}

const previewExtraStyle = `
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

// ======= SEARCH API =======

app.post('/api/search', (req, res) => {
  const { query, caseSensitive } = req.body;
  if (!query) return res.json([]);
  try {
    const files = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.md'));
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    const results = [];
    for (const file of files) {
      const slug = file.replace('.md', '');
      const content = fs.readFileSync(path.join(PAGES_DIR, file), 'utf8');
      const lines = content.split('\n');
      const matches = [];
      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          matches.push({ id: `${slug}:${i + 1}`, line: i + 1, text: lines[i].trim().substring(0, 120) });
        }
        regex.lastIndex = 0;
      }
      if (matches.length > 0) {
        results.push({ slug, matches });
      }
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======= LINK ACROSS PAGES API =======

app.post('/api/pages/link', (req, res) => {
  const { query, caseSensitive, targetSlug, replaceText, selectedLines } = req.body;
  if (!query || !targetSlug) return res.status(400).json({ error: 'Missing query or target' });
  try {
    const files = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.md'));
    const flags = caseSensitive ? '' : 'i';
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingLinkRegex = new RegExp(`\\[${escaped}\\]\\([^)]*\\)`, flags + 'g');
    const plainRegex = new RegExp(escaped, flags + 'g');
    let totalReplaced = 0;
    let pagesModified = 0;

    const selectedSet = selectedLines ? new Set(selectedLines) : null;

    for (const file of files) {
      const slug = file.replace('.md', '');
      const filePath = path.join(PAGES_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      let fileModified = false;

      for (let i = 0; i < lines.length; i++) {
        const lineId = `${slug}:${i + 1}`;
        if (selectedSet && !selectedSet.has(lineId)) continue;
        if (!existingLinkRegex.test(lines[i]) && !plainRegex.test(lines[i])) continue;
        existingLinkRegex.lastIndex = 0;
        plainRegex.lastIndex = 0;

        const updated = replaceLinkInLine(lines[i], query, targetSlug, replaceText, caseSensitive);

        if (updated !== lines[i]) {
          lines[i] = updated;
          totalReplaced++;
          fileModified = true;
        }
      }

      if (fileModified) {
        fs.writeFileSync(filePath, lines.join('\n'));
        pagesModified++;
      }
    }
    res.json({ totalReplaced, pagesModified });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======= SITE CONFIG API =======

app.get('/api/config', (req, res) => {
  res.json(loadSiteConfig());
});

app.put('/api/config', (req, res) => {
  try {
    const config = loadSiteConfig();
    Object.assign(config, req.body);
    saveSiteConfig(config);
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const faviconUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, CSS_DIR),
    filename: (req, file, cb) => cb(null, 'favicon.ico'),
  }),
  fileFilter: (req, file, cb) => {
    cb(null, /\.(ico|png|svg)$/i.test(file.originalname));
  },
});

app.post('/api/config/favicon', faviconUpload.single('favicon'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No valid favicon file (ico, png, svg)' });
  try {
    const config = loadSiteConfig();
    config.favicon = req.file.filename;
    saveSiteConfig(config);
    res.json({ favicon: req.file.filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Static: favicon for preview
app.use('/favicon.ico', (req, res) => {
  const config = loadSiteConfig();
  if (config.favicon) {
    const faviconPath = path.join(CSS_DIR, config.favicon);
    if (fs.existsSync(faviconPath)) return res.sendFile(faviconPath);
  }
  res.status(404).end();
});

// ======= PREVIEW API =======

app.post('/api/preview', (req, res) => {
  const { markdown, pageName } = req.body;
  const host = req.headers.host || `localhost:${PORT}`;
  const baseTag = `<base href="http://${host}/" />`;
  const html = wrapTables(converter.makeHtml(markdown || ''));
  res.send(renderPage({
    cssRoot: '/site-css/',
    navRoot: '#',
    fileName: pageName || 'Untitled',
    content: html,
    extraHead: baseTag + previewExtraStyle,
    siteConfig: loadSiteConfig(),
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
      const entry = { label, type, file };
      if (code === '??' || code.includes('A')) {
        summary.created.push(entry);
      } else if (code.includes('D')) {
        summary.deleted.push(entry);
      } else {
        summary.edited.push(entry);
      }
    }
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/deploy/revert', (req, res) => {
  const { files } = req.body;
  if (!files || !files.length) return res.status(400).json({ error: 'No files specified' });
  try {
    const reverted = [];
    for (const file of files) {
      const safe = file.replace(/"/g, '');
      try {
        runGit(`checkout HEAD -- "${safe}"`);
        reverted.push(safe);
      } catch {
        const fullPath = path.join(ROOT_DIR, safe);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          reverted.push(safe + ' (removed)');
        }
      }
    }
    res.json({ reverted });
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
  const selectedFiles = req.body.files;
  const steps = [];
  try {
    const removed = cleanUnusedImages();
    if (removed > 0) {
      steps.push('Removed ' + removed + ' unused image(s)');
    }

    if (selectedFiles && selectedFiles.length > 0) {
      const safeFiles = selectedFiles.map((f) => `"${f.replace(/"/g, '')}"`).join(' ');
      runGit(`add ${safeFiles}`);
      steps.push('Staged ' + selectedFiles.length + ' file(s)');
    } else {
      runGit('add -A');
      steps.push('Staged all changes');
    }

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

// ======= UPDATE API =======

app.post('/api/update', (req, res) => {
  try {
    const status = runGit('status --porcelain');
    if (status.trim()) {
      return res.status(400).json({ error: 'You have unsaved changes. Please deploy or discard them before updating.' });
    }
    const output = runGit('pull origin master');
    res.json({ updated: true, output });
    setTimeout(() => {
      console.log('\n  Restarting editor after update...\n');
      process.exit(0);
    }, 500);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======= PREVIEW SERVER =======

const { spawn } = require('child_process');
let previewProcess = null;
const PREVIEW_PORT = 4000;

app.post('/api/preview-server/start', (req, res) => {
  if (previewProcess) {
    return res.json({ running: true, port: PREVIEW_PORT });
  }
  previewProcess = spawn('node', [path.join(ROOT_DIR, 'preview-site.js')], {
    cwd: ROOT_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
    env: { ...process.env, BROWSER: 'none' },
  });
  previewProcess.on('close', () => { previewProcess = null; });

  let responded = false;
  const onReady = (data) => {
    if (!responded && data.toString().includes('Site preview running')) {
      responded = true;
      res.json({ running: true, port: PREVIEW_PORT });
    }
  };
  previewProcess.stdout.on('data', onReady);
  previewProcess.stderr.on('data', onReady);

  setTimeout(() => {
    if (!responded) {
      responded = true;
      res.json({ running: true, port: PREVIEW_PORT });
    }
  }, 15000);
});

app.get('/api/preview-server/status', (req, res) => {
  res.json({ running: !!previewProcess, port: PREVIEW_PORT });
});

app.post('/api/preview-server/stop', (req, res) => {
  killPreviewServer();
  res.json({ running: false });
});

function killPreviewServer() {
  if (previewProcess) {
    previewProcess.kill();
    previewProcess = null;
  }
}

process.on('exit', killPreviewServer);
process.on('SIGINT', () => { killPreviewServer(); process.exit(); });
process.on('SIGTERM', () => { killPreviewServer(); process.exit(); });

// ======= START =======

function getLocalIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return null;
}

app.listen(PORT, '0.0.0.0', async () => {
  const localIP = getLocalIP();
  console.log(`\n  Farm Games Wiki Editor running at:`);
  console.log(`    Local:   http://localhost:${PORT}`);
  if (localIP) console.log(`    Network: http://${localIP}:${PORT}`);
  console.log('');
  try {
    const open = (await import('open')).default;
    open(`http://localhost:${PORT}`);
  } catch {
    console.log('  (could not auto-open browser)');
  }
});
