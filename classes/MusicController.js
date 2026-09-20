/** Three synchronized stems: melody stays present as percussion and tension enter. */
class MusicController {
    constructor(audio){this.audio=audio;this.volume=.35;this.target=-1;this.layers=[];this.requestedMap='forest';this.loadId=0;this.mode=null;try{const saved=localStorage.getItem('woodland-music-volume');if(saved!==null&&Number.isFinite(Number(saved)))this.volume=Math.max(0,Math.min(1,Number(saved)));}catch{}
        document.addEventListener?.('visibilitychange',()=>this.update(this.lastState||'start',this.lastIntensity??1,this.requestedMap));
    }
    async start(map=this.requestedMap){
        map=['forest','snow','ash'].includes(map)?map:'forest';this.requestedMap=map;
        if(!this.audio.ctx||this.attemptedMap===map)return;
        this.attemptedMap=map;const id=++this.loadId;this.loading=true;
        // Keep compressed music at its native sample rate to bound phone memory.
        this.decoder ||= typeof OfflineAudioContext!=='undefined'?new OfflineAudioContext(2,1,22050):this.audio.ctx;
        const read=async url=>{const r=await fetch(url);if(!r.ok)throw Error('Music HTTP '+r.status);return this.decoder.decodeAudioData(await r.arrayBuffer());};
        try{
            let buffers;
            try{buffers=await Promise.all(['theme','rhythm','tension'].map(part=>read(`assets/audio/${map}-${part}.mp3?v=22`)));}
            catch(error){if(id!==this.loadId)return;console.warn('新配乐暂未加载，使用备用音乐',error);buffers=[await read('assets/audio/woodland-trail.wav')];}
            if(id!==this.loadId)return;
            const ctx=this.audio.ctx,now=ctx.currentTime;
            if(!this.gain){this.gain=ctx.createGain();this.gain.gain.value=0;this.gain.connect(ctx.destination);}
            if(this.group){this.group.gain.cancelScheduledValues(now);this.group.gain.setTargetAtTime(0,now,.45);for(const l of this.layers)l.source.stop(now+2);}
            const group=ctx.createGain();group.gain.value=0;group.connect(this.gain);let remaining=buffers.length;
            const when=now+.06,loopEnd=Math.min(...buffers.map(b=>b.duration));
            this.layers=buffers.map((buffer,i)=>{
                const gain=ctx.createGain();gain.gain.value=i===0?1:0;gain.connect(group);
                const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;source.loopEnd=loopEnd;source.connect(gain);source.start(when);
                source.onended=()=>{source.disconnect();gain.disconnect();if(--remaining===0)group.disconnect();};return {source,gain};
            });
            group.gain.setTargetAtTime(1,when,.6);this.group=group;this.source=this.layers[0].source;this.map=map;this.startedAt=when;this.beatSeconds=loopEnd/128;this.target=-1;this.mode=null;
        }catch(error){console.warn('背景音乐加载失败，可继续游戏',error);}finally{if(id===this.loadId)this.loading=false;}
    }
    setVolume(value){this.volume=Math.max(0,Math.min(1,Number(value)||0));try{localStorage.setItem('woodland-music-volume',String(this.volume));}catch{}this.target=-1;}
    update(state,intensity=1,map=this.requestedMap){
        this.lastState=state;this.lastIntensity=intensity;
        if(this.attemptedMap!==map)this.start(map);if(!this.gain)return;
        const now=this.audio.ctx.currentTime;
        // Three stable arrangements; incoming instruments join on the next beat.
        const next=state!=='playing'?'rest':intensity>=1.18?'danger':intensity>=1?'drive':'rest';
        if(next!==this.mode){
            this.mode=next;const weights=next==='danger'?[1,.85,.7]:next==='drive'?[1,.68,.18]:[1,.22,0];
            const onBeat=this.startedAt+Math.ceil(Math.max(0,now-this.startedAt)/this.beatSeconds)*this.beatSeconds;
            this.layers.forEach((l,i)=>{l.gain.gain.cancelScheduledValues(now);l.gain.gain.setTargetAtTime(weights[i],state==='playing'?onBeat:now,next==='rest'?1.1:.55);});
        }
        const target=!this.audio.enabled||document.hidden?0:this.volume*(state==='playing'?.65:state==='paused'||state==='upgrading'?.16:.28);
        if(target===this.target)return;this.target=target;this.gain.gain.cancelScheduledValues(now);this.gain.gain.setTargetAtTime(target,now,target===0?.035:.2);
    }
}
class AudioSettings {
    constructor(game){this.game=game;this.controls=[];
        for(const parent of [game.loadout.panel.querySelector('.loadout-inner')||game.loadout.panel,game.skillInventory.dialog]){
            const panel=document.createElement('details');panel.className='audio-settings';const title=document.createElement('summary');title.textContent='声音设置';panel.append(title);
            for(const [id,label,value] of [['music','背景音乐',game.audio.music.volume],['effects','攻击与音效',game.audio.masterVolume]]){
                const row=document.createElement('label');row.textContent=label;const range=document.createElement('input');range.type='range';range.min=0;range.max=100;range.value=Math.round(value*100);range.setAttribute('aria-label',label);const output=document.createElement('output');output.textContent=range.value+'%';
                range.addEventListener('input',()=>{game.audio.init();game.audio._ensureInit();if(id==='music')game.audio.music.setVolume(range.value/100);else game.audio.setVolume(range.value/100);for(const entry of this.controls.filter(c=>c.id===id)){entry.range.value=range.value;entry.output.textContent=range.value+'%';}});
                row.append(range,output);panel.append(row);this.controls.push({id,range,output});
            }parent.append(panel);
        }
    }
}
