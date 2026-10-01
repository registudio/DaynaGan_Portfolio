'use client';

import { useEffect, useRef, useState } from 'react';
import type { Game } from '@/game/engine/Game';
import type { Hud, Panel } from '@/game/engine/store';
import { list } from '@/lib/portfolio';
import ModelViewer from '../ModelViewer';
import ContactForm from '../pro/ContactForm';
import SkillTree from './SkillTree';
import StarMap from './StarMap';
import { useModal } from './useModal';

export default function PanelView({ game, hud, panel }: { game: Game; hud: Hud; panel: Panel }) {
  const ref = useModal(()=>game.closePanel());

  const close = () => game.closePanel();
  const wide = panel.kind === 'starmap' || panel.kind === 'skills' || panel.kind === 'locker' || (panel.kind === 'content' && panel.model);

  return (
    <div className="g-modal" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div
        ref={ref}
        className={`g-panel${wide ? ' wide' : ''}${panel.kind === 'content' && panel.tone ? ` ${panel.tone}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={panel.kind === 'content' ? panel.title : panel.kind}
        tabIndex={-1}
      >
        <button className="g-close" onClick={close} aria-label="Close">
          ✕
        </button>
        {hud.tour && (
          <div className="g-panel-tour">
            <span>
              Tour {hud.tour.step}/{hud.tour.total}
            </span>
            <button onClick={() => game.tourTogglePause()}>{hud.tour.label.endsWith('paused') ? '▶ Resume' : '❚❚ Hold'}</button>
            {hud.tour.step < hud.tour.total ? (
              <button onClick={() => game.tourNext(1)}>Next ▶▶</button>
            ) : (
              <button onClick={() => game.stopTour()}>Finish tour ✓</button>
            )}
          </div>
        )}
        {panel.kind === 'content' && <ContentPanel game={game} panel={panel} />}
        {panel.kind === 'starmap' && <StarMap game={game} hud={hud} />}
        {panel.kind === 'skills' && (
          <>
            <div className="g-eyebrow">Trophy Hall · Skill Matrix</div>
            <h2>Skill Matrix</h2>
            <SkillTree game={game} hud={hud} />
          </>
        )}
        {panel.kind === 'locker' && <Locker game={game} hud={hud} />}
        {panel.kind === 'contact' && <Transmission game={game} />}
        {panel.kind === 'credits' && <Credits game={game} />}
      </div>
    </div>
  );
}

function ContentPanel({ game, panel }: { game: Game; panel: Extract<Panel, { kind: 'content' }> }) {
  return (
    <div className={panel.model ? 'g-split' : ''}>
      <div className="g-scroll">
        {panel.eyebrow && <div className="g-eyebrow">{panel.eyebrow}</div>}
        <h2>{panel.title}</h2>
        <div className="g-html" dangerouslySetInnerHTML={{ __html: panel.html }} />
        {!!panel.actions?.length && (
          <div className="g-actions">
            {panel.actions.map((a) =>
              a.href ? (
                <a key={a.id} className={`g-btn${a.primary ? ' primary' : ''}`} href={a.href} target="_blank" rel="noopener noreferrer">
                  {a.label}
                </a>
              ) : (
                <button key={a.id} className={`g-btn${a.primary ? ' primary' : ''}`} onClick={() => game.panelAction(a.id, panel)}>
                  {a.label}
                </button>
              ),
            )}
          </div>
        )}
      </div>
      {panel.model && (
        <div className="g-model">
          <ModelViewer projectId={panel.model.projectId} ghost={panel.model.ghost} dark initialExplode={panel.model.ghost?.length ? 0.4 : 0.15} />
        </div>
      )}
    </div>
  );
}

function Locker({ game, hud }: { game: Game; hud: Hud }) {
  const rooms = game.portfolio.levels.find((l) => l.id === 'projects')?.rooms ?? [];
  const built = rooms.filter((r) => hud.save.built.includes(r.id));
  const [sel, setSel] = useState(built[0]?.id ?? null);
  const room = rooms.find((r) => r.id === sel);
  return (
    <>
      <div className="g-eyebrow">Station Hub · Collection locker</div>
      <h2>
        Collection · {built.length}/{rooms.length}
      </h2>
      <div className="g-locker">
        <ul>
          {rooms.map((r) => {
            const has = hud.save.built.includes(r.id);
            return (
              <li key={r.id}>
                <button className={`${sel === r.id ? 'on' : ''}${has ? '' : ' empty'}`} disabled={!has} onClick={() => setSel(r.id)}>
                  {has ? '◆' : '◇'} {has ? r.title : '??? — not built yet'}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="g-model">
          {room ? (
            <>
              <ModelViewer key={room.id} projectId={room.id} dark />
              <p className="g-model-cap">{list(room.meta.tags).join(' · ')}</p>
            </>
          ) : (
            <p className="g-empty">Nothing built yet. Recover parts in the Circuit Caverns and assemble them at each vault.</p>
          )}
        </div>
      </div>
    </>
  );
}

function Transmission({ game }: { game: Game }) {
  const form = game.portfolio.levels.find((l) => l.id === 'contact')?.rooms.find((r) => r.id === 'form');
  const [sent, setSent] = useState(false);
  return (
    <div className="g-scroll">
      <div className="g-eyebrow">Comms Array · Transmission Console</div>
      <h2>{sent ? 'TRANSMISSION RECEIVED' : 'Send Dayna a transmission'}</h2>
      {!sent && <p className="g-sub">Dish aligned. Signal strength 100%. Your message goes straight to Dayna&apos;s inbox.</p>}
      <div className="g-form">
        <ContactForm
          reasons={list(form?.meta.reasons)}
          success={form?.body ?? 'Thanks — message received.'}
          email={game.portfolio.site.email}
          submitLabel="▶ TRANSMIT"
          onSent={() => {
            setSent(true);
            game.onTransmissionSent();
          }}
        />
      </div>
      {sent && <Credits game={game} inline />}
    </div>
  );
}

function Credits({ game, inline = false }: { game: Game; inline?: boolean }) {
  const s = game.portfolio.site;
  return (
    <div className={`g-credits${inline ? ' inline' : ''}`}>
      {!inline && <h2>Thanks for playing!</h2>}
      <p>Keep in touch with {s.displayName}:</p>
      <div className="g-actions">
        <a className="g-btn primary" href={s.linkedin} target="_blank" rel="noopener noreferrer">
          LinkedIn ↗
        </a>
        <a className="g-btn" href={s.github} target="_blank" rel="noopener noreferrer">
          GitHub ↗
        </a>
        <a className="g-btn" href={s.resume} target="_blank" rel="noopener noreferrer">
          Résumé ⤓
        </a>
      </div>
      <p className="g-sub">
        Starring {s.displayName} and {s.companion.name} the cat. Built with Three.js, Next.js and a lot of voxels.
      </p>
    </div>
  );
}
