const SHOWDOWN_OPTIONS = {
  backslashEscapesHTMLTags: true,
  strikethrough: true,
  tables: true,
  tasklists: true,
  ghCodeBlocks: true,
};

const DEFAULT_SITE_TITLE = 'Farm Games Wiki';
const DEFAULT_TITLE_TEMPLATE = '{{pageTitle}} | {{siteTitle}}';

const FONT_LINKS = `
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&family=Jersey+15&display=swap" rel="stylesheet">`;

const capitalizeWord = (word) => {
  try {
    return word[0].toUpperCase() + word.substring(1);
  } catch {
    return word;
  }
};

const fileNameToTitle = (fileName) =>
  fileName.replace('.md', '').split('_').map(capitalizeWord).join(' ');

const buildPageTitle = (template, pageTitle, siteTitle) =>
  template.replace('{{pageTitle}}', pageTitle).replace('{{siteTitle}}', siteTitle);

const renderPage = ({
  cssRoot,
  navRoot,
  fileName,
  content,
  extraHead,
  extraBodyStart,
  showNav = true,
  siteConfig,
}) => {
  const config = siteConfig || {};
  const siteTitle = config.siteTitle || DEFAULT_SITE_TITLE;
  const titleTemplate = config.pageTitle || DEFAULT_TITLE_TEMPLATE;
  const pageTitle = fileNameToTitle(fileName);
  const fullTitle = buildPageTitle(titleTemplate, pageTitle, siteTitle);
  const faviconTag = config.favicon ? `<link rel="icon" href="${cssRoot}${config.favicon}" />` : '';
  const navHtml = showNav
    ? `<div class="nav"><h2><a href="${navRoot || cssRoot}">${siteTitle}</a> | ${pageTitle}</h2></div>`
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${extraHead || ''}
        <title>${fullTitle}</title>
        ${faviconTag}
        <link rel="stylesheet" href="${cssRoot}reset.css" />
        <link rel="stylesheet" href="${cssRoot}styles.css" />
        ${FONT_LINKS}
    </head>
    <body>
        ${extraBodyStart || ''}
        <article>
          ${navHtml}
          ${content}
        </article>
    </body>
</html>
`;
};

const wrapTables = (html) =>
  html
    .replace(/<table>/g, '<div class="table-wrapper"><table>')
    .replace(/<\/table>/g, '</table></div>');

module.exports = { SHOWDOWN_OPTIONS, fileNameToTitle, renderPage, wrapTables };
