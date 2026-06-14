# Baseline results: financial research eval pack

This report summarizes public AgentV baseline artifacts for the `financial-research-agent` eval project. It is written for readers who have not seen Dexter or AgentV before: the short version is that AgentV can package a niche financial-research workflow as portable eval YAML, target config, rubric prompts, and public result artifacts without a bespoke mini framework.

## What this project evaluates

The source eval adapts Dexter's public `finance_agent.csv` benchmark fixture at pinned commit `8d9419829f443f84b804d033bb2c3b1fbd788629`. Each row becomes an AgentV test case:

- the Dexter question becomes AgentV `input`;
- the Dexter reference answer becomes `expected_output`;
- the Dexter rubric metadata becomes structured AgentV `llm-grader` rubric checks;
- the target is a public web/coding financial-research agent, not the Dexter runtime.

The default public target is configured in [`.agentv/targets.yaml`](.agentv/targets.yaml). It tells the target agent to use public web, SEC, investor-relations, exchange, and reputable news sources, and not to use Dexter, private data APIs, paid market data, or benchmark golden answers.

## Published baseline runs

Dashboard-style static reports are published at https://entityprocess.github.io/financial-research-evals/ and https://entityprocess.github.io/financial-research-evals/dexter-baseline.html.

| Run | Scope | Target/model | Grader | Result |
| --- | --- | --- | --- | --- |
| [50-case Codex baseline](https://entityprocess.github.io/financial-research-evals/) | 50 financial-research questions from the pinned Dexter fixture | AgentV `codex` provider target; exact model supplied by `CODEX_MODEL` and not exported in the public artifact | `dexter-rubric` AgentV `llm-grader` | AgentV pass rate 72.0%; mean rubric score 81.3%; 32/50 full rubric passes; 192/241 checks satisfied |
| [One-test Codex web baseline](https://entityprocess.github.io/financial-research-evals/dexter-baseline.html) | TJX beat/miss question used as a live plumbing check | AgentV `codex` provider target | `dexter-rubric` AgentV `llm-grader` | 33.3% score; 1/3 checks; confirms artifact and rubric plumbing but is not the aggregate quality baseline |

Raw artifacts for the 50-case run are available as [`index.jsonl`](https://github.com/EntityProcess/financial-research-evals/blob/main/.agentv/results/runs/age-14-task-bundle-dogfood/2026-06-10T08-35-26Z-age-14-codex/index.jsonl), [`benchmark.json`](https://github.com/EntityProcess/financial-research-evals/blob/main/.agentv/results/runs/age-14-task-bundle-dogfood/2026-06-10T08-35-26Z-age-14-codex/benchmark.json), and [`transcript.jsonl`](https://github.com/EntityProcess/financial-research-evals/blob/main/.agentv/results/runs/age-14-task-bundle-dogfood/2026-06-10T08-35-26Z-age-14-codex/transcript.jsonl). The result repository also contains per-case folders with inputs, responses, grading JSON, timing, and task config snapshots.

## How to read the scores

AgentV records a 0.0-1.0 score per case. For this eval pack, the score is the fraction of rubric checks satisfied by the LLM grader. A full rubric **pass** means every check passed. A case can still be useful when it partially passes: the assertions list shows exactly which facts, calculations, or contradiction guards succeeded or failed.

The 50-case baseline is descriptive. It is **not** a merge gate. Before using a future run as a release blocker, define stable thresholds, pin the target/model setup, decide how benchmark drift should be handled, and review LLM-judge outputs for high-stakes claims.

## 50-case result by question type

| Question type | Cases | Mean score | AgentV ok | Full rubric passes |
| --- | ---: | ---: | ---: | ---: |
| Adjustments | 4 | 75.0% | 3/4 | 3/4 |
| Beat or Miss | 7 | 79.2% | 5/7 | 4/7 |
| Complex Retrieval | 3 | 87.8% | 3/3 | 1/3 |
| Financial Modeling | 4 | 88.6% | 3/4 | 3/4 |
| Market Analysis | 3 | 32.9% | 0/3 | 0/3 |
| Numerical Reasoning | 8 | 84.4% | 6/8 | 6/8 |
| Qualitative Retrieval | 9 | 91.4% | 7/9 | 7/9 |
| Quantitative Retrieval | 9 | 82.2% | 7/9 | 7/9 |
| Trends | 3 | 85.6% | 2/3 | 1/3 |

## What the baseline shows

- **Strengths:** direct quantitative retrieval, qualitative retrieval, and formulaic numerical reasoning often pass completely. Examples include Warner Bros. Discovery restructuring costs, Redfin/Rocket acquisition terms, Spirit operating KPI enumeration, and Uber revenue-growth attribution.
- **Gaps:** market-analysis and exact multi-part tasks are more brittle. Some failures come from omitted sub-answers, such as giving only TJX's high-end guidance beat instead of both low-end and high-end comparisons.
- **Benchmark drift signal:** financial facts can change after a pinned benchmark answer is written. The U.S. Steel/Nippon case failed because the public-web answer discussed later developments while the pinned reference expected a blocked transaction. This is useful eval evidence, but it should be interpreted as a reference-maintenance signal as well as a target-quality signal.

## Cross-domain AgentV proof point

Financial research and legal document intelligence are intentionally different domains, but their public baselines use the same AgentV primitives:

| Domain | Eval pack | Domain-specific pieces | Shared AgentV pieces | Public artifact |
| --- | --- | --- | --- | --- |
| Financial research | This repository's Dexter-adapted finance eval | Public-web financial research prompt, finance skills/workflow notes, Dexter-derived rubric checks | Eval YAML, target registry, `llm-grader`, JSONL index, per-case grading artifacts, transcript output | [Financial static report](https://entityprocess.github.io/financial-research-evals/) |
| Legal/document intelligence | `EntityProcess/legal-document-intelligence-evals` PR #1 | Legal document fixtures, stateful-swarm target, Harvey-style legal rubrics | Eval YAML, target registry, `llm-grader`, JSONL index, per-case grading artifacts, transcript output | [Legal static report](https://entityprocess.github.io/legal-document-intelligence-evals-results/) |

The scores are not comparable across domains because the tasks, rubrics, and targets differ. The proof is portability: teams can keep domain expertise in eval packs, graders, prompts, and skills while AgentV supplies the common run, grading, artifact, and dashboard surface.

## Limitations

- This is not investment advice and should not be used for financial decisions.
- The target/model identity is partially environment-driven; the public artifacts record the target label but not all local environment values.
- LLM-as-judge grading provides useful structured evidence, but it can be imperfect and should be audited before high-stakes use.
- The result artifacts intentionally omit provider secrets, local logs, private endpoints, and paid-data credentials.
