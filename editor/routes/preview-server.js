const path = require('path');
const { spawn } = require('child_process');
const { Router } = require('express');
const { ROOT_DIR, PREVIEW_PORT } = require('../lib/paths');

const READY_SIGNAL = 'Site preview running';
const START_TIMEOUT_MS = 15000;

let previewProcess = null;

const router = Router();

const killPreviewServer = () => {
  if (previewProcess) {
    previewProcess.kill();
    previewProcess = null;
  }
};

router.post('/start', (req, res) => {
  if (previewProcess) {
    console.log('  · Preview server already running');
    return res.json({ running: true, port: PREVIEW_PORT });
  }
  console.log('  → Starting preview server...');
  previewProcess = spawn('node', [path.join(ROOT_DIR, 'preview-site.js')], {
    cwd: ROOT_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
    env: { ...process.env, BROWSER: 'none' },
  });
  previewProcess.on('close', () => {
    previewProcess = null;
  });

  let responded = false;
  const onReady = (data) => {
    if (!responded && data.toString().includes(READY_SIGNAL)) {
      responded = true;
      console.log(`  ✓ Preview server running on port ${PREVIEW_PORT}`);
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
  }, START_TIMEOUT_MS);
});

router.get('/status', (req, res) => {
  res.json({ running: !!previewProcess, port: PREVIEW_PORT });
});

router.post('/stop', (req, res) => {
  killPreviewServer();
  console.log('  ✓ Preview server stopped');
  res.json({ running: false });
});

process.on('exit', killPreviewServer);
process.on('SIGINT', () => {
  killPreviewServer();
  process.exit();
});
process.on('SIGTERM', () => {
  killPreviewServer();
  process.exit();
});

module.exports = router;
