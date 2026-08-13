Refine the existing implementation of the treatment assignment flows. The current structure is already correct conceptually, but the layout, typography, and component usage must be cleaned up to properly follow Material UI standards and the design system.

There are two modal types in the system and they must remain clearly separated.

The first modal appears on the Plots page when the user selects one or multiple plots and clicks Add treatment to plots. This modal is used to create a new treatment and assign it to the selected plots.

The second modal appears on the Treatments page when the user assigns existing treatments to plots. This happens either through the bulk options menu or through the row action menu. In this case the treatment already exists and the user only needs to choose which plots the treatment should be assigned to.

Both modals must share layout rules, spacing rules, and Material UI components so the UI remains consistent.

Typography must follow sentence case. Titles must not use title case. For example the modal title must be “Add treatment to plots” instead of “Add Treatment to Plots”. Only the first letter should be capitalized.

The options menu on the plots page currently shows Add treatment to plots separated from the other actions such as Get predictions. This separation is unnecessary and confusing. The action Add treatment to plots should appear in the same menu section as the other actions so that all plot actions are grouped consistently.

The modal layout must be cleaned up so it follows a consistent grid and spacing system. Currently the title, content, and form fields are misaligned. The title is visually further left than the form content and the explanatory text is too far away from the title. The modal content should follow a simple vertical rhythm: title, small description, form fields. All elements should align on the same left grid line with consistent padding.

Use standard Material UI spacing. The modal body should have equal horizontal padding on both sides. The description text should sit directly below the title with a smaller spacing than currently implemented. The layout should feel compact and structured rather than spread out.

On the Add treatment to plots modal the Date field must not be prefilled. The user should explicitly choose the date. Replace the current input with the Material UI Date Picker component so the user can select a date from a calendar.

The Status field should be removed entirely because it is unnecessary in this flow.

The Product selector should remain as it is because the current searchable selector works well. Align the Product field horizontally with the Date field so they appear in the same row of the grid layout.

The Dose and Water Volume inputs must be numeric input fields. These fields must only accept numeric values and should not allow text input. Use numeric input components with the unit label L/ha.

The Plots selector is already implemented well. Keep the current behavior where plots appear as chips below the selector and can be removed individually.

The modal footer must be simplified. The Cancel button should appear directly next to the primary button on the right side. Both buttons should be right aligned. Remove the horizontal divider above the footer because it adds unnecessary visual noise.

Now refine the Assign treatment to plots modal used on the Treatments page.

This modal must dynamically adjust its title based on the number of treatments selected. If one treatment is selected the title must be Assign treatment to plots. If multiple treatments are selected the title must be Assign treatments to plots.

The modal layout should reuse the same cleaned layout used in the creation modal so spacing, typography, and alignment remain consistent.

Currently the treatment summary section is too dominant. The large bold text and heavy visual emphasis make the layout feel unbalanced. This summary should be redesigned so it becomes lighter and more structured.

Instead of showing only a message like “2 treatments selected”, the modal should always show the treatments themselves. If one treatment is selected show a single row of information. If multiple treatments are selected show all treatments in a list.

The best solution is to render a very subtle table showing the selected treatments. This table should be lightweight and visually quiet. It should contain columns for Product, Date, Dose, and Water Volume. The typography should be regular weight and the background should remain neutral so the section does not overpower the modal.

If only one treatment is selected the table will simply contain one row. If multiple treatments are selected the table will list all selected treatments so the user can clearly see what will be assigned.

Below this treatment summary section the user should see the Plots selector, which behaves exactly the same way as in the creation modal.

The footer should again contain the Cancel button and the primary action button aligned to the right. The primary button must read Assign to plots.

Both modal types must strictly use Material UI components. Avoid custom UI solutions where Material UI already provides components. Ensure spacing, alignment, and component usage follow Material UI design conventions so the interface feels consistent and clean.