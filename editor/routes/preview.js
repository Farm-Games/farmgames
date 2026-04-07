const { Router } = require('express');
const showdown = require('showdown');
const { SHOWDOWN_OPTIONS, renderPage, wrapTables } = require('../../shared/template');
const { loadSiteConfig } = require('../lib/config');
const { PORT } = require('../lib/paths');

const CONVERTER = new showdown.Converter(SHOWDOWN_OPTIONS);

const PREVIEW_EXTRA_STYLE = `
        <style>
          body { margin: 0 auto; padding: 0 10px; }
          article { margin-top: 10px; }
          a { pointer-events: none; }
        </style>`;

const router = Router();

router.post('/', (req, res) => {
  const { markdown, pageName } = req.body;
  const host = req.headers.host || `localhost:${PORT}`;
  const baseTag = `<base href="http://${host}/" />`;
  const html = wrapTables(CONVERTER.makeHtml(markdown || ''));
  res.send(
    renderPage({
      cssRoot: '/site-css/',
      navRoot: '#',
      fileName: pageName || 'Untitled',
      content: html,
      extraHead: baseTag + PREVIEW_EXTRA_STYLE,
      siteConfig: loadSiteConfig(),
    }),
  );
});

module.exports = router;
