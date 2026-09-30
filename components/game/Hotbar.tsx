'use client';
import type { Game } from '@/game/engine/Game';
import type { Action } from '@/game/engine/store';
import { COOLDOWNS, GEAR, gearUnlocked } from '@/game/engine/missions';
import PixelIcon from './PixelIcon';
import { useGameState } from './useGameState';

const PAD: Partial<Record<Action,string>>={melee:'X',zap:'B / RT',dash:'LB',cat:'Y',artifact1:'↑',artifact2:'→',artifact3:'↓',artifact4:'←'};
const keyName=(code:string)=>code.replace(/^Key|^Digit/,'').replace('ShiftLeft','Shift').replace('Space','Space');
export default function Hotbar({game}:{game:Game}) {
  const hud=useGameState(game,['save','settings','device','cooldowns','hp','maxHp','tour']);
  const unlocked=new Set(gearUnlocked(hud.save).map(g=>g.id));
  const label=(action:Action)=>hud.device==='touch'?'Tap':hud.device==='gamepad'?PAD[action]:keyName(hud.settings.keys[action][0]);
  const slot=(id:string,name:string,icon:string,action:Action,locked=false,reason='')=>{
    const cd=hud.cooldowns[id]??0, seconds=Math.ceil(cd*(COOLDOWNS[id]??1));
    return <button key={id} className={`g-slot${locked?' locked':''}`} aria-label={`${name} — ${locked?reason:seconds?`${seconds} seconds remaining`:'ready'}`} title={`${name} — ${locked?reason:'Ready when cooldown ends'}`} onClick={()=>{
      if(locked){game.store.toast(reason,'warn');return;}
      game.input.press(action);
    }}><span className="g-ico"><PixelIcon name={locked?'lock':icon}/></span><kbd>{label(action)}</kbd>
      <span className="g-slot-state">{locked?'Locked':seconds?`${seconds}s`:'Ready'}</span>
      {cd>0&&<i className="g-cd" style={{height:`${Math.min(100,cd*100)}%`}}/>}
    </button>;
  };
  return <div className="g-hotbar" hidden={!!hud.tour} role="group" aria-label="Abilities">
    {slot('melee','Wrench','wrench','melee')}{slot('zap','Solder beam','bolt','zap')}
    {slot('dash','Servo Boots','boot','dash',!unlocked.has('dash'),'Clear About to unlock Servo Boots')}
    <div className="g-heart" role="meter" aria-label="Health" aria-valuemin={0} aria-valuemax={hud.maxHp} aria-valuenow={hud.hp}><span aria-hidden>♥</span><b>{hud.hp}/{hud.maxHp}</b></div>
    {slot('cat','Xiao Hu','cat','cat')}
    {GEAR.filter(g=>g.slot).map(g=>slot(g.id,g.name,g.id,`artifact${g.slot}` as Action,!unlocked.has(g.id),`Clear ${game.portfolio.levels.find(l=>l.id===g.from)?.title??g.from} to unlock ${g.name}`))}
  </div>;
}
