---
name: financial-research
description: Public-company financial research workflow for answering factual market, filing, KPI, guidance, trend, and event questions with sourced evidence. Use when a task asks about a company, ticker, financial metric, business event, SEC filing, earnings result, or public market data.
---

# Financial Research Skill

This skill is a portable public-research workflow. It intentionally does not
assume Dexter, Financial Datasets, or any private provider. Use public filings,
company investor-relations materials, exchange/SEC pages, reputable news, and any
public web tools available in the target environment.

## Checklist

1. Restate the question as the exact fact pattern to verify.
2. Identify the company/ticker, fiscal period, metric definition, and requested
   answer format.
3. Pick source types in this order: company disclosure/filing, regulator or
   exchange record, reputable news/industry source, broad web search.
4. Gather the minimum evidence needed; do not over-collect unrelated context.
5. Normalize units and periods before comparing values.
6. Calculate deltas explicitly when asked for beats/misses, growth, ranges, or
   basis-point differences.
7. Cross-check material numbers or event claims.
8. Return a concise answer with evidence names/dates and caveats for uncertainty.

## Source Selection Patterns

- **Earnings and guidance:** earnings release, 10-Q/10-K, investor presentation,
  transcript, and guidance tables.
- **Business events:** company press releases, 8-Ks, merger/proxy filings,
  regulator/court releases, then reputable news for external context.
- **Historical metrics:** annual reports and consistent company-defined KPIs; if a
  metric definition changes, call that out.
- **People and governance:** proxy statements, annual meeting materials, board
  announcements, and company leadership pages.
- **Market data:** exchange pages, company quote pages, and reputable market data
  summaries; avoid paid/private endpoints for the public benchmark target.

## Research Loop

- Search once with the complete natural-language question or a rich ticker +
  metric query.
- Open/fetch full source documents only when snippets do not contain enough
  evidence.
- For independent sub-questions, research them in parallel if the environment
  supports subagents or parallel tool calls.
- Keep a scratch table of source value, period, units, and citation before writing
  the final answer.

## Calculation Rules

- Basis-point difference = `(actual percentage - reference percentage) * 100`.
- Percentage range as a share of midpoint = `(high - low) / ((high + low) / 2)`.
- Growth rate should state whether it is year-over-year, CAGR, sequential, or
  annualized.
- Use the company's fiscal labels exactly (for example, Q4 FY2025 versus calendar
  Q4 2024).

## Final Answer Rules

- Answer the asked question first; evidence follows.
- Preserve requested formatting for tables, line breaks, or quoted labels.
- Do not present personalized investment advice unless explicitly requested and
  supported by suitability context.
- Do not mention Dexter or benchmark fixtures in the answer.
