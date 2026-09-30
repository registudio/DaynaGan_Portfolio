import type { GitHubFeed } from '@/lib/github';
import { list, parseLink, type Part, type Portfolio, type Room } from '../../lib/portfolio.ts';
import { checkBuild, partKey, roomKey, type BuildCheck } from '../../lib/skills.ts';
import type { Panel, PanelAction, SaveData } from './store.ts';

/** Builds the holo-panel content for consoles, terminals, NPCs and machines. */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const chips = (items: string[]) =>
  items.length ? `<ul class="g-chips">${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '';

export const proAnchor = (levelId: string, roomId?: string) => (roomId ? `${levelId}-${roomId}` : levelId);

function metaLine(node: Part) {
  const bits = [node.meta.role || node.meta.qualification, node.meta.period !== 'TODO' ? node.meta.period : '', node.meta.org, node.meta.year].filter(Boolean);
  return bits.join(' · ');
}

function partsChecklist(levelId: string, room: Room, save: SaveData) {
  const parts = room.parts.filter((p) => !p.todo || p.body);
  if (!parts.length) return '';
  return `<div class="g-sub">Data in this room</div><ul class="g-check">${parts
    .map((p) => {
      const got = save.scanned.includes(partKey(levelId, room.id, p.id));
      return `<li class="${got ? 'got' : ''}">${got ? '◆' : '◇'} ${esc(p.title)}</li>`;
    })
    .join('')}</ul>`;
}

export function roomPanel(p: Portfolio, levelId: string, room: Room, save: SaveData): Panel {
  const level = p.levels.find((l) => l.id === levelId)!;
  let html = room.html ?? '';
  if (room.id === 'stats')
    html = `<div class="g-stats">${room.parts.map((s) => `<div><b>${esc(s.title)}</b><span>${esc(s.meta.label ?? '')}</span></div>`).join('')}</div>`;
  if (room.id === 'currently')
    html += `<dl class="g-dl">${room.parts.map((s) => `<dt>${esc(s.title)}</dt><dd>${s.html ?? ''}</dd>`).join('')}</dl>`;
  if (room.id === 'identity') html += chips(list(level.meta.tags));
  if (room.meta.tags) html += chips(list(room.meta.tags));
  if (room.id !== 'stats' && room.id !== 'currently') html += partsChecklist(levelId, room, save);
  return {
    kind: 'content',
    levelId,
    roomId: room.id,
    eyebrow: [level.title, metaLine(room)].filter(Boolean).join(' · '),
    title: room.title,
    html: html || '<p>…</p>',
    actions: [{ id: `pro:${proAnchor(levelId, levelId === 'about' ? undefined : room.id)}`, label: 'Open in Professional mode' }],
  };
}

export function partPanel(p: Portfolio, levelId: string, room: Room, part: Part): Panel {
  let html = part.html ?? '';
  if (part.meta.tags) html += chips(list(part.meta.tags));
  if (part.meta.did) html += `<p class="g-did"><b>What I did</b> ${esc(part.meta.did)}</p>`;
  if (part.meta.learned) html += `<p class="g-learned"><b>What I learnt</b> ${esc(part.meta.learned)}</p>`;
  const link = parseLink(part.meta.link);
  if (link?.level === 'projects') {
    const proj = p.levels.find((l) => l.id === 'projects')?.rooms.find((r) => r.id === link.room);
    if (proj) html += `<p class="g-link">▸ Project file: <b>${esc(proj.title)}</b> — build it in the Circuit Caverns.</p>`;
  }
  if (!html) html = `<p>${esc(part.title)}</p>`;
  return {
    kind: 'content',
    levelId,
    roomId: room.id,
    partId: part.id,
    eyebrow: [room.meta.short || room.title, part.meta.period, part.meta.org].filter(Boolean).join(' · '),
    title: part.title,
    html,
    actions: [{ id: `pro:${proAnchor(levelId, room.id)}`, label: 'Open in Professional mode' }],
  };
}

export function skillHint(check: BuildCheck, levelTitles: Record<string, string>) {
  return check.missingSkills
    .map((m) => {
      const where = [...new Set(m.from.map((f) => levelTitles[f.levelId] ?? f.levelId))].join(' / ');
      return `${m.name} Lv ${m.level} (you have ${m.have}) — earn it in ${where}`;
    })
    .concat(check.missingProjects.map((m) => `Build ${m.title} first`));
}

export function projectPanel(
  p: Portfolio,
  room: Room,
  save: SaveData,
  skills: Record<string, number>,
): { panel: Panel; check: BuildCheck; missingParts: Part[] } {
  const levelId = 'projects';
  const missingParts = room.parts.filter((x) => !save.scanned.includes(partKey(levelId, room.id, x.id)));
  const built = save.built.includes(room.id);
  const check = checkBuild(p, room.id, skills, save.built);
  const levelTitles = Object.fromEntries(p.levels.map((l) => [l.id, l.title]));
  let html = '';
  let tone: 'info' | 'warn' | 'success' = 'info';
  const actions: PanelAction[] = [];
  if (built) {
    tone = 'success';
    html += `<p class="g-ok">✔ Built and stored in your collection.</p>${room.html ?? ''}`;
  } else {
    html += `<p class="g-sub">Blueprint · ${room.parts.length - missingParts.length}/${room.parts.length} parts recovered</p>`;
    html += `<ul class="g-check">${room.parts
      .map((x) => {
        const got = !missingParts.includes(x);
        return `<li class="${got ? 'got' : ''}">${got ? '◆' : '◇'} ${esc(x.title)}</li>`;
      })
      .join('')}</ul>`;
    const hints = skillHint(check, levelTitles);
    if (missingParts.length) html += `<p class="g-warn">Recover the missing parts scattered through the caverns — some are carried by bugs.</p>`;
    else if (hints.length) {
      tone = 'warn';
      html += `<p class="g-warn">Assembly locked — skill check failed:</p><ul class="g-req">${hints.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>`;
    } else {
      html += `<p class="g-ok">All parts recovered and skills met.</p>`;
      actions.push({ id: `build:${room.id}`, label: '⚙ Assemble project', primary: true });
    }
    const first = (room.html ?? '').split('</p>')[0];
    if (first) html += `<div class="g-sub">Case file</div>${first}</p>`;
  }
  if (room.meta.status === 'in-progress') html += `<p class="g-warn">⚠ CASE FILE INCOMPLETE — full write-up coming soon.</p>`;
  actions.push({ id: `pro:${proAnchor(levelId, room.id)}`, label: 'Open in Professional mode' });
  return {
    panel: {
      kind: 'content',
      levelId,
      roomId: room.id,
      eyebrow: `Project vault · ${room.meta.year ?? ''}`.replace(/ · $/, ''),
      title: room.title,
      html,
      model: { projectId: room.id, ghost: built ? [] : missingParts.map((x) => x.id) },
      actions,
      tone,
    },
    check,
    missingParts,
  };
}

export function partCard(room: Room, part: Part) {
  return {
    eyebrow: `Recovered · ${room.title}`,
    title: part.title,
    html: `${part.html ?? ''}${part.meta.did ? `<p class="g-did"><b>Did</b> ${esc(part.meta.did)}</p>` : ''}${
      part.meta.learned ? `<p class="g-learned"><b>Learnt</b> ${esc(part.meta.learned)}</p>` : ''
    }`,
  };
}

export function repoPanel(feed: GitHubFeed, index: number): Panel {
  const r = feed.repos[index];
  return {
    kind: 'content',
    levelId: 'github',
    roomId: 'repos',
    eyebrow: 'Repo rack',
    title: r?.name ?? 'Repository',
    html: r
      ? `<p>${esc(r.description ?? 'No description yet.')}</p>${chips([r.language ?? '', r.stargazers_count ? `★ ${r.stargazers_count}` : '', `updated ${r.updated_at.slice(0, 10)}`].filter(Boolean))}`
      : '<p>Offline.</p>',
    actions: r ? [{ id: 'link', label: 'Open on GitHub ↗', href: r.html_url, primary: true }] : [],
  };
}

export function githubConsole(p: Portfolio, room: Room, feed: GitHubFeed, save: SaveData): Panel {
  const base = roomPanel(p, 'github', room, save);
  if (base.kind !== 'content') return base;
  let html = '';
  if (feed.status === 'offline') html = `<p class="g-warn">LIVE FEED TEMPORARILY OFFLINE</p><p>The mainframe can't reach GitHub right now.</p>`;
  else if (room.id === 'contributions') {
    const total = feed.totalContributions ?? feed.activity.reduce((a, d) => a + d.count, 0);
    html = `<p>The floor lights up with real activity from <b>@${esc(feed.profile?.login ?? p.site.githubUsername)}</b>.</p><div class="g-stats"><div><b>${total}</b><span>${feed.activitySource === 'calendar' ? 'contributions this year' : 'recent public events'}</span></div><div><b>${feed.profile?.public_repos ?? 0}</b><span>public repos</span></div><div><b>${feed.totalStars}</b><span>stars</span></div></div>`;
  } else if (room.id === 'repos') {
    html = `<p>Each server rack is a repository. Walk up to one to read it.</p>${chips(feed.languageStats.map((l) => `${l.name} ${Math.round(l.share * 100)}%`))}`;
  } else if (room.id === 'commits') {
    const commits = feed.events
      .filter((e) => e.type === 'PushEvent')
      .flatMap((e) => (e.payload?.commits ?? []).map((c) => ({ repo: e.repo.name.split('/')[1], msg: c.message.split('\n')[0], at: e.created_at.slice(0, 10) })))
      .slice(0, 8);
    html = commits.length
      ? `<ul class="g-feed">${commits.map((c) => `<li><code>${esc(c.repo)}</code> ${esc(c.msg)} <span>${c.at}</span></li>`).join('')}</ul>`
      : '<p>No recent public commits.</p>';
  }
  return { ...base, html: `${room.html ?? ''}${html}`, actions: [{ id: 'link', label: 'View GitHub profile ↗', href: p.site.github }, ...(base.actions ?? [])] };
}

export function npcPanel(p: Portfolio, room: Room, save: SaveData): Panel {
  const base = roomPanel(p, 'leadership', room, save);
  if (base.kind !== 'content') return base;
  const lines = room.parts.map((x) => x.html ?? '').join('');
  return { ...base, eyebrow: `Colonist · ${room.meta.role} · ${room.meta.period}`, html: `${lines}` };
}

export const isRoomScanned = (save: SaveData, levelId: string, roomId: string) => save.scanned.includes(roomKey(levelId, roomId));

/**
 * Planet landmark: an entire section on one page — intro, then every room with all of its
 * parts inline (no separate terminals to visit).
 */
export function sectionPanel(p: Portfolio, levelId: string): Panel {
  const level = p.levels.find((l) => l.id === levelId);
  if (!level) return { kind: 'content', levelId, roomId: '', title: levelId, html: '<p>…</p>' };
  let html = level.html ?? '';
  if (level.meta.tags) html += chips(list(level.meta.tags));
  // Game-only rooms (shelves, matrix, backroom, relay field…) don't belong in the overview.
  const GAME_ONLY = new Set(['shelves', 'skill-matrix', 'backroom', 'relays', 'star-map', 'form']);
  for (const room of level.rooms) {
    if ((room.todo && !room.body) || GAME_ONLY.has(room.id)) continue;
    const meta = metaLine(room);
    html += `<section class="g-sec"><h3>${esc(room.title)}</h3>${meta ? `<p class="g-sec-meta">${esc(meta)}</p>` : ''}${room.html ?? ''}`;
    if (room.meta.tags) html += chips(list(room.meta.tags));
    const parts = room.parts.filter((x) => !x.todo || x.body);
    if (parts.length) {
      html += '<ul class="g-sec-parts">';
      for (const part of parts) {
        const when = [part.meta.period, part.meta.org].filter(Boolean).join(' · ');
        const body = part.html ? part.html.replace(/^<p>|<\/p>\s*$/g, '') : part.meta.label ? esc(part.meta.label) : '';
        html += `<li><b>${esc(part.title)}</b>${when ? ` <span class="g-sec-meta">${esc(when)}</span>` : ''}${body ? ` — ${body}` : ''}</li>`;
      }
      html += '</ul>';
    }
    html += '</section>';
  }
  if (levelId === 'trophies') {
    // Skills are earned in the missions; on the planet, just list them by group.
    const groups = new Map<string, string[]>();
    for (const sk of p.site.skills) (groups.get(sk.group) ?? groups.set(sk.group, []).get(sk.group)!).push(sk.name);
    html += '<section class="g-sec"><h3>Skills</h3>';
    for (const [g, names] of groups) html += `<p class="g-sec-meta">${esc(g)}</p>${chips(names)}`;
    html += '</section>';
  }
  return {
    kind: 'content',
    levelId,
    roomId: '',
    eyebrow: [level.meta.eyebrow, level.meta.kicker].filter(Boolean).join(' · '),
    title: level.title,
    html: html || '<p>…</p>',
    actions: [{ id: `pro:${proAnchor(levelId)}`, label: 'Open in Professional mode' }],
  };
}
