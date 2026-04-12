const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const showdown = require('showdown');
const { SHOWDOWN_OPTIONS } = require('../shared/template');

const converter = new showdown.Converter(SHOWDOWN_OPTIONS);
const render = (md) => converter.makeHtml(md);

describe('HTML passthrough for custom elements', () => {
  const MD_VIDEO_PLAYER =
    '<div class="media-player video-player">\n  <video controls preload="metadata">\n    <source src="/media/clip.mp4" type="video/mp4" />\n  </video>\n</div>';
  const MD_AUDIO_PLAYER =
    '<div class="media-player audio-player">\n  <audio controls preload="metadata">\n    <source src="/media/track.mp3" type="audio/mpeg" />\n  </audio>\n</div>';
  const MD_YOUTUBE_IFRAME =
    '<div class="media-player video-player">\n  <iframe src="https://www.youtube.com/embed/abc123" allowfullscreen></iframe>\n</div>';
  const MD_MEDIA_CAPTION =
    '<div class="media-player video-player">\n  <video controls></video>\n  <p class="media-caption">My caption</p>\n</div>';
  const MD_GALLERY =
    '<div class="gallery" style="--gallery-cols: 3">\n  <figure>\n    <img src="/images/a.jpg" alt="A" />\n    <figcaption>Photo A</figcaption>\n  </figure>\n</div>';
  const MD_GALLERY_MULTI =
    '<div class="gallery">\n  <figure>\n    <img src="/images/a.jpg" alt="A" />\n  </figure>\n  <figure>\n    <img src="/images/b.jpg" alt="B" />\n  </figure>\n</div>';
  const MD_MIXED =
    '# Title\n\nSome text.\n\n<div class="media-player video-player">\n  <video controls></video>\n</div>\n\nMore text.';

  it('video player HTML passes through unchanged', () => {
    const html = render(MD_VIDEO_PLAYER);
    assert.match(html, /class="media-player video-player"/);
    assert.match(html, /<video controls/);
    assert.match(html, /src="\/media\/clip\.mp4"/);
  });

  it('audio player HTML passes through unchanged', () => {
    const html = render(MD_AUDIO_PLAYER);
    assert.match(html, /class="media-player audio-player"/);
    assert.match(html, /<audio controls/);
    assert.match(html, /src="\/media\/track\.mp3"/);
  });

  it('YouTube iframe passes through', () => {
    const html = render(MD_YOUTUBE_IFRAME);
    assert.match(html, /youtube\.com\/embed\/abc123/);
    assert.match(html, /allowfullscreen/);
  });

  it('media caption passes through', () => {
    const html = render(MD_MEDIA_CAPTION);
    assert.match(html, /class="media-caption"/);
    assert.match(html, /My caption/);
  });

  it('gallery HTML passes through', () => {
    const html = render(MD_GALLERY);
    assert.match(html, /class="gallery"/);
    assert.match(html, /--gallery-cols: 3/);
    assert.match(html, /<figure>/);
    assert.match(html, /<figcaption>Photo A<\/figcaption>/);
  });

  it('gallery with multiple figures passes through', () => {
    const html = render(MD_GALLERY_MULTI);
    const figureCount = (html.match(/<figure>/g) || []).length;
    assert.strictEqual(figureCount, 2);
  });

  it('mixed markdown and HTML renders correctly', () => {
    const html = render(MD_MIXED);
    assert.match(html, /<h1/);
    assert.match(html, /Some text/);
    assert.match(html, /media-player/);
    assert.match(html, /More text/);
  });
});
