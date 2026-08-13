Build the data logic for a Plots page.

Set up a real existing mock database that stores plots and drives the table content. Do not focus on design or visual styling. This prompt is only about data structure, working filters, and front end behavior.

Requirements

Create a plot database with these fields for each plot:

id
plotName
owner
variety
location
lastRealTreatment
crop
season

Important rules

The database must actually exist as a real data source used by the page.
Do not hardcode table rows directly inside the UI.
The UI must read all rows from the database.
lastRealTreatment can be fake placeholder data for now.
location can be any realistic place name.
crop and season must be stored on each plot record.

Seed the database with enough realistic records so the page feels real, around 20 to 30 plots.

The database must support these visible table fields:

plot name
owner
variety
location
last real treatment

It must also support these filter fields:

season
crop

Filtering behavior

The season dropdown must list available seasons from the database values.
The crop dropdown must list available crops from the database values.
Do not define dropdown options separately by hand.
They must come from the existing plot data.

Filtering must already work:

If only season is selected, show only plots from that season.
If only crop is selected, show only plots from that crop.
If both are selected, combine both filters.
If no filter is selected, show all plots.
If a default value is needed, use the current selected values from the page state.

Search behavior

Add working search for plot name.
Search should filter the visible rows by plotName.
Simple contains matching is enough.

Table behavior

Render the table rows from the filtered dataset.
The table must update immediately when:

season changes
crop changes
search input changes

Data examples

Use realistic sample data such as:

plot names
cherry 123
Cherry orchard demo UK
Demo LAB
Mon Cherry
Nik Ciliegia
Plot id 3
sweetheart
Test apple 1
test_cherry_deployment
test_plot

owners
aparna.sujitmore.ext@bayer.com

demo@resiyou.com

pablo.orensanz@bayer.com

barbara.witkowska@bayer.com

agusti.soler@bayer.com

varieties
Ambrunes
Stella
Arcina
Schattenmorelle
Kordia
Sweetheart
Duroni

locations
Wuppertal
Loughborough
Bonn
Karlsruhe
Terni
Rio de Janeiro
Aielo del Friuli
El Robledo

crops
Cherry
Apple
Pear
Grape

seasons
Default Season
2024
2025
Spring 2025
Summer 2025

Technical expectations

Use one central dataset as the source of truth.
The page should derive dropdown values from that dataset.
The page should derive filtered table rows from that dataset plus current filter state.
Keep the logic simple and structured.
Mock backend or local seeded database is fine, as long as it is real data backing the page.

Output

Deliver:

a real seeded plot database
working season filter
working crop filter
working plot name search
table rows rendered from database data
combined filtering logic across season, crop, and search

If you want, I can now turn this into a stricter implementation prompt for Bolt, Lovable, or Cursor with exact schema and pseudo logic.