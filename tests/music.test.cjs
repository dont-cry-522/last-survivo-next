const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function setup(fetcher){
 const sources=[],param=()=>({value:0,cancelScheduledValues(){},setTargetAtTime(v){this.value=v}});
 const ctx={currentTime:1,destination:{},createGain(){return {gain:param(),connect(){},disconnect(){}}},createBufferSource(){const s={connect(){},disconnect(){},start(t){this.started=t},stop(t){this.stopped=t}};sources.push(s);return s},async decodeAudioData(){return {duration:64}}};
 const c=vm.createContext({console,document:{hidden:false,addEventListener(name,handler){this[name]=handler}},localStorage:{getItem(){return null},setItem(){}},fetch:fetcher|| (async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}))});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../classes/MusicController.js'),'utf8')+';this.Music=MusicController',c);
 const audio={ctx,enabled:true};return {music:new c.Music(audio),audio,sources,c};
}
test('three music stems start together and repeat updates do not create sources',async()=>{
 const {music,sources}=setup();await music.start('forest');assert.equal(sources.length,3);assert(sources.every(s=>s.started===sources[0].started&&s.loop));
 for(let i=0;i<20;i++)music.update('playing',.8,'forest');assert.equal(sources.length,3);
});
test('combat adds rhythm and tension without removing the adventure melody',async()=>{
 const {music}=setup();await music.start('forest');music.update('playing',.65,'forest');const rest=music.layers.map(l=>l.gain.gain.value);
 music.update('playing',1.2,'forest');const fight=music.layers.map(l=>l.gain.gain.value);assert(fight[0]>0);assert(fight[1]>rest[1]);assert(fight[2]>rest[2]);
});
test('map changes retire old sources; mute, volume zero and hidden page silence the mix',async()=>{
 const {music,audio,sources,c}=setup();await music.start('forest');await music.start('snow');assert(sources.slice(0,3).every(s=>s.stopped>0));assert.equal(music.map,'snow');
 music.update('playing',1,'snow');audio.enabled=false;music.update('playing',1,'snow');assert.equal(music.target,0);
 audio.enabled=true;music.setVolume(0);music.update('playing',1,'snow');assert.equal(music.target,0);music.setVolume(.5);c.document.hidden=true;music.update('playing',1,'snow');assert.equal(music.target,0);
});
test('late downloads cannot replace the most recently selected map',async()=>{
 let release;const gate=new Promise(r=>release=r);const {music}=setup(async url=>{if(url.includes('forest'))await gate;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}});
 const forest=music.start('forest');await music.start('ash');release();await forest;assert.equal(music.map,'ash');
});
test('visibility event silences music even when animation frames stop',async()=>{
 const {music,c}=setup();await music.start('forest');music.update('playing',1.2,'forest');c.document.hidden=true;c.document.visibilitychange();assert.equal(music.target,0);
 c.document.hidden=false;c.document.visibilitychange();assert(music.target>0);assert.equal(music.mode,'danger');
});
test('failed map download falls back once and does not retry every frame',async()=>{
 let requests=0;const {music}=setup(async url=>{requests++;return {ok:url.includes('woodland-trail'),arrayBuffer:async()=>new ArrayBuffer(1)}});
 await music.start('snow');assert.equal(music.layers.length,1);const before=requests;for(let i=0;i<10;i++)music.update('playing',1,'snow');assert.equal(requests,before);
});
