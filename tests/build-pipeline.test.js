const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PAGES_DIR = path.join(ROOT, 'src', 'pages');

describe('Site generation (generate_site.js)', () => {
  const INDEX_HTML = 'index.html';
  const DENLEY_PAGE = '2021_denley_tournament.html';
  const SITEMAP_HTML = 'sitemap.html';
  const CNAME_FILENAME = 'CNAME';
  const CNAME_CONTENT = 'farmgames.uk';
  const STYLES_CSS = 'styles.css';
  const RESET_CSS = 'reset.css';
  const SITE_TITLE = 'Farm Games Wiki';
  const REGEX_SITEMAP_EXCLUDES_FILE_STUB = /href="file_/;
  const REGEX_SITEMAP_EXCLUDES_INDEX = /href="index"/;
  const REGEX_SEARCH_EXCLUDES_FILE_VALUE = /value="file_/;
  const NO_TABLES_MSG = 'no tables in any page to test';
  const MD_SOURCES_MSG = 'should have markdown source files';

  beforeEach(() => {
    execSync('node generate_site.js', { cwd: ROOT, stdio: 'pipe' });
  });

  it('creates public/ directory', () => {
    assert.ok(fs.existsSync(PUBLIC_DIR));
  });

  it('generates HTML files for markdown pages', () => {
    const mdFiles = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.md'));
    assert.ok(mdFiles.length > 0, MD_SOURCES_MSG);
    for (const md of mdFiles) {
      const htmlFile = path.join(PUBLIC_DIR, md.replace('.md', '.html'));
      assert.ok(fs.existsSync(htmlFile), `${md} should have a corresponding HTML file`);
    }
  });

  it('copies CSS files to public/', () => {
    assert.ok(fs.existsSync(path.join(PUBLIC_DIR, STYLES_CSS)));
    assert.ok(fs.existsSync(path.join(PUBLIC_DIR, RESET_CSS)));
  });

  it('generates CNAME file', () => {
    const cname = path.join(PUBLIC_DIR, CNAME_FILENAME);
    assert.ok(fs.existsSync(cname));
    assert.strictEqual(fs.readFileSync(cname, 'utf8'), CNAME_CONTENT);
  });

  it('generates sitemap.html', () => {
    assert.ok(fs.existsSync(path.join(PUBLIC_DIR, SITEMAP_HTML)));
  });

  it('sitemap excludes file_* stubs', () => {
    const sitemap = fs.readFileSync(path.join(PUBLIC_DIR, SITEMAP_HTML), 'utf8');
    assert.doesNotMatch(sitemap, REGEX_SITEMAP_EXCLUDES_FILE_STUB);
  });

  it('sitemap excludes index page', () => {
    const sitemap = fs.readFileSync(path.join(PUBLIC_DIR, SITEMAP_HTML), 'utf8');
    assert.doesNotMatch(sitemap, REGEX_SITEMAP_EXCLUDES_INDEX);
  });

  it('generated HTML contains CSS links', () => {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, INDEX_HTML), 'utf8');
    assert.match(html, /reset\.css/);
    assert.match(html, /styles\.css/);
  });

  it('generated HTML contains Google Fonts', () => {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, INDEX_HTML), 'utf8');
    assert.match(html, /fonts\.googleapis\.com/);
  });

  it('generated HTML contains page search dropdown', () => {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, DENLEY_PAGE), 'utf8');
    assert.match(html, /id="search"/);
    assert.match(html, /nice-select2/);
  });

  it('search dropdown excludes file_* stubs', () => {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, DENLEY_PAGE), 'utf8');
    assert.doesNotMatch(html, REGEX_SEARCH_EXCLUDES_FILE_VALUE);
  });

  it('tables are wrapped in div.table-wrapper', () => {
    const pages = fs.readdirSync(PUBLIC_DIR).filter((f) => f.endsWith('.html'));
    let foundTable = false;
    for (const page of pages) {
      const html = fs.readFileSync(path.join(PUBLIC_DIR, page), 'utf8');
      if (html.includes('<table>')) {
        foundTable = true;
        assert.match(html, /class="table-wrapper"/);
      }
    }
    if (!foundTable) {
      assert.ok(true, NO_TABLES_MSG);
    }
  });

  it('non-index pages have nav with site title', () => {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, DENLEY_PAGE), 'utf8');
    assert.match(html, /class="nav"/);
    assert.match(html, new RegExp(SITE_TITLE));
  });

  it('index page does not have nav', () => {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, INDEX_HTML), 'utf8');
    assert.doesNotMatch(html, /class="nav"/);
  });

  it('copies favicon when configured', () => {
    const configPath = path.join(ROOT, 'site.config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.favicon) {
        const faviconSrc = path.join(ROOT, 'src', config.favicon);
        if (fs.existsSync(faviconSrc)) {
          assert.ok(fs.existsSync(path.join(PUBLIC_DIR, config.favicon)));
        }
      }
    }
  });
});

describe('Page name sanitization', () => {
  const TEMP_PAGE_FILENAME = '_test_sanitize_.md';
  const TEMP_PAGE_MARKDOWN = '# Test';
  const TEMP_PAGE = path.join(PAGES_DIR, TEMP_PAGE_FILENAME);
  const EXPECTED_HTML = '_test_sanitize_.html';

  afterEach(() => {
    if (fs.existsSync(TEMP_PAGE)) fs.unlinkSync(TEMP_PAGE);
  });

  it('generated HTML uses sanitized filename as page slug', () => {
    fs.writeFileSync(TEMP_PAGE, TEMP_PAGE_MARKDOWN);
    execSync('node generate_site.js', { cwd: ROOT, stdio: 'pipe' });
    assert.ok(fs.existsSync(path.join(PUBLIC_DIR, EXPECTED_HTML)));
  });
});
