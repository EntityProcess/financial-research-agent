#!/usr/bin/env bun
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEXTER_PINNED_COMMIT = '8d9419829f443f84b804d033bb2c3b1fbd788629';

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function fail(message: string): never {
  console.error(message);
  console.error('No resolved secret values or private endpoints were printed.');
  process.exit(1);
}

const prompt = argValue('--prompt');
const outputPath = argValue('--output');
const dexterRepoPath = env('DEXTER_REPO_PATH');

if (!prompt) fail('Missing --prompt from AgentV CLI target invocation.');
if (!outputPath) fail('Missing --output from AgentV CLI target invocation.');
if (!dexterRepoPath) fail('Set DEXTER_REPO_PATH to a local Dexter checkout.');
if (!env('OPENAI_API_KEY')) fail('Set OPENAI_API_KEY before running Dexter through AgentV.');
if (!env('FINANCIAL_DATASETS_API_KEY')) fail('Set FINANCIAL_DATASETS_API_KEY before running Dexter through AgentV.');
if (!env('EXASEARCH_API_KEY') && !env('TAVILY_API_KEY')) {
  fail('Set EXASEARCH_API_KEY or TAVILY_API_KEY before running Dexter through AgentV.');
}

const absoluteDexterPath = path.resolve(dexterRepoPath);
const agentModulePath = path.join(absoluteDexterPath, 'src/agent/agent.ts');
const model = env('DEXTER_MODEL') ?? 'gpt-5.5';
const maxIterations = Number.parseInt(env('DEXTER_MAX_ITERATIONS') ?? '10', 10);

process.chdir(absoluteDexterPath);

const { Agent } = await import(pathToFileURL(agentModulePath).href);
const agent = await Agent.create({
  model,
  maxIterations: Number.isFinite(maxIterations) ? maxIterations : 10,
});

let answer = '';
for await (const event of agent.run(prompt)) {
  if (event.type === 'done') {
    answer = event.answer;
  }
}

writeFileSync(
  outputPath,
  JSON.stringify(
    {
      output: answer,
      metadata: {
        dexter_source_commit: env('DEXTER_COMMIT') ?? DEXTER_PINNED_COMMIT,
        dexter_model: model,
      },
    },
    null,
    2,
  ),
);
