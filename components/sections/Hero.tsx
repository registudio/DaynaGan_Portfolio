import type { Site } from '@/lib/content';
import { CursorConstellation } from '@/components/playground/CursorConstellation';
import { ChromaticText } from '@/components/playground/ChromaticText';

export function Hero({ site }: { site: Site }) {
  return (
    <section id="hero" className="hero">
      <CursorConstellation className="hero-canvas" />
      <div className="hero-orbs" aria-hidden="true">
        <span className="orb orb-a" data-parallax="-0.35" />
        <span className="orb orb-b" data-parallax="-0.15" />
        <span className="orb orb-c" data-parallax="-0.5" />
      </div>
      <div className="hero-content" data-parallax="0.25">
        <p className="hero-badge">
          <span className="pulse" aria-hidden="true" />
          {site.heroEyebrow}
        </p>
        <p className="hero-kicker">{site.heroKicker}</p>
        <h1>
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
      <p className="hero-hint" aria-hidden="true">
        {site.heroHint}
      </p>
      <a className="scroll-cue" href="#about" aria-label="Scroll to About">
        <span />
      </a>
    </section>
  );
}
