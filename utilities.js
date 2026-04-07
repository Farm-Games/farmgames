const fs = require('fs');
const { OUTPUT_FOLDER, SITENAME, INDEX_PAGE } = require('./constants-md');

const SRC_DIR = __dirname + '/src';
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|svg|webp)$/i;
const MEDIA_EXTENSIONS = /\.(mp4|webm|ogg|mp3|wav|m4a)$/i;
const GALLERY_REGEX = /<gallery[^>]*>(.*?)<\/gallery>/s;
const LIST_REGEX = /(?<!<[^>]*?)(\*+)([^*]+)(?![^<]*?>)/gm;
const BOLD_REGEX = /'''(.*?)'''/gm;
const HEADER_REGEX = /(?<!<[^>]*?)(==+)([^=]+)(==+)(?![^<]*?>)/gm;
const SITENAME_REGEX = /{{SITENAME}}/gm;

const sanitizeLink = (link) => `${link.replace(/[^a-z0-9]/gi, '_')}`.toLowerCase();

const isLinkForImage = (link) => link.match(/\.(jpeg|jpg|gif|png|svg)$/i);

const findNestedMatches = (text) => {
  const matches = [];
  let depth = 0;
  let currentMatch = '';
  let isInMatch = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '[' && text[i + 1] === '[') {
      if (depth === 0 && isInMatch) {
        matches.push(currentMatch);
        currentMatch = '';
      }
      depth++;
      currentMatch += '[[';
      i++;
      continue;
    }

    if (char === ']' && text[i + 1] === ']') {
      depth--;
      currentMatch += ']]';
      if (depth === 0) {
        matches.push(currentMatch);
        currentMatch = '';
        isInMatch = false;
      }
      i++;
      continue;
    }

    if (depth > 0) {
      currentMatch += char;
    }

    if (depth > 0 && !isInMatch) {
      isInMatch = true;
    }
  }

  return matches || [];
};

const buildGalleryFigure = (imgSrc, linkText, caption) => `
          <figure>
            <img src="${sanitizeLink(imgSrc)}" alt="${imgSrc}" />
            <a href="${sanitizeLink(linkText)}">${caption}</a>
          </figure>
      `;

const convertGalleryLinksToHTML = (input) =>
  input
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const parts = line.split('|');
      const imgSrc = parts[0].trim();
      const linkText = parts[1].replace('link=', '').trim();
      const caption = parts[2] ? parts[2].trim() : linkText;
      return buildGalleryFigure(imgSrc, linkText, caption);
    })
    .join('\n');

const clearOutputFolder = (folder) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder);
    console.log('Output folder has been created');
    return;
  }
  const files = fs.readdirSync(folder);
  for (const file of files) {
    fs.unlink(folder + file, () => {});
  }
  console.log('Output folder has been cleared');
};

const writeFile = (pagePath, pageContent) => {
  if (pagePath.includes('farm_games_wiki')) {
    writeFile(INDEX_PAGE, pageContent);
  }
  try {
    fs.writeFileSync(pagePath, pageContent);
    console.log(`File ${pagePath} has been created`);
  } catch (err) {
    console.error(err);
  }
};

const copyFileToOutputFolder = (filePath, outputFolder) => {
  const fileName = filePath.split('/').pop();
  fs.copyFileSync(filePath, outputFolder + fileName);
  console.log(`File ${fileName} has been copied`);
};

const copyDirectoryByExtension = (srcDir, outputDir, extensionRegex, label) => {
  if (!fs.existsSync(srcDir)) return;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const files = fs.readdirSync(srcDir).filter((f) => extensionRegex.test(f));
  files.forEach((file) => {
    fs.copyFileSync(srcDir + '/' + file, outputDir + file);
    console.log(`${label} ${file} has been copied`);
  });
};

const copyCSSFilesToOutputFolder = (outputFolder) => {
  copyFileToOutputFolder(SRC_DIR + '/styles.css', outputFolder);
  copyFileToOutputFolder(SRC_DIR + '/reset.css', outputFolder);
};

const copyIntroFilesToOutputFolder = (outputFolder) => {
  copyFileToOutputFolder(SRC_DIR + '/intro.mp4', outputFolder);
  copyFileToOutputFolder(SRC_DIR + '/intro.mp3', outputFolder);
};

const copyImageFilesToOutputFolder = (outputFolder) =>
  copyDirectoryByExtension(
    SRC_DIR + '/images',
    outputFolder + 'images/',
    IMAGE_EXTENSIONS,
    'Image',
  );

const copyMediaFilesToOutputFolder = (outputFolder) =>
  copyDirectoryByExtension(SRC_DIR + '/media', outputFolder + 'media/', MEDIA_EXTENSIONS, 'Media');

const getPageAttributes = (page) => {
  const pageName = sanitizeLink(page.title[0]);
  const pageContent = page.revision[0].text[0]['_'] ?? '';
  return { pageName, pageContent };
};

const replaceSitename = (content) => content.replaceAll(SITENAME_REGEX, SITENAME);

const replaceLists = (content) =>
  content.replaceAll(LIST_REGEX, (match) => {
    const listLevel = match.match(/\*/g).length;
    const listText = match.replace(/\*/g, '').trim();
    return `${'  '.repeat(listLevel - 1)}- ${listText}`;
  });

const replaceBold = (content) => content.replaceAll(BOLD_REGEX, '**$1**');

const replaceHeaders = (content) =>
  content.replaceAll(HEADER_REGEX, (match) => {
    const headerLevel = match.match(/=/g).length - 1;
    if (headerLevel > 6 || headerLevel <= 1) return match;
    const headerText = match.replace(/=/g, '').trim();
    const pound = '#'.repeat(headerLevel);
    return `${pound} ${headerText} ${pound}`;
  });

const doesPageExist = (pageName, allPages) =>
  allPages.some((page) => page.title[0].toLowerCase() === pageName.toLowerCase());

const replaceLinks = (content, allPages) =>
  findNestedMatches(content).reduce((acc, match) => {
    const linkParts = match.slice(2, -2).split('|');
    const link = doesPageExist(linkParts[0], allPages) ? sanitizeLink(linkParts[0]) : '#a';
    if (linkParts.length > 2) {
      return `\n![${linkParts[2]}](${link})\n> ${replaceLinks(linkParts[2], allPages)}\n`;
    }
    if (isLinkForImage(linkParts[0])) {
      return acc.replace(match, `![${linkParts[1]}](${link})`);
    }
    if (linkParts.length > 1) {
      return acc.replace(match, `[${linkParts[1]}](${link})`);
    }
    return acc.replace(match, `[${linkParts[0]}](${link})`);
  }, content);

const replaceGalleryLinks = (content) => {
  const match = content.match(GALLERY_REGEX);
  if (!match) return content;
  const galleryContent = match[1];
  const transformed = convertGalleryLinksToHTML(galleryContent);
  return content
    .replace(galleryContent, transformed)
    .replace('<gallery', '<gallery class="gallery"');
};

module.exports = {
  replaceLinks,
  writeFile,
  getPageAttributes,
  replaceHeaders,
  copyFileToOutputFolder,
  replaceSitename,
  replaceBold,
  replaceLists,
  copyCSSFilesToOutputFolder,
  copyIntroFilesToOutputFolder,
  copyImageFilesToOutputFolder,
  copyMediaFilesToOutputFolder,
  clearOutputFolder,
  replaceGalleryLinks,
  sanitizeLink,
  convertGalleryLinksToHTML,
  findNestedMatches,
};
