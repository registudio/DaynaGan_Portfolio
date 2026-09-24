import type { Site } from '@/lib/content';
import { CursorConstellation } from '@/components/playground/CursorConstellation';
import { ChromaticText } from '@/components/playground/ChromaticText';
import { HeroStage } from '@/components/hero/HeroStage';
import type { HeroModel } from '@/components/hero/HeroModels';

export function Hero({ site, models }: { site: Site; models: HeroModel[] }) {
  return (
    <section id="hero" className="hero">
      <CursorConstellation className="hero-canvas" />
      <div className="hero-grid">
        <div className="hero-content" data-parallax="0.15">
          <p className="hero-badge">
            <span className="pulse" aria-hidden="true" />
            {site.heroEyebrow}
          </p>
          <h1>
            <span className="hero-hello">{site.heroKicker}</span>
            <ChromaticText>{site.heroTitle}</ChromaticText>
          </h1>
          <p className="hero-subtitle">{site.heroSubtitle}</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#projects">
              See the builds
            </a>
            <a className="button" href="#contact">
              Get in touch
            </a>
          </div>
        </div>
        <HeroStage models={models} />
      </div>
      <p className="hero-hint" aria-hidden="true">
        {site.heroHint}
      </p>
      <a className="scroll-cue" href="#about" aria-label="Scroll to About">
        <span />
      </a>
    </section>
  );
}
