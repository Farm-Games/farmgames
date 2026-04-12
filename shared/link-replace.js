const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildExistingLinkRegex = (escaped, flags) =>
  new RegExp(`\\[${escaped}\\]\\([^)]*\\)`, flags + 'g');

const buildPlainTextRegex = (escaped, flags) => new RegExp(escaped, flags + 'g');

const isInsideLink = (text, offset, matchLength) => {
  const before = text.substring(0, offset);
  const after = text.substring(offset + matchLength);
  return /\[[^\]]*$/.test(before) && /^[^\[]*\]\(/.test(after);
};

const replaceLinkInLine = (line, query, targetSlug, replaceText, caseSensitive) => {
  const flags = caseSensitive ? '' : 'i';
  const escaped = escapeRegex(query);
  const existingLinkRegex = buildExistingLinkRegex(escaped, flags);
  const plainRegex = buildPlainTextRegex(escaped, flags);
  const linkText = replaceText || query;
  const replacement = `[${linkText}](${targetSlug})`;

  let updated = line.replace(existingLinkRegex, replacement);

  updated = updated.replace(plainRegex, (match, offset) => {
    if (isInsideLink(updated, offset, match.length)) return match;
    return replacement;
  });

  return updated;
};

module.exports = { replaceLinkInLine };
