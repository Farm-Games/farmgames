const fs = require('fs');
const { CONFIG_PATH } = require('./paths');

const loadSiteConfig = () => {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
};

const saveSiteConfig = (config) => {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
};

module.exports = { loadSiteConfig, saveSiteConfig };
