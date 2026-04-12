const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const express = require('express');

const PORT = 4000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const REBUILD_DEBOUNCE_MS = 500;
const RELOAD_SCRIPT = `<script>new EventSource('/__reload').onmessage=e=>{if(e.data==='reload')location.reload()}</script>`;
const WATCH_DIRS = [path.join(__dirname, 'src'), path.join(__dirname, 'shared')];

let clients = [];
let rebuildTimer = null;

const generate = () => {
  try {
    execSync('node generate_site.js', { cwd: __dirname, stdio: 'inherit' });
    return true;
  } catch {
    console.log('  Build failed, will retry on next change.');
    return false;
  }
};

const notifyClients = () => {
  clients.forEach((c) => c.write('data: reload\n\n'));
};

const scheduleRebuild = () => {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    console.log('\n  File changed, regenerating...');
    if (generate()) {
      console.log('  Reloading browsers...\n');
      notifyClients();
    }
  }, REBUILD_DEBOUNCE_MS);
};

const injectReloadScript = (html) => html.replace('</body>', RELOAD_SCRIPT + '</body>');

const resolveHtmlPath = (reqPath) => {
  const ext = path.extname(reqPath);
  if (ext && ext !== '.html') return null;
  let filePath = path.join(PUBLIC_DIR, reqPath);
  if (!ext) filePath += '.html';
  return fs.existsSync(filePath) ? filePath : null;
};

const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return null;
};

const startWatchers = () => {
  for (const dir of WATCH_DIRS) {
    if (fs.existsSync(dir)) {
      fs.watch(dir, { recursive: true }, scheduleRebuild);
    }
  }
};

console.log('  Generating site...');
generate();

const app = express();

app.get('/__reload', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('data: connected\n\n');
  clients.push(res);
  req.on('close', () => {
    clients = clients.filter((c) => c !== res);
  });
});

app.use((req, res, next) => {
  const filePath = resolveHtmlPath(req.path);
  if (filePath) {
    const html = injectReloadScript(fs.readFileSync(filePath, 'utf8'));
    res.type('html').send(html);
    return;
  }
  next();
});

app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

startWatchers();

app.listen(PORT, '0.0.0.0', async () => {
  const localIP = getLocalIP();
  console.log('\n  Site preview running at:');
  console.log(`    Local:   http://localhost:${PORT}`);
  if (localIP) console.log(`    Network: http://${localIP}:${PORT}`);
  console.log('    Watching for changes in src/ and shared/\n');
  if (process.env.BROWSER !== 'none') {
    try {
      const open = (await import('open')).default;
      open(`http://localhost:${PORT}`);
    } catch {}
  }
});
