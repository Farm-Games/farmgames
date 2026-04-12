const fs = require('fs');
const path = require('path');
const { ROOT_DIR } = require('./paths');
const { runGit } = require('./git');

const CONFLICT_MARKER_START = '<<<<<<<';
const CONFLICT_MARKER_MID = '=======';
const CONFLICT_MARKER_END = '>>>>>>>';

const getConflictedFiles = () => {
  try {
    const raw = runGit('diff --name-only --diff-filter=U');
    return raw.split('\n').filter(Boolean);
  } catch {
    return [];
  }
};

const parseConflicts = (content) => {
  const conflicts = [];
  const lines = content.split('\n');
  let i = 0;
  let conflictIndex = 0;

  while (i < lines.length) {
    if (lines[i].startsWith(CONFLICT_MARKER_START)) {
      const mineLines = [];
      const theirLines = [];
      let inMine = true;
      i++;

      while (i < lines.length && !lines[i].startsWith(CONFLICT_MARKER_END)) {
        if (lines[i].startsWith(CONFLICT_MARKER_MID)) {
          inMine = false;
        } else if (inMine) {
          mineLines.push(lines[i]);
        } else {
          theirLines.push(lines[i]);
        }
        i++;
      }

      conflicts.push({
        id: conflictIndex++,
        mine: mineLines.join('\n'),
        theirs: theirLines.join('\n'),
      });
    }
    i++;
  }

  return conflicts;
};

const getConflictsForFile = (filePath) => {
  const fullPath = path.join(ROOT_DIR, filePath);
  if (!fs.existsSync(fullPath)) return [];
  const content = fs.readFileSync(fullPath, 'utf8');
  return parseConflicts(content);
};

const resolveConflict = (filePath, conflictId, choice) => {
  const fullPath = path.join(ROOT_DIR, filePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  const result = [];
  let i = 0;
  let currentConflict = 0;

  while (i < lines.length) {
    if (lines[i].startsWith(CONFLICT_MARKER_START)) {
      const mineLines = [];
      const theirLines = [];
      let inMine = true;
      i++;

      while (i < lines.length && !lines[i].startsWith(CONFLICT_MARKER_END)) {
        if (lines[i].startsWith(CONFLICT_MARKER_MID)) {
          inMine = false;
        } else if (inMine) {
          mineLines.push(lines[i]);
        } else {
          theirLines.push(lines[i]);
        }
        i++;
      }

      if (currentConflict === conflictId) {
        const chosen = choice === 'mine' ? mineLines : theirLines;
        result.push(...chosen);
      } else {
        result.push(CONFLICT_MARKER_START + ' HEAD');
        result.push(...mineLines);
        result.push(CONFLICT_MARKER_MID);
        result.push(...theirLines);
        result.push(lines[i]);
      }
      currentConflict++;
    } else {
      result.push(lines[i]);
    }
    i++;
  }

  fs.writeFileSync(fullPath, result.join('\n'));
};

const resolveAllConflicts = (filePath, choice) => {
  const fullPath = path.join(ROOT_DIR, filePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].startsWith(CONFLICT_MARKER_START)) {
      const mineLines = [];
      const theirLines = [];
      let inMine = true;
      i++;

      while (i < lines.length && !lines[i].startsWith(CONFLICT_MARKER_END)) {
        if (lines[i].startsWith(CONFLICT_MARKER_MID)) {
          inMine = false;
        } else if (inMine) {
          mineLines.push(lines[i]);
        } else {
          theirLines.push(lines[i]);
        }
        i++;
      }

      const chosen = choice === 'mine' ? mineLines : theirLines;
      result.push(...chosen);
    } else {
      result.push(lines[i]);
    }
    i++;
  }

  fs.writeFileSync(fullPath, result.join('\n'));
};

const hasRemainingConflicts = (filePath) => {
  const fullPath = path.join(ROOT_DIR, filePath);
  if (!fs.existsSync(fullPath)) return false;
  const content = fs.readFileSync(fullPath, 'utf8');
  return content.includes(CONFLICT_MARKER_START);
};

module.exports = {
  getConflictedFiles,
  parseConflicts,
  getConflictsForFile,
  resolveConflict,
  resolveAllConflicts,
  hasRemainingConflicts,
};
