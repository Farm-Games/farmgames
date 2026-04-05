const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const showdown = require('showdown');
const { SHOWDOWN_OPTIONS } = require('../shared/template');

const converter = new showdown.Converter(SHOWDOWN_OPTIONS);
const render = (md) => converter.makeHtml(md);

describe('Markdown rendering for WYSIWYG toolbar features', () => {

  it('heading: ## renders as <h2>', () => {
    const html = render('## My Heading');
    assert.match(html, /<h2/);
    assert.match(html, /My Heading/);
  });

  it('bold: **text** renders as <strong>', () => {
    const html = render('**bold text**');
    assert.match(html, /<strong>bold text<\/strong>/);
  });

  it('italic: *text* renders as <em>', () => {
    const html = render('*italic text*');
    assert.match(html, /<em>italic text<\/em>/);
  });

  it('strikethrough: ~~text~~ renders as <del>', () => {
    const html = render('~~deleted text~~');
    assert.match(html, /<del>deleted text<\/del>/);
  });

  it('horizontal rule: --- renders as <hr>', () => {
    const html = render('---');
    assert.match(html, /<hr/);
  });

  it('blockquote: > text renders as <blockquote>', () => {
    const html = render('> quoted text');
    assert.match(html, /<blockquote>/);
    assert.match(html, /quoted text/);
  });

  it('unordered list: - item renders as <ul><li>', () => {
    const html = render('- item one\n- item two');
    assert.match(html, /<ul>/);
    assert.match(html, /<li>item one<\/li>/);
    assert.match(html, /<li>item two<\/li>/);
  });

  it('ordered list: 1. item renders as <ol><li>', () => {
    const html = render('1. first\n2. second');
    assert.match(html, /<ol>/);
    assert.match(html, /<li>first<\/li>/);
    assert.match(html, /<li>second<\/li>/);
  });

  it('task list: - [ ] renders checkbox', () => {
    const html = render('- [ ] unchecked\n- [x] checked');
    assert.match(html, /type="checkbox"/);
    assert.match(html, /unchecked/);
    assert.match(html, /checked/);
  });

  it('table: pipe syntax renders as <table>', () => {
    const html = render('| Col A | Col B |\n|-------|-------|\n| 1     | 2     |');
    assert.match(html, /<table>/);
    assert.match(html, /<th>Col A<\/th>/);
    assert.match(html, /<td>1<\/td>/);
  });

  it('link: [text](url) renders as <a>', () => {
    const html = render('[Farm Games](farm_games)');
    assert.match(html, /<a href="farm_games">Farm Games<\/a>/);
  });

  it('inline code: `code` renders as <code>', () => {
    const html = render('use `npm install`');
    assert.match(html, /<code>npm install<\/code>/);
  });

  it('code block: triple backtick renders as <pre><code>', () => {
    const html = render('```js\nconsole.log("hi")\n```');
    assert.match(html, /<pre>/);
    assert.match(html, /<code/);
    assert.match(html, /console\.log/);
  });

  it('image: ![alt](url) renders as <img>', () => {
    const html = render('![My Image](/images/photo.jpg)');
    assert.match(html, /<img/);
    assert.match(html, /src="\/images\/photo\.jpg"/);
    assert.match(html, /alt="My Image"/);
  });

});

describe('Image layout HTML passthrough', () => {

  it('img with size class preserves class attribute', () => {
    const html = render('<img src="/images/t.jpg" alt="test" class="img-small" />');
    assert.match(html, /class="img-small"/);
    assert.match(html, /src="\/images\/t\.jpg"/);
  });

  it('img with size and alignment classes preserves both', () => {
    const html = render('<img src="/images/t.jpg" alt="test" class="img-medium img-left" />');
    assert.match(html, /class="img-medium img-left"/);
  });

  it('img-right class preserves for float layout', () => {
    const html = render('<img src="/images/t.jpg" alt="test" class="img-large img-right" />');
    assert.match(html, /class="img-large img-right"/);
  });

  it('img-center class preserves for centered layout', () => {
    const html = render('<img src="/images/t.jpg" alt="test" class="img-center" />');
    assert.match(html, /class="img-center"/);
  });

  it('floated image followed by text renders as separate elements', () => {
    const md = 'Text before.\n\n<img src="/images/t.jpg" alt="test" class="img-small img-left" />\n\nText that wraps around.';
    const html = render(md);
    assert.match(html, /class="img-small img-left"/);
    assert.match(html, /Text that wraps around/);
  });

  it('img without layout classes reverts to plain markdown rendering', () => {
    const html = render('![plain](/images/t.jpg)');
    assert.match(html, /<img/);
    assert.match(html, /alt="plain"/);
    assert.doesNotMatch(html, /class="/);
  });

});
