# Concept overview — how to open

## Quickest way (no server needed)

Double-click `docs/concepts/index.html` in Finder, or open it directly in your browser:

```
file:///Users/lylepeterer/Desktop/CleanUp/_Protos/ResiYou-LabReports-260522/docs/concepts/index.html
```

The file is fully self-contained (inline CSS + vanilla JS, no external dependencies) and works offline via `file://`.

## Opening prototype links inside the page

Variant cards link to `http://localhost:5174/…`. For those links to work, start the prototype in a separate terminal tab first:

```
npm run dev -- --port 5174
```

Then navigate the concept overview as normal — clicking "Open in prototype →" will open the correct variant in a new browser tab.

## What's in the page

- Left sidebar listing all 4 projects (Lab management · Spray plans · Draft state · New onboarding flow)
- Clicking a project shows its panel with project context and every variant card
- Each card: version label, variant name, archetype badge, user-flow diagram, "what's new vs baseline", and a direct prototype link
- Archetype legend and prototype-running note in the sidebar
