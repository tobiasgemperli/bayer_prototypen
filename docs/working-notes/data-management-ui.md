Recreate the UI of a web based data management interface similar to the provided screenshot. The goal is to visually replicate the layout and structure one to one, while slightly modernizing the visual style. Components may come from any modern design system such as Material, Radix, ShadCN, or similar, as long as the functionality and placement remain identical. The UI does not need to be functional. It is only a visual prototype.

General layout

Create a full width desktop application layout with three main zones:

Top application header

Filter and actions bar

Data table area

Use a clean enterprise SaaS style similar to modern admin tools. Slightly modernize spacing, typography, and component styling while keeping the same structure.

Color style

Use colors inspired by the screenshot but modernized.

Primary blue
Approximate reference: #3B86C6

Background
Very light grey: #F6F7F9

Table header blue
Slightly darker than primary

Text
Primary: #2E2E2E
Secondary: #6B7280

Borders
Light grey: #E5E7EB

Hover states should use subtle light blue or grey backgrounds.

Typography

Use a neutral UI font such as Inter, Roboto, or system UI.

Heading size for page title
18 to 20px medium

Table text
13 to 14px

Secondary labels
12px

Structure

Top header

A horizontal top bar spanning the full width.

Left side
ResiYou logo
Logo consists of a simple circular checkmark icon plus the text ResiYou

Right side
Notification bell icon
Help icon
User avatar circle with the letter “a”
Username label: anita baranyi
Small dropdown arrow next to the name

Background of the header should be white with a subtle bottom border.

Page title section

Below the header, align the content to the left with comfortable horizontal padding.

Page title
Plots

Use medium weight typography.

Filter and action bar

Directly below the title place a horizontal filter bar.

Left side filters

Season dropdown
Label inside the control: Default Season

Crop dropdown
Label inside the control: Cherry

These controls can use any modern dropdown component but should visually feel similar to enterprise SaaS controls.

Right side actions

Add Plot button
Small primary button with a plus icon

Search field
Rectangular search input with placeholder text: Search

Options button
Text button with label: Options and a vertical three dot icon

Spacing between controls should be consistent.

Data table

Below the filters create a large full width data table.

Table container

White background
Subtle border
Rounded corners optional

Table header

Background in blue tone similar to the screenshot.

Columns

Checkbox column

Plots

Owner

Variety

Location

Last real treatment

Use small sort indicators on some columns.

First column

Checkbox selection for rows.

Plots column

Each row contains a plot name such as:

cherry 123
Cherry orchard demo UK
Demo LAB
EF_Aceq_AB98490_RU010E_1050

Some rows include a small cloud icon indicating cloud synced data.

Owner column

Email addresses such as:

aparna.sujitmore.ext@bayer.com

demo@resiyou.com

pablo.orensanz@bayer.com

Variety column

Examples:

Ambrunes
Stella
Arcina
Schattenmorelle

Location column

Examples:

Wuppertal
Loughborough
Bonn
Karlsruhe

Last real treatment column

Dates formatted like:

11/11/2025
12/06/2025
26/05/2025

Some rows should show text:

No real treatments available

Row styling

Alternate row backgrounds using very subtle grey.

Hover state
Light blue or light grey highlight.

Checkbox selection state
Row background slightly tinted.

Icons

Use a consistent icon set such as Material Icons or Lucide.

Icons needed

Cloud icon
Plus icon
Bell icon
Help icon
Three dot menu icon
Dropdown arrow

Spacing and density

The table should feel information dense but still readable.

Row height around 36 to 40px.

Columns should auto expand to fill width.

Visual improvements

While keeping the structure identical, improve:

Slightly more breathing space in filters
Cleaner dropdown styling
More modern table header typography
Better hover states
Subtle shadows or borders for containers

Important constraint

Do not change the layout or information architecture.
Filters stay on top.
Actions stay on the right.
Table columns remain in the same order.
Only the visual style and component library may differ.

Output

Create a desktop frame representing the full screen interface and build all elements as reusable Figma components where possible.