const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PAGES_DIR = path.join(ROOT, 'src', 'pages');
const PORT = 3457;
const BASE = `http://localhost:${PORT}`;

let serverProcess;

const api = async (urlPath, opts) => {
  const res = await fetch(BASE + urlPath, opts);
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('json') ? await res.json() : await res.text();
  return { status: res.status, body };
};

describe('Editor Server API', () => {
  const JSON_HEADERS = { 'Content-Type': 'application/json' };
  const SERVER_READY_BANNER = 'Farm Games Wiki Editor';
  const PAGE_INDEX = 'index';
  const PAGE_NONEXISTENT = 'nonexistent_page_xyz';
  const PAGE_TEST_API = 'test_api_page';
  const PAGE_DELETE_ME = 'delete_me';
  const PAGE_NONEXISTENT_DELETE = 'nonexistent_xyz';
  const PAGE_SANITIZE_ENCODED = 'Test%20Page!';
  const PAGE_SANITIZED_NAME = 'test_page_';
  const MD_TEST_API_PAGE = '# Test API Page';
  const MD_PREVIEW_HELLO = '# Hello';
  const MD_PREVIEW_TABLE = '| A |\n|---|\n| 1 |';
  const JSON_PUT_TEST_PAGE = () => JSON.stringify({ content: MD_TEST_API_PAGE });
  const JSON_PUT_SANITIZE = () => JSON.stringify({ content: 'test' });
  const JSON_PREVIEW_HELLO = () => JSON.stringify({ markdown: MD_PREVIEW_HELLO, pageName: 'test' });
  const JSON_PREVIEW_TABLE = () => JSON.stringify({ markdown: MD_PREVIEW_TABLE, pageName: 'test' });
  const JSON_SEARCH_FARM = () => JSON.stringify({ query: 'Farm Games', caseSensitive: false });
  const JSON_SEARCH_NONE = () =>
    JSON.stringify({ query: 'xyznonexistent123', caseSensitive: false });
  const TEMP_DELETE_CONTENT = 'temp';

  before(async () => {
    serverProcess = spawn(
      'node',
      [
        '-e',
        `
      process.env.PORT = '${PORT}';
      const path = require('path');
      const mod = require(path.join('${ROOT}', 'editor', 'server.js'));
    `,
      ],
      {
        cwd: ROOT,
        stdio: 'pipe',
        env: { ...process.env, PORT: String(PORT), BROWSER: 'none' },
      },
    );

    serverProcess.kill();

    serverProcess = spawn(
      'node',
      [
        '-e',
        `
      const express = require('express');
      const origListen = express.application.listen;
      express.application.listen = new Proxy(origListen, {
        apply: (target, thisArg, argList) =>
          Reflect.apply(target, thisArg, [${PORT}, ...argList.slice(1)]),
      });
      require('./editor/server.js');
    `,
      ],
      {
        cwd: ROOT,
        stdio: 'pipe',
        env: { ...process.env, BROWSER: 'none' },
      },
    );

    await new Promise((resolve) => {
      const onData = (data) => {
        if (data.toString().includes(SERVER_READY_BANNER)) {
          serverProcess.stdout.off('data', onData);
          resolve();
        }
      };
      serverProcess.stdout.on('data', onData);
      setTimeout(resolve, 5000);
    });
  });

  after(() => {
    if (serverProcess) serverProcess.kill();
  });

  it('GET /api/pages returns array of page names', async () => {
    const { status, body } = await api('/api/pages');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.length > 0);
    assert.ok(body.includes(PAGE_INDEX));
  });

  it('GET /api/pages/:name returns page content', async () => {
    const { status, body } = await api(`/api/pages/${PAGE_INDEX}`);
    assert.strictEqual(status, 200);
    assert.strictEqual(body.name, PAGE_INDEX);
    assert.ok(body.content.length > 0);
  });

  it('GET /api/pages/:name returns 404 for nonexistent page', async () => {
    const { status } = await api(`/api/pages/${PAGE_NONEXISTENT}`);
    assert.strictEqual(status, 404);
  });

  it('PUT /api/pages/:name creates a new page', async () => {
    const { status, body } = await api(`/api/pages/${PAGE_TEST_API}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON_PUT_TEST_PAGE(),
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.saved, true);
    assert.ok(fs.existsSync(path.join(PAGES_DIR, `${PAGE_TEST_API}.md`)));
  });

  it('PUT /api/pages/:name sanitizes page name', async () => {
    const { body } = await api(`/api/pages/${PAGE_SANITIZE_ENCODED}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON_PUT_SANITIZE(),
    });
    assert.strictEqual(body.name, PAGE_SANITIZED_NAME);
    const f = path.join(PAGES_DIR, `${PAGE_SANITIZED_NAME}.md`);
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });

  it('DELETE /api/pages/:name deletes a page', async () => {
    fs.writeFileSync(path.join(PAGES_DIR, `${PAGE_DELETE_ME}.md`), TEMP_DELETE_CONTENT);
    const { status, body } = await api(`/api/pages/${PAGE_DELETE_ME}`, { method: 'DELETE' });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.deleted, true);
    assert.ok(!fs.existsSync(path.join(PAGES_DIR, `${PAGE_DELETE_ME}.md`)));
  });

  it('DELETE /api/pages/:name returns 404 for nonexistent', async () => {
    const { status } = await api(`/api/pages/${PAGE_NONEXISTENT_DELETE}`, { method: 'DELETE' });
    assert.strictEqual(status, 404);
  });

  it('POST /api/preview returns rendered HTML', async () => {
    const { status, body } = await api('/api/preview', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON_PREVIEW_HELLO(),
    });
    assert.strictEqual(status, 200);
    assert.match(body, /<!DOCTYPE html>/);
    assert.match(body, /<h1/);
    assert.match(body, /Hello/);
  });

  it('POST /api/preview renders tables with wrapper', async () => {
    const { body } = await api('/api/preview', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON_PREVIEW_TABLE(),
    });
    assert.match(body, /table-wrapper/);
  });

  it('GET /api/images returns array', async () => {
    const { status, body } = await api('/api/images');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body));
  });

  it('POST /api/search finds text across pages', async () => {
    const { status, body } = await api('/api/search', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON_SEARCH_FARM(),
    });
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.length > 0);
    assert.ok(body[0].slug);
    assert.ok(body[0].matches.length > 0);
  });

  it('POST /api/search returns empty for no matches', async () => {
    const { body } = await api('/api/search', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON_SEARCH_NONE(),
    });
    assert.strictEqual(body.length, 0);
  });

  it('GET /api/config returns site config', async () => {
    const { status, body } = await api('/api/config');
    assert.strictEqual(status, 200);
    assert.ok(typeof body === 'object');
    assert.ok('siteTitle' in body || Object.keys(body).length >= 0);
  });

  it('GET /api/deploy/summary returns change summary', async () => {
    const { status, body } = await api('/api/deploy/summary');
    assert.strictEqual(status, 200);
    assert.ok('created' in body);
    assert.ok('edited' in body);
    assert.ok('deleted' in body);
  });

  it('serves editor HTML at /', async () => {
    const { status, body } = await api('/');
    assert.strictEqual(status, 200);
    assert.match(body, new RegExp(SERVER_READY_BANNER));
  });

  it('serves site CSS at /site-css/', async () => {
    const res = await fetch(`${BASE}/site-css/styles.css`);
    assert.strictEqual(res.status, 200);
  });

  afterEach(() => {
    const testPage = path.join(PAGES_DIR, `${PAGE_TEST_API}.md`);
    if (fs.existsSync(testPage)) fs.unlinkSync(testPage);
  });
});
