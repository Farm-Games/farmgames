const fs = require('fs');
const path = require('path');
const showdown = require('showdown');
const { INPUT_FOLDER, OUTPUT_FOLDER, WEB_ROOT } = require('./constants-html');
const {
  clearOutputFolder,
  copyCSSFilesToOutputFolder,
  copyIntroFilesToOutputFolder,
  copyImageFilesToOutputFolder,
  copyMediaFilesToOutputFolder,
} = require('./utilities');
const { mountIntroScreen } = require('./src/intro');
const { fileNameToTitle, SHOWDOWN_OPTIONS, renderPage, wrapTables } = require('./shared/template');

const CONVERTER = new showdown.Converter(SHOWDOWN_OPTIONS);
const CONFIG_PATH = path.join(__dirname, 'site.config.json');
const CNAME_DOMAIN = 'farmgames.uk';
const NICE_SELECT_CSS =
  '<link href="https://cdn.jsdelivr.net/npm/nice-select2@2.2.0/dist/css/nice-select2.css" rel="stylesheet">';
const NICE_SELECT_JS_URL =
  'https://cdn.jsdelivr.net/npm/nice-select2@2.2.0/dist/js/nice-select2.min.js';

const loadSiteConfig = () =>
  fs.existsSync(CONFIG_PATH) ? JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) : {};

const SITE_CONFIG = loadSiteConfig();

const isStubFile = (file) => file.startsWith('file_');

const stripExtension = (file) => file.replace('.md', '');

const filesToSelectOptions = (files) =>
  files
    .map(stripExtension)
    .filter((file) => !isStubFile(file))
    .map((file) => `<option value="${file}">${fileNameToTitle(file)}</option>`)
    .join('');

const createPageSelect = (files) => `
<select class="search wide" id="search" style="display:none;">
  ${filesToSelectOptions(files)}
</select>
`;

const niceSelectScript = (webRoot) => `
        <script src="${NICE_SELECT_JS_URL}"></script>
        <script>
          const searchEl = document.getElementById("search")
          NiceSelect.bind(searchEl, {searchable: true, placeholder: 'Search for a page...', });
          searchEl.addEventListener('change', (e) => {
            window.location.href = "${webRoot}" + e.target.value;
          });
        </script>`;

const buildArticleContent = (files, content) => `
          ${createPageSelect(files)}
          ${content}
          ${niceSelectScript(WEB_ROOT)}`;

const pageBodyTemplate = (fileName, files, content, addNav = true) =>
  renderPage({
    cssRoot: WEB_ROOT,
    fileName,
    content: buildArticleContent(files, content),
    extraHead: NICE_SELECT_CSS,
    extraBodyStart: !addNav ? mountIntroScreen() : '',
    showNav: addNav,
    siteConfig: SITE_CONFIG,
  });

const convertFile = (file, files) => {
  const input = fs.readFileSync(INPUT_FOLDER + file, 'utf8');
  const html = wrapTables(CONVERTER.makeHtml(input));
  const outputPath = OUTPUT_FOLDER + file.replace('.md', '.html');
  fs.writeFileSync(outputPath, pageBodyTemplate(file, files, html, !file.includes('index')));
  console.log(`Converted ${file} to ${outputPath}`);
};

const convertMarkdownToHTML = () => {
  const files = fs.readdirSync(INPUT_FOLDER).filter((file) => file.endsWith('.md'));
  files.forEach((file) => convertFile(file, files));
};

const groupByFirstLetter = (pages) => {
  const grouped = {};
  for (const page of pages.sort()) {
    const letter = page[0].toUpperCase();
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(page);
  }
  return grouped;
};

const generateSitemapMarkdown = (grouped) => {
  let md = '# All Pages\n\n';
  for (const letter of Object.keys(grouped).sort()) {
    md += `## ${letter}\n\n`;
    for (const page of grouped[letter]) {
      md += `- [${fileNameToTitle(page)}](${page})\n`;
    }
    md += '\n';
  }
  return md;
};

const generateSitemap = (files) => {
  const pages = files
    .map(stripExtension)
    .filter((f) => !isStubFile(f) && f !== 'index' && f !== 'sitemap');

  const grouped = groupByFirstLetter(pages);
  const md = generateSitemapMarkdown(grouped);
  const html = wrapTables(CONVERTER.makeHtml(md));
  const outputPath = OUTPUT_FOLDER + 'sitemap.html';
  fs.writeFileSync(outputPath, pageBodyTemplate('sitemap.md', files, html, true));
  console.log(`Generated sitemap at ${outputPath}`);
};

const copyFavicon = () => {
  if (!SITE_CONFIG.favicon) return;
  const faviconSrc = path.join(__dirname, 'src', SITE_CONFIG.favicon);
  if (!fs.existsSync(faviconSrc)) return;
  fs.copyFileSync(faviconSrc, path.join(OUTPUT_FOLDER, SITE_CONFIG.favicon));
  console.log(`Copied favicon: ${SITE_CONFIG.favicon}`);
};

const build = () => {
  clearOutputFolder(OUTPUT_FOLDER);
  copyCSSFilesToOutputFolder(OUTPUT_FOLDER);
  copyIntroFilesToOutputFolder(OUTPUT_FOLDER);
  copyImageFilesToOutputFolder(OUTPUT_FOLDER);
  copyMediaFilesToOutputFolder(OUTPUT_FOLDER);
  copyFavicon();
  convertMarkdownToHTML();
  const allFiles = fs.readdirSync(INPUT_FOLDER).filter((file) => file.endsWith('.md'));
  generateSitemap(allFiles);
  fs.writeFileSync(OUTPUT_FOLDER + 'CNAME', CNAME_DOMAIN);
};

build();
