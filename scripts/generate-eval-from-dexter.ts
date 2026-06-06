#!/usr/bin/env bun
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const DEXTER_PINNED_COMMIT = '8d9419829f443f84b804d033bb2c3b1fbd788629';
const DEXTER_SOURCE_FILE = 'src/evals/dataset/finance_agent.csv';

type Row = {
  readonly sourceRow: number;
  readonly question: string;
  readonly answer: string;
  readonly questionType: string;
  readonly expertTimeMins: string;
  readonly rubric: string;
};

type RubricCriterion = {
  readonly operator: 'correctness' | 'contradiction';
  readonly criteria: string;
};

type Args = {
  readonly check: boolean;
  readonly out: string;
  readonly sample?: number;
};

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function parseArgs(): Args {
  const rawArgs = process.argv.slice(2);
  let check = false;
  let out = 'evals/financial-research-agent.eval.yaml';
  let sample: number | undefined;

  for (let index = 0; index < rawArgs.length; index++) {
    const arg = rawArgs[index];
    if (arg === '--check') {
      check = true;
    } else if (arg === '--out') {
      const value = rawArgs[index + 1];
      if (!value) fail('Expected a path after --out.');
      out = value;
      index++;
    } else if (arg === '--sample') {
      const value = rawArgs[index + 1];
      if (!value) fail('Expected a positive integer after --sample.');
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        fail('Expected --sample to be a positive integer.');
      }
      sample = parsed;
      index++;
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }

  if (check && sample !== undefined) {
    fail('--check validates the full committed dataset. Re-run without --sample.');
  }

  return { check, out, ...(sample !== undefined ? { sample } : {}) };
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function parseRubricCriteria(raw: string): RubricCriterion[] {
  const criteria: Array<{ operator: string; criteria: string }> = [];
  const objectRegex = /\{([\s\S]*?)\}/g;
  for (const objectMatch of raw.matchAll(objectRegex)) {
    const body = objectMatch[1] ?? '';
    const operator = body.match(/['"]operator['"]\s*:\s*(['"])([\s\S]*?)\1/)?.[2]?.trim();
    const text = body
      .match(/['"]criteria['"]\s*:\s*(['"])([\s\S]*?)\1/)?.[2]
      ?.replace(/\\n/g, '\n')
      .trim();
    if (operator && text) {
      criteria.push({ operator, criteria: text });
    }
  }

  const correctness = criteria
    .filter((criterion): criterion is RubricCriterion => criterion.operator === 'correctness')
    .slice(0, 5);
  const contradiction = criteria.find(
    (criterion): criterion is RubricCriterion => criterion.operator === 'contradiction',
  );
  return contradiction ? [...correctness, contradiction] : correctness;
}

function block(value: string, indent = 6): string {
  const spaces = ' '.repeat(indent);
  return value
    .trim()
    .split('\n')
    .map((line) => `${spaces}${line}`)
    .join('\n');
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72);
}

function render(rows: readonly Row[], sourceCommit: string, options: { readonly sample?: number } = {}): string {
  const description =
    options.sample !== undefined
      ? `Generated AgentV adaptation of the first ${rows.length} rows sampled from Dexter's public finance_agent.csv dataset.`
      : "Generated AgentV adaptation of Dexter's full public finance_agent.csv dataset.";
  const tests = rows
    .map((row, index) => {
      const criteria = parseRubricCriteria(row.rubric);
      const rubricItems =
        criteria.length > 0
          ? criteria
              .map((criterion, criterionIndex) => {
                const isContradiction = criterion.operator === 'contradiction';
                const id = isContradiction ? 'contradiction_guard' : `criterion_${criterionIndex + 1}`;
                return `          - id: ${id}\n            outcome: ${JSON.stringify(criterion.criteria)}\n            operator: ${criterion.operator}\n            weight: 1`;
              })
              .join('\n')
          : `          - id: reference_match\n            outcome: ${JSON.stringify('Conveys the same key information as the Dexter reference answer.')}\n            weight: 1`;

      return `  - id: ${slug(row.question) || `dexter-row-${row.sourceRow}`}\n    metadata:\n      source_repo: https://github.com/virattt/dexter\n      source_commit: ${sourceCommit}\n      source_file: ${DEXTER_SOURCE_FILE}\n      source_row: ${row.sourceRow}\n      question_type: ${JSON.stringify(row.questionType)}\n      expert_time_mins: ${JSON.stringify(row.expertTimeMins)}\n    input: |\n${block(row.question)}\n    expected_output: |\n${block(row.answer)}\n    assertions:\n      - type: rubrics\n        criteria:\n${rubricItems}`;
    })
    .join('\n\n');

  return `name: financial-research-agent\ndescription: |\n  ${description}\n  Source: https://github.com/virattt/dexter at commit ${sourceCommit}.\n  The default target is a coding/web research agent evaluated against Dexter's\n  public golden answers, so this suite does not require Dexter's paid Financial\n  Datasets API path.\n\nexecution:\n  target: financial-research-agent\n\ntags: [financial-research-agent, dexter, finance, generated]\n\ntests:\n${tests}\n`;
}

const args = parseArgs();
const repoPath = env('DEXTER_REPO_PATH');
if (!repoPath) {
  console.error('Set DEXTER_REPO_PATH to a local Dexter checkout.');
  process.exit(1);
}

const expectedCommit = env('DEXTER_COMMIT') ?? DEXTER_PINNED_COMMIT;
const dexterPath = path.resolve(repoPath);
const git = spawnSync('git', ['rev-parse', 'HEAD'], {
  cwd: dexterPath,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});
if (git.status !== 0) {
  fail('DEXTER_REPO_PATH must be a git checkout so the pinned Dexter commit can be verified.');
}

const actualCommit = git.stdout.trim();
if (actualCommit !== expectedCommit) {
  fail(`Dexter checkout must be pinned to ${expectedCommit}. Current checkout is ${actualCommit}.`);
}

const csvPath = path.join(dexterPath, DEXTER_SOURCE_FILE);
const sourceRows = parseCsv(readFileSync(csvPath, 'utf8'))
  .slice(1)
  .map((row, index) => ({ row, sourceRow: index + 1 }))
  .filter(({ row }) => row.length >= 5 && row[0]?.trim())
  .map(({ row, sourceRow }) => ({
    sourceRow,
    question: row[0] ?? '',
    answer: row[1] ?? '',
    questionType: row[2] ?? '',
    expertTimeMins: row[3] ?? '',
    rubric: row[4] ?? '',
  }));

function countEvalTests(content: string): number {
  return content.match(/^  - id: /gm)?.length ?? 0;
}

if (args.check) {
  const actual = readFileSync(args.out, 'utf8');
  const expected = render(sourceRows, expectedCommit);
  const actualTests = countEvalTests(actual);

  if (actualTests !== sourceRows.length) {
    fail(
      `${args.out} contains ${actualTests} tests, but pinned Dexter ${DEXTER_SOURCE_FILE} contains ${sourceRows.length}. ` +
        'This usually means --sample output was committed as the full dataset boundary. Regenerate without --sample.',
    );
  }

  if (actual !== expected) {
    fail(`${args.out} does not match generated output from Dexter ${expectedCommit}. Run bun run generate and review the diff.`);
  }

  console.log(`${args.out} matches ${sourceRows.length} tests generated from Dexter ${expectedCommit}.`);
} else {
  const rows = args.sample !== undefined ? sourceRows.slice(0, args.sample) : sourceRows;
  writeFileSync(args.out, render(rows, expectedCommit, { ...(args.sample !== undefined ? { sample: args.sample } : {}) }));
  console.log(`Wrote ${rows.length} Dexter-derived AgentV tests to ${args.out}`);
}
