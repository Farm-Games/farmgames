const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const express = require('express');

const PORT = 4000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const WATCH_DIRS = [
  path.join(__dirname, 'src'),
  path.join(__dirname, 'shared'),
];

let clients = [];

function generate() {
  try {
    execSync('node generate_site.js', { cwd: __dirname, stdio: 'inherit' });
    return true;
  } catch {
    console.log('  Build failed, will retry on next change.');
    return false;
  }
}

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
  const ext = path.extname(req.path);
  if (!ext || ext === '.html') {
    let filePath = path.join(PUBLIC_DIR, req.path);
    if (!ext) filePath += '.html';
    if (fs.existsSync(filePath)) {
      let html = fs.readFileSync(filePath, 'utf8');
      const reloadScript = `<script>new EventSource('/__reload').onmessage=e=>{if(e.data==='reload')location.reload()}</script>`;
      html = html.replace('</body>', reloadScript + '</body>');
      res.type('html').send(html);
      return;
    }
  }
  next();
});

app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

let rebuildTimer = null;

function scheduleRebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    console.log('\n  File changed, regenerating...');
    if (generate()) {
      console.log('  Reloading browsers...\n');
      clients.forEach((c) => c.write('data: reload\n\n'));
    }
  }, 500);
}

for (const dir of WATCH_DIRS) {
  if (!fs.existsSync(dir)) continue;
  fs.watch(dir, { recursive: true }, scheduleRebuild);
}

app.listen(PORT, '0.0.0.0', async () => {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  let localIP = null;
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) { localIP = iface.address; break; }
    }
    if (localIP) break;
  }
  console.log(`\n  Site preview running at:`);
  console.log(`    Local:   http://localhost:${PORT}`);
  if (localIP) console.log(`    Network: http://${localIP}:${PORT}`);
  console.log(`    Watching for changes in src/ and shared/\n`);
  if (process.env.BROWSER !== 'none') {
    try {
      const open = (await import('open')).default;
      open(`http://localhost:${PORT}`);
    } catch {}
  }
});
