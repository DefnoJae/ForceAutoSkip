const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const source = fs.readFileSync('code.js', 'utf8');
let now = 10000, interval, seeks = [], data = {op:{interval:{startTime:10,endTime:100}},ed:{interval:{startTime:1200,endTime:1290}}};
let state = {clientId:'client',playbackInfo:{id:'episode1',mkvMetadata:{chapters:[]}}};
let status = {id:'episode1',clientId:'client',duration:1380,currentTime:19,paused:false};
const listeners = {};
const vc = {getPlaybackState:()=>state,getPlaybackStatus:()=>status,getCurrentClientId:()=>state.clientId,
getSkipData:async()=>data,seekTo:t=>seeks.push(t),showMessage:()=>{},addEventListener:(n,f)=>listeners[n]=f};
vm.runInNewContext(source+'\ninit();', {$ui:{register:f=>f({videoCore:vc,setInterval:f=>interval=f})},Date:{now:()=>now}});
async function flush(){await Promise.resolve();await Promise.resolve();}
(async()=>{
 await flush(); interval(); assert.deepEqual(seeks,[100]);
 interval(); assert.equal(seeks.length,1);
 now+=1600; interval(); assert.deepEqual(seeks,[100,100]);
 status.currentTime=100; interval(); assert.equal(seeks.length,2);
 status.currentTime=1210; interval(); assert.equal(seeks.at(-1),1290);
 status.paused=true; now+=2000; interval(); assert.equal(seeks.length,3);
 status.paused=false; state.playbackInfo.isNakamaWatchParty=true; interval(); assert.equal(seeks.length,3);
 state={clientId:'client',playbackInfo:{id:'episode2',mkvMetadata:{chapters:[{start:0,text:'OP 1'},{start:90,text:'Episode'},{start:1200,text:'ED'},{start:1290,text:'After credits'}]}}};
 data=null; status={...status,id:'episode2',currentTime:20}; now+=6000; interval(); await flush(); interval(); assert.equal(seeks.at(-1),90);
 status.currentTime=1291; interval(); assert.equal(seeks.at(-1),90);
 state.playbackInfo.mkvMetadata.chapters=[{start:0,text:'Chapter 1'},{start:90,text:'Chapter 2'}]; status.currentTime=20; now+=2000; interval(); assert.equal(seeks.at(-1),90);
 status.id='stale'; interval(); assert.equal(seeks.length,4);
 console.log('PASS: exact ranges, retry throttle, confirmed seeks, ending, pause, watch party, episode reset, chapter fallback, post-credit preservation, unlabelled chapters, stale status');
 const manifest = JSON.parse(fs.readFileSync('Manifest.json', 'utf8'));
 assert.equal(manifest.payload, source);
 assert.deepEqual(manifest.plugin.permissions.scopes, ['playback']);
 assert.equal(manifest.version, '1.0.3');
 assert.equal(manifest.icon, 'https://raw.githubusercontent.com/DefnoJae/ForceAutoSkip/main/icon-bleach.png');
 assert.equal(fs.readFileSync('icon-bleach.png').subarray(1, 4).toString(), 'PNG');
 assert.equal(manifest.manifestURI, 'https://raw.githubusercontent.com/DefnoJae/ForceAutoSkip/main/Manifest.json');
 console.log('PASS: manifest JSON and embedded source match');
 let permissionMessage = '';
 vm.runInNewContext(source+'\ninit();', {$ui:{register:f=>f({toast:{error:message=>permissionMessage=message}})}});
 assert.match(permissionMessage, /playback access/);
 console.log('PASS: missing playback API reports actionable error without crashing');
})();

