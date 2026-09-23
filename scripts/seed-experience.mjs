import { readFileSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
const spec = readFileSync('dayna-portfolio-build-spec.md', 'utf8');
const entries = [
  [
    'otsaw',
    'OTSAW Digital',
    'Robotics Intern',
    'Jan 2022 – Mar 2022',
    '03A',
    ['Autodesk Inventor', 'Soldering', 'Hands-on Assembly'],
  ],
  [
    'astar',
    'A*STAR I²R',
    'Robotics Intern',
    'Sep 2024 – Feb 2025',
    '03B',
    ['ROS 2', 'NVIDIA Isaac Sim', 'Nav2', 'LangChain'],
  ],
  [
    'dso',
    'DSO National Laboratories',
    'Software Engineer Intern',
    'May 2026 – Jul 2026',
    '03C',
    ['Python', 'Reinforcement learning', 'SMAClite'],
  ],
  [
    'ecovolt',
    'Ecovolt Technologies',
    'Hardware Engineer Intern',
    'Jan 2026 – Present',
    '03D',
    ['Embedded firmware', 'Sensor fusion', 'IoT', 'Field testing'],
  ],
];
mkdirSync('content/experience', { recursive: true });
for (const [i, [slug, title, role, period, label, tags]] of entries.entries()) {
  const start = spec.indexOf(`## ${label} —`);
  const rest = spec.slice(start);
  const content = rest.slice(rest.indexOf('### Content'));
  const body = content.match(/```text\s*([\s\S]*?)```/)[1].trim();
  writeFileSync(
    `content/experience/${slug}.mdx`,
    `---\nslug: ${slug}\ntitle: ${JSON.stringify(title)}\nrole: ${role}\nperiod: ${period}\norder: ${i + 1}\ntechnologies: ${JSON.stringify(tags)}\n---\n${body}\n`,
  );
}
mkdirSync('public/resume', { recursive: true });
copyFileSync('DaynaGan_Resume.pdf', 'public/resume/DaynaGan_Resume.pdf');
