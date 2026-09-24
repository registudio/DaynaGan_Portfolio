import { getSite, getSections, getExperience, getProjects, getProfile } from '@/lib/content';
import { getGitHubFeed } from '@/lib/github';
import { siteUrl, asset } from '@/lib/urls';
import { FloatingNav } from '@/components/site/FloatingNav';
import { ScrollEffects } from '@/components/site/ScrollEffects';
import { Hero } from '@/components/sections/Hero';
import { About } from '@/components/sections/About';
import { SectionHeader } from '@/components/sections/SectionHeader';
import { EducationTimeline } from '@/components/sections/Education';
import { ExperienceTrack } from '@/components/sections/Experience';
import { Skills } from '@/components/sections/Skills';
import { GitHubDashboard } from '@/components/sections/GitHubDashboard';
import { Contact } from '@/components/sections/Contact';
import { CursorConstellation } from '@/components/playground/CursorConstellation';
import { ProjectsExplorer } from '@/components/projects/ProjectsExplorer';

export default async function Home() {
  const site = getSite();
  const profile = getProfile();
  const sections = Object.fromEntries(getSections().map((s) => [s.id, s]));
  // Asset paths get the GitHub Pages base path so they resolve under /<repo>/.
  const projects = getProjects().map(({ body: _body, ...p }) => ({
    ...p,
    model: p.model ? asset(p.model) : p.model,
    compare: p.compare && {
      ...p.compare,
      before: {
        ...p.compare.before,
        image: p.compare.before.image && asset(p.compare.before.image),
      },
      after: { ...p.compare.after, image: p.compare.after.image && asset(p.compare.after.image) },
    },
  }));
  const jobs = getExperience().map((j) => ({
    slug: j.slug,
    title: j.title,
    role: j.role,
    period: j.period,
    mark: j.mark,
    logo: j.logo ? asset(j.logo) : undefined,
    technologies: j.technologies,
    summary: j.body.trim().split('\n\n')[0],
    details: j.body
      .split('\n')
      .filter((l) => l.startsWith('- '))
      .map((l) => l.slice(2)),
  }));
  const feed = await getGitHubFeed();
  const resume = asset(site.resume);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.name,
    ...(siteUrl() ? { url: siteUrl()!.href } : {}),
    sameAs: [site.github, site.linkedin],
    description: site.description,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <a className="skip-link" href="#about">
        Skip to content
      </a>
      <div className="backdrop" aria-hidden="true">
        <span className="aurora aurora-a" />
        <span className="aurora aurora-b" />
        <span className="grain" />
      </div>
      <FloatingNav items={site.navigation} resume={resume} />
      <ScrollEffects />
      <main>
        <Hero
          site={site}
          models={projects.map((p) => ({ slug: p.slug, title: p.title, parts: p.parts }))}
        />
        <About section={sections.about} profile={profile} />

        <section id="education" className="section band education">
          <span className="section-glow glow-right" data-parallax="-0.25" aria-hidden="true" />
          <SectionHeader section={sections.education} />
          <EducationTimeline items={profile.education} />
        </section>

        <section id="experience" className="section band experience">
          <SectionHeader section={sections.experience} />
          <ExperienceTrack jobs={jobs} />
        </section>

        <section id="projects" className="section band projects">
          <span className="section-glow glow-left" data-parallax="-0.3" aria-hidden="true" />
          <SectionHeader section={sections.projects}>
            <p className="section-intro">{sections.projects.body.trim()}</p>
          </SectionHeader>
          <ProjectsExplorer projects={projects} />
        </section>

        <section id="skills" className="section band skills">
          <span className="section-glow glow-right" data-parallax="-0.2" aria-hidden="true" />
          <SectionHeader section={sections.skills} />
          <Skills profile={profile} />
        </section>

        <section id="github" className="section band github">
          <SectionHeader section={sections.github} />
          <GitHubDashboard
            feed={feed}
            profileUrl={site.github}
            username={site.githubUsername}
            displayName={site.displayName}
            location={site.location}
            projects={projects.map((p) => ({
              slug: p.slug,
              title: p.title,
              summary: p.summary,
              technologies: p.technologies,
              github: p.github,
            }))}
          />
        </section>

        <section id="contact" className="section band contact">
          <CursorConstellation className="contact-canvas" />
          <p className="eyebrow" data-reveal>
            {sections.contact.eyebrow}
          </p>
          <Contact
            title={sections.contact.title}
            intro={sections.contact.body.trim()}
            email={site.email}
            linkedin={site.linkedin}
            github={site.github}
            resume={resume}
          />
        </section>
      </main>
      <footer className="footer">
        <span>
          © {new Date().getFullYear()} {site.name}
        </span>
        <span>Built with Next.js, Three.js & a lot of purple.</span>
      </footer>
    </>
  );
}
