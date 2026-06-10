#!/usr/bin/env bun
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DEXTER_PINNED_COMMIT = '8d9419829f443f84b804d033bb2c3b1fbd788629';

type Row = {
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

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function parseArgs() {
  const sampleIndex = process.argv.indexOf('--sample');
  const outIndex = process.argv.indexOf('--out');
  const sample =
    sampleIndex >= 0 && process.argv[sampleIndex + 1]
      ? Number.parseInt(process.argv[sampleIndex + 1] ?? '', 10)
      : undefined;

  return {
    sample,
    out: outIndex >= 0 ? process.argv[outIndex + 1] : 'evals/financial-research-agent.eval.yaml',
  };
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
  const criteria: RubricCriterion[] = [];
  const objectRegex = /\{([\s\S]*?)\}/g;
  for (const objectMatch of raw.matchAll(objectRegex)) {
    const body = objectMatch[1] ?? '';
    const operator = body.match(/['"]operator['"]\s*:\s*(['"])([\s\S]*?)\1/)?.[2]?.trim();
    const text = body
      .match(/['"]criteria['"]\s*:\s*(['"])([\s\S]*?)\1/)?.[2]
      ?.replace(/\\n/g, '\n')
      .trim();

    if ((operator === 'correctness' || operator === 'contradiction') && text) {
      criteria.push({ operator, criteria: text });
    }
  }

  return criteria;
}

function block(value: string, indent = 6): string {
  const spaces = ' '.repeat(indent);
  return value
    .trim()
    .split('\n')
    .map((line) => {
      const trimmed = line.trimEnd();
      return trimmed ? `${spaces}${trimmed}` : '';
    })
    .join('\n');
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72);
}

function yamlString(value: string, indent = 12): string {
  const text = value.trim();
  if (!text.includes('\n')) {
    return JSON.stringify(text);
  }

  const spaces = ' '.repeat(indent);
  return `|\n${text
    .split('\n')
    .map((line) => {
      const trimmed = line.trimEnd();
      return trimmed ? `${spaces}${trimmed}` : '';
    })
    .join('\n')}`;
}

function render(rows: readonly Row[]): string {
  const tests = rows
    .map((row, index) => {
      const criteria = parseRubricCriteria(row.rubric);
      const rubricItems =
        criteria.length > 0
          ? criteria
              .map(
                (criterion, criterionIndex) =>
                  `          - id: criterion-${criterionIndex + 1}\n            operator: ${criterion.operator}\n            criteria: ${yamlString(criterion.criteria, 14)}`,
              )
              .join('\n')
          : `          - id: criterion-1\n            operator: correctness\n            criteria: "Conveys the same key information as the Dexter reference answer."`;

      return `  - id: ${slug(row.question) || `dexter-row-${index + 1}`}\n    metadata:\n      source_row: ${index + 1}\n      question_type: ${JSON.stringify(row.questionType)}\n      expert_time_mins: ${JSON.stringify(row.expertTimeMins)}\n    input: |\n${block(row.question)}\n    expected_output: |\n${block(row.answer)}\n    assertions:\n      - name: dexter-rubric\n        type: llm-grader\n        prompt: file://prompts/dexter-grader.md\n        rubrics:\n${rubricItems}`;
    })
    .join('\n\n');

  return `name: financial-research-agent\ndescription: |\n  Generated AgentV adaptation of Dexter's full public finance_agent.csv dataset.\n  Source: https://github.com/virattt/dexter at commit ${env('DEXTER_COMMIT') ?? DEXTER_PINNED_COMMIT}.\n  The default target is a coding/web research agent evaluated against Dexter's\n  public golden answers, so this suite does not require Dexter's paid Financial\n  Datasets API path. Dexter CSV rubrics are preserved as native llm-grader\n  rubric items with Dexter's operator semantics.\n\nexecution:\n  target: financial-research-agent\n\ntags: [financial-research-agent, dexter, finance, generated]\n\nmetadata:\n  source_repo: https://github.com/virattt/dexter\n  source_commit: ${env('DEXTER_COMMIT') ?? DEXTER_PINNED_COMMIT}\n  source_file: src/evals/dataset/finance_agent.csv\n\ntests:\n${tests}\n`;
}

const args = parseArgs();
const repoPath = env('DEXTER_REPO_PATH');
if (!repoPath) {
  console.error('Set DEXTER_REPO_PATH to a local Dexter checkout.');
  process.exit(1);
}

const csvPath = path.join(path.resolve(repoPath), 'src/evals/dataset/finance_agent.csv');
const rows = parseCsv(readFileSync(csvPath, 'utf8'))
  .slice(1)
  .filter((row) => row.length >= 5 && row[0]?.trim())
  .slice(0, args.sample !== undefined && Number.isFinite(args.sample) ? args.sample : undefined)
  .map((row) => ({
    question: row[0],
    answer: row[1],
    questionType: row[2],
    expertTimeMins: row[3],
    rubric: row[4],
  }));

writeFileSync(args.out, render(rows));
console.log(`Wrote ${rows.length} Dexter-derived AgentV tests to ${args.out}`);
