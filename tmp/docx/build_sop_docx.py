from pathlib import Path
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor

ROOT = Path('/Users/mandinu/Downloads/project')
IMG = ROOT / 'images'
OUT = ROOT / 'output/docx/Thermal_Insulation_SOP.docx'

NAVY = '12304A'
BLUE = '147EA8'
LIGHT = 'EAF6FA'
LINE = 'D9D9D9'
RED = RGBColor(163, 33, 33)
GREEN = RGBColor(23, 122, 91)

doc = Document()
sec = doc.sections[0]
sec.page_width = Cm(21.0)
sec.page_height = Cm(29.7)
sec.top_margin = Cm(1.8)
sec.bottom_margin = Cm(1.8)
sec.left_margin = Cm(1.8)
sec.right_margin = Cm(1.8)

styles = doc.styles
styles['Normal'].font.name = 'STIX Two Text'
styles['Normal'].font.size = Pt(10.5)
styles['Normal'].paragraph_format.space_after = Pt(5)
styles['Normal']._element.rPr.rFonts.set(qn('w:ascii'), 'STIX Two Text')
styles['Normal']._element.rPr.rFonts.set(qn('w:hAnsi'), 'STIX Two Text')
for name, size in [('Title', 28), ('Subtitle', 15), ('Heading 1', 17), ('Heading 2', 13)]:
    s = styles[name]
    s.font.name = 'STIX Two Text'
    s.font.size = Pt(size)
    s.font.color.rgb = RGBColor(0, 0, 0)
    s.font.bold = name != 'Subtitle'
    s._element.rPr.rFonts.set(qn('w:ascii'), 'STIX Two Text')
    s._element.rPr.rFonts.set(qn('w:hAnsi'), 'STIX Two Text')
    s.paragraph_format.space_before = Pt(12)
    s.paragraph_format.space_after = Pt(6)
    if name.startswith('Heading'):
        s.paragraph_format.keep_with_next = True

# Remove the built-in title border so the title is separated by whitespace only.
title_ppr = styles['Title']._element.get_or_add_pPr()
title_border = title_ppr.find(qn('w:pBdr'))
if title_border is not None:
    title_ppr.remove(title_border)

def shade(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = tcPr.find(qn('w:shd'))
    if shd is None:
        shd = OxmlElement('w:shd')
        tcPr.append(shd)
    shd.set(qn('w:fill'), fill)

def borders(table, color=LINE):
    tblPr = table._tbl.tblPr
    el = tblPr.find(qn('w:tblBorders'))
    if el is None:
        el = OxmlElement('w:tblBorders')
        tblPr.append(el)
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        tag = OxmlElement(f'w:{edge}')
        tag.set(qn('w:val'), 'single')
        tag.set(qn('w:sz'), '5')
        tag.set(qn('w:space'), '0')
        tag.set(qn('w:color'), color)
        el.append(tag)

def set_cell_margin(cell, top=85, start=95, bottom=85, end=95):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcMar = tcPr.first_child_found_in('w:tcMar')
    if tcMar is None:
        tcMar = OxmlElement('w:tcMar')
        tcPr.append(tcMar)
    for m, v in [('top', top), ('start', start), ('bottom', bottom), ('end', end)]:
        node = tcMar.find(qn(f'w:{m}'))
        if node is None:
            node = OxmlElement(f'w:{m}')
            tcMar.append(node)
        node.set(qn('w:w'), str(v))
        node.set(qn('w:type'), 'dxa')

def keep_row_together(row):
    tr_pr = row._tr.get_or_add_trPr()
    if tr_pr.find(qn('w:cantSplit')) is None:
        tr_pr.append(OxmlElement('w:cantSplit'))

def repeat_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    if tr_pr.find(qn('w:tblHeader')) is None:
        header = OxmlElement('w:tblHeader')
        header.set(qn('w:val'), 'true')
        tr_pr.append(header)

def keep_table_with_next(table):
    for cell in table.rows[-1].cells:
        if cell.paragraphs:
            cell.paragraphs[-1].paragraph_format.keep_with_next = True

def style_table(table, widths=None):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    borders(table)
    repeat_header(table.rows[0])
    for j, cell in enumerate(table.rows[0].cells):
        shade(cell, NAVY)
        for r in cell.paragraphs[0].runs:
            r.font.bold = True
            r.font.color.rgb = RGBColor(255,255,255)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    for i, row in enumerate(table.rows[1:], 1):
        if i % 2 == 0:
            for cell in row.cells:
                shade(cell, 'F4F8FA')
    for row in table.rows:
        keep_row_together(row)
        for j, cell in enumerate(row.cells):
            set_cell_margin(cell)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            if widths:
                cell.width = Cm(widths[j])
            for p in cell.paragraphs:
                p.paragraph_format.space_after = Pt(1)
                p.paragraph_format.line_spacing = 1.05
                for r in p.runs:
                    r.font.size = Pt(9.1)

def add_table(headers, rows, widths=None):
    t = doc.add_table(rows=1, cols=len(headers))
    for i, h in enumerate(headers):
        t.rows[0].cells[i].text = h
    for row in rows:
        cells = t.add_row().cells
        for i, val in enumerate(row):
            cells[i].text = str(val)
    style_table(t, widths)
    doc.add_paragraph()
    return t

def caption(text):
    p = doc.add_paragraph(style='Caption')
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run(text).italic = True
    p.paragraph_format.keep_with_next = False

def add_picture(path, width=None, height=None, cap=None):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.keep_with_next = bool(cap)
    r = p.add_run()
    r.add_picture(str(path), width=width, height=height)
    if cap:
        caption(cap)

def lead(label, text, color=RED):
    p = doc.add_paragraph()
    r = p.add_run(label + ' - ')
    r.bold = True
    r.font.color.rgb = color
    p.add_run(text)
    return p

def bullet(text):
    doc.add_paragraph(text, style='List Bullet')

def number(text, index):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(0.7)
    p.paragraph_format.first_line_indent = Cm(-0.7)
    p.add_run(f'{index}.  {text}')

# Cover
p = doc.add_paragraph('SPHERE')
p.alignment = WD_ALIGN_PARAGRAPH.LEFT
p.runs[0].font.color.rgb = RGBColor(20,126,168)
p.runs[0].font.size = Pt(14)
title = doc.add_paragraph('Spacesuit Thermal Shielding Kit', style='Title')
title.alignment = WD_ALIGN_PARAGRAPH.LEFT
sub = doc.add_paragraph('Standard Operating Procedure', style='Subtitle')
sub.alignment = WD_ALIGN_PARAGRAPH.LEFT
doc.add_paragraph('Comparative Heat Transfer and Insulation Performance Laboratory')
add_picture(IMG/'astronaut.png', width=Cm(5.0))
meta = add_table(['Document control', 'Value'], [
    ('Document owner', 'Timon Karl-Heinz Schwarz'),
    ('Project team', 'Piyath Vithanage, Elio Krollpfeiffer, Dilan Fernando, Nuhansee Migelhewage'),
    ('Issue date', '9 September 2026'),
    ('Planned duration', '30 minutes per group'),
], [4.5, 11.5])
doc.add_paragraph('Purpose. This procedure enables four student teams to compare the transient cooling of identical, sealed 100 mL glass-jar capsules protected by bare, bubble-wrap, Mylar, and multilayer test configurations. It aligns the physical experiment with the current SPHERE student manual, teacher manual, task sheet, flashcards, and Mission Control model.')
lead('SAFETY', 'Only the instructor or another designated adult may prepare and dispense hot water. The maximum initial water temperature is 80.0 °C. Never use boiling water. Eye protection and heat-resistant gloves are required.')
doc.add_page_break()

doc.add_heading('1 Scope and learning outcomes', level=1)
doc.add_paragraph('This is an educational analog for comparing heat-transfer mechanisms and effective insulation performance. The glass jars, cotton, bubble wrap, and reflective film are not flight-qualified hardware, and an ice-water bath does not reproduce a space vacuum. The experiment instead provides a repeatable cold boundary for model comparison.')
doc.add_paragraph("After the activity, students should be able to distinguish conduction, convection, and radiation; apply Newton's law of cooling; record a controlled temperature time series; calculate residuals and mean absolute error (MAE); and explain how leakage, probe placement, layer compression, and boundary drift affect repeatability.")

doc.add_heading('2 Roles and stop work authority', level=1)
add_table(['Role', 'Responsibility'], [
    ('Instructor', 'Complete the local risk assessment; supervise hot-water handling; verify jar condition, probe-lid seals, ice-bath temperature, and safe separation of water from electronics.'),
    ('Student teams', 'Assemble the assigned insulation configuration, record measurements exactly on schedule, report anomalies immediately, and keep the work area dry.'),
    ('Timekeeper and data lead', 'Start the timer at immersion, announce 60-second intervals, enter values in Mission Control and the task sheet, and document late or missed readings.'),
    ('All participants', 'Stop the test if a jar cracks or leaks, insulation becomes saturated, a probe moves, water reaches electronics, or any person is at risk.'),
], [4.2, 11.8])

doc.add_heading('3 Equipment and materials', level=1)
add_picture(IMG/'equipments.png', height=Cm(12.7), cap='Figure 1. Current SPHERE toolkit.')
add_table(['Qty.', 'Item', 'Requirement'], [
    ('4', '100 mL wide-mouth glass jars with prepared probe lids', 'Heat-safe, undamaged, identical geometry. The lid opening supports the probe and approved classroom sealing method.'),
    ('4', 'Waterproof digital probe thermometers', 'Stainless-steel probes; document instrument accuracy. Manuals use ±0.5 °C as the reference.'),
    ('4', 'Ice-water bath containers', 'Stable and deep enough for the external water line to remain above the internal capsule water level.'),
    ('1 set', 'Cotton, bubble wrap, reflective Mylar, tape or bands', 'Dry and applied consistently without crushing trapped-air layers.'),
    ('1', 'Supervised hot-water source and measuring vessel', 'Instructor use only; prepare no hotter than 80.0 °C.'),
    ('1+', 'Bath thermometer', 'Independent measurement of the actual boundary temperature Tenv.'),
    ('-', 'PPE, towels, timer, worksheets', 'Required before the hot-water phase. Keep electronics at a separate dry station.'),
], [1.3, 5.0, 9.7])
add_picture(IMG/'hardware-schematic.png', width=Cm(16.5), cap='Figure 2. Glass-jar arrangement and centered probe placement.')

doc.add_heading('4 Safety controls', level=1)
lead('SAFETY', 'Hot water can cause scalding. Do not exceed 80.0 °C, do not use boiling water, and do not allow unsupervised hot-water handling.')
for text in [
    'Inspect every glass jar and lid. Reject chipped, cracked, scratched, or poorly fitting components.',
    'Perform the seal check with cold water before hot filling. Use only the approved classroom lid-sealing method; do not improvise a pressure seal.',
    'The capsule is closed to resist leakage but is not a pressure vessel. Do not overfill, pressurize, or aim it toward a person.',
    'Wear eye protection and use heat-resistant gloves or suitable tongs for filling, closing, transferring, immersing, and removing a warm capsule.',
    'Keep the bath below waist height on a stable surface. Wipe spills immediately; keep displays, cables, computers, and power supplies dry.',
    'Only the intended waterproof metal probe may contact water. The display, connector, and lead junction remain dry.',
    'For hot-room operation, use 55-60 °C initial water or a room-temperature bath and enter the actual T0 and Tenv in Mission Control.',
]: bullet(text)

doc.add_heading('5 Pre flight preparation', level=1)
add_picture(IMG/'preflight-thermal-lab.png', width=Cm(16.5), cap='Figure 3. Project-specific pre-flight arrangement with four glass-jar configurations, ice-water baths, matching probe thermometers, PPE, and a separate dry data station.')
for idx, text in enumerate([
    'Confirm the risk assessment, PPE, dry electronics station, towels, and emergency response arrangements.',
    'Fill each jar with cold water, fit the probe through its prepared lid, secure the opening using the approved classroom method, close the lid, and invert briefly over a sink or secondary container. Reject or reseal leaks.',
    'Set the probe at the vertical center of the 100 mL water volume. Mark or clamp the lead so depth cannot change.',
    'Prepare a well-mixed ice-water slurry. Measure and record the actual bath temperature; do not assume exactly 0.0 °C.',
    'Assign configurations A-D. Use identical water mass, jar geometry, probe depth, bath depth, timing, and handling.',
], 1): number(text, idx)
lead('CONTROL', 'A fair comparison requires the same starting-temperature tolerance, water volume, probe position, immersion depth, bath condition, and 60-second interval.', GREEN)

doc.add_heading('6 Insulation configurations', level=1)
doc.add_paragraph('The constants below are educational reference-model values, not certified material properties or guaranteed results. The symbol k is an effective system cooling constant, not thermal conductivity.')
add_table(['Configuration', 'k (min⁻¹)', 'Construction', 'Model T(15)'], [
    ('A Bare', '0.150', 'Uninsulated glass jar.', '8.4 °C'),
    ('B Bubble wrap', '0.040', 'Two even layers with intact cells; do not compress.', '43.9 °C'),
    ('C Mylar', '0.121', 'One reflective layer, shiny side outward; avoid tears and direct water paths.', '13.0 °C'),
    ('D Multilayer', '0.015', 'Inner cotton, middle bubble wrap, outer Mylar; secure independently.', '63.9 °C'),
], [3.4, 2.2, 7.0, 2.4])
doc.add_paragraph('Model temperatures use T0 = 80.0 °C and Tenv = 0.0 °C. Cotton-only is an optional fifth trial.')
pic_table = doc.add_table(rows=1, cols=4)
keep_row_together(pic_table.rows[0])
for i, (name, file) in enumerate([('A Bare glass','barecapsule.jpeg'),('B Bubble wrap','bubblewrap-only.png'),('C Mylar','Onlymylar.jpg'),('D Multilayer','full-mli.png')]):
    c = pic_table.cell(0,i)
    c.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
    c.paragraphs[0].add_run().add_picture(str(IMG/file), height=Cm(3.8))
    p2 = c.add_paragraph(name); p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
keep_table_with_next(pic_table)
caption('Figure 4. Standard four-configuration comparison assemblies.')

doc.add_heading('6.1 Multilayer assembly sequence', level=2)
for idx, text in enumerate([
    'Wrap the dry glass jar uniformly with cotton. Avoid thick folds and leave the lid functional.',
    'Add bubble wrap with consistent overlap and intact cells. Do not crush the bubbles.',
    'Add Mylar as the outer layer, shiny side outward. Limit water circulation into layers while keeping the display and lead junction dry.',
    'Confirm the probe has not shifted and record layer order and approximate coverage.',
], 1): number(text, idx)
pic_table = doc.add_table(rows=1, cols=2)
keep_row_together(pic_table.rows[0])
for i, (name, file) in enumerate([('Layer order','full-mli-parts.png'),('Completed assembly','full-mli.png')]):
    c = pic_table.cell(0,i)
    c.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
    c.paragraphs[0].add_run().add_picture(str(IMG/file), height=Cm(6.0))
    p2 = c.add_paragraph(name); p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
keep_table_with_next(pic_table)
caption('Figure 5. Educational multilayer assembly; not flight-qualified MLI.')

doc.add_heading('7 Experimental procedure', level=1)
procedure_intro = doc.add_paragraph('Four teams should run in parallel. If one jar is reused, return it and the bath to the same measured initial conditions before each run.')
procedure_intro.paragraph_format.keep_with_next = True
add_table(['Step', 'Action', 'Method and acceptance point'], [
    ('1', 'Configure Mission Control', 'Select the assigned model, enter measured T0 and Tenv, and run the prediction before collection.'),
    ('2', 'Prepare the bath', 'Maintain a mixed ice-water slurry; record Tenv immediately before immersion and at the end.'),
    ('3', 'Prepare the capsule', 'Instructor adds exactly 100 mL at no more than 80.0 °C and closes the prepared probe lid using the approved method.'),
    ('4', 'Verify start', 'Confirm the internal reading is stable and within the agreed tolerance. Reposition only before the run.'),
    ('5', 'Immerse and record T0', 'Use gloves or tongs. External bath level must exceed the internal water level. Start timing at immersion; keep display and lead junction dry.'),
    ('6', 'Log 15 minutes', 'Record internal temperature at t = 1, 2, ..., 15 min. Do not move or squeeze the sample. Document late or missed readings.'),
    ('7', 'Monitor controls', 'Watch seal, bath level and temperature, probe position, and wetting. Stop for leakage, glass damage, unstable supports, or electrical exposure.'),
    ('8', 'End the run', 'At 15 minutes record capsule and bath temperatures; remove using gloves or tongs into secondary containment.'),
    ('9', 'Check data', 'Confirm 16 observations from 0 through 15 minutes. Retain the Mission Control export and paper task sheet.'),
    ('10', 'Cool and clean', 'Cool before unwrapping. Empty at a sink and dry jars, probes, insulation, bath, and work surface.'),
], [1.2, 4.0, 10.0])
pic_table = doc.add_table(rows=1, cols=2)
keep_row_together(pic_table.rows[0])
for i, (name, file) in enumerate([('Measure actual bath boundary','bathwater-0temp.jpg'),('Immerse to internal water line','capsuleinside.jpg')]):
    c = pic_table.cell(0,i)
    c.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
    c.paragraphs[0].add_run().add_picture(str(IMG/file), height=Cm(6.2))
    p2 = c.add_paragraph(name); p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
keep_table_with_next(pic_table)
caption('Figure 6. Boundary verification and capsule immersion.')
add_picture(IMG/'setup.jpg', width=Cm(15.3), cap='Figure 7. Keep the dry data station separate from the bath.')

doc.add_heading('8 Data reduction and model comparison', level=1)
data_intro = doc.add_paragraph('Use the actual measured bath temperature as Tenv. The governing equations are:')
data_intro.paragraph_format.keep_with_next = True
add_picture(ROOT/'tmp/docx/equations.png', width=Cm(12.5), cap='Equation set 1. Newtonian cooling, residual, MAE, and estimated effective cooling constant.')
doc.add_paragraph('Use n = 16 when all readings from t = 0 through 15 minutes are included. State a different n if a reading is invalid or missing. Report k in min⁻¹ and MAE in °C. Compare MAE with instrument accuracy and repeated-run variation; do not convert MAE into an invented percentage score.')
pic_table = doc.add_table(rows=1, cols=2)
keep_row_together(pic_table.rows[0])
for i, (name, file) in enumerate([('Mission Control setup','website-setting up.PNG'),('Saved reference prediction','predicted-curve.png')]):
    c = pic_table.cell(0,i)
    c.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
    c.paragraphs[0].add_run().add_picture(str(IMG/file), width=Cm(7.7))
    p2 = c.add_paragraph(name); p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
keep_table_with_next(pic_table)
caption('Figure 8. Configure and preserve the prediction before measurement.')
add_picture(IMG/'input temp.jpg', height=Cm(12.8), cap='Figure 9. Manual temperature entry at the actual timestamp.')

doc.add_heading('9 Quality controls and troubleshooting', level=1)
add_table(['Observation', 'Likely cause', 'Response'], [
    ('Sudden fall', 'Leakage, probe touching glass, sample moved, severe mixing.', 'Stop if leakage is suspected; mark invalid, inspect after cooling, and repeat safely.'),
    ('Starts differ', 'Filling or transfer delay, inconsistent water source.', 'Repeat within tolerance or compare fitted k and normalized temperature excess.'),
    ('Bath warms', 'Too little ice, poor mixing, high room temperature.', 'Measure actual temperature, update Tenv, and document drift.'),
    ('Mylar is weak', 'Direct liquid contact, tears, water entry, no spacer.', 'Treat as immersed system behavior, not universal material failure.'),
    ('MLI varies', 'Different thickness, crushed cells, open top, overlap.', 'Photograph construction; rebuild to the standard sequence.'),
    ('High MAE', 'Wrong model input, timing, probe shift, leakage, uncalibrated k.', 'Check inputs and timestamps, then discuss uncertainty and model limits.'),
], [3.4, 5.4, 6.4])

doc.add_heading('10 Acceptance checklist', level=1)
checklist_items = [
    'Four undamaged 100 mL glass jars with prepared probe lids were used.',
    'Every lid passed a cold-water leak test before hot filling.',
    'Initial water temperature did not exceed 80.0 °C and actual T0 was recorded.',
    'Actual ice-bath temperature was measured and entered as Tenv.',
    'Probe depth, water volume, immersion depth, timing, and layer coverage were controlled.',
    'Every valid trial contains 16 time-temperature pairs from 0 through 15 minutes.',
    'Graphs include units, labels, a legend, observed data, and model data.',
    'Residuals and MAE use the stated number of valid observations.',
    'Conclusions distinguish system behavior, build quality, uncertainty, and assumptions.',
    'All equipment and surfaces were cooled, emptied, dried, and stored safely.',
]
for idx, text in enumerate(checklist_items):
    item = doc.add_paragraph('☐  ' + text)
    item.paragraph_format.keep_with_next = idx < len(checklist_items) - 1

doc.add_heading('11 Document synchronization record', level=1)
sync_intro = doc.add_paragraph('This document uses the same experiment definition as the current project materials: 100 mL glass jars with prepared probe lids; measured ice-water boundary; four standard configurations; a 15-minute run with observations from t = 0 through 15 minutes; Newtonian cooling; residuals and MAE; and the Mission Control reference constants.')
sync_intro.paragraph_format.keep_with_next = True
add_table(['Aligned source', 'Controlled content'], [
    ('Student Manual', 'Hardware, configurations, layer sequence, stages, equations, and MAE.'),
    ('Teacher Manual', 'Safety limits, risk controls, lesson flow, constants, and instructor criteria.'),
    ('Student Task Sheet', 'Sixteen-point log, graph, residual and MAE fields, and ten inquiries.'),
    ('Flashcards', 'Heat-transfer, effective k, boundary condition, and multilayer terminology.'),
    ('Mission Control web app', 'Configuration names, constants, timer, manual entry, and MAE output.'),
], [5.6, 10.4])
doc.add_paragraph('Limit of use. This activity demonstrates comparative thermal behavior under classroom conditions. It does not certify any material or assembly for aerospace, pressure-vessel, fire-protection, or personal-protective use.')

# No running header or footer.
for section in doc.sections:
    header = section.header
    p = header.paragraphs[0]
    p.text = ''
    footer = section.footer
    fp = footer.paragraphs[0]
    fp.text = ''

doc.core_properties.title = 'Spacesuit Thermal Shielding Kit'
doc.core_properties.subject = 'SPHERE glass jar ice-water immersion laboratory SOP'
doc.core_properties.author = 'Timon Karl-Heinz Schwarz and SPHERE project team'
doc.save(OUT)
print(OUT)
