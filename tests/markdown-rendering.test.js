const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const showdown = require('showdown');
const { SHOWDOWN_OPTIONS } = require('../shared/template');

const converter = new showdown.Converter(SHOWDOWN_OPTIONS);
const render = (md) => converter.makeHtml(md);

describe('Markdown rendering for WYSIWYG toolbar features', () => {
  const MD_HEADING = '## My Heading';
  const MD_BOLD = '**bold text**';
  const MD_ITALIC = '*italic text*';
  const MD_STRIKE = '~~deleted text~~';
  const MD_HR = '---';
  const MD_BLOCKQUOTE = '> quoted text';
  const MD_UL = '- item one\n- item two';
  const MD_OL = '1. first\n2. second';
  const MD_TASKS = '- [ ] unchecked\n- [x] checked';
  const MD_TABLE = '| Col A | Col B |\n|-------|-------|\n| 1     | 2     |';
  const MD_LINK = '[Farm Games](farm_games)';
  const MD_INLINE_CODE = 'use `npm install`';
  const MD_CODE_BLOCK = '```js\nconsole.log("hi")\n```';
  const MD_IMAGE = '![My Image](/images/photo.jpg)';

  it('heading: ## renders as <h2>', () => {
    const html = render(MD_HEADING);
    assert.match(html, /<h2/);
    assert.match(html, /My Heading/);
  });

  it('bold: **text** renders as <strong>', () => {
    const html = render(MD_BOLD);
    assert.match(html, /<strong>bold text<\/strong>/);
  });

  it('italic: *text* renders as <em>', () => {
    const html = render(MD_ITALIC);
    assert.match(html, /<em>italic text<\/em>/);
  });

  it('strikethrough: ~~text~~ renders as <del>', () => {
    const html = render(MD_STRIKE);
    assert.match(html, /<del>deleted text<\/del>/);
  });

  it('horizontal rule: --- renders as <hr>', () => {
    const html = render(MD_HR);
    assert.match(html, /<hr/);
  });

  it('blockquote: > text renders as <blockquote>', () => {
    const html = render(MD_BLOCKQUOTE);
    assert.match(html, /<blockquote>/);
    assert.match(html, /quoted text/);
  });

  it('unordered list: - item renders as <ul><li>', () => {
    const html = render(MD_UL);
    assert.match(html, /<ul>/);
    assert.match(html, /<li>item one<\/li>/);
    assert.match(html, /<li>item two<\/li>/);
  });

  it('ordered list: 1. item renders as <ol><li>', () => {
    const html = render(MD_OL);
    assert.match(html, /<ol>/);
    assert.match(html, /<li>first<\/li>/);
    assert.match(html, /<li>second<\/li>/);
  });

  it('task list: - [ ] renders checkbox', () => {
    const html = render(MD_TASKS);
    assert.match(html, /type="checkbox"/);
    assert.match(html, /unchecked/);
    assert.match(html, /checked/);
  });

  it('table: pipe syntax renders as <table>', () => {
    const html = render(MD_TABLE);
    assert.match(html, /<table>/);
    assert.match(html, /<th>Col A<\/th>/);
    assert.match(html, /<td>1<\/td>/);
  });

  it('link: [text](url) renders as <a>', () => {
    const html = render(MD_LINK);
    assert.match(html, /<a href="farm_games">Farm Games<\/a>/);
  });

  it('inline code: `code` renders as <code>', () => {
    const html = render(MD_INLINE_CODE);
    assert.match(html, /<code>npm install<\/code>/);
  });

  it('code block: triple backtick renders as <pre><code>', () => {
    const html = render(MD_CODE_BLOCK);
    assert.match(html, /<pre>/);
    assert.match(html, /<code/);
    assert.match(html, /console\.log/);
  });

  it('image: ![alt](url) renders as <img>', () => {
    const html = render(MD_IMAGE);
    assert.match(html, /<img/);
    assert.match(html, /src="\/images\/photo\.jpg"/);
    assert.match(html, /alt="My Image"/);
  });
});

describe('Image layout HTML passthrough', () => {
  const IMG_SRC_T = '/images/t.jpg';
  const IMG_ALT_TEST = 'test';
  const HTML_IMG_SMALL = `<img src="${IMG_SRC_T}" alt="${IMG_ALT_TEST}" class="img-small" />`;
  const HTML_IMG_MEDIUM_LEFT = `<img src="${IMG_SRC_T}" alt="${IMG_ALT_TEST}" class="img-medium img-left" />`;
  const HTML_IMG_LARGE_RIGHT = `<img src="${IMG_SRC_T}" alt="${IMG_ALT_TEST}" class="img-large img-right" />`;
  const HTML_IMG_CENTER = `<img src="${IMG_SRC_T}" alt="${IMG_ALT_TEST}" class="img-center" />`;
  const MD_FLOAT_WRAP = `Text before.\n\n<img src="${IMG_SRC_T}" alt="${IMG_ALT_TEST}" class="img-small img-left" />\n\nText that wraps around.`;
  const MD_PLAIN_IMG = '![plain](/images/t.jpg)';

  it('img with size class preserves class attribute', () => {
    const html = render(HTML_IMG_SMALL);
    assert.match(html, /class="img-small"/);
    assert.match(html, /src="\/images\/t\.jpg"/);
  });

  it('img with size and alignment classes preserves both', () => {
    const html = render(HTML_IMG_MEDIUM_LEFT);
    assert.match(html, /class="img-medium img-left"/);
  });

  it('img-right class preserves for float layout', () => {
    const html = render(HTML_IMG_LARGE_RIGHT);
    assert.match(html, /class="img-large img-right"/);
  });

  it('img-center class preserves for centered layout', () => {
    const html = render(HTML_IMG_CENTER);
    assert.match(html, /class="img-center"/);
  });

  it('floated image followed by text renders as separate elements', () => {
    const html = render(MD_FLOAT_WRAP);
    assert.match(html, /class="img-small img-left"/);
    assert.match(html, /Text that wraps around/);
  });

  it('img without layout classes reverts to plain markdown rendering', () => {
    const html = render(MD_PLAIN_IMG);
    assert.match(html, /<img/);
    assert.match(html, /alt="plain"/);
    assert.doesNotMatch(html, /class="/);
  });
});
