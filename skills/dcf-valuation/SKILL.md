---
name: dcf-valuation
description: Portable discounted-cash-flow workflow for public companies. Use when asked for intrinsic value, fair value, price target support, undervalued/overvalued analysis, or a DCF sensitivity table.
---

# DCF Valuation Skill

This is a generic public-company DCF workflow. It is adapted as original guidance
for this harness and does not copy or require Dexter's runtime tools.

## Checklist

1. Gather five years of operating cash flow, capital expenditures, revenue,
   margins, debt, cash, shares, market cap, enterprise value, and current price.
2. Derive free cash flow when needed: operating cash flow minus capital
   expenditures.
3. Select a forecast growth rate from historical FCF/revenue trends, current
   guidance, and business quality; haircut unusually high growth.
4. Estimate a discount rate from sector risk, leverage, rates, and company-specific
   risk. Explain the assumption rather than pretending precision.
5. Project five years of FCF, fade growth toward a mature rate, and calculate a
   terminal value with a conservative perpetual growth rate.
6. Discount projected FCF and terminal value, subtract net debt, divide by diluted
   shares, and compare to current price.
7. Run a small sensitivity grid around WACC and terminal growth.
8. Validate the result against market EV, FCF yield, and terminal-value share of
   total value. Revise or caveat if sanity checks fail.

## Output

Return a compact valuation summary, assumptions table, FCF projection, sensitivity
matrix, and caveats. State that a DCF is an estimate sensitive to assumptions.
