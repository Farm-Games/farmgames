const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');

function start() {
  const child = spawn('node', [serverPath], { stdio: 'inherit' });
  child.on('close', (code) => {
    if (code === 0) {
      console.log('\n  Restarting editor...\n');
      start();
    } else {
      process.exit(code);
    }
  });
}

start();
