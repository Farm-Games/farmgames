const fs = require('fs');
const showdown = require('showdown');
const converter = new showdown.Converter({ backslashEscapesHTMLTags: true });
const { INPUT_FOLDER, OUTPUT_FOLDER, WEB_ROOT } = require('./constants-html');
const { clearOutputFolder, copyCSSFilesToOutputFolder, copyIntroFilesToOutputFolder } = require('./utilities');
const { mountIntroScreen } = require('./src/intro');

const fileNameToTitle = (fileName) =>
  fileName
    .replace('.md', '')
    .split('_')
    .map((word) => {
      try {
        return word[0].toUpperCase() + word.substring(1);
      } catch (error) {
        return word;
      }
    })
    .join(' ');

const filesToSelectOptions = (files) =>
  files
    .map((file) => file.replace('.md', ''))
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

const pageBodyTemplate = (fileName, files, content, addNav = true) => `
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Farm Games Wiki</title>
        <link href="https://cdn.jsdelivr.net/npm/nice-select2@2.2.0/dist/css/nice-select2.css" rel="stylesheet">
        <link rel="stylesheet" href="${WEB_ROOT}reset.css" />
        <link rel="stylesheet" href="${WEB_ROOT}styles.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&family=Jersey+15&display=swap" rel="stylesheet">
    </head>
    <body>
        ${!addNav ? mountIntroScreen() : ''}
        <article>
          ${addNav ? `<div class="nav"><h2><a href="${WEB_ROOT}">Farm Games</a>| ${fileNameToTitle(fileName)}</h2></div>` : ''}
          ${createPageSelect(files)}
          ${content}
        </article>
        <script src="https://cdn.jsdelivr.net/npm/nice-select2@2.2.0/dist/js/nice-select2.min.js"></script>
        <script>
          const searchEl = document.getElementById("search")
          NiceSelect.bind(searchEl, {searchable: true, placeholder: 'Search for a page...', });
          searchEl.addEventListener('change', (e) => {
            window.location.href = "${WEB_ROOT}" + e.target.value;
          });
        </script>
    </body>
</html>
`;

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
convertMarkdownToHTML();
