const fs = require('fs');
const version = '1.0.12';
const releasePath = 'releases/v' + version;
const releaseURL = 'https://raw.githubusercontent.com/DefnoJae/ForceAutoSkip/main/' + releasePath;
const manifest = {
  id: 'force-op-ed-skip',
  name: 'Force OP/ED Skip',
  version,
  manifestURI: 'https://raw.githubusercontent.com/DefnoJae/ForceAutoSkip/main/releases/Manifest.json',
  language: 'javascript',
  type: 'plugin',
  description: 'Reliably seeks past detected OP/ED ranges, with labelled chapter fallback and retries.',
  author: 'DefnoJae',
  website: 'https://github.com/DefnoJae/ForceAutoSkip',
  icon: 'https://raw.githubusercontent.com/DefnoJae/ForceAutoSkip/main/releases/icon.png',
  lang: 'multi',
  payload: fs.readFileSync('code.js', 'utf8'),
  plugin: { version: '1', permissions: { scopes: ['playback', 'storage'] } }
};
fs.writeFileSync('Manifest.json', JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync('latest.json', JSON.stringify(manifest, null, 2) + '\n');
fs.mkdirSync(releasePath, { recursive: true });
fs.writeFileSync('releases/Manifest.json', JSON.stringify(manifest, null, 2) + '\n');
fs.copyFileSync('icon-selected.png', 'releases/icon.png');
fs.writeFileSync(releasePath + '/Manifest.json', JSON.stringify(manifest, null, 2) + '\n');
fs.copyFileSync('icon-selected.png', releasePath + '/icon.png');
// Migrate installed versions whose update URL was pinned to a release directory.
for (const dir of fs.readdirSync('releases')) {
  const path = 'releases/' + dir + '/Manifest.json';
  if (fs.existsSync(path)) fs.writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n');
}
