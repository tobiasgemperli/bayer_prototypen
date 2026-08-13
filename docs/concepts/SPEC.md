# Concept spec — projects & variants

> The design backbone for this round. Each **project** is a group in `variants/` (a folder in the
> Prototype navigator). Each **variant** is a comparable version of that project's flow, built as a
> real React variant (baseline untouched). This file drives the build agents and the concept deck.
>
> Per project we ship **4 variants** spanning the spectrum the brief asked for:
> **① Lean** (fastest to build/adopt, just enough to hit the goal) … **④ Best-in-class** (state-of-the-art
> usability & data-entry efficiency), with ②–③ as distinct middle options. Lab management gets **1 new
> "best" version** added to its existing five.

Legend — **Effort**: ▁ lean · ▃ small · ▅ medium · ▇ larger. **Efficiency**: data-entry/usability strength.

---

## Project: Spray plans  *(new)*

**Entities/relations introduced (per the brief):** `SprayPlan` { kind: *simulated → planned*, status: *pending → completed* } containing many `PlannedSpray` { status: *planned → executed* }. **Planning status (Pending/Completed) is user-managed** (reflects the real-world operation); per-spray *executed* tracks what actually happened. Today's "alternative plans" become **simulations you can commit and then execute**.

**JTBD:** *"Plan my spray programme ahead, see which sprays are actually done, and turn a what-if simulation into a committed plan I execute across the season."*

**Today (baseline):** Plot detail → **Treatments** tab → sub-tabs **Real** / **+ New simulated plan**. Simulated plans are throwaway what-ifs: no status, no lifecycle, no execution tracking, no way to "commit" one.

**Surface for all variants:** a new **Spray plans** tab on the plot detail (injected via `extraTabs`; baseline & other projects unaffected). Data from `data/spray-plans-data.ts`. Reuse `EditableDataGrid` + `dateColumn`, `EmptyState`, `OptionsTrigger`, `SaveBar`, MUI chips.

| # | Variant (id) | Archetype | What it is | What's new vs baseline | Effort / Efficiency |
|---|---|---|---|---|---|
| **V1** | Plan list — `spray-plans-v1` | **① Lean** | A table of plans (name · season · kind chip · # sprays · progress · **status chip**). **+ New plan**; click a plan → its sprays in an editable grid. Row actions: *Mark completed*, *Convert simulation → plan*, *Delete*. | Plans are first-class with explicit **Pending/Completed**; simulation can be **committed**; execution counted. | ▁ / ▃ |
| **V2** | Planning board — `spray-plans-v2` | **④ Best usability & data-entry** | **Kanban**: lanes **Pending \| Completed** + a **Simulations** shelf. Plan cards show a progress ring + spray chips; **move a card between lanes to set status in one click**; **inline quick-add spray** on the card; per-spray *executed* checkbox; when all sprays executed the card nudges "→ move to Completed". | Status by direct manipulation; fewest clicks to plan + update; execution visible at a glance. | ▇ / ▇ |
| **V3** | Lifecycle stepper — `spray-plans-v3` | **② Lifecycle-first** | Each plan is a horizontal **stepper: Simulated → Planned → In progress → Completed**. Sprays listed with an *executed* toggle + executed-date; the stepper auto-advances from the data, user **confirms** the planning status. | Makes the **simulate → plan → execute** lifecycle the explicit mental model; status grounded in real operation. | ▅ / ▅ |
| **V4** | Calendar planner — `spray-plans-v4` | **③ Time-first** | A **month calendar** (MUI `DateCalendar`) with planned sprays sitting on their dates; click a day to add a spray; **overdue** (past + not executed) flagged; mark executed from the day chip; plan auto-completes when all sprays executed. | Plan on a timeline, not a list; proactive **overdue** nudges; status follows execution over time. | ▇ / ▅ |

**Flows (one line each):**
- V1: `Spray plans tab → list → (New plan / open) → edit sprays → tick executed → Mark completed`
- V2: `board → add card to a lane → quick-add sprays → tick executed → move card → Completed`
- V3: `simulate plan → "Commit to plan" → execute sprays over time → confirm → Completed`
- V4: `calendar → add spray on a date → as dates pass, mark executed → plan completes`

---

## Project: Draft state  *(new)*

**Concept introduced (per the brief):** records can be **Draft (incomplete mandatory data)** vs **Complete**, **system-managed** from data completeness — *not* a manual toggle. A plot saved without a planting date/variety, or a treatment without product/method/dose, is a Draft. Helpers `getPlotCompleteness` / `getTreatmentCompleteness` / `isPlotDraft` (see `data/plots-data.ts`). Seeded drafts: **plot 9** (3/5), **plot 10** (4/5), **treatment t6**.

**JTBD:** *"Records I save with missing mandatory data are clearly flagged and quick to finish, so my forecasts run on complete, trustworthy data."*

**Today (baseline):** the **Plots** list (`PlotsTable`) shows every plot identically — no draft/complete signal, no "what's missing", no way to finish a half-entered record. Same for the Treatments grid.

**Surface for all variants:** override `PlotsPage` (the list) and complete records **in place** via `updatePlot` (no plot-editor route exists, so completion lives in the variant). Reuse `PlotsTable` styling, `EmptyState`, MUI chips/LinearProgress, `BaseDialog`.

| # | Variant (id) | Archetype | What it is | What's new vs baseline | Effort / Efficiency |
|---|---|---|---|---|---|
| **V1** | Badge + filter — `draft-state-v1` | **① Lean** | **Draft** chip on incomplete rows + a **"3/5"** completeness column + a filter **All / Drafts / Complete** + a banner *"2 plots need info to forecast"*. Row **Complete** → dialog with **only the missing fields** → save. | Draft vs Complete made explicit; drafts are findable & countable; targeted completion. | ▁ / ▃ |
| **V2** | Inline completion — `draft-state-v2` | **④ Best usability & data-entry** | Each draft row **expands inline** into a compact form of **only the missing fields** with **autosave**; a per-row progress meter + an overall **"Plots ready" bar**; the Draft chip **clears live** as fields fill. Zero navigation. | Finish drafts without leaving the list; live progress; least-effort data entry. | ▇ / ▇ |
| **V3** | Drafts tray — `draft-state-v3` | **② Separate the WIP** | A pinned **"Drafts (2)"** tray above the list showing each draft + what's missing + a **guided "Complete" stepper** through the missing fields; the main list below shows only **ready** plots. | Work-in-progress separated from trustworthy records; guided finish. | ▅ / ▅ |
| **V4** | Status + side-panel — `draft-state-v4` | **③ Workflow status** | A **Status** column with **Draft / Complete** pills; clicking a Draft opens a **right side-panel** with the record + a **missing-field checklist**; filling flips it to Complete. **Treatments** show the same Draft chip in the grid for cross-record consistency. | Editorial-style workflow status; one checklist to "make it complete"; consistent across plots & treatments. | ▇ / ▅ |

**Flows:**
- V1: `Plots → filter Drafts → Complete → fill missing fields → Complete`
- V2: `Plots → expand draft row → fill inline (autosave) → row turns Complete`
- V3: `Drafts tray → Complete → stepper through missing → done → leaves tray`
- V4: `Plots → click Draft pill → side-panel checklist → fill → Complete`

---

## Project: Lab management  *(existing — add 1 new "best" version)*

**Relation reaffirmed (per the brief):** a **sample contains multiple lab reports** (`LabSampleData.reports: LabReport[]`, each with its own `residues`). Existing versions: V1 reports-table, V2 stacked, V3 laboratory-management, V4 treatments-grid, V5 sample-first.

**JTBD:** *"See a sample and all its lab reports + results on one screen, and add a report to a sample without leaving the page."*

**Gap in existing versions:** none shows the **1 sample → N reports → results** relation in a single, no-navigation view; they either page-swap or stack.

| # | Variant (id) | Archetype | What it is | What's new vs baseline | Effort / Efficiency |
|---|---|---|---|---|---|
| **V6** | Master–detail — `v7-lab-master-detail` | **④ Best for the 1→N relation** | **Two-pane**: left = samples list (code · name · date · **status** · # reports); right = the selected sample's header + its **lab reports** (each expandable to a results table) + **Add lab report** inline (**select-or-create laboratory**). Reuses `LabReportsTable` / `LabReportForm`. | The whole sample→reports→results chain on **one screen**, no page-swap; add a report in context; traceability obvious. | ▇ / ▇ |

**Flow:** `Lab management tab → pick sample (or + Add sample) → right pane lists reports → Add lab report (choose/create lab) → enter results inline`

---

## Existing projects (documented on the deck, not rebuilt)
- **Lab management** V1–V5 (above) — see `variants/*/README.md`.
- **New onboarding flow** — V1 Register flow, V2 Onboarding flow (`flow:` versions, no component override).

## Build & wiring contract (for agents)
- Create files **only** inside your own `variants/<id>/` folder. **Do not** edit `registry.ts`, `projects.ts`, `routes.tsx`, `main/*`, `data/*`, or any other variant — the integrator wires those.
- **Spray plans / Lab:** export `function PlotDetailPage()` from `variants/<id>/PlotDetailPage.tsx` that renders `<BaselinePlotDetailPage … />` (spray → `extraTabs`; lab → `samplingTabLabel` + `SamplingContent`).
- **Draft state:** export `function PlotsPage()` from `variants/<id>/PlotsPage.tsx` (a fork of `main/PlotsPage`, keeping season/crop filters, search, Add plot, empty state).
- Reuse `design-system/` + `lab-shared/`; MUI only; **no new dependencies**; **do not run a build**.
- Add a short `README.md` (hypothesis + what changes) in your folder.
- Return: the exact `registry.ts` import + `VARIANTS` entry, and the `projects.ts` version row, for the integrator.
