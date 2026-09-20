"""Original 32-bar woodland loop: plucked strings, bass, brushed percussion.
Deterministic synthesis, circular reverb tails, no third-party recordings.
"""
from pathlib import Path
import numpy as np,wave
rate=22050; beat=60/104; length=32*4*beat; N=round(length*rate)
rng=np.random.default_rng(518);mix=np.zeros((N,2),dtype=np.float64)
def add(sig,at,volume=.1,pan=0):
 idx=(round(at*rate)+np.arange(len(sig)))%N
 for ch,g in enumerate([(1-pan)*.5,(1+pan)*.5]):np.add.at(mix[:,ch],idx,sig*volume*g)
def note(midi,at,dur,volume,pan=0,bass=False):
 t=np.arange(round(dur*rate))/rate;f=440*2**((midi-69)/12)
 sig=sum(np.sin(2*np.pi*f*k*t+.12*k)*np.exp(-t*(2+k*.8 if not bass else 2+k*.3))/(k**1.7) for k in range(1,6))
 sig*=np.minimum(1,t/.007)*np.minimum(1,(dur-t)/.04)
 add(sig,at,volume,pan)
def drum(at,kind,volume):
 dur=.24 if kind=='kick' else .095;t=np.arange(round(rate*dur))/rate
 if kind=='kick':sig=np.sin(2*np.pi*(64*t+3*(1-np.exp(-t*35))))*np.exp(-t*24)
 else:
  noise=rng.normal(0,.4,len(t));sig=(noise-np.roll(noise,1))*np.exp(-t*(65 if kind=='hat' else 30));sig*=np.minimum(1,t*1500)
 add(sig,at,volume)
chords=[(50,[62,65,69]),(46,[58,62,65]),(53,[60,65,69]),(48,[60,64,67])]
melodies=[[74,77,76,69,72,74],[77,74,70,69,65,70],[72,77,81,77,74,72],[76,79,76,72,67,69]]
for bar in range(32):
 root,chord=chords[(bar//2)%4];start=bar*4*beat;section=bar//8
 for j in range(8):note(chord[[0,1,2,1,0,2,1,2][j]],start+j*beat/2,1.2,.16 if section!=2 else .11,(-1 if j%2 else 1)*.3)
 for j in [0,2]:note(root,start+j*beat,1.2,.29,0,True)
 for j in [0,2.5]:drum(start+j*beat,'kick',.27)
 for j in [1,3]:drum(start+j*beat,'brush',.065)
 for j in range(8):drum(start+(j*.5+.03)*beat,'hat',.035 if j%2 else .022)
 if bar%2==0 and section!=2:
  phrase=melodies[(bar//2)%4]
  for j,m in enumerate(phrase):note(m+(12 if section==3 and j==4 else 0),start+[0,.75,1.5,2.5,3.5,4.5][j]*beat,.8,.11,.1)
# Circular reflections preserve a seamless tail through the loop boundary.
dry=mix.copy()
for seconds,gain in [(.113,.17),(.227,.10),(.367,.065)]:mix+=np.roll(dry,round(seconds*rate),axis=0)[:,::-1]*gain
mix=np.tanh(mix*1.5);mix*=.78/max(.78,np.max(np.abs(mix)))
out=Path(__file__).resolve().parents[1]/'assets/audio/woodland-trail.wav'
with wave.open(str(out),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(rate);w.writeframes((mix*32767).astype('<i2').tobytes())
print(f'{length:.2f}s, peak={np.abs(mix).max():.3f}, loop step={np.max(np.abs(mix[-1]-mix[0])):.5f}, {out.stat().st_size} bytes')
