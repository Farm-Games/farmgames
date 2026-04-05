const fs = require('fs');
const showdown = require('showdown');
const { INPUT_FOLDER, OUTPUT_FOLDER, WEB_ROOT } = require('./constants-html');
const { clearOutputFolder, copyCSSFilesToOutputFolder, copyIntroFilesToOutputFolder, copyImageFilesToOutputFolder } = require('./utilities');
const { mountIntroScreen } = require('./src/intro');
const { fileNameToTitle, SHOWDOWN_OPTIONS, renderPage } = require('./shared/template');

const converter = new showdown.Converter(SHOWDOWN_OPTIONS);

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
  });
};

const convertMarkdownToHTML = () => {
  const files = fs.readdirSync(INPUT_FOLDER).filter((file) => file.endsWith('.md'));
  files.forEach((file) => {
    const input = fs.readFileSync(INPUT_FOLDER + file, 'utf8');
    const html = converter.makeHtml(input);
    const outputPath = OUTPUT_FOLDER + file.replace('.md', '.html');
    fs.writeFileSync(outputPath, pageBodyTemplate(file, files, html, !file.includes('index')));
    console.log(`Converted ${file} to ${outputPath}`);
  });
};

// Main
clearOutputFolder(OUTPUT_FOLDER);
copyCSSFilesToOutputFolder(OUTPUT_FOLDER);
copyIntroFilesToOutputFolder(OUTPUT_FOLDER);
copyImageFilesToOutputFolder(OUTPUT_FOLDER);
convertMarkdownToHTML();
fs.writeFileSync(OUTPUT_FOLDER + 'CNAME', 'farmgames.uk');
