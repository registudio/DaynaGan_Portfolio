'use client';
import { useState } from 'react';
import type { Game } from '@/game/engine/Game';
import type { Hud } from '@/game/engine/store';
import { gripResult, sensorReading, signalPath } from '@/game/engine/exploration';

const LABS = {gripper:'Gripper control',sensor:'Sensor calibration',routing:'Signal routing'} as const;
export default function EngineeringLab({game,hud}: {game:Game;hud:Hud}) {
  const [lab,setLab]=useState<keyof typeof LABS>('gripper');
  const [gap,setGap]=useState(75), [force,setForce]=useState(15), [offset,setOffset]=useState(0);
  const [switches,setSwitches]=useState([0,0,0,0]);
  const [feedback,setFeedback]=useState('');
  const grip=gripResult(gap,force), reading=sensorReading(27.4,offset), target=[1,3,2,1];
  const powered=signalPath(switches,target);
  const success=lab==='gripper'?grip==='held':lab==='sensor'?Math.abs(reading-25)<=0.1:powered===4;
  return <div className="g-lab">
    <p className="g-sub">Optional engineering simulations · simplified teaching models, not measurements from the real projects. Complete all three experiments at your own pace.</p>
    <div className="g-actions">{Object.entries(LABS).map(([id,name])=><button key={id} className="g-btn" aria-pressed={lab===id} onClick={()=>{setLab(id as typeof lab);setFeedback('');}}>{hud.save.labs?.includes(id)?'✓ ':''}{name}</button>)}</div>
    <h3>{LABS[lab]}</h3>
    {lab==='gripper'&&<><p>Pick up a fragile 38 mm sample. Close the fingers to 32–42 mm and apply enough force to hold it without crushing it.</p>
      <svg viewBox="0 0 400 170" role="img" aria-label={`Gripper ${grip}, gap ${gap} millimetres`}><rect x="60" y="20" width="280" height="24" rx="10" fill="#64748b"/><path d={`M${200-gap} 44 V125 H${212-gap} M${200+gap} 44 V125 H${188+gap}`} fill="none" stroke="#a78bfa" strokeWidth="14"/><rect x="175" y="100" width="50" height="45" rx="8" fill={grip==='held'?'#34d399':grip==='crushed'?'#fb7185':'#fbbf24'}/></svg>
      <label>Finger gap · {gap} mm<input type="range" min="20" max="90" value={gap} onChange={e=>setGap(+e.target.value)}/></label>
      <label>Grip force · {force}%<input type="range" min="0" max="100" value={force} onChange={e=>setForce(+e.target.value)}/></label>
      <output aria-live="polite">{grip==='held'?'✓ Stable grip':grip==='crushed'?'! Too much pressure':grip==='slipping'?'↓ Sample slipping':'◇ Fingers open'}</output></>}
    {lab==='sensor'&&<><p>The reference is 25.0°C, but the sensor reads 27.4°C. Correct the offset to within 0.1°C, then test it.</p>
      <div className="g-lab-meters"><span>Reference <b>25.0°C</b></span><span>Corrected <b>{reading.toFixed(1)}°C</b></span><span>Error <b>{(reading-25).toFixed(1)}°C</b></span></div>
      <label>Calibration offset · {offset.toFixed(1)}°C<input type="range" min="-5" max="5" step="0.1" value={offset} onChange={e=>setOffset(+e.target.value)}/></label></>}
    {lab==='routing'&&<><p>Carry a signal from source to receiver. Each junction must point to its required output: east → west → south → east. A disconnected junction cuts power to everything downstream.</p>
      <div className="g-circuit"><span>⚡ Source</span>{switches.map((v,i)=><button key={i} className={`g-btn ${i<powered?'g-ok':''}`} aria-label={`Junction ${i+1}, ${['north','east','south','west'][v]}, ${i<powered?'powered':'disconnected'}`} onClick={()=>setSwitches(s=>s.map((n,k)=>k===i?(n+1)%4:n))}>{i+1} · {['↑','→','↓','←'][v]}<small>{i<powered?'✓ Power':'○ No power'}</small></button>)}<span>{powered===4?'✓ Receiver':'○ Receiver'}</span></div>
      <output aria-live="polite">{powered}/4 connected · {powered<4?`inspect junction ${powered+1}`:'signal received'}</output></>}
    <div className="g-actions"><button className="g-btn primary" onClick={()=>{if(success){game.completeLab(lab);setFeedback('✓ Experiment complete. Change the controls to keep exploring.');}else setFeedback('Not yet — inspect the live readings and adjust your controls.');}}>Test experiment</button></div>
    <p role="status">{feedback}</p>
  </div>;
}
