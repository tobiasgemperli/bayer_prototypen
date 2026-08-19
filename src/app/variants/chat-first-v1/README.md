# chat-first-v1 — Fullscreen Chat / UI

**Hypothesis:** For an AI-heavy workflow, making the assistant a *peer mode* to
the UI — not an overlay on top of it — reads as "the chat is the app." A top
segmented control flips fullscreen between **Chat** and **UI**.

**What changes**
- A segmented **Chat / UI** control in the header (only when this prototype is active).
- **UI mode** = today's baseline app, with AI affordances hidden (no assistant
  FAB, no "Import with AI" button). AI lives exclusively in Chat mode.
- **Chat mode** = a fullscreen conversation where results render as **inline
  blocks**: "show me all treatments" → a treatments table *inside the chat*;
  "show me all plots" → a plots table. Add-treatment (typed / CSV / screenshot)
  renders the same approval card inline; accepting writes to the plot and shows
  the updated table.

**How it's wired**
- Not a page-slot registry variant — it's a global experience selected via the
  demo prototype switcher (`data/prototypes.ts`, section "Fullscreen").
- Reuses the baseline assistant core (`callLLM`, `parseResponse`,
  `enrichCommand`, `PendingCard`, the canned samples) exported from
  `main/ChatAssistant.tsx`, plus the real data stores.
- Read-only "show me" navigate commands are translated into inline table blocks
  instead of route changes; forecast/samples offer an "Open in UI mode" jump.

**Scope (v1):** show + edit; hybrid routing (canned sample chips + live LLM for
free-form). Forecast/samples render as an "open in UI" hand-off rather than a
full inline view.
