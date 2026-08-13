Build the Treatments detail page that opens when a user clicks on a plot in the Plots list.

Important: this is an extension of the current prototype, not a disconnected new screen. Reuse the existing app structure wherever possible and start building a small reusable UI system instead of hardcoding one off elements.

The Treatments page should follow the reference layout closely and should be connected to a real mock database.

Scope

When a user clicks a plot in the Plots list, open that plot’s Treatments detail page.

This page must include the same overall structure as in the reference:

top app navbar
breadcrumb or plot context area
plot title with crop in brackets
top level tabs such as Treatments, Prediction, Compare, Sampling
status label on the right
sub tabs for Real and New simulated plan
summary text showing the amount of treatments
actions on the right such as Add treatment, Search, and Options
treatments table below

Do not redesign the flow. Do not invent new product features. Recreate the page structure shown in the screenshot as closely as possible.

Data model

Create or extend the mock database so it supports both plots and treatments.

The database should include at least:

plots
id
plotName
crop
owner
variety
location
season

treatments
id
plotId
date
method
product
productDose
waterVolume
type

The treatments must be connected to the plot through plotId.

The Treatments page must load the correct treatments for the clicked plot.

For now, Prediction, Compare, Sampling, and New simulated plan can be visual tabs without full functionality yet, but the Real tab and Real treatments table must work with actual data.

Behavior

When a user clicks a plot row in the Plots table, route to that plot’s Treatments detail page.

The page should display the selected plot’s name and crop in the header, for example:
Demo LAB (Cherry)

The Treatments table must render only the treatments belonging to that selected plot.

Add seeded treatment records for multiple plots so the detail pages feel real.

Search on the Treatments page can filter the visible treatment rows by product or method.

The Add treatment button can open a modal or drawer shell for now. Saving is optional if not yet implemented, but the entry point should exist.

The Action column can remain a placeholder action trigger for now, but it should be built as a reusable pattern, not as isolated hardcoded text.

Reuse and system thinking

Do not hardcode isolated page pieces separately if they repeat patterns already used on the Plots page.

Reuse shared UI wherever possible, for example:

app navbar
page shell
header actions layout
search input pattern
button styles
tabs pattern
table wrapper
table header styling
row selection pattern
options trigger

Start creating a reusable structure so the prototype evolves into a small system instead of a collection of disconnected hardcoded screens.

This means:

extract shared layout components where appropriate
reuse existing navigation and page scaffolding
reuse existing table and action bar patterns
reuse design tokens or common spacing and typography rules if already established
keep components modular and data driven

Important constraints

Do not rebuild the whole product from scratch again.
Do not change the existing Plots page concept.
Do not invent dashboard features.
Do not add unrelated functionality.
Do not make this a hardcoded static detail screen.
It must be connected to the selected plot and to a real mock database.

Expected result

After this update, the prototype should support this flow:

open the Plots list
click a plot row
navigate to the Treatments detail page for that plot
see plot specific treatment data loaded from the database
see a page structure close to the provided screenshot
see reused shared UI patterns instead of disconnected one off components

Implementation mindset

Treat this as the next connected page in the same product.
Build it in a reusable and data driven way.
Prioritize structure, reuse, and database connection over quick hardcoded imitation.