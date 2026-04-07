const { execSync } = require('child_process');
const { ROOT_DIR } = require('./paths');

const GIT_TIMEOUT_MS = 30000;
const GIT_STDIO = ['pipe', 'pipe', 'pipe'];

const runGit = (args) =>
  execSync(`git ${args}`, {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    timeout: GIT_TIMEOUT_MS,
    stdio: GIT_STDIO,
  });

module.exports = { runGit };
