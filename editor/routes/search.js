const fs = require('fs');
const path = require('path');
const { PAGES_DIR } = require('../lib/paths');
const { replaceLinkInLine } = require('../../shared/link-replace');

const ESCAPE_REGEX = /[.*+?^${}()|[\]\\]/g;
const MAX_TEXT_LENGTH = 120;

const searchHandler = (req, res) => {
  const { query, caseSensitive } = req.body;
  if (!query) return res.json([]);
  try {
    const files = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.md'));
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(query.replace(ESCAPE_REGEX, '\\$&'), flags);
    const results = [];
    for (const file of files) {
      const slug = file.replace('.md', '');
      const content = fs.readFileSync(path.join(PAGES_DIR, file), 'utf8');
      const lines = content.split('\n');
      const matches = [];
      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          matches.push({
            id: `${slug}:${i + 1}`,
            line: i + 1,
            text: lines[i].trim().substring(0, MAX_TEXT_LENGTH),
          });
        }
        regex.lastIndex = 0;
      }
      if (matches.length > 0) {
        results.push({ slug, matches });
      }
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const linkHandler = (req, res) => {
  const { query, caseSensitive, targetSlug, replaceText, selectedLines } = req.body;
  if (!query || !targetSlug) return res.status(400).json({ error: 'Missing query or target' });
  try {
    const files = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.md'));
    const flags = caseSensitive ? '' : 'i';
    const escaped = query.replace(ESCAPE_REGEX, '\\$&');
    const existingLinkRegex = new RegExp(`\\[${escaped}\\]\\([^)]*\\)`, flags + 'g');
    const plainRegex = new RegExp(escaped, flags + 'g');
    let totalReplaced = 0;
    let pagesModified = 0;
    const selectedSet = selectedLines ? new Set(selectedLines) : null;

    for (const file of files) {
      const slug = file.replace('.md', '');
      const filePath = path.join(PAGES_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      let fileModified = false;

      for (let i = 0; i < lines.length; i++) {
        const lineId = `${slug}:${i + 1}`;
        if (selectedSet && !selectedSet.has(lineId)) continue;
        if (!existingLinkRegex.test(lines[i]) && !plainRegex.test(lines[i])) continue;
        existingLinkRegex.lastIndex = 0;
        plainRegex.lastIndex = 0;

        const updated = replaceLinkInLine(lines[i], query, targetSlug, replaceText, caseSensitive);
        if (updated !== lines[i]) {
          lines[i] = updated;
          totalReplaced++;
          fileModified = true;
        }
      }

      if (fileModified) {
        fs.writeFileSync(filePath, lines.join('\n'));
        pagesModified++;
      }
    }
    console.log(
      `  ✓ Linked "${query}" → ${targetSlug} (${totalReplaced} in ${pagesModified} page(s))`,
    );
    res.json({ totalReplaced, pagesModified });
  } catch (err) {
    console.log(`  ✗ Link across failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { searchHandler, linkHandler };
