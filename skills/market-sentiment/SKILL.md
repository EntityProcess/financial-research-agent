---
name: market-sentiment
description: Public sentiment research workflow for stocks, sectors, companies, or market events using social/news sources without treating sentiment as proof.
---

# Market Sentiment Skill

Use this for questions such as "what are people saying," "market sentiment," or
"check Twitter/X" about a ticker, company, sector, or event.

## Workflow

1. Split the topic into 3-5 searches: core ticker/company, bullish framing,
   bearish framing, news/links, and known expert voices if relevant.
2. Prefer recent, high-signal posts or sourced commentary over replies, spam, and
   low-engagement hot takes.
3. Follow threads or linked sources when a post is materially important.
4. Group findings by bullish, bearish, neutral/news, and catalyst themes.
5. Distinguish retail/social sentiment from institutional or company-sourced
   evidence.
6. End with tone, confidence, and caveats about sample bias.

## Output

Return a sourced sentiment briefing with searched window, themes, representative
voices, overall sentiment, and caveats. Do not use sentiment as a standalone
investment recommendation.
