import test from 'node:test';
import assert from 'node:assert/strict';
import { terrainFaces, canStep } from '../game/engine/terrain.ts';
import type { LevelMap, Cell } from '../game/engine/layout.ts';
import { projectPlan, signalPath, gripResult, sensorReading, matchesTopic } from '../game/engine/exploration.ts';
import { loadPortfolio } from '../lib/load.ts';
import { emptySave } from '../game/engine/store.ts';
import { partKey } from '../lib/skills.ts';

const cell=(h=0):Cell=>({t:1,h,room:0,surf:'floor'});
test('terrain omits internal faces and exposes fractional stair risers',()=>{
  const map={w:2,d:1,cells:[cell(),cell()]} as LevelMap;
  assert.equal(terrainFaces(map).length,8); // two tops and six outer sides
  map.cells[1].h=0.3;
  const faces=terrainFaces(map);
  assert.equal(faces.length,9);
  const riser=faces.find(f=>f.surface==='side'&&f.points.every(p=>p[0]===1));
  assert.ok(riser);
  assert.deepEqual([...new Set(riser.points.map(p=>p[1]))].sort(),[0,0.3]);
});
test('height collision admits stairs but rejects ledges, walls, and void',()=>{
  assert.ok(canStep(cell(),cell(0.3)));
  assert.ok(canStep(cell(0.3),cell()));
  assert.equal(canStep(cell(),cell(1.5)),false);
  assert.equal(canStep(cell(1.5),cell()),false);
  assert.equal(canStep(cell(),{...cell(),solid:true}),false);
  assert.equal(canStep(cell(),undefined),false);
});
test('blueprints advance from missing parts to prerequisites to assembly',()=>{
  const p=loadPortfolio(),save=emptySave();
  const room=p.levels.find(l=>l.id==='projects')!.rooms.find(r=>r.id==='drone')!;
  const first=projectPlan(p,save,room.id)!;
  assert.equal(first.missing.length,room.parts.length);
  assert.equal(first.next.target,partKey('projects',room.id,room.parts[0].id));
  save.scanned=room.parts.map(part=>partKey('projects',room.id,part.id));
  assert.match(projectPlan(p,save,room.id)!.next.text,/first/);
  save.built=p.levels.find(l=>l.id==='projects')!.rooms.filter(r=>r.id!==room.id).map(r=>r.id);
  save.scanned=p.levels.flatMap(l=>l.rooms.flatMap(r=>[`${l.id}/${r.id}`,...r.parts.map(part=>partKey(l.id,r.id,part.id))]));
  assert.equal(projectPlan(p,save,room.id)!.next.target,`assembly:${room.id}`);
  save.built.push(room.id);
  assert.equal(projectPlan(p,save,room.id)!.done,true);
});
test('engineering experiments report physical failure and disconnected signals',()=>{
  assert.equal(gripResult(38,45),'held');
  assert.equal(gripResult(38,10),'slipping');
  assert.equal(gripResult(38,90),'crushed');
  assert.equal(sensorReading(27.4,-2.4),25);
  assert.equal(signalPath([1,0,2],[1,3,2]),1);
  assert.equal(signalPath([1,3,2],[1,3,2]),3);
  assert.ok(matchesTopic('robotics','Isaac Sim × Nav2'));
  assert.equal(matchesTopic('embedded','Volunteer outreach'),false);
});
