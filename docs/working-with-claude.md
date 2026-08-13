# Working with Claude — briefing protocol & AI-design workflow

> The point of these docs: you hand me a **challenge**, and I produce **state-of-the-art interaction-design proposals** grounded in this product — without you re-explaining context each time.
> Grounded in how expert teams work with AI (see `research.md`): **AI scaffolds & explores; you own strategy & final calls.** Strong prompts are **mini-briefs** (what · who · how it should feel). Always **options with trade-offs**. **Verify everything.**

## My standing context (what I already know — don't re-explain)
- **The product & goals** → `product.md` (Predict / Optimize / Comply; users; credits; glossary).
- **What exists today** → `flows.md` (IA, screens, the Lab-management variants, known gaps).
- **The design vocabulary** → `design-language.md` (reusable patterns + UX principles).
- **How to build it** → `../CONVENTIONS.md` (SSOT, layers, variants, verification).
So a brief can be short — I fill gaps from these, and only ask when a missing answer would change the design.

## How to brief me (the brief)
Give me whatever you have; a one-liner is fine ("make lab-report entry faster for agronomists") — I'll restate it as a brief and proceed. The fuller form:
1. **Challenge** — the problem / job-to-be-done, in a sentence or two.
2. **Who & where** — which user (grower/agronomist, processor, retailer) and where in the flow.
3. **Today** — current behaviour (or "see flows.md").
4. **Goal / success** — what good looks like; a metric or a felt outcome.
5. **Constraints** — brand/MUI, must-reuse, mobile?, compliance/traceability, scope.
6. **Output** — new variant version · change the baseline · proposal only.

### Paste-able template
```
Challenge:
User & where:
Today:
Goal / success:
Constraints:
Output (variant / baseline / proposal):
```

## How I respond (the protocol)
1. **Restate & frame** — the problem, user, constraints, success; surface my assumptions. Ask only blocking questions.
2. **Analyze the existing** — pull the relevant flow/UI/concept from `flows.md` + `product.md`; name the specific friction.
3. **Options (2–3) with trade-offs** — each: the idea · why it helps the goal · effort · risk. Tied to the UX principles and a product pillar (Predict / Optimize / Comply).
4. **Recommend** — pick one, say why, and name what should be **validated with you or real users** (AI scaffolds; you decide).
5. **Build it as a variant** — implement as a new **version** in the right project folder (`variants/<id>/` + a row in `variants/projects.ts`), reusing `design-system/` + `lab-shared/`. **Baseline stays untouched** unless you say "promote".
6. **Verify & show** — `npm run build` clean + headless screenshots (never your tab); present before/after and how to reach it in the navigator.

## Principles I hold
- **Prototype real, handoff-ready interaction** (working MUI), not throwaway mockups — the dev team copy-pastes.
- **Reuse-first SSOT** — only fork a component for genuine divergence.
- **Variants are how we compare** — I propose alternatives side-by-side; I don't overwrite a working design to try an idea.
- **Validate against the compliance/traceability reality** in `product.md`; flag where I'm guessing.
- **Don't hijack your browser** — verify in a separate headless instance.

## Anti-patterns (what I won't do)
- Re-ask basics that are in these docs.
- Ship a single take when the brief is open — I'll give options.
- Build a second table/form/empty-state from scratch, or fork a variant for a label-only change.
- Leave disabled controls on screen, or overwrite the baseline to test an idea.

## Keeping these docs honest
When the product understanding, flows, or patterns change, update the relevant doc in the same change (and log notable decisions in `../CHANGELOG.md`). Out-of-date context is worse than none.
