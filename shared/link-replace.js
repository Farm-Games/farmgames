function replaceLinkInLine(line, query, targetSlug, replaceText, caseSensitive) {
  const flags = caseSensitive ? '' : 'i';
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existingLinkRegex = new RegExp(`\\[${escaped}\\]\\([^)]*\\)`, flags + 'g');
  const plainRegex = new RegExp(escaped, flags + 'g');
  const linkText = replaceText || query;
  const replacement = `[${linkText}](${targetSlug})`;

  let updated = line.replace(existingLinkRegex, replacement);

  updated = updated.replace(plainRegex, (match, offset) => {
    const before = updated.substring(0, offset);
    const after = updated.substring(offset + match.length);
    const insideLink = /\[[^\]]*$/.test(before) && /^[^\[]*\]\(/.test(after);
    if (insideLink) return match;
    return replacement;
  });

  return updated;
}

exports.replaceLinkInLine = replaceLinkInLine;
