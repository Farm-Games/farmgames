const fs = require('fs');
const path = require('path');
const { Router } = require('express');
const { ROOT_DIR } = require('../lib/paths');
const { runGit } = require('../lib/git');
const { cleanUnusedImages, cleanUnusedMedia } = require('../lib/cleanup');
const {
  getConflictedFiles,
  getConflictsForFile,
  resolveConflict,
  resolveAllConflicts,
  hasRemainingConflicts,
} = require('../lib/conflicts');

const router = Router();

const classifyChange = (code, file) => {
  const isPage = file.startsWith('src/pages/') && file.endsWith('.md');
  const isImage = file.startsWith('src/images/');
  const label = isPage
    ? file.replace('src/pages/', '').replace('.md', '')
    : isImage
      ? file.replace('src/images/', '')
      : file;
  const type = isPage ? 'page' : isImage ? 'image' : 'file';
  return { label, type, file };
};

const stageFiles = (selectedFiles) => {
  if (selectedFiles && selectedFiles.length > 0) {
    const safeFiles = selectedFiles.map((f) => `"${f.replace(/"/g, '')}"`).join(' ');
    runGit(`add ${safeFiles}`);
    return `Staged ${selectedFiles.length} file(s)`;
  }
  runGit('add -A');
  return 'Staged all changes';
};

const isConflict = (msg) =>
  msg.includes('CONFLICT') || msg.includes('could not apply') || msg.includes('conflict');

const syncWithRemote = () => {
  try {
    runGit('pull --rebase origin master');
    console.log('  ✓ Synced');
    return { ok: true };
  } catch (pullErr) {
    const msg = pullErr.message || '';
    if (isConflict(msg)) {
      console.log('  ✗ Conflict detected');
      const files = getConflictedFiles();
      return { ok: false, conflict: true, files };
    }
    throw pullErr;
  }
};

// ===== Summary =====

router.get('/summary', (req, res) => {
  try {
    const raw = runGit('status --porcelain');
    const lines = raw.split('\n').filter(Boolean);
    const summary = { created: [], edited: [], deleted: [] };
    for (const line of lines) {
      const code = line.substring(0, 2);
      const file = line.substring(3);
      const entry = classifyChange(code, file);
      if (code === '??' || code.includes('A')) {
        summary.created.push(entry);
      } else if (code.includes('D')) {
        summary.deleted.push(entry);
      } else {
        summary.edited.push(entry);
      }
    }
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Revert =====

router.post('/revert', (req, res) => {
  const { files } = req.body;
  if (!files || !files.length) return res.status(400).json({ error: 'No files specified' });
  try {
    console.log(`  → Reverting ${files.length} file(s)...`);
    const reverted = [];
    for (const file of files) {
      const safe = file.replace(/"/g, '');
      try {
        runGit(`checkout HEAD -- "${safe}"`);
        reverted.push(safe);
      } catch {
        const fullPath = path.join(ROOT_DIR, safe);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          reverted.push(safe + ' (removed)');
        }
      }
    }
    console.log(`  ✓ Reverted ${reverted.length} file(s)\n`);
    res.json({ reverted });
  } catch (err) {
    console.log('  ✗ Revert failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===== Deploy =====

router.post('/', (req, res) => {
  const message = (req.body.message || 'Update from editor').replace(/"/g, "'");
  const selectedFiles = req.body.files;
  const steps = [];
  try {
    const removedImages = cleanUnusedImages();
    const removedMedia = cleanUnusedMedia();
    const totalCleaned = removedImages + removedMedia;
    if (totalCleaned > 0) {
      console.log(
        `  ✓ Cleaned ${removedImages} unused image(s), ${removedMedia} unused media file(s)`,
      );
      steps.push(`Removed ${totalCleaned} unused file(s)`);
    }

    console.log('  → Staging changes...');
    steps.push(stageFiles(selectedFiles));
    console.log('  ✓ Staged');

    const status = runGit('status --porcelain');
    if (!status.trim()) {
      console.log('  · Nothing to deploy');
      return res.json({
        deployed: false,
        steps,
        message: 'Nothing to deploy -- no changes found.',
      });
    }

    console.log('  → Committing...');
    runGit(`commit -m "${message}"`);
    steps.push('Committed: ' + message);
    console.log('  ✓ Committed');

    console.log('  → Syncing with remote...');
    const sync = syncWithRemote();
    if (!sync.ok && sync.conflict) {
      const conflictData = sync.files.map((f) => ({
        file: f,
        conflicts: getConflictsForFile(f),
      }));
      return res.status(409).json({
        deployed: false,
        conflict: true,
        steps,
        files: conflictData,
      });
    }
    steps.push('Synced with remote');

    console.log('  → Pushing...');
    runGit('push origin master');
    steps.push('Pushed to origin/master');
    console.log('  ✓ Deployed successfully\n');

    res.json({ deployed: true, steps });
  } catch (err) {
    console.log('  ✗ Deploy failed:', err.message);
    steps.push('Error: ' + err.message);
    res.status(500).json({ deployed: false, steps, error: err.message });
  }
});

// ===== Conflict Resolution =====

router.get('/conflicts', (req, res) => {
  try {
    const files = getConflictedFiles();
    const conflictData = files.map((f) => ({
      file: f,
      conflicts: getConflictsForFile(f),
    }));
    res.json(conflictData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/conflicts/resolve', (req, res) => {
  const { file, conflictId, choice } = req.body;
  if (!file || conflictId === undefined || !choice) {
    return res.status(400).json({ error: 'Missing file, conflictId, or choice' });
  }
  try {
    resolveConflict(file, conflictId, choice);
    console.log(`  ✓ Resolved conflict ${conflictId} in ${file} (${choice})`);
    const remaining = getConflictsForFile(file);
    res.json({ remaining: remaining.length });
  } catch (err) {
    console.log(`  ✗ Resolve failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

router.post('/conflicts/resolve-all', (req, res) => {
  const { choice } = req.body;
  if (!choice) return res.status(400).json({ error: 'Missing choice' });
  try {
    const files = getConflictedFiles();
    for (const file of files) {
      resolveAllConflicts(file, choice);
    }
    console.log(`  ✓ Resolved all conflicts (${choice})`);
    res.json({ resolved: files.length });
  } catch (err) {
    console.log(`  ✗ Resolve all failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

router.post('/conflicts/finish', (req, res) => {
  try {
    const files = getConflictedFiles();
    const unresolved = files.filter((f) => hasRemainingConflicts(f));
    if (unresolved.length > 0) {
      return res.status(400).json({
        error: `${unresolved.length} file(s) still have conflicts`,
        files: unresolved,
      });
    }

    runGit('add -A');
    runGit('-c core.editor=true rebase --continue');
    console.log('  ✓ Rebase completed');

    runGit('push origin master');
    console.log('  ✓ Pushed after conflict resolution\n');

    res.json({ deployed: true });
  } catch (err) {
    console.log('  ✗ Finish failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/conflicts/abort', (req, res) => {
  try {
    runGit('rebase --abort');
    console.log('  ✓ Rebase aborted, changes preserved locally');
    res.json({ aborted: true });
  } catch (err) {
    console.log('  ✗ Abort failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/conflicts/reset', (req, res) => {
  try {
    runGit('rebase --abort');
    runGit('reset --hard origin/master');
    console.log('  ✓ Reset to origin/master');
    res.json({ reset: true });
  } catch (err) {
    console.log('  ✗ Reset failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
