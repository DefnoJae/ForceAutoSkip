const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const source = fs.readFileSync('code.js','utf8');
function row(on) {
 return {attributes:{'data-vc-element':'menu-option'},outerHTML:'<button><span>Skip OP/ED</span><span>'+ (on?'On':'Off') +'</span></button>'};
}
function submenu(on) {
 return [{attributes:{'data-vc-element':'menu-section-close'},outerHTML:'<button><span>Skip OP/ED</span></button>'},
 {attributes:{'data-vc-element':'setting-select-option'},outerHTML:'<div><span><svg></svg></span><span>'+(on?'On':'Off')+'</span></div>'}];
}
function harness(storage = new Map(), initialRows = []) {
 const h = {now:10000, rows:initialRows, intervals:[], events:{}, timers:[], seeks:[], logs:[], storage, hang:false,
 state:{clientId:'client',playbackInfo:{id:'episode1',mkvMetadata:{chapters:[]}}},
 status:{id:'episode1',clientId:'client',duration:1380,currentTime:10,paused:false},
 data:{op:{interval:{startTime:10,endTime:100}},ed:{interval:{startTime:1200,endTime:1290}}}};
 const vc = {getPlaybackState:()=>h.state,getPlaybackStatus:()=>({...h.status,currentTime:0}),
 getCurrentClientId:()=>h.state.clientId,pullStatus:async()=>({...h.status}),getSkipData:async()=>h.data,
 seekTo:time=>h.seeks.push(time),showMessage:()=>{},addEventListener:(name,fn)=>h.events[name]=fn};
 const ctx = {videoCore:vc,dom:{query:async(selector,options)=>{assert.equal(options.withOuterHTML,true);return h.hang?new Promise(()=>{}):h.rows;}},
 setInterval:fn=>{h.intervals.push(fn);return ()=>{};},setTimeout:fn=>{const t={fn,cancelled:false};h.timers.push(t);return ()=>t.cancelled=true;}};
 vm.runInNewContext(source+'\ninit();',{$ui:{register:fn=>fn(ctx)},$storage:{get:key=>storage.get(key),set:(key,value)=>storage.set(key,value)},
 Date:{now:()=>h.now},console:{log:message=>h.logs.push(message)}});
 h.tick=async(ms=0,advance=true)=>{h.now+=ms;if(advance)h.status.currentTime+=ms/1000;await h.intervals[0]();await flush();};
 h.setting=async()=>{await flush();await h.intervals[1]();};
 return h;
}
async function flush(){for(let i=0;i<10;i++)await Promise.resolve();}
(async()=>{
 const stored = new Map([['player-auto-skip:client',true]]);
 let h=harness(stored); await flush(); await h.tick();
 await h.tick(1999); assert.equal(h.seeks.length,0,'native gets full two seconds');
 await h.tick(1); assert.deepEqual(h.seeks,[100],'no menu, click, or cached status needed');
 await h.tick(500); assert.equal(h.seeks.length,1,'throttle retries');
 await h.tick(1500); assert.equal(h.seeks.length,2,'retry after two seconds');
 h.status.currentTime=100;await h.tick(500);assert.equal(h.seeks.length,2,'confirmed target stops retry');
 h=harness(new Map());await flush();await h.tick();await h.tick(3000);assert.equal(h.seeks.length,0,'unknown toggle stays inactive');
 h.rows=submenu(true);await h.setting();assert.equal(h.storage.get('player-auto-skip:client'),true);
 h.rows=[];await h.tick();await h.tick(2000);assert.deepEqual(h.seeks,[100],'submenu On remembered when closed');
 const restarted=harness(h.storage);await flush();await restarted.tick();await restarted.tick(2000);
 assert.deepEqual(restarted.seeks,[100],'restart uses confirmed toggle without opening menu');
 h.rows=submenu(false);await h.setting();await h.tick(3000);assert.equal(h.seeks.length,1,'Off cancels forced skipping');
 const offRestart=harness(h.storage);await flush();await offRestart.tick();await offRestart.tick(3000);assert.equal(offRestart.seeks.length,0);
 h=harness(new Map([['player-auto-skip:client',true]]));await flush();await h.tick();
 h.status.currentTime=100;await h.tick(2000);assert.equal(h.seeks.length,0,'successful native skip cancels fallback');
 h=harness(new Map([['player-auto-skip:client',true]]));await flush();await h.tick();
 h.status.paused=true;await h.tick(3000);h.status.paused=false;await h.tick();await h.tick(1999);assert.equal(h.seeks.length,0);
 await h.tick(1);assert.equal(h.seeks.length,1,'pause resets grace period');
 h=harness(new Map([['player-auto-skip:client',true]]));await flush();await h.tick();await h.tick(5000,false);
 assert.equal(h.seeks.length,0,'buffering does not force a seek');await h.tick(1000);assert.equal(h.seeks.length,0);await h.tick(1000);assert.equal(h.seeks.length,1);
 h=harness(new Map([['player-auto-skip:client',true]]));await flush();await h.tick();
 h.state.playbackInfo.id='episode2';h.status.id='episode2';await h.tick(2000);await h.tick();assert.equal(h.seeks.length,0);
 await h.tick(2000);assert.deepEqual(h.seeks,[100],'episode resets timer but retains known toggle');
 h.status.currentTime=1210;await h.tick();await h.tick(2000);assert.equal(h.seeks.at(-1),1290,'ending skips preserve following scene');
 h=harness(new Map([['player-auto-skip:client',true]]));await flush();h.hang=true;
 const settingsRequest=h.intervals[1]();await flush();await h.tick();await h.tick(2000);
 assert.deepEqual(h.seeks,[100],'pending UI query cannot block playback watchdog');
 for(const t of h.timers)if(!t.cancelled)t.fn();await settingsRequest;
 h.hang=false;h.rows=[row(false)];await h.setting();await h.tick(3000);assert.equal(h.seeks.length,1,'polling recovers and detects Off');
 for(const label of ['Intro','Outro','Credits','Opening scene','After credits']) {
   h=harness(new Map([['player-auto-skip:client',true]]));h.data=null;
   h.state.playbackInfo.mkvMetadata.chapters=[{start:0,text:label},{start:90,text:'Story'}];await flush();h.now+=6000;await h.tick();await h.tick(2000);assert.equal(h.seeks.length,0,label);
 }
 h=harness(new Map([['player-auto-skip:client',true]]));h.state.playbackInfo.mkvMetadata.chapters=[{start:0,text:'OP',end:900},{start:90,text:'Story'}];
 await flush();await h.tick();await h.tick(2000);assert.deepEqual(h.seeks,[90],'file chapter caps end and overrides player timing');
 h=harness(new Map([['player-auto-skip:client',true]]));h.state.playbackInfo.isNakamaWatchParty=true;await flush();await h.tick();await h.tick(3000);assert.equal(h.seeks.length,0);
 h=harness(new Map([['player-auto-skip:client',true]]));h.status.id='stale';await flush();await h.tick();await h.tick(3000);assert.equal(h.seeks.length,0);
 const manifest=JSON.parse(fs.readFileSync('Manifest.json','utf8'));
 assert.equal(manifest.version,'1.0.11');assert.equal(manifest.payload,source);
 assert.deepEqual(manifest.plugin.permissions.scopes,['playback','storage']);
 assert.equal(manifest.manifestURI,'https://raw.githubusercontent.com/DefnoJae/ForceAutoSkip/main/releases/Manifest.json');
 for(const path of ['latest.json','releases/Manifest.json',...fs.readdirSync('releases').filter(dir=>fs.statSync('releases/'+dir).isDirectory()).map(dir=>'releases/'+dir+'/Manifest.json')])
   assert.deepEqual(JSON.parse(fs.readFileSync(path,'utf8')),manifest);
 console.log('PASS: two-second grace, no-touch fallback, fresh status pull, retries, native success, remembered On/Off, restart, pause, buffering, episode changes, ending, UI query isolation, chapter guards, watch party, stale status, update aliases');
})().catch(error=>{console.error(error);process.exitCode=1;});
