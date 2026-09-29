'use client';
import type { GitHubFeed } from '@/lib/github';
import type { Portfolio } from '@/lib/portfolio';
import type { Mode } from '../App';
export default function GameShell(_: { portfolio: Portfolio; github: GitHubFeed; onExit: (m: Mode, anchor?: string) => void }) {
  return <div className="game-loading">GAME COMING UP</div>;
}
