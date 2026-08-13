# ResiYou — product context

> The "why" behind everything in this prototype. Read this first; design proposals must serve these goals.

## What ResiYou is
**ResiYou** (by **Bayer**) is an **AI-driven, cloud-based platform for crop-protection residue management** in fruit & vegetables. It predicts, in real time, how pesticide ("crop protection product") residues dissipate on a crop **until harvest**, so growers can spray effectively **and** stay within residue limits.

## The core tension it solves
A grower must **protect the crop** (spray against pests/disease) yet keep residues under two ceilings:
- **Legal MRLs** — Maximum Residue Limits set by regulators (EU/government).
- **Secondary / retailer standards** — supermarkets' own limits, often **stricter** than legal.

Over-spray → produce rejected as non-compliant. Under-spray → crop loss. ResiYou predicts the residue outcome of a spray program so the grower can hit the target window.

## Three pillars (the real product's value proposition)
1. **Predict** — residues at harvest, in real time, from weather + location + crop + treatments.
2. **Optimize** — **simulate & compare** different spray programs to choose the strategy that best fits the desired residue profile.
3. **Comply** — check predictions against **legal MRLs** and **food-chain/retailer (secondary) standards**; a **calendar view** shows which plots meet a given supermarket's requirements on a given date.

## Users
- **Primary:** the **crop-protection decision maker** — a **grower / agronomist** who holds the spray data.
- **Wider food chain:** producers & processors (scheduling), retailers & traders (compliance verification).

## Business model (matters for UX)
Sold as **prediction / forecast credits**, in annual tiers:
- ResiYou **Easy** — 10 forecasts · **Professional** — 30 · **Platinum** — 100.
One forecast consumes one credit. → This is the reality behind the **"Get forecast" action**, the **"Uses 1 forecast credit"** tooltip, and the **no-credits modal**.

## Data & method (so claims in the UI are grounded)
Gradient-boosted-tree models trained on **field-trial residue data since the 1970s**, plus commercial-grower data, official regulatory residue reports, pesticide chemical properties, and historical weather. Predictions carry **uncertainty**. Active ingredients have a **status**: supported / experimental / unsupported.
Currently covers **strawberries, pome fruits, stone fruits** (expanding).

## Domain glossary (use this vocabulary)
- **Plot** — a field/parcel: crop, variety, location, season.
- **Treatment / application** — one spray event: date · method · product · dose · water volume. The model's main input.
- **Active substance / analyte** — the chemical measured as residue (e.g. deltamethrin, glyphosate).
- **Residue** — chemical remaining on/in produce at harvest, in **mg/kg (ppm)**.
- **MRL** — Maximum Residue Limit (legal ceiling). **% MRL** — how close the prediction is to it.
- **ARfD** — Acute Reference Dose (acute toxicological threshold); shown as **% ARfD**.
- **Secondary standard / retailer limit** — a supermarket's own (usually stricter) limit.
- **Residue forecast / prediction** — model output: predicted residue per substance at harvest vs % MRL / % ARfD.
- **Simulated plan** — a hypothetical spray program compared against the real one (the Optimize pillar).
- **Sample / sample report** — a physical sample taken from a plot (name · type · date) sent to a lab.
- **Lab report** — results back from a lab for a sample: laboratory · report ID · analytes & residue levels · attachments.
- **Sample sheet** — printable sheet (with a **sample code**) sent with the physical sample so returning results match back.
- **Commodity / sample type** — Fruit · Soil · Irrigation water · Leaf.
- **Residue level** — Residue · Trace · Below LOQ · Not analyzed. **LOQ / LOD** — limit of quantification / detection.
- **Forecast credit** — consumable unit; one forecast = one credit.

## Sources
- [ResiYou by Bayer](https://www.resiyou.com/) · [ResiYou Professional (Bayer AgroCloud)](https://agrocloud.bayer.com/gr/en/resiyou-professional.html)
- [Use case: AI-driven residue management (Supper & Supper)](https://supperundsupper.com/en/usecases/optimizing-crop-protection-with-ai-driven-residue-management-the-resiyou-platform)
- [European Fruit Magazine — ResiYou](https://fruitmagazine.eu/2025/02/24/resiyou-the-ai-based-digital-tool-for-residue-management/) · [Fruitnet](https://www.fruitnet.com/eurofruit/bayer-presents-resiyou-platform-to-aragonese-growers/265211.article)
