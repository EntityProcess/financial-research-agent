#!/usr/bin/env bun
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const DEXTER_PINNED_COMMIT = '8d9419829f443f84b804d033bb2c3b1fbd788629';

type Check = {
  readonly ok: boolean;
  readonly message: string;
};

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function run(command: string, args: readonly string[], cwd?: string) {
  return spawnSync(command, [...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function checkDexterRepo(repoPath: string | undefined): Check[] {
  if (!repoPath) {
    return [{ ok: false, message: 'Set DEXTER_REPO_PATH to a local Dexter checkout.' }];
  }

  const absolutePath = path.resolve(repoPath);
  const checks: Check[] = [];
  checks.push({
    ok: existsSync(absolutePath),
    message: `DEXTER_REPO_PATH must exist: ${repoPath}`,
  });
  checks.push({
    ok: existsSync(path.join(absolutePath, 'src/evals/dataset/finance_agent.csv')),
    message: 'DEXTER_REPO_PATH must point at a Dexter checkout with src/evals/dataset/finance_agent.csv.',
  });
  checks.push({
    ok: existsSync(path.join(absolutePath, 'src/agent/agent.ts')),
    message: 'DEXTER_REPO_PATH must point at a Dexter checkout with src/agent/agent.ts.',
  });

  const git = run('git', ['rev-parse', 'HEAD'], absolutePath);
  if (git.status === 0) {
    const actualCommit = git.stdout.trim();
    const expectedCommit = env('DEXTER_COMMIT') ?? DEXTER_PINNED_COMMIT;
    checks.push({
      ok: actualCommit === expectedCommit,
      message: `Dexter checkout should be pinned to ${expectedCommit}. Current checkout is a different commit.`,
    });
  } else {
    checks.push({
      ok: false,
      message: 'DEXTER_REPO_PATH must be a git checkout so the pinned Dexter commit can be verified.',
    });
  }

  if (!existsSync(path.join(absolutePath, 'node_modules'))) {
    checks.push({
      ok: false,
      message: 'Run bun install inside DEXTER_REPO_PATH before running the eval.',
    });
  }

  return checks;
}

function providerChecks(): Check[] {
  const agentTarget = env('AGENT_TARGET') ?? 'financial-research-agent';
  const checks: Check[] = [];

  if (agentTarget === 'dexter-agent') {
    checks.push(
      { ok: Boolean(env('OPENAI_API_KEY')), message: 'Set OPENAI_API_KEY before running the real Dexter agent.' },
      {
        ok: Boolean(env('FINANCIAL_DATASETS_API_KEY')),
        message: 'Set FINANCIAL_DATASETS_API_KEY before running the real Dexter agent.',
      },
      {
        ok: Boolean(env('EXASEARCH_API_KEY') || env('TAVILY_API_KEY')),
        message: 'Set EXASEARCH_API_KEY or TAVILY_API_KEY before running the real Dexter agent.',
      },
    );
  } else if (agentTarget === 'financial-research-agent') {
    checks.push(
      { ok: Boolean(env('CODEX_EXECUTABLE')), message: 'Set CODEX_EXECUTABLE for the coding research target.' },
      { ok: Boolean(env('CODEX_MODEL')), message: 'Set CODEX_MODEL for the coding research target.' },
      { ok: Boolean(env('CODEX_WORKSPACE_DIR')), message: 'Set CODEX_WORKSPACE_DIR for Codex workspace isolation.' },
      { ok: Boolean(env('CODEX_LOG_DIR')), message: 'Set CODEX_LOG_DIR for Codex run logs.' },
    );
  }

  const graderTarget = env('GRADER_TARGET') ?? 'openai-grader';
  if (graderTarget === 'openai-grader') {
    checks.push({ ok: Boolean(env('OPENAI_MODEL')), message: 'Set OPENAI_MODEL for the AgentV grader target.' });
  }
  if (graderTarget === 'azure-grader') {
    checks.push({ ok: Boolean(env('AZURE_OPENAI_ENDPOINT')), message: 'Set AZURE_OPENAI_ENDPOINT for azure-grader.' });
    checks.push({ ok: Boolean(env('AZURE_OPENAI_API_KEY')), message: 'Set AZURE_OPENAI_API_KEY for azure-grader.' });
    checks.push({ ok: Boolean(env('AZURE_DEPLOYMENT_NAME')), message: 'Set AZURE_DEPLOYMENT_NAME for azure-grader.' });
  }

  return checks;
}

function main() {
  const agentTarget = env('AGENT_TARGET') ?? 'financial-research-agent';
  const checks = [...(agentTarget === 'dexter-agent' ? checkDexterRepo(env('DEXTER_REPO_PATH')) : []), ...providerChecks()];
  const failures = checks.filter((check) => !check.ok);

  if (failures.length > 0) {
    console.error('financial-research-agent AgentV setup is incomplete.');
    console.error('Missing or invalid prerequisites:');
    for (const failure of failures) {
      console.error(`- ${failure.message}`);
    }
    console.error('');
    console.error('No resolved secret values or private endpoints were printed.');
    process.exit(1);
  }

  if (!process.argv.includes('--check-only')) {
    console.log('financial-research-agent AgentV setup check passed.');
    console.log(`Dexter source commit: ${env('DEXTER_COMMIT') ?? DEXTER_PINNED_COMMIT}`);
  }
}

main();
