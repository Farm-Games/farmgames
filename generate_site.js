const fs = require('fs');
const path = require('path');
const showdown = require('showdown');
const { INPUT_FOLDER, OUTPUT_FOLDER, WEB_ROOT } = require('./constants-html');
const { clearOutputFolder, copyCSSFilesToOutputFolder, copyIntroFilesToOutputFolder, copyImageFilesToOutputFolder } = require('./utilities');
const { mountIntroScreen } = require('./src/intro');
const { fileNameToTitle, SHOWDOWN_OPTIONS, renderPage, wrapTables } = require('./shared/template');

const converter = new showdown.Converter(SHOWDOWN_OPTIONS);

const CONFIG_PATH = path.join(__dirname, 'site.config.json');
const siteConfig = fs.existsSync(CONFIG_PATH) ? JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) : {};

const filesToSelectOptions = (files) =>
  files
    .map((file) => file.replace('.md', ''))
    .filter((file) => !file.startsWith('file_'))
    .map((file) => ({
      value: file,
      label: fileNameToTitle(file),
    }))
    .map(({ value, label }) => `<option value="${value}">${label}</option>`)
    .join('');

const createPageSelect = (files) => `
<select class="search wide" id="search" style="display:none;">
  ${filesToSelectOptions(files)}
</select>
`;

const niceSelectScript = (webRoot) => `
        <script src="https://cdn.jsdelivr.net/npm/nice-select2@2.2.0/dist/js/nice-select2.min.js"></script>
        <script>
          const searchEl = document.getElementById("search")
          NiceSelect.bind(searchEl, {searchable: true, placeholder: 'Search for a page...', });
          searchEl.addEventListener('change', (e) => {
            window.location.href = "${webRoot}" + e.target.value;
          });
        </script>`;

const pageBodyTemplate = (fileName, files, content, addNav = true) => {
  const extraHead = `<link href="https://cdn.jsdelivr.net/npm/nice-select2@2.2.0/dist/css/nice-select2.css" rel="stylesheet">`;
  const selectHtml = createPageSelect(files);
  const scriptHtml = niceSelectScript(WEB_ROOT);

  const articleContent = `
          ${selectHtml}
          ${content}
          ${scriptHtml}`;

  return renderPage({
    cssRoot: WEB_ROOT,
    fileName,
    content: articleContent,
    extraHead,
    extraBodyStart: !addNav ? mountIntroScreen() : '',
    showNav: addNav,
    siteConfig,
  });
};

const convertMarkdownToHTML = () => {
  const files = fs.readdirSync(INPUT_FOLDER).filter((file) => file.endsWith('.md'));
  files.forEach((file) => {
    const input = fs.readFileSync(INPUT_FOLDER + file, 'utf8');
    const html = wrapTables(converter.makeHtml(input));
    const outputPath = OUTPUT_FOLDER + file.replace('.md', '.html');
    fs.writeFileSync(outputPath, pageBodyTemplate(file, files, html, !file.includes('index')));
    console.log(`Converted ${file} to ${outputPath}`);
  });
};

const generateSitemap = (files) => {
  const pages = files
    .map((f) => f.replace('.md', ''))
    .filter((f) => !f.startsWith('file_') && f !== 'index' && f !== 'sitemap');

  const grouped = {};
  for (const page of pages.sort()) {
    const letter = page[0].toUpperCase();
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(page);
  }

  let md = '# All Pages\n\n';
  for (const letter of Object.keys(grouped).sort()) {
    md += `## ${letter}\n\n`;
    for (const page of grouped[letter]) {
      md += `- [${fileNameToTitle(page)}](${page})\n`;
    }
    md += '\n';
  }

  const html = wrapTables(converter.makeHtml(md));
  const outputPath = OUTPUT_FOLDER + 'sitemap.html';
  fs.writeFileSync(outputPath, pageBodyTemplate('sitemap.md', files, html, true));
  console.log(`Generated sitemap at ${outputPath}`);
};

// Main
clearOutputFolder(OUTPUT_FOLDER);
copyCSSFilesToOutputFolder(OUTPUT_FOLDER);
copyIntroFilesToOutputFolder(OUTPUT_FOLDER);
copyImageFilesToOutputFolder(OUTPUT_FOLDER);
if (siteConfig.favicon) {
  const faviconSrc = path.join(__dirname, 'src', siteConfig.favicon);
  if (fs.existsSync(faviconSrc)) {
    fs.copyFileSync(faviconSrc, path.join(OUTPUT_FOLDER, siteConfig.favicon));
    console.log(`Copied favicon: ${siteConfig.favicon}`);
  }
}
convertMarkdownToHTML();
const allFiles = fs.readdirSync(INPUT_FOLDER).filter((file) => file.endsWith('.md'));
generateSitemap(allFiles);
fs.writeFileSync(OUTPUT_FOLDER + 'CNAME', 'farmgames.uk');
