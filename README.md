# financial-research-agent

AgentV companion eval project for a public coding/web financial research agent.

This repository is not a fork of Dexter and does not own Dexter's agent code or dataset. It uses Dexter's public `src/evals/` dataset as a pinned benchmark fixture and golden-answer source so the AgentV Dashboard can show a realistic public domain-agent project.

## Baseline Results

See [BASELINE_RESULTS.md](BASELINE_RESULTS.md) for a public narrative report on the financial-research baseline runs, links to raw AgentV artifacts, and the cross-domain AgentV proof point alongside the legal/document-intelligence eval pack. The published dashboard-style static report is served at https://entityprocess.github.io/financial-research-evals/.

## Source Pin

The first public demo is pinned to Dexter commit:

```text
8d9419829f443f84b804d033bb2c3b1fbd788629
```

Dexter's own eval flow at that commit uses:

- `bun run src/evals/run.ts`
- optional sampling with `--sample N`
- `src/evals/dataset/finance_agent.csv`
- CSV columns: `Question`, `Answer`, `Question Type`, `Expert time (mins)`, `Rubric`
- an LLM-as-judge correctness check, with CSV rubric metadata containing
  `correctness` and `contradiction` criteria

The committed AgentV eval keeps the question/answer fixture shape for every row in the pinned CSV: Dexter questions become AgentV `input`, and Dexter answers become `expected_output`. Dexter's runtime evaluator ignores the CSV `Rubric` column, but this project intentionally preserves those entries as native AgentV `llm-grader` rubrics. The shared prompt in `prompts/dexter-grader.md` receives AgentV's `{{ rubrics_json }}` and `{{ metadata_json }}` structured variables, so the eval does not duplicate question/answer data into grader-only payloads.

By default, the eval does **not** run Dexter. It runs a coding/web research agent against Dexter's public golden answers, so the demo does not require `FINANCIAL_DATASETS_API_KEY`. The real `dexter-agent` target remains available as an optional compatibility target for users who have Dexter's paid data prerequisites configured.

## Harness and Skill Boundary

This repository mirrors the legal-style harness split:

- **AgentV** is only the eval harness: target selection, execution, results, and grading.
- **Financial research skills/workflow** are target-agent behavior maintained in `skills/`, `workflows/`, and `prompts/financial-research-system.md`.
- **Dexter CSV and golden answers** are benchmark fixture/provenance from the pinned public commit. They are not answer sources during benchmark execution.
- **`dexter-agent`** remains an optional compatibility/reference target for users with Dexter's private prerequisites.

The default public `financial-research-agent` and `codex` targets embed a compact version of the reusable financial-research workflow in `.agentv/targets.yaml` and point back to the canonical prompt/skill files. This keeps the default target behavior explicit without adding provider-specific Dexter internals to AgentV core.

### Dexter attribution and license check

Dexter was inspected at commit `8d9419829f443f84b804d033bb2c3b1fbd788629` for portable workflow ideas, including financial research, DCF, memo, sentiment, tool-use, subagent, and finance-router guidance. That pinned checkout does not include a standalone `LICENSE`, `NOTICE`, or `COPYING` file, and `package.json` does not declare a `license` field, but Dexter's README license section states that the project is MIT licensed. Run `bun run check:dexter-provenance` with `DEXTER_REPO_PATH` set to refresh this evidence.

This repository still does **not** copy Dexter SKILL.md prose, source code, provider/API internals, or private data assumptions. The skill cards here are original, generic public-financial-research guidance; Dexter remains the dataset provenance and optional reference target.

## Prerequisites

Install AgentV separately.

For the default `financial-research-agent` target, configure a Codex-style coding agent plus a grader:

```bash
AGENT_TARGET=financial-research-agent
CODEX_EXECUTABLE=codex-eng
CODEX_MODEL=gpt-5.5
CODEX_REASONING_EFFORT=low
CODEX_WORKSPACE_DIR=.agentv/codex-workspaces
CODEX_LOG_DIR=.agentv/logs/codex
GRADER_TARGET=openai-grader
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.5
```

Clone and pin Dexter only when regenerating eval YAML from Dexter's CSV or when running the optional real `dexter-agent` target:

```bash
git clone https://github.com/virattt/dexter.git ../dexter
git -C ../dexter checkout 8d9419829f443f84b804d033bb2c3b1fbd788629
cd ../dexter
bun install
```

Create local env for this project:

```bash
cp .env.example .env
```

Fill in only local values in `.env`. Do not commit `.env`, resolved provider endpoints, API keys, Bitwarden output, or result-repo tokens.

Required variables for the default public-demo target:

- `AGENT_TARGET=financial-research-agent`
- `CODEX_EXECUTABLE`
- `CODEX_MODEL`
- `CODEX_WORKSPACE_DIR`
- `CODEX_LOG_DIR`
- `GRADER_TARGET`
- grader model variables for the selected grader target
- for `GRADER_TARGET=azure`: `AZURE_OPENAI_RESPONSES_BASE_URL`, `AZURE_OPENAI_API_KEY`, and `AZURE_DEPLOYMENT_NAME`

Additional variables for optional `AGENT_TARGET=dexter-agent`:

- `DEXTER_REPO_PATH`
- `OPENAI_API_KEY`
- `FINANCIAL_DATASETS_API_KEY`
- `EXASEARCH_API_KEY` or `TAVILY_API_KEY`

## Run

Preflight:

```bash
bun run setup
```

The public target prompt is defined in `.agentv/targets.yaml` and summarized in
`prompts/financial-research-system.md`; update the skill/workflow files first
when changing target-agent research behavior.

Run the full AgentV eval:

```bash
agentv eval evals/financial-research-agent.eval.yaml --targets .agentv/targets.yaml --target financial-research-agent
```

During AgentV repository development, prefer the source CLI from the AgentV checkout:

```bash
bun /path/to/agentv/apps/cli/src/cli.ts eval financial-research-agent/evals/financial-research-agent.eval.yaml --targets financial-research-agent/.agentv/targets.yaml --target financial-research-agent
```

For quick verification, run one committed test by ID:

```bash
agentv eval evals/financial-research-agent.eval.yaml --targets .agentv/targets.yaml --target financial-research-agent --test-id us-steel-nippon-merger
```

To run the real Dexter agent instead, use `--target dexter-agent` after setting
the optional Dexter variables above.

## Regenerate From Dexter CSV

After updating `DEXTER_REPO_PATH` and `DEXTER_COMMIT`, regenerate the full AgentV eval from Dexter's public CSV:

```bash
bun run scripts/generate-eval-from-dexter.ts --out evals/financial-research-agent.eval.yaml
```

Use `--sample N --out <path>` only for local experiments or quick generator checks; do not use a sampled file as the committed dataset boundary.

Review the generated eval before committing. The generator intentionally keeps the conversion conservative and AgentV-native: it preserves Dexter rubric entries as `{ operator, criteria }`-style `llm-grader` rubric items, uses suite-level source metadata for the pinned CSV, and reuses `prompts/dexter-grader.md` by file reference.

## Secret Boundary

Setup and target scripts print variable names and missing prerequisite guidance only. They must not print resolved secret values, private endpoints, or Bitwarden-derived output.

Public result synchronization belongs to the downstream `financial-research-evals` work. Before publishing any run artifact, scan it for API keys, provider endpoints, private paths, and sensitive data.

## AgentV Composition Note

The Dexter adaptation uses AgentV's native `llm-grader` primitive. Each assertion references `prompts/dexter-grader.md` and passes Dexter CSV rubric entries through `rubrics`, preserving `operator` plus `criteria` so the prompt can distinguish correctness checks from contradiction guards. Suite-level `metadata` carries the pinned Dexter source fields, while per-test metadata only carries row-specific fields such as `source_row`, `question_type`, and `expert_time_mins`.
