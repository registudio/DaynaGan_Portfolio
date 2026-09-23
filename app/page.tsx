import { getSite, getSections, getExperience, getProjects, getPosts, getTour } from '@/lib/content';
import { getGitHubFeed } from '@/lib/github';
import { Markdown } from '@/components/Markdown';
import { GitHubFeed } from '@/components/GitHubFeed';
import { TourExperience } from '@/components/tour/TourExperience';
import { siteUrl, asset } from '@/lib/urls';
import Link from 'next/link';
export const revalidate = 3600;
export default async function Home() {
  const site = getSite(),
    sections = getSections(),
    experience = getExperience(),
    projects = getProjects(),
    posts = getPosts(),
    tour = getTour();
  const feed = await getGitHubFeed();
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
      <TourExperience
        site={site}
        tour={tour}
        sections={sections}
        jobs={experience.map((j) => ({
          ...j,
          summary: j.body.trim().split('\n\n')[0],
          details: j.body
            .split('\n')
            .filter((l) => l.startsWith('- '))
            .map((l) => l.slice(2)),
        }))}
        projects={projects}
        posts={posts}
        feed={feed}
        githubPanel={<GitHubFeed key="telemetry" feed={feed} profile={site.github} />}
        readingPanel={
          <div key="reading-content" className="reading-content">
            {sections.map((s) => (
              <section key={s.id}>
                <h2>{s.title}</h2>
                <Markdown body={s.body} />
                {s.id === 'experience' &&
                  experience.map((j) => (
                    <article key={j.slug}>
                      <h3>{j.title}</h3>
                      <p>
                        {j.role} · {j.period}
                      </p>
                      <Markdown body={j.body} />
                    </article>
                  ))}
                {s.id === 'education' && (
                  <p>School of Science and Technology · Elective: Computing+</p>
                )}
                {s.id === 'skills' && (
                  <>
                    {tour.skills.map((s) => (
                      <p key={s.title}>
                        <strong>{s.title}</strong>: {s.items.join(', ')}
                      </p>
                    ))}
                    {tour.awards.map((a) => (
                      <p key={a.title}>
                        {a.title} · {a.period}
                      </p>
                    ))}
                  </>
                )}
                {s.id === 'github' && <GitHubFeed feed={feed} profile={site.github} />}
                {s.id === 'contact' && (
                  <div className="reading-contact">
                    <p>
                      <a href={`mailto:${site.email}`}>{site.email} ↗</a>
                    </p>
                    <p>
                      <a href={site.linkedin} target="_blank" rel="noreferrer">
                        LinkedIn ↗
                      </a>
                    </p>
                    <p>
                      <a href={site.github} target="_blank" rel="noreferrer">
                        GitHub ↗
                      </a>
                    </p>
                    <p>
                      <a href={asset(site.resume)} target="_blank" rel="noreferrer">
                        Download résumé ↗
                      </a>
                    </p>
                  </div>
                )}
                {s.id === 'projects' &&
                  projects.map((p) => (
                    <p key={p.slug}>
                      <Link href={`/projects/${p.slug}`}>{p.title} ↗</Link> — {p.summary}
                    </p>
                  ))}
                {s.id === 'blog' &&
                  posts.map((p) => (
                    <p key={p.slug}>
                      <Link href={`/blog/${p.slug}`}>{p.title} ↗</Link> — {p.summary}
                    </p>
                  ))}
              </section>
            ))}
          </div>
        }
      />
    </>
  );
}
