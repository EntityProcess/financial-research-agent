---
name: investment-memo
description: Workflow for drafting a concise long/short public-equity memo with a variant view, scenarios, catalysts, risks, and monitoring tripwires.
---

# Investment Memo Skill

Use this when the user asks for a memo, thesis, stock pitch, long/short write-up,
or investment case. Keep the memo falsifiable and evidence-driven.

## Workflow

1. Establish ticker, direction, horizon, conviction, and variant view. If the
   variant view is missing, derive a draft from evidence and label it as a draft.
2. Gather company financials, current market data, recent earnings, filings,
   segment/KPI data, recent news, and relevant ownership or insider context.
3. Build bear/base/bull scenarios from drivers, not vibes: revenue growth,
   margin, multiple, probability, target price, and return.
4. Check asymmetry and make weak setups visible instead of hiding them.
5. Write thesis bullets with evidence and an observable "wrong if" tripwire.
6. Include catalysts, risks with mitigants, position-management notes, and KPIs to
   monitor.
7. Steelman the bear case and remove unsupported adjectives.

## Output

Return the memo in the format the user requested. If no format is specified, use a
short markdown memo with sections for Variant View, Thesis, Scenarios, Catalysts,
Risks/Tripwires, and Monitoring KPIs.
