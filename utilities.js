const fs = require('fs');
const { OUTPUT_FOLDER, SITENAME, INDEX_PAGE } = require('./constants-md');

const sanitizeLink = (link) => `${link.replace(/[^a-z0-9]/gi, '_')}`.toLowerCase();

const findNestedMatches = (text) => {
  const matches = [];
  let depth = 0; // Track nesting depth
  let currentMatch = ''; // Store current match content
  let isInMatch = false; // Flag to indicate if we are inside the outer [[ ]]

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '[' && text[i + 1] === '[') {
      // We found an opening [[
      if (depth === 0 && isInMatch) {
        // If we are at the outermost level and in a match, capture the content
        matches.push(currentMatch);
        currentMatch = ''; // Reset for the next match
      }

      // Increase the depth
      depth++;
      currentMatch += '[['; // Include the opening brackets
      i++; // Skip the next '[' because we already handled it
      continue;
    }

    if (char === ']' && text[i + 1] === ']') {
      // We found a closing ]]
      depth--;
      currentMatch += ']]'; // Include the closing brackets

      if (depth === 0) {
        // When we reach the outermost level, capture the current match
        matches.push(currentMatch); // Push the outer match
        currentMatch = ''; // Reset for the next outer match
        isInMatch = false; // Reset match flag
      }
      i++; // Skip the next ']' because we already handled it
      continue;
    }

    // Accumulate characters inside [[ ]]
    if (depth > 0) {
      currentMatch += char;
    }

    // Start accumulating text after the first opening [[
    if (depth > 0 && !isInMatch) {
      isInMatch = true;
    }
  }

  return matches || [];
};

const convertGalleryLinksToHTML = (input) => {
  // Split the input by new lines
  const lines = input.split('\n').filter((line) => line.trim() !== '');

  return lines
    .map((line) => {
      // Split the line into parts using the pipe (|) as a separator
      const parts = line.split('|');

      // Extract image source (img) and text for link and caption
      const imgSrc = parts[0].trim();
      const linkText = parts[1].replace('link=', '').trim();
      const caption = parts[2] ? parts[2].trim() : linkText;

      // Construct the HTML anchor tag with <figure> and <figcaption>
      return `
          <figure>
            <img src="${sanitizeLink(imgSrc)}" alt="${imgSrc}" />
            <a href="${sanitizeLink(linkText)}">${caption}</a>
          </figure>
      `;
    })
    .join('\n');
};

const clearOutputFolder = (folder) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder);
    console.log('Output folder has been created');
    return;
  }

  const files = fs.readdirSync(folder);
  for (const file of files) {
    fs.unlink(folder + file, (err) => {});
  }
  console.log('Output folder has been cleared');
};

const writeFile = (pagePath, pageContent) => {
  const shouldAlsoWriteToIndex = pagePath.includes('farm_games_wiki');
  if (shouldAlsoWriteToIndex) {
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

const copyCSSFilesToOutputFolder = (outputFolder) => {
  copyFileToOutputFolder(__dirname + '/src' + '/styles.css', outputFolder);
  copyFileToOutputFolder(__dirname + '/src' + '/reset.css', outputFolder);
};

const copyIntroFilesToOutputFolder = (outputFolder) => {
  copyFileToOutputFolder(__dirname + '/src' + '/intro.mp4', outputFolder);
  copyFileToOutputFolder(__dirname + '/src' + '/intro.mp3', outputFolder);
};

const isLinkForImage = (link) => link.match(/\.(jpeg|jpg|gif|png|svg)$/i);

const isLinkForPage = (link) => !isLinkForImage(link);

const getPageAttributes = (page) => {
  const pageName = sanitizeLink(page.title[0]);
  const pageContent = page.revision[0].text[0]['_'] ?? '';
  return { pageName, pageContent };
};

const replaceSitename = (content) => content.replaceAll(/{{SITENAME}}/gm, SITENAME);

const replaceLists = (content) => {
  const listRegex = /(?<!<[^>]*?)(\*+)([^*]+)(?![^<]*?>)/gm;
  return content.replaceAll(listRegex, (match) => {
    const listLevel = match.match(/\*/g).length;
    const listText = match.replace(/\*/g, '').trim();
    return `${'  '.repeat(listLevel - 1)}- ${listText}`;
  });
};

const replaceBold = (content) => content.replaceAll(/'''(.*?)'''/gm, '**$1**');

const replaceHeaders = (content) =>
  content.replaceAll(/(?<!<[^>]*?)(==+)([^=]+)(==+)(?![^<]*?>)/gm, (match) => {
    const headerLevel = match.match(/=/g).length - 1;
    if (headerLevel > 6 || headerLevel <= 1) {
      return match;
    }
    const headerText = match.replace(/=/g, '').trim();
    const pound = '#'.repeat(headerLevel);
    return `${pound} ${headerText} ${pound}`;
  });

const doesPageExist = (pageName, allPages) => allPages.some((page) => page.title[0].toLowerCase() === pageName.toLowerCase());

const replaceLinks = (content, allPages) =>
  findNestedMatches(content).reduce((content, match) => {
    const linkParts = match.slice(2, -2).split('|');
    const link = doesPageExist(linkParts[0], allPages) ? sanitizeLink(linkParts[0]) : '#a';
    if (linkParts.length > 2) {
      return (
`
![${linkParts[2]}](${link})
> ${replaceLinks(linkParts[2], allPages)}
`);
    }
    if (isLinkForImage(linkParts[0])) {
      return content.replace(match, `![${linkParts[1]}](${link})`);
    }
    if (linkParts.length > 1) {
      return content.replace(match, `[${linkParts[1]}](${link})`);
    }
    return content.replace(match, `[${linkParts[0]}](${link})`);
  }, content);

const replaceGalleryLinks = (content) => {
  // Define a regex to match the content inside <gallery>...</gallery>
  const galleryRegex = /<gallery[^>]*>(.*?)<\/gallery>/s;

  // Match the content inside <gallery>...</gallery>
  const match = content.match(galleryRegex);

  if (match) {
    // Extract the content inside <gallery>
    const galleryContent = match[1];

    // Transform the content inside the gallery tag
    const transformedGalleryContent = convertGalleryLinksToHTML(galleryContent);

    // Replace the old gallery content with the transformed one
    return content.replace(galleryContent, transformedGalleryContent).replace('<gallery', '<gallery class="gallery"');
  } else {
    // If no <gallery> tag is found, return the original document
    return content;
  }
};

exports.replaceLinks = replaceLinks;
exports.writeFile = writeFile;
exports.getPageAttributes = getPageAttributes;
exports.replaceHeaders = replaceHeaders;
exports.copyFileToOutputFolder = copyFileToOutputFolder;
exports.replaceSitename = replaceSitename;
exports.replaceBold = replaceBold;
exports.replaceLists = replaceLists;
exports.copyCSSFilesToOutputFolder = copyCSSFilesToOutputFolder;
exports.copyIntroFilesToOutputFolder = copyIntroFilesToOutputFolder;
exports.clearOutputFolder = clearOutputFolder;
exports.replaceGalleryLinks = replaceGalleryLinks;
exports.sanitizeLink = sanitizeLink;
exports.convertGalleryLinksToHTML = convertGalleryLinksToHTML;
exports.findNestedMatches = findNestedMatches;
