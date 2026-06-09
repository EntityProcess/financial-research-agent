#!/usr/bin/env bun
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DEXTER_PINNED_COMMIT = '8d9419829f443f84b804d033bb2c3b1fbd788629';

type Row = {
  readonly question: string;
  readonly answer: string;
  readonly questionType: string;
  readonly expertTimeMins: string;
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

function render(rows: readonly Row[]): string {
  const tests = rows
    .map((row, index) => {
      return `  - id: ${slug(row.question) || `dexter-row-${index + 1}`}\n    metadata:\n      source_repo: https://github.com/virattt/dexter\n      source_commit: ${env('DEXTER_COMMIT') ?? DEXTER_PINNED_COMMIT}\n      source_file: src/evals/dataset/finance_agent.csv\n      source_row: ${index + 1}\n      question_type: ${JSON.stringify(row.questionType)}\n      expert_time_mins: ${JSON.stringify(row.expertTimeMins)}\n    input: |\n${block(row.question)}\n    expected_output: |\n${block(row.answer)}`;
    })
    .join('\n\n');

  return `name: financial-research-agent\ndescription: |\n  Generated AgentV adaptation of Dexter's full public finance_agent.csv dataset.\n  Source: https://github.com/virattt/dexter at commit ${env('DEXTER_COMMIT') ?? DEXTER_PINNED_COMMIT}.\n  The default target is a coding/web research agent evaluated against Dexter's\n  public golden answers, so this suite does not require Dexter's paid Financial\n  Datasets API path. Correctness is graded with the same expected-vs-actual\n  semantics as Dexter's original LLM evaluator.\n\nexecution:\n  target: financial-research-agent\n\ntags: [financial-research-agent, dexter, finance, generated]\n\nassertions:\n  - name: dexter-correctness\n    type: llm-grader\n    prompt: file://../graders/dexter-correctness.md\n\ntests:\n${tests}\n`;
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
  }));

writeFileSync(args.out, render(rows));
console.log(`Wrote ${rows.length} Dexter-derived AgentV tests to ${args.out}`);
