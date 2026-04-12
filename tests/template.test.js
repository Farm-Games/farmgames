const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { fileNameToTitle, renderPage, wrapTables, SHOWDOWN_OPTIONS } = require('../shared/template');

describe('fileNameToTitle', () => {
  const FILE_ALBANY = 'albany_rattlers';
  const FILE_ALBANY_MD = 'albany_rattlers.md';
  const FILE_INDEX = 'index';
  const FILE_ST_JOHN = 'st__john_s_mariners';
  const FILE_CALGARY_CAPS = 'Calgary_Jailbirds';
  const TITLE_ALBANY = 'Albany Rattlers';
  const TITLE_INDEX = 'Index';
  const TITLE_CALGARY = 'Calgary Jailbirds';

  it('converts underscores to spaces and capitalizes', () => {
    assert.strictEqual(fileNameToTitle(FILE_ALBANY), TITLE_ALBANY);
  });

  it('strips .md extension', () => {
    assert.strictEqual(fileNameToTitle(FILE_ALBANY_MD), TITLE_ALBANY);
  });

  it('handles single word', () => {
    assert.strictEqual(fileNameToTitle(FILE_INDEX), TITLE_INDEX);
  });

  it('handles empty segments', () => {
    const result = fileNameToTitle(FILE_ST_JOHN);
    assert.ok(result.includes('John'));
  });

  it('handles already capitalized input', () => {
    assert.strictEqual(fileNameToTitle(FILE_CALGARY_CAPS), TITLE_CALGARY);
  });
});

describe('renderPage', () => {
  const CSS_ROOT_ROOT = '/';
  const CSS_ROOT_SITE = '/site-css/';
  const CSS_ROOT_CUSTOM = '/myroot/';
  const CSS_ROOT_SLASH = '/css/';
  const FILE_TEST = 'test';
  const FILE_MY_PAGE = 'my_page';
  const NAV_ROOT_HASH = '#';
  const CONTENT_HELLO = '<p>Hello</p>';
  const CONTENT_MY = '<p>My content</p>';
  const EXTRA_HEAD_META = '<meta name="x" />';
  const EXTRA_BODY_INTRO = '<div id="intro"></div>';
  const SITE_TITLE_CUSTOM = 'My Wiki';
  const PAGE_TITLE_TEMPLATE = '{{siteTitle}} - {{pageTitle}}';
  const REGEX_TITLE_WIKI_MY_PAGE = /<title>Wiki - My Page<\/title>/;
  const REGEX_TITLE_MY_PAGE_PIPE_WIKI = /<title>My Page \| Wiki<\/title>/;
  const FAVICON_NAME = 'favicon.ico';

  it('produces valid HTML with doctype', () => {
    const html = renderPage({
      cssRoot: CSS_ROOT_ROOT,
      fileName: FILE_TEST,
      content: CONTENT_HELLO,
    });
    assert.match(html, /<!DOCTYPE html>/);
    assert.match(html, /<html lang="en">/);
  });

  it('includes CSS links with cssRoot', () => {
    const html = renderPage({ cssRoot: CSS_ROOT_SITE, fileName: FILE_TEST, content: '' });
    assert.match(html, /href="\/site-css\/reset\.css"/);
    assert.match(html, /href="\/site-css\/styles\.css"/);
  });

  it('includes content in article', () => {
    const html = renderPage({ cssRoot: CSS_ROOT_ROOT, fileName: FILE_TEST, content: CONTENT_MY });
    assert.match(html, /<article>/);
    assert.match(html, /<p>My content<\/p>/);
  });

  it('shows nav with page title when showNav is true', () => {
    const html = renderPage({
      cssRoot: CSS_ROOT_ROOT,
      fileName: FILE_MY_PAGE,
      content: '',
      showNav: true,
    });
    assert.match(html, /class="nav"/);
    assert.match(html, /My Page/);
  });

  it('hides nav when showNav is false', () => {
    const html = renderPage({
      cssRoot: CSS_ROOT_ROOT,
      fileName: FILE_MY_PAGE,
      content: '',
      showNav: false,
    });
    assert.doesNotMatch(html, /class="nav"/);
  });

  it('uses navRoot for the nav link when provided', () => {
    const html = renderPage({
      cssRoot: CSS_ROOT_SLASH,
      navRoot: NAV_ROOT_HASH,
      fileName: FILE_TEST,
      content: '',
    });
    assert.match(html, /href="#"/);
  });

  it('falls back to cssRoot for nav link when navRoot not provided', () => {
    const html = renderPage({ cssRoot: CSS_ROOT_CUSTOM, fileName: FILE_TEST, content: '' });
    assert.match(html, /href="\/myroot\/"/);
  });

  it('includes extraHead in head', () => {
    const html = renderPage({
      cssRoot: CSS_ROOT_ROOT,
      fileName: FILE_TEST,
      content: '',
      extraHead: EXTRA_HEAD_META,
    });
    assert.match(html, /<meta name="x" \/>/);
  });

  it('includes extraBodyStart before article', () => {
    const html = renderPage({
      cssRoot: CSS_ROOT_ROOT,
      fileName: FILE_TEST,
      content: '',
      extraBodyStart: EXTRA_BODY_INTRO,
    });
    assert.match(html, /<div id="intro"><\/div>/);
  });

  it('uses siteConfig.siteTitle in nav and title', () => {
    const html = renderPage({
      cssRoot: CSS_ROOT_ROOT,
      fileName: FILE_TEST,
      content: '',
      siteConfig: { siteTitle: SITE_TITLE_CUSTOM },
    });
    assert.match(html, /My Wiki/);
  });

  it('uses siteConfig.pageTitle template for title tag', () => {
    const html = renderPage({
      cssRoot: CSS_ROOT_ROOT,
      fileName: FILE_MY_PAGE,
      content: '',
      siteConfig: { siteTitle: 'Wiki', pageTitle: PAGE_TITLE_TEMPLATE },
    });
    assert.match(html, REGEX_TITLE_WIKI_MY_PAGE);
  });

  it('defaults pageTitle template to {{pageTitle}} | {{siteTitle}}', () => {
    const html = renderPage({
      cssRoot: CSS_ROOT_ROOT,
      fileName: FILE_MY_PAGE,
      content: '',
      siteConfig: { siteTitle: 'Wiki' },
    });
    assert.match(html, REGEX_TITLE_MY_PAGE_PIPE_WIKI);
  });

  it('includes favicon link when siteConfig.favicon is set', () => {
    const html = renderPage({
      cssRoot: CSS_ROOT_SLASH,
      fileName: FILE_TEST,
      content: '',
      siteConfig: { favicon: FAVICON_NAME },
    });
    assert.match(html, /rel="icon"/);
    assert.match(html, /href="\/css\/favicon\.ico"/);
  });

  it('omits favicon link when not configured', () => {
    const html = renderPage({ cssRoot: CSS_ROOT_ROOT, fileName: FILE_TEST, content: '' });
    assert.doesNotMatch(html, /rel="icon"/);
  });

  it('includes Google Fonts links', () => {
    const html = renderPage({ cssRoot: CSS_ROOT_ROOT, fileName: FILE_TEST, content: '' });
    assert.match(html, /fonts\.googleapis\.com/);
    assert.match(html, /IBM\+Plex\+Mono/);
    assert.match(html, /Jersey\+15/);
  });
});

describe('wrapTables', () => {
  const HTML_SINGLE_TABLE = '<table><tr><td>1</td></tr></table>';
  const HTML_TWO_TABLES = '<table></table> text <table></table>';
  const HTML_NO_TABLES = '<p>No tables here</p>';

  it('wraps table in div.table-wrapper', () => {
    const result = wrapTables(HTML_SINGLE_TABLE);
    assert.match(result, /<div class="table-wrapper"><table>/);
    assert.match(result, /<\/table><\/div>/);
  });

  it('wraps multiple tables', () => {
    const result = wrapTables(HTML_TWO_TABLES);
    const wrapperCount = (result.match(/table-wrapper/g) || []).length;
    assert.strictEqual(wrapperCount, 2);
  });

  it('does not modify content without tables', () => {
    assert.strictEqual(wrapTables(HTML_NO_TABLES), HTML_NO_TABLES);
  });
});

describe('SHOWDOWN_OPTIONS', () => {
  it('has all required options enabled', () => {
    assert.strictEqual(SHOWDOWN_OPTIONS.backslashEscapesHTMLTags, true);
    assert.strictEqual(SHOWDOWN_OPTIONS.strikethrough, true);
    assert.strictEqual(SHOWDOWN_OPTIONS.tables, true);
    assert.strictEqual(SHOWDOWN_OPTIONS.tasklists, true);
    assert.strictEqual(SHOWDOWN_OPTIONS.ghCodeBlocks, true);
  });
});
