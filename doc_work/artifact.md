# Template execution contract

## Reference
- Source: `/Users/mandinu/Downloads/Experimental_Toolkit_Photosynthesis_SOP_final.docx`
- SHA-256: `246a0182720e9bba6e27796a94a4156ea9d159bc13c92e84fc6bb89c9e75e128`
- Render evidence: `/Users/mandinu/Downloads/project/doc_work/reference_render`
- Page count: 5
- Section count: 1

## Page system
- A4 portrait, 8.27 x 11.69 inches.
- Margins: 1.00 inch on all sides.
- One section; different first-page header enabled.
- First-page header contains the TUM logo at left and HSP logo at right.
- Later-page header contains the HSP logo at right.
- Footer contains a right-aligned page-number field.

## Typography and color
- Theme: Office/Aptos; document defaults use the minor theme font at 12 pt.
- Main title uses Heading 1: 20 pt, dark teal `#0F4761`, 18 pt before and 4 pt after.
- Section headings use Heading 2: 16 pt, dark teal `#0F4761`, 14 pt before and 10 pt after.
- Subheadings use Heading 3: 14 pt, dark teal `#0F4761`, 8 pt before and 4 pt after.
- Small labels use Heading 4: italic, dark teal `#0F4761`, 4 pt before and 2 pt after.
- Body text follows Normal: 12 pt theme body font, 11.6 pt automatic line spacing, 8 pt after.
- Tables use Table Grid, 0 pt paragraph-after inside cells, black 0.5 pt borders.

## Components and content flow
- Page 1 begins below the two-logo first-page header.
- Title, GENERAL INFORMATION metadata table, short description, and hardware checklist establish the document.
- PROCEDURE is expressed as a five-column table: Step, Action, Notes, Duration, Check.
- Instructional photographs are inline within the procedure grid in the source.
- HSP logo and page number recur on continuation pages.

## New-document slot map
- Replace the body content while retaining page geometry, styles, theme, first/continuation headers, logos, and footer/page-number field.
- Reuse Heading 1-4, Normal, Caption, List Bullet, List Number, and Table Grid.
- Replace the source photos with the supplied thermal-insulation setup and telemetry images.
- Preserve header/footer parts and their relationships.

## Fidelity gates
- Keep the reference file unchanged and verify its SHA-256 before and after authoring.
- Final A4 page geometry, margins, first-page header behavior, logos, page number, heading palette, and body type must remain source-derived.
- Render every final page and inspect for clipped table text, stranded captions, distorted photographs, large accidental gaps, and broken pagination.
