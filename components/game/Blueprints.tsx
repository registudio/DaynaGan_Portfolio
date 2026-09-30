'use client';
import type { Game } from '@/game/engine/Game';
import type { Hud } from '@/game/engine/store';
import { projectPlan } from '@/game/engine/exploration';

export default function Blueprints({game,hud}: {game:Game;hud:Hud}) {
  return <div className="g-blueprints"><p className="g-sub">Pin a build to track parts, prerequisites, and your next destination.</p>
    {game.portfolio.levels.find(l=>l.id==='projects')?.rooms.map(room=>{
      const plan=projectPlan(game.portfolio,hud.save,room.id)!;
      return <article className="g-blueprint" key={room.id}>
        <h3>{plan.done?'✓':'◇'} {room.title}</h3>
        <p>{room.parts.length-plan.missing.length}/{room.parts.length} parts recovered</p>
        <ul>{plan.missing.map(p=><li key={p.id}>◇ {p.title}</li>)}</ul>
        {plan.check.missingSkills.map(s=><p key={s.skill}>{s.name}: {s.have}/{s.level} — {s.from.filter(src=>!hud.save.scanned.includes(src.key)).map(src=>src.label).join(', ')}</p>)}
        {plan.check.missingProjects.map(p=><p key={p.id}>Build first: {p.title}</p>)}
        <p className="g-sub">Next: {plan.next.text}</p>
        <div className="g-actions"><button className="g-btn" aria-pressed={hud.save.trackedProject===room.id} onClick={()=>game.trackProject(hud.save.trackedProject===room.id?null:room.id)}>{hud.save.trackedProject===room.id?'Unpin blueprint':'Pin blueprint'}</button>
        {!plan.done&&<button className="g-btn" onClick={()=>{game.trackProject(room.id);game.travel(plan.next.level);}}>Go to {game.portfolio.levels.find(l=>l.id===plan.next.level)?.title}</button>}</div>
      </article>;
    })}</div>;
}
