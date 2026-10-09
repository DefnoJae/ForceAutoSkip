const fs = require('fs');
const version = '1.0.7';
const releasePath = 'releases/v' + version;
const releaseURL = 'https://raw.githubusercontent.com/DefnoJae/ForceAutoSkip/main/' + releasePath;
const manifest = {
  id: 'force-op-ed-skip',
  name: 'Force OP/ED Skip',
  version,
  manifestURI: releaseURL + '/Manifest.json',
  language: 'javascript',
  type: 'plugin',
  description: 'Reliably seeks past detected OP/ED ranges, with labelled chapter fallback and retries.',
  author: 'DefnoJae',
  website: 'https://github.com/DefnoJae/ForceAutoSkip',
  icon: releaseURL + '/icon.png',
  lang: 'multi',
  payload: fs.readFileSync('code.js', 'utf8'),
  plugin: { version: '1', permissions: { scopes: ['playback'] } }
};
fs.writeFileSync('Manifest.json', JSON.stringify(manifest, null, 2) + '\n');
fs.mkdirSync(releasePath, { recursive: true });
fs.writeFileSync(releasePath + '/Manifest.json', JSON.stringify(manifest, null, 2) + '\n');
fs.copyFileSync('icon-selected.png', releasePath + '/icon.png');
