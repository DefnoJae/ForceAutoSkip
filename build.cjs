const fs = require('fs');
const manifest = {
  id: 'force-op-ed-skip',
  name: 'Force OP/ED Skip',
  version: '1.0.6',
  manifestURI: 'https://raw.githubusercontent.com/DefnoJae/ForceAutoSkip/main/Manifest.json',
  language: 'javascript',
  type: 'plugin',
  description: 'Reliably seeks past detected OP/ED ranges, with labelled chapter fallback and retries.',
  author: 'DefnoJae',
  website: 'https://github.com/DefnoJae/ForceAutoSkip',
  icon: 'https://raw.githubusercontent.com/DefnoJae/ForceAutoSkip/main/icon-selected.png',
  lang: 'multi',
  payload: fs.readFileSync('code.js', 'utf8'),
  plugin: { version: '1', permissions: { scopes: ['playback'] } }
};
fs.writeFileSync('Manifest.json', JSON.stringify(manifest, null, 2) + '\n');
