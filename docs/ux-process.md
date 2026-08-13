# AI-driven UX design process

> **How** design work gets done here, beneath the **front door** in [`working-with-claude.md`](./working-with-claude.md)
> (which is *how you brief me* and *how I respond*). This file is the repeatable pipeline I run for any
> challenge: **Research → Requirements → Ideation → Variations → Evaluation → Handoff** — grounded in the
> state of the art in AI-assisted product design (sources at the end; see also [`research.md`](./research.md)).

## Operating principles (hold these at every stage)
1. **AI explores, scaffolds, accelerates; the human owns strategy, taste, ethics, and final validation.** I compress the laborious middle (synthesis, drafting, variant generation, first-pass critique); you make the load-bearing calls.
2. **Always options with explicit trade-offs**, never a single take on an open brief. Each option states the idea · why it serves the goal · effort · risk, and ties to a product pillar (Predict / Optimize / Comply) and the UX principles.
3. **Design system & principles are guardrails, not suggestions.** Generate strictly within `design-system/` + `lab-shared/` + `theme.ts` and the principles in [`design-language.md`](./design-language.md). No inventing components, colours, or patterns.
4. **Guard against design fixation.** AI output increases fixation and narrows divergent thinking (CHI 2024). So I *diverge before I converge*: spread the option space (e.g. lean → best-in-class) before committing, and treat the first plausible output as a draft to challenge.
5. **Flag every assumption; verify everything.** Synthetic reasoning and AI personas only *stress-test* — anything load-bearing is marked **"validate with real users"**. Built work is verified by `npm run build` + headless screenshots (never your tab).

## The pipeline

| Stage | Goal | AI method(s) | Human checkpoint | Artifact (where it lives) |
|---|---|---|---|---|
| **1 Research** | Understand the unmet need | JTBD job-statements; proto-personas from domain data; theme clustering of any inputs; **Opportunity-Solution-Tree** framing | You confirm the need is real; validate personas with real users | `docs/concepts/<project>-discovery.md` |
| **2 Requirements** | Frame the right problem & define success | Problem-framing template; **How-Might-We**; draft acceptance/**evaluation criteria**; **North Star + HEART** candidates | You pick the metric, own boundaries & failure modes | The project intro in `docs/concepts/SPEC.md` |
| **3 Ideation** | Open the solution space | Prompt-as-mini-brief divergent generation **within** the design-system guardrails | You curate; reject fixation; keep the distinct directions | The archetype set (see below) in `SPEC.md` |
| **4 Variations** | Make options comparable | Parallel, system-aligned variants, each annotated with trade-offs | You apply taste; choose with documented rationale | Built variants in `src/app/variants/` + the deck `docs/concepts/index.html` |
| **5 Evaluation** | Catch defects & validate | AI heuristic review (**Nielsen's 10**), **WCAG** pass, cognitive walkthrough; headless screenshots | You triage; run real-user validation on load-bearing calls | Notes in the variant README / `CHANGELOG.md` |
| **6 Handoff** | Ship with intent intact | Draft specs, component mapping, change notes | You/eng confirm fidelity & accessibility | `variants/projects.ts` + `registry.ts` wiring, READMEs |

### The archetype set (how I diverge in Ideation → Variations)
For each project I spread options across a deliberate spectrum so you can trade off effort vs. polish:
- **① Lean** — fastest to build/adopt; just enough to hit the user goal.
- **②–③ Middle** — distinct mental models (e.g. lifecycle-first, time-first, separate-the-WIP, workflow-status).
- **④ Best-in-class** — state-of-the-art usability & data-entry efficiency (often direct-manipulation / inline / zero-navigation).

This is exactly how the **Spray plans** and **Draft state** projects in `SPEC.md` are structured.

## Templates (lightweight — fill only what earns its place)

**Proto-persona** (assumption-based; validate later):
`Name/role · context & devices · top jobs (JTBD) · pains today · what "good" feels like · riskiest assumption`

**Assumption map** — list each idea's assumptions, place on *importance × evidence*; test the **high-importance / low-evidence** ones first.

**How-Might-We** — reframe the prioritized opportunity: *"How might we [enable X] for [user] so that [outcome]?"* (generate 3–5, pick the framing that opens the best space).

**Success metrics** — one **North Star** (the core value delivered, ideally the JTBD) + **HEART** signals (Happiness, Engagement, Adoption, Retention, Task-success). For AI-powered features, prefer **evaluation criteria** (probabilistic, with a golden set + failure modes) over binary acceptance criteria.

**Evaluation checklist** — Nielsen's 10 (visibility of status, match to real world, user control, consistency, error prevention, recognition over recall, flexibility, minimalist design, error recovery, help) + a WCAG quick pass (contrast, focus order, labels/alt, keyboard). Note what only **real users** can answer.

## Worked example — "Spray plans" through the pipeline
1. **Research** — JTBD: *"plan my spray programme ahead, see what's actually done, and turn a what-if into a committed plan."* Proto-persona: agronomist managing many plots; riskiest assumption = *users will keep planning status in sync with reality* → validate.
2. **Requirements** — HMW: *"How might we let a grower commit a simulation and track execution so the plan reflects reality?"* North Star: *% of planned sprays marked executed on time*; HEART: task-success on "update status".
3. **Ideation → Variations** — four archetypes: **Plan list (lean)**, **Planning board (best)**, **Lifecycle stepper**, **Calendar planner** — all built as comparable variants, all reusing the editable grid / EmptyState / SaveBar.
4. **Evaluation** — heuristic + headless screenshots; flagged for real-user check: does the board's one-click status move match how growers think, vs. the calendar's time-first model?
5. **Handoff** — wired into the navigator under the **Spray plans** project; documented on the deck.

## Division of labour
| AI owns | Human owns |
|---|---|
| Synthesis, drafting, variant generation, first-pass critique, acceleration | Strategy, problem framing, taste/craft, ethics, prioritisation, **final validation** |

## Sources
Continuous discovery & Opportunity-Solution-Trees (Teresa Torres / Product Talk); Jobs-to-be-Done; HEART & North Star metric frameworks; Nielsen's 10 usability heuristics; WCAG 2.1/2.2; "5 shifts redefining design systems in the AI era" (Figma — design-system-as-guardrails); "Generative AI, design fixation & divergent thinking" (CHI 2024); "Writing PRDs for AI products" (acceptance → evaluation criteria). Full URLs in [`research.md`](./research.md).
