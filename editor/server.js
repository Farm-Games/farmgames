const express = require('express');
const { PUBLIC_DIR, CSS_DIR, IMAGES_DIR, MEDIA_DIR, PORT } = require('./lib/paths');
const { getLocalIP } = require('./lib/network');
const { serveFavicon } = require('./routes/config');

const app = express();
app.use(express.json());

app.use(express.static(PUBLIC_DIR));
app.use('/site-css', express.static(CSS_DIR));
app.use('/images', express.static(IMAGES_DIR));
app.use('/media', express.static(MEDIA_DIR));

const searchRouter = require('./routes/search');
app.post('/api/pages/link', searchRouter.linkHandler);
app.use('/api/pages', require('./routes/pages'));
app.use('/api/preview', require('./routes/preview'));
app.use('/api/images', require('./routes/images'));
app.use('/api/media', require('./routes/media'));
app.post('/api/search', searchRouter.searchHandler);
app.use('/api/config', require('./routes/config').configRouter);
app.use('/api/deploy', require('./routes/deploy'));
app.use('/api/update', require('./routes/update'));
app.use('/api/preview-server', require('./routes/preview-server'));
app.use('/favicon.ico', serveFavicon);

app.listen(PORT, '0.0.0.0', async () => {
  const localIP = getLocalIP();
  console.log('\n  Farm Games Wiki Editor running at:');
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
