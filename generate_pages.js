const fs = require('fs');
const xml2js = require('xml2js');
const parser = new xml2js.Parser();
const { OUTPUT_FOLDER } = require('./constants-md');
const {
  getPageAttributes,
  replaceSitename,
  replaceHeaders,
  replaceLinks,
  replaceBold,
  replaceLists,
  replaceGalleryLinks,
  writeFile,
  clearOutputFolder,
} = require('./utilities');

const parseLegacyPages = () => {
  fs.readFile(__dirname + '/src' + '/pages_without_templates.xml', (_, data) => {
    parser.parseString(data, (_, result) => {
      const pages = result.mediawiki.page;
      pages.forEach((page) => {
        const { pageName, pageContent } = getPageAttributes(page);

        const newContent = pageContent.split('\n').map((line) => {
          const modifiedContentWithSitename = replaceSitename(line);
          const modifiedContentWithLists = replaceLists(modifiedContentWithSitename);
          const modifiedContentWithBold = replaceBold(modifiedContentWithLists);
          const modifiedContentWithHeaders = replaceHeaders(modifiedContentWithBold);
          const modifiedContentWithLinks = replaceLinks(modifiedContentWithHeaders, pages);
          return modifiedContentWithLinks;
        }).join('\n');

        const modifiedContentWithGalleryLinks = replaceGalleryLinks(newContent);

        const pagePath = OUTPUT_FOLDER + pageName + '.md';
        writeFile(pagePath, modifiedContentWithGalleryLinks);
      });
    });
  });
};

// Main
clearOutputFolder(OUTPUT_FOLDER);
parseLegacyPages();
