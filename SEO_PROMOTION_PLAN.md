# SEO and Promotion Plan

## Goal

Grow qualified organic traffic for Don't Send It Yet from people searching in emotional, urgent breakup moments, then convert that traffic into cooldown starts, vault saves, no-contact email starts, and feedback.

## Positioning

Primary promise: a free regret-prevention tool for texts you might send to your ex.

Audience:

- People about to text an ex after a breakup.
- People trying no-contact but having a spike of urge.
- People seeking breakup closure, reassurance, or emotional regulation.

Search intent to own:

- "should I text my ex"
- "texting your ex"
- "no contact challenge"
- "I miss my ex should I text them"
- "drunk text ex"
- "breakup no contact tracker"
- "how to stop texting my ex"
- "write a text to my ex but not send it"

## Technical SEO Already Started

- Rewrote the homepage title and meta description around the highest-intent use case.
- Added canonical URL injection through `SITE_URL`.
- Added Open Graph and Twitter metadata for better sharing previews.
- Added `SoftwareApplication` and `FAQPage` JSON-LD.
- Added `/robots.txt` with sitemap discovery.
- Added `/sitemap.xml` for the homepage.
- Added `favicon.svg` and `og-image.svg`.

Launch environment:

```bash
SITE_URL=https://dont-send-it-yet.onrender.com
```

Then verify:

- `https://dont-send-it-yet.onrender.com/robots.txt`
- `https://dont-send-it-yet.onrender.com/sitemap.xml`
- Google Search Console URL Inspection
- Rich Results Test for JSON-LD
- PageSpeed Insights on mobile

## Keyword Clusters

### Cluster 1: Urgent Decision

Target landing page: homepage.

Keywords:

- should I text my ex
- should I send this text to my ex
- I want to text my ex
- text your ex checker
- drunk text my ex

Content angle: immediate interactive tool, not advice-only content.

### Cluster 2: No Contact

Target landing page: future `/no-contact-challenge`.

Keywords:

- no contact challenge
- 30 day no contact rule
- no contact tracker
- no contact day 1
- no contact with ex

Content angle: streak, email support, daily check-ins, triggers.

### Cluster 3: Breakup Closure

Target landing page: future `/breakup-closure`.

Keywords:

- how to get closure after breakup
- closure text to ex
- should I ask my ex for closure
- why do I want closure from my ex

Content angle: closure vs regulation, save-to-vault alternative.

### Cluster 4: Message Drafts

Target landing page: future `/unsent-texts`.

Keywords:

- unsent text to ex
- write a letter to your ex and don't send it
- message vault
- texts I should not send

Content angle: searchable examples, but route users into the tool.

## First 30 Days

Week 1: Launch foundations

- Connect the final domain.
- Set `SITE_URL`.
- Submit sitemap in Google Search Console.
- Add Microsoft Bing Webmaster Tools.
- Add lightweight analytics events for `score_generated`, `cooldown_started`, `decision_vault`, `decision_delete`, `challenge_started`.
- Publish one short founder/product note on Indie Hackers, Product Hunt Coming Soon, Reddit profile, X, TikTok, and LinkedIn.

Week 2: Build topic pages

- Create `/no-contact-challenge`.
- Create `/should-i-text-my-ex`.
- Create `/unsent-texts`.
- Link all three pages from the homepage nav/footer.
- Add FAQ blocks to each page based on real feedback.

Week 3: Community distribution

- Answer 10 relevant Reddit/Quora questions with useful advice first and one soft link where allowed.
- Post 5 short-form videos around moments like "the 2am ex text test" and "save it to the vault instead."
- Reach out to 20 breakup coaches, therapists, and newsletter writers with a free resource angle.

Week 4: Iterate from data

- In Search Console, inspect queries with impressions but low CTR.
- Rewrite titles/meta for pages below 2% CTR.
- Expand pages where average position is 8-30.
- Convert the top 5 feedback themes into FAQs or micro-copy.

## Launch Copy

Short post:

> I made a free tool for the moment when you are about to text your ex and part of you already knows tomorrow might hurt. Paste the draft, get a regret score, start a 10-minute cooldown, and save it to a private vault instead of sending from panic.

Reddit-safe comment ending:

> If you need a pause ritual, I built a free "send it yet?" checker for this exact moment. The useful part is the cooldown and vault, not the score itself.

Outreach email:

Subject: Free no-contact cooldown tool for your audience

Hi,

I built Don't Send It Yet, a free tool for people who are about to text an ex and need a structured pause. It gives a regret score, starts a 10-minute cooldown, and helps users save the message to a vault instead of sending from a spike.

It may be useful as a resource for breakup/no-contact readers. Happy to make a custom resource page or quote for your audience if helpful.

## Measurement

Primary conversions:

- Regret score generated
- Cooldown started
- Message saved to vault
- No-contact challenge started

SEO KPIs:

- Indexed pages
- Organic clicks
- Query impressions by cluster
- CTR by landing page
- Average position for "should I text my ex", "no contact challenge", and "unsent text to ex"

Quality guardrails:

- Avoid manipulative mental-health claims.
- Avoid promising recovery, diagnosis, or therapy.
- Keep copy clear that this is a pause tool, not medical advice.
- Do not spam breakup communities; answer sincerely and link only when welcome.
