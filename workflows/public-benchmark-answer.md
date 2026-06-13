# Public Financial Benchmark Answer Workflow

Use this workflow for the default `financial-research-agent` AgentV target. It is
written for public web/coding agents answering single benchmark questions, not for
Dexter's private runtime.

## Decision Tree

1. **Reported metric or KPI** — Find the company disclosure for the exact fiscal
   period, copy the reported value, normalize units, and cite the release/filing.
2. **Guidance or beat/miss** — Locate the guidance range and the actual result,
   compute the variance with the requested unit (bps, %, dollars, per-share), and
   state whether it beat or missed.
3. **Trend/comparison** — Build a small period-by-period table, align definitions
   across years/quarters, and summarize the direction plus the likely driver only
   if evidence supports it.
4. **Business event or deal question** — Establish the timeline from primary
   company statements and filings, then use reputable news for external actions
   such as regulatory or court decisions.
5. **Filing-content question** — Use the specific 10-K/10-Q/8-K section that maps
   to the ask (business, risk factors, MD&A, financial statements, material event)
   rather than scanning whole filings.
6. **Valuation, memo, or sentiment request** — Switch to the relevant skill card
   under `skills/` and return the requested artifact/summary.

## Evidence Rules

- Primary sources outrank secondary sources.
- Cite source names and dates compactly; URLs are helpful when available.
- If the source date matters, include it explicitly.
- If a value is calculated, show the source values and formula.
- If a value cannot be verified publicly, say what was checked and do not invent.

## Output Shape

- Honor the user's requested format first.
- Keep the answer short unless the question asks for analysis.
- Use line breaks or compact tables for multi-period numeric answers.
- Include a one-sentence caveat only when it changes how the answer should be
  interpreted.
