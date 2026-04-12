const { Router } = require('express');
const { runGit } = require('../lib/git');

const RESTART_DELAY_MS = 500;

const router = Router();

router.post('/', (req, res) => {
  try {
    const status = runGit('status --porcelain');
    if (status.trim()) {
      console.log('  ✗ Update blocked: uncommitted changes');
      return res.status(400).json({
        error: 'You have unsaved changes. Please deploy or discard them before updating.',
      });
    }
    console.log('  → Pulling latest changes...');
    const output = runGit('pull origin master');
    console.log('  ✓ Updated');
    res.json({ updated: true, output });
    setTimeout(() => {
      console.log('  → Restarting editor...\n');
      process.exit(0);
    }, RESTART_DELAY_MS);
  } catch (err) {
    console.log('  ✗ Update failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
