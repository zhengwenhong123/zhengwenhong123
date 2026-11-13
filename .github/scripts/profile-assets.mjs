import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const username = 'zhengwenhong123';
const query = `query { user(login: "${username}") {
  repositories(privacy: PUBLIC, ownerAffiliations: OWNER, isFork: false) { totalCount }
  followers { totalCount }
  contributionsCollection {
    totalCommitContributions totalPullRequestContributions totalIssueContributions
    contributionCalendar { totalContributions weeks { contributionDays { date contributionCount contributionLevel } } }
  }
} }`;
let result;
if (process.env.GITHUB_TOKEN) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) throw new Error(`GitHub GraphQL returned ${response.status}`);
  result = await response.json();
} else {
  result = JSON.parse(execFileSync('gh', ['api', 'graphql', '-f', `query=${query}`], { encoding: 'utf8' }));
}
if (result.errors?.length) throw new Error(result.errors.map(error => error.message).join('; '));
const user = result.data?.user;
if (!user) throw new Error('The requested GitHub profile was not found');

const activity = user.contributionsCollection;
const calendar = activity.contributionCalendar;
const days = calendar.weeks.flatMap(week => week.contributionDays);
const start = days[0].date, end = days.at(-1).date;
const background = '#0d1117', panel = '#161b22', border = '#30363d', ink = '#e6edf3', muted = '#9da7b3';
const svg = (width, height, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><rect width="${width}" height="${height}" rx="16" fill="${background}"/><g font-family="Arial, sans-serif">${body}</g></svg>\n`;
mkdirSync('assets', { recursive: true });

const metrics = [
  ['Commits', activity.totalCommitContributions, '#a78bfa'],
  ['Pull requests', activity.totalPullRequestContributions, '#67e8f9'],
  ['Issues', activity.totalIssueContributions, '#fbbf24'],
  ['Public projects', user.repositories.totalCount, '#f472b6'],
];
const stats = metrics.map(([label, value, color], index) => {
  const x = 24 + index % 2 * 178, y = 62 + Math.floor(index / 2) * 79;
  return `<rect x="${x}" y="${y}" width="164" height="67" rx="9" fill="${panel}" stroke="${border}"/><text x="${x + 14}" y="${y + 28}" font-size="27" font-weight="700" fill="${color}">${value}</text><text x="${x + 14}" y="${y + 49}" font-size="12" fill="${muted}">${label}</text>`;
}).join('');
writeFileSync('assets/github-stats.svg', svg(400, 266,
  `<text x="24" y="32" font-size="19" font-weight="700" fill="${ink}">GitHub activity</text><text x="24" y="49" font-size="10" fill="${muted}">${start} — ${end} · public profile data</text>${stats}<text x="24" y="245" font-size="10" fill="${muted}">Projects exclude forks. Commits, PRs and issues cover this period.</text>`));

const levels = { NONE: '#21262d', FIRST_QUARTILE: '#4c1d95', SECOND_QUARTILE: '#6d28d9', THIRD_QUARTILE: '#8b5cf6', FOURTH_QUARTILE: '#c4b5fd' };
const cells = calendar.weeks.map((week, column) => week.contributionDays.map(day => {
  const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay();
  return `<rect x="${30 + column * 14}" y="${82 + weekday * 14}" width="10" height="10" rx="2" fill="${levels[day.contributionLevel]}"><title>${day.date}: ${day.contributionCount} contributions</title></rect>`;
}).join('')).join('');
writeFileSync('assets/contribution-activity.svg', svg(800, 220,
  `<text x="30" y="34" font-size="21" font-weight="700" fill="${ink}">Contribution activity</text><text x="30" y="56" font-size="12" fill="${muted}">${calendar.totalContributions} contributions · ${start} — ${end}</text>${cells}<text x="30" y="199" font-size="11" fill="${muted}">@${username} · Generated from the GitHub contribution calendar</text>`));

const milestones = [
  ['LIVE', 'Interactive 3D portfolio', '#a78bfa'],
  ['CI / CD', 'Checks and automatic deployment', '#67e8f9'],
  ['MOBILE', '927 KB character asset', '#fbbf24'],
  ['ZH / EN', 'Bilingual portfolio interface', '#f472b6'],
];
writeFileSync('assets/shipped-milestones.svg', svg(800, 152,
  '<text x="24" y="32" font-size="20" font-weight="700" fill="#e6edf3">Built, shipped, and still improving</text>' + milestones.map(([label, detail, color], index) => {
    const x = 24 + index * 190;
    return `<rect x="${x}" y="53" width="176" height="74" rx="10" fill="${panel}" stroke="${border}"/><text x="${x + 12}" y="78" font-size="15" font-weight="700" fill="${color}">${label}</text><text x="${x + 12}" y="101" font-size="10" fill="${muted}">${detail}</text>`;
  }).join('')));
console.log(JSON.stringify({ username, period: { start, end }, totalContributions: calendar.totalContributions, generated: ['github-stats.svg', 'contribution-activity.svg', 'shipped-milestones.svg'] }));
