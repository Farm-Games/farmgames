const { spawn } = require('child_process');
const path = require('path');

const SERVER_PATH = path.join(__dirname, 'server.js');

const start = () => {
  const child = spawn('node', [SERVER_PATH], { stdio: 'inherit' });
  child.on('close', (code) => {
    if (code === 0) {
      console.log('\n  Restarting editor...\n');
      start();
    } else {
      process.exit(code);
    }
  });
};

start();
