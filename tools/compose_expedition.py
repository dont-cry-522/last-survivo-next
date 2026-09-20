"""Original adventure themes, with sample-aligned rhythm and tension stems.

Requires NumPy and ffmpeg with libmp3lame. No third-party recordings or melodies.
Run: python tools/compose_expedition.py --ffmpeg /path/to/ffmpeg
"""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile
import wave
import numpy as np

RATE = 22050
OUT = Path(__file__).resolve().parents[1] / 'assets/audio'
SCORES = {
    'forest': dict(bpm=112, shift=0, lead='flute', roots=[40,43,48,45,40,38,47,40],
        chords=[[64,67,71],[62,67,71],[64,67,72],[64,69,72],[64,67,71],[62,66,69],[63,66,71],[64,67,71]],
        melody=[[76,79,78,74,76,71,74,76],[79,83,81,79,76,74,71,74],
                [81,79,76,74,72,76,79,78],[78,75,71,74,76,79,78,76]]),
    'snow': dict(bpm=108, shift=0, lead='reed', roots=[38,41,46,43,38,36,45,38],
        chords=[[62,65,69],[60,65,69],[62,65,70],[62,67,70],[62,65,69],[60,64,67],[61,64,69],[62,65,69]],
        melody=[[81,77,74,76,77,81,79,77],[77,79,82,81,77,74,72,74],
                [79,77,74,72,70,74,77,76],[76,73,69,73,74,77,76,74]]),
    'ash': dict(bpm=120, shift=0, lead='horn', roots=[45,41,43,40,45,48,43,40],
        chords=[[64,69,72],[65,69,72],[62,67,71],[64,68,71],[64,69,72],[64,67,72],[62,67,71],[64,68,71]],
        melody=[[76,76,79,81,79,76,74,72],[77,76,72,69,71,74,76,74],
                [81,84,83,79,76,79,81,79],[76,75,71,72,74,76,71,69]])
}

def compose(name, score):
    beat = 60 / score['bpm']
    count = round(32 * 4 * beat * RATE)
    stems = {k: np.zeros((count, 2), dtype=np.float64) for k in ['theme','rhythm','tension']}
    rng = np.random.default_rng(817 + list(SCORES).index(name))

    def add(layer, signal, at, volume, pan=0):
        index = (round(at * RATE) + np.arange(len(signal))) % count
        for channel, gain in enumerate([np.sqrt((1-pan)/2), np.sqrt((1+pan)/2)]):
            np.add.at(stems[layer][:,channel], index, signal * volume * gain)

    def note(layer, midi, at, dur, volume, voice='pluck', pan=0):
        t = np.arange(round(dur * RATE)) / RATE
        freq = 440 * 2 ** ((midi-69)/12)
        release = np.minimum(1, (dur-t)/min(.13, dur*.2))
        if voice == 'pluck':
            sig = sum(np.sin(2*np.pi*freq*k*t + .13*k) * np.sin(k*.72)
                      * np.exp(-t*(1.7+k*.75)) / k**1.35 for k in range(1,11))
            sig += .1*np.sin(2*np.pi*freq*1.003*t)*np.exp(-t*3)
            sig *= np.minimum(1,t/.005)*release
        elif voice == 'bass':
            sig = (np.sin(2*np.pi*freq*t)+.2*np.sin(2*np.pi*freq*2*t))
            sig *= np.minimum(1,t/.013)*np.exp(-t*2.7)*release
        else:
            phase = 2*np.pi*freq*t + .08*np.sin(2*np.pi*5.1*t)*np.minimum(1,t*4)
            if voice == 'horn':
                sig = sum(np.sin(k*phase)/(k**1.5) for k in range(1,7))*.65
            elif voice == 'strings':
                sig = sum(np.sin(k*phase + k*.12)/(k**1.6) for k in range(1,9))*.55
            else:
                sig = np.sin(phase)+.16*np.sin(phase*2)+(.12 if voice=='reed' else .045)*np.sin(phase*3)
                sig += np.convolve(rng.normal(0,1,len(t)), np.ones(9)/9, mode='same')*.035
            sig *= np.minimum(1,t/(.11 if voice=='strings' else .04))*release*(.88+.12*np.exp(-t*5))
        add(layer,sig,at,volume,pan)

    def drum(at, kind, volume, layer='rhythm', pan=0):
        dur = .46 if kind in ['kick','tom'] else .16
        t = np.arange(round(dur*RATE))/RATE
        noise = rng.normal(0,.45,len(t))
        if kind in ['kick','tom']:
            f = 53 if kind=='kick' else 105
            sig = np.sin(2*np.pi*(f*t+2.4*(1-np.exp(-t*32))))*np.exp(-t*14)
            sig += noise*.13*np.exp(-t*65)
        elif kind=='rim':
            sig=(np.sin(2*np.pi*710*t)+.4*np.sin(2*np.pi*1170*t))*np.exp(-t*85)+noise*.25*np.exp(-t*75)
        else:
            sig=(noise-np.roll(noise,1))*.45*np.exp(-t*60)
        sig *= np.minimum(1,t/.002)*np.minimum(1,(dur-t)/.01)
        add(layer,sig,at,volume,pan)

    for bar in range(32):
        start = bar*4*beat
        root, chord = score['roots'][bar%8], score['chords'][bar%8]
        bridge = 16 <= bar < 24
        # A clear melody rests between phrases; accompaniment keeps forward motion.
        arp = [0,1,2,1,0,2,1,2] if name!='ash' else [0,2,1,0,2,1,0,2]
        for j, degree in enumerate(arp):
            note('theme',chord[degree],start+j*.5*beat,1.3,.09 if bridge else .115,'pluck',(-1 if j%2 else 1)*.4)
        for j in [0,2]: note('theme',root,start+j*beat,1.1,.15,'bass')
        if bar%2==0:
            phrase = score['melody'][(bar//2)%4]
            timings = [0,.75,1.5,2.5,3.5,4.5,5.25,6.5]
            for j,midi in enumerate(phrase):
                if bridge and j in [1,3,5]: continue
                note('theme',midi-(12 if bridge else 0),start+timings[j]*beat,(1.25 if j==7 else .6)*beat,
                     .125 if name!='ash' else .105,score['lead'],.12)
        if bar>=24 and bar%2==1:
            note('theme',chord[2]+12,start+2.5*beat,.65*beat,.07,'pluck',-.3)
        for j in ([0,2.5] if name!='ash' else [0,1.5,2.5]): drum(start+j*beat,'kick',.28)
        for j in [1,3]: drum(start+j*beat,'rim',.11 if name!='snow' else .075,pan=-.2)
        for j in range(8): drum(start+(j*.5+.018)*beat,'shaker',.05 if j%2 else .035,pan=.35)
        for j in [0,1.5,2,3.5]: note('rhythm',root,start+j*beat,.38*beat,.11,'bass')
        # Danger layer: lower register ostinato, restrained toms, no replacement tune.
        for j in range(8):
            note('tension',chord[j%3]-12,start+j*.5*beat,.34*beat,.065,'strings',-.15)
        if bar%2==0: note('tension',root+12,start,1.7*beat,.11,'horn',.2)
        for j in [0,2,3.5]: drum(start+j*beat,'tom',.16,'tension',.2)
        if bar%4==3:
            for j in [3,3.25,3.5,3.75]: drum(start+j*beat,'tom',.07+(j-3)*.09,'tension',-.2)

    # Circular early reflections preserve note tails across the loop seam.
    for part, mix in stems.items():
        dry=mix.copy()
        for seconds,gain in [(.087,.10),(.173,.07),(.293,.045)]:
            mix += np.roll(dry,round(seconds*RATE),axis=0)[:,::-1]*gain
        # Small DC correction and a short matched endpoint remove loop clicks.
        mix -= mix.mean(axis=0)
        seam = round(RATE*.008)
        edge=(mix[0]+mix[-1])/2
        mix[:seam] += (edge-mix[0])*(1-np.arange(seam)/seam)[:,None]
        mix[-seam:] += (edge-mix[-1])*(np.arange(seam)/(seam-1))[:,None]
    peak=np.max(np.abs(sum(stems.values())))
    gain=.84/max(peak,1e-6)
    for mix in stems.values(): mix*=gain
    return stems, count/RATE

def encode(ffmpeg, mix, dest):
    with tempfile.TemporaryDirectory() as tmp:
        wav=Path(tmp)/'stem.wav'
        with wave.open(str(wav),'wb') as f:
            f.setnchannels(2);f.setsampwidth(2);f.setframerate(RATE)
            f.writeframes((np.clip(mix,-1,1)*32767).astype('<i2').tobytes())
        subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-i',str(wav),'-c:a','libmp3lame','-b:a','96k',str(dest)],check=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--ffmpeg',required=True);args=parser.parse_args()
    report={}
    for name, score in SCORES.items():
        stems,duration=compose(name,score);report[name]={'bpm':score['bpm'],'duration':duration,'stems':{}}
        for part,mix in stems.items():
            dest=OUT/f'{name}-{part}.mp3';encode(args.ffmpeg,mix,dest)
            report[name]['stems'][part]={'bytes':dest.stat().st_size,'rms':round(float(np.sqrt(np.mean(mix**2))),4),'peak':round(float(np.max(np.abs(mix))),4)}
        if name=='forest':
            # A short listening reference; game transitions use the actual live stem mixer.
            preview=stems['theme'][:24*RATE].copy()
            for part,levels in [('rhythm',[.22,.68,.85]),('tension',[0,.18,.7])]:
                time=np.arange(len(preview))/RATE
                weights=np.full(len(preview),levels[0],dtype=float);previous=levels[0]
                for at,level in zip([15*60/score['bpm'],30*60/score['bpm']],levels[1:]):
                    weights+=(level-previous)*np.clip((time-at)/.6,0,1);previous=level
                preview+=stems[part][:len(preview)]*weights[:,None]
            preview[-RATE:] *= np.linspace(1,0,RATE)[:,None]
            encode(args.ffmpeg,preview,OUT/'expedition-preview.mp3')
        print(name,report[name],flush=True)
    (OUT/'expedition-score.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
