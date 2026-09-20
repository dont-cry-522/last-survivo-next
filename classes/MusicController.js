/** One looping music source; gain changes never restart the phrase. */
class MusicController {
    constructor(audio){this.audio=audio;this.volume=.35;this.target=-1;try{const saved=localStorage.getItem('woodland-music-volume');if(saved!==null&&Number.isFinite(Number(saved)))this.volume=Math.max(0,Math.min(1,Number(saved)));}catch{}}
    async start(){if(this.loading||this.source||!this.audio.ctx)return;this.loading=true;
        try{const response=await fetch('assets/audio/woodland-trail.wav');if(!response.ok)throw Error('Music HTTP '+response.status);const buffer=await this.audio.ctx.decodeAudioData(await response.arrayBuffer());
            this.gain=this.audio.ctx.createGain();this.gain.gain.value=0;this.gain.connect(this.audio.ctx.destination);
            this.source=this.audio.ctx.createBufferSource();this.source.buffer=buffer;this.source.loop=true;this.source.connect(this.gain);this.source.start();this.target=-1;
        }catch(error){console.warn('背景音乐加载失败，可继续游戏',error);}finally{this.loading=false;}}
    setVolume(value){this.volume=Math.max(0,Math.min(1,Number(value)||0));try{localStorage.setItem('woodland-music-volume',String(this.volume));}catch{}this.target=-1;}
    update(state,intensity=1){if(!this.gain)return;const target=!this.audio.enabled||document.hidden?0:this.volume*(state==='playing'?.5*Math.max(.5,Math.min(1.2,intensity)):state==='paused'||state==='upgrading'?.16:.28);
        if(target===this.target)return;this.target=target;const now=this.audio.ctx.currentTime;this.gain.gain.cancelScheduledValues(now);this.gain.gain.setTargetAtTime(target,now,.2);}
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
