// Mirror GitHub Issues into .scratch/. See docs/runbooks/refresh-scratch.md.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

const FEATURE_DIRS = { 1: 'v1-tournament-statistics', 10: 'v2-round-by-round' };

const slug = (t) =>
  t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const render = (i) => {
  const labels = i.labels.map((l) => l.name).join(', ') || '—';
  let md = `# ${i.title}\n\n- **GitHub:** #${i.number} (${i.url})\n- **State:** ${i.state}\n- **Labels:** ${labels}\n\n---\n\n${i.body || '_No description._'}\n`;
  if (i.comments.length) {
    md += '\n---\n\n## Comments\n';
    for (const c of i.comments) md += `\n### ${c.author?.login ?? 'unknown'} · ${c.createdAt?.slice(0, 10) ?? ''}\n\n${c.body}\n`;
  }
  return md;
};

const issues = JSON.parse(
  execFileSync('gh', ['issue', 'list', '--state', 'all', '--limit', '500',
    '--json', 'number,title,state,labels,body,comments,url'], { encoding: 'utf8' }),
).sort((a, b) => a.number - b.number);

const parentOf = (i) => Number(i.body?.match(/##\s*Parent\s*\r?\n\s*#(\d+)/)?.[1]);
const specs = issues.filter((i) => /^spec:/i.test(i.title));

let index = '# .scratch\n\nLocal working files for Claude and the skills in `.claude/skills/`. GitHub Issues stay the source of truth: refresh with `node tools/scripts/sync-scratch.mjs` (see `docs/runbooks/refresh-scratch.md`).\n\n```\n.scratch/\n  <feature>/\n    spec.md            the spec (parent issue)\n    issues/NN-slug.md  one file per ticket\n    reviews/           code-review reports\n    notes/             research, plans, handoffs\n```\n\n## Features\n\n';

for (const spec of specs) {
  const dir = `.scratch/${FEATURE_DIRS[spec.number] ?? slug(spec.title.replace(/^spec:\s*/i, ''))}`;
  rmSync(`${dir}/issues`, { recursive: true, force: true });
  for (const sub of ['issues', 'reviews', 'notes']) mkdirSync(`${dir}/${sub}`, { recursive: true });
  writeFileSync(`${dir}/spec.md`, render(spec));
  index += `### [${spec.title}](${dir.slice(9)}/spec.md) — #${spec.number}, ${spec.state}\n\n`;
  issues.filter((i) => parentOf(i) === spec.number).forEach((i, k) => {
    const file = `${String(k + 1).padStart(2, '0')}-${slug(i.title)}.md`;
    writeFileSync(`${dir}/issues/${file}`, render(i));
    index += `- [${i.title}](${dir.slice(9)}/issues/${file}) — #${i.number}, ${i.state}\n`;
  });
  index += '\n';
}

writeFileSync('.scratch/README.md', index);
console.log(`Synced ${specs.length} specs.`);
