import fs from 'node:fs';
import matter from 'gray-matter';
const info=[
  ['about','About me','Hypermatter Reactor'],
  ['education','Education','Imperial Academy Records'],
  ['experience','Work experience','Equatorial Trench & Hangar Bays'],
  ['projects','Projects','Superlaser'],
  ['skills','Skills & awards','Deflector Shields & Turbolaser Batteries'],
  ['github','GitHub','The Overbridge'],
  ['blog','Blog','Sector Archives'],
  ['contact','Contact me','Tractor Beam & Comlink Array'],
];
for(const [i,[id,title,module]] of info.entries()){
 const file=`content/sections/${id}.md`;
 const parsed=fs.existsSync(file)?matter(fs.readFileSync(file,'utf8')):{data:{tags:[]},content:'Technical capabilities and recognition, revealed on a flight across the station’s defenses.\n'};
 Object.assign(parsed.data,{id,title,module,order:i+1,eyebrow:`0${i+1} / ${title.toUpperCase()}`,kicker:module.toUpperCase()});
 fs.writeFileSync(file,matter.stringify(parsed.content,parsed.data));
}
const file='content/site.md', site=matter(fs.readFileSync(file,'utf8'));
site.data.navigation=[{id:'blueprint',label:'Blueprint',caption:'Station overview',number:'00'},...info.map(([id,label,caption],i)=>({id,label,caption,number:`0${i+1}`}))];
site.data.stationName='Death Star / guided tour';
fs.writeFileSync(file,matter.stringify(site.content,site.data));
