# Research log

Captured research that informs `product.md` and `working-with-claude.md`. Re-verify before quoting as fact (the web changes; AI summaries can drift).

## A. ResiYou product (commercial)
- Bayer's **AI-driven residue-management** platform for fruit & veg; predicts residue dissipation to harvest in real time. Note: `resiyou.com/login` is a JS app with no static content — product facts come from the sources below, not the page text.
- **Three functionalities** (Bayer AgroCloud): **Predict** residues at harvest · **Optimize** by simulating & comparing spray programs · **Comply** with legal & food-chain standards. A **calendar view** flags which plots meet supermarket requirements on which dates.
- **Pricing = forecast credits**: Easy 10 / Professional 30 / Platinum 100 per year (Professional ≈ €1,200 ex-VAT).
- **Method**: gradient-boosted trees on field-trial residue data since the 1970s + grower data + regulatory reports + chemical properties + weather; uncertainty quantified. Crops: strawberries, pome & stone fruit. Active-ingredient status: supported / experimental / unsupported.
- **Users**: the crop-protection decision maker (grower/agronomist with spray data); value across producers, processors, retailers.
→ Sources listed in `product.md`.

## B. How experts use AI for UX / interaction design
From a peer-reviewed study on AI-assisted design briefs (Frontiers, 2024) + Figma's "AI for product design":

- **A good brief has three functions**: *assessment* (stakeholder needs), *agreement* (shared contract), *documentation* (living guide). Elements: overview, audience, objectives, scope, constraints, research.
- **Designer role shifts from "executor" to "client"** of the AI — you direct, verify, and decide; AI retrieves, structures, and explores.
- **Effective workflow**: Information retrieval → Verification (multi-perspective critique) → Analysis via explicit frameworks → Communication → Decision-making with **options + pros/cons**.
- **Prompt = a mini-brief**, in sequence: *intent* (what / who / how it should feel) → *structure* → *tone & layout* → *variants with trade-offs* → *implementation details* (component names, spacing/typography tokens for handoff).
- **Human vs AI ownership**: humans set goals, keep empathy/creativity, validate feasibility & ethics, make final calls; AI owns iteration speed, exploration, pattern-finding, scaffolding.
- **Practices**: standardize prompt/brief templates; build verification protocols (AI fabricates — fact-check); use AI for scaffolding not finalization; document the workflow; involve eng + stakeholders early.
- Measured effect in the study: ~**48.6% faster** brief creation, with higher quality ratings — *when* paired with human oversight.

Sources:
- [AI assistance in enterprise UX design workflows (Frontiers in AI, 2024)](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2024.1404647/full) · [PMC mirror](https://pmc.ncbi.nlm.nih.gov/articles/PMC11588748/)
- [How to use AI for product design — Figma](https://www.figma.com/resource-library/ai-for-product-design/)
- [How AI is transforming UX design (UXmatters, 2025)](https://www.uxmatters.com/mt/archives/2025/11/how-ai-is-transforming-ux-design-and-product-experience-planning-in-2025.php)

## How this shaped our way of working
- The **variant system** *is* the "options with trade-offs" practice, made real: every proposal is a comparable, handoff-ready version, not a static mockup.
- `working-with-claude.md` encodes the brief template + the retrieval→verify→options→recommend→build→verify protocol.
- "Validate everything / AI scaffolds, human decides" → I always flag assumptions and what needs your or users' validation.
