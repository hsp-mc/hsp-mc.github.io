from pathlib import Path
import math
from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.shared import Inches, Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path('/Users/mandinu/Downloads/project')
TMP = ROOT / 'tmp/report_build'
OUT = ROOT / 'output/docx/SPHERE_Thermal_Insulation_Project_Report_Updated.docx'
TMP.mkdir(parents=True, exist_ok=True)
OUT.parent.mkdir(parents=True, exist_ok=True)

NAVY = '123047'; BLUE = '176B87'; PALE = 'EAF3F6'; GREY = '5F6B73'; LIGHT = 'D9E1E5'; WHITE = 'FFFFFF'

def clean_image(name, max_px=2200):
    src = ROOT / 'images' / name
    dst = TMP / (src.stem.replace(' ', '_') + '.jpg')
    im = Image.open(src).convert('RGB')
    im.thumbnail((max_px, max_px))
    im.save(dst, 'JPEG', quality=92, optimize=True)
    return dst

imgs = {n: clean_image(n) for n in [
    'preflight-thermal-lab.png','hardware-schematic.png','equipments.png','barecapsule.jpeg',
    'bubblewrap-only.png','Onlymylar.jpg','full-mli.png','full-mli-parts.png','setup.jpg',
    'working.jpg','input temp.jpg','website-setting up.PNG','predicted-curve.png','stage1-theory-safety.png'
]}
KATEX_DIR = TMP/'katex_equations'
eqs = {p.stem:p for p in KATEX_DIR.glob('*.png')}

times = list(range(16))
obs = {
    'Full MLI': [77.6,76.6,76.1,75.6,75.1,74.5,73.9,73.5,72.1,70.6,69.7,68.5,67.4,65.8,64.1,62.7],
    'Bubble wrap': [82.6,79.0,75.2,72.5,70.0,67.9,65.6,64.0,62.3,60.6,58.9,57.5,56.1,54.8,53.7,52.6],
    'Mylar only': [80.5,68.6,61.8,55.8,51.3,47.8,44.9,42.5,40.6,38.9,38.1,36.3,35.5,34.6,33.9,33.3],
    'Bare control': [80.1,73.9,66.0,59.9,54.5,50.1,47.1,44.6,42.5,40.9,39.5,38.2,37.3,36.5,35.8,35.2],
}
colors = {'Full MLI':'#176B87','Bubble wrap':'#3A9D73','Mylar only':'#D8842F','Bare control':'#66727A'}

def make_chart(series, path, ymin, ymax, ylabel, legend_labels=None):
    W,H=1710,900; L,R,T,B=150,55,65,120
    im=Image.new('RGB',(W,H),'white'); d=ImageDraw.Draw(im)
    try:
        font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',28)
        small=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',24)
        bold=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf',25)
    except:
        font=small=bold=ImageFont.load_default()
    def xy(t,v): return (L+(W-L-R)*t/15, T+(H-T-B)*(ymax-v)/(ymax-ymin))
    for v in range(int(math.ceil(ymin/10)*10),int(ymax)+1,10):
        y=xy(0,v)[1]; d.line((L,y,W-R,y),fill='#DDE5E8',width=2); d.text((70,y-14),str(v),font=small,fill='#43515A')
    for t in range(0,16,3):
        x=xy(t,ymin)[0]; d.line((x,T,x,H-B),fill='#EEF2F4',width=2); d.text((x-9,H-B+20),str(t),font=small,fill='#43515A')
    d.line((L,T,L,H-B),fill='#293942',width=3); d.line((L,H-B,W-R,H-B),fill='#293942',width=3)
    for name,vals in series.items():
        pts=[xy(t,v) for t,v in zip(times,vals)]; d.line(pts,fill=colors[name],width=6,joint='curve')
        for x,y in pts: d.ellipse((x-5,y-5,x+5,y+5),fill=colors[name])
    d.text((W//2-85,H-55),'Time (min)',font=font,fill='#24323A')
    d.text((18,20),ylabel,font=font,fill='#24323A')
    x0=185
    for name in series:
        lab=legend_labels[name] if legend_labels else name
        d.line((x0,T-28,x0+45,T-28),fill=colors[name],width=7); d.text((x0+56,T-44),lab,font=bold,fill='#24323A'); x0+=360
    im.save(path,'PNG',optimize=True)

OBS_CHART = TMP/'observed_curves.png'
make_chart(obs, OBS_CHART, 25, 85, 'Measured core temperature (°C)')

ks = {'Bare control':0.150,'Bubble wrap':0.040,'Mylar only':0.121,'Full MLI':0.015}
model={n:[80*math.exp(-k*t) for t in times] for n,k in ks.items()}
MODEL_CHART = TMP/'reference_model_curves.png'
make_chart(model, MODEL_CHART, 0, 85, 'Model temperature (°C)', {n:f'{n}  k={ks[n]:.3f}' for n in ks})

def shade(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr(); shd = tcPr.find(qn('w:shd'))
    if shd is None: shd = OxmlElement('w:shd'); tcPr.append(shd)
    shd.set(qn('w:fill'), fill)

def cell_margins(cell, top=90, start=100, bottom=90, end=100):
    tc = cell._tc; tcPr = tc.get_or_add_tcPr(); tcMar = tcPr.first_child_found_in('w:tcMar')
    if tcMar is None: tcMar = OxmlElement('w:tcMar'); tcPr.append(tcMar)
    for m,v in [('top',top),('start',start),('bottom',bottom),('end',end)]:
        node=tcMar.find(qn('w:'+m))
        if node is None: node=OxmlElement('w:'+m); tcMar.append(node)
        node.set(qn('w:w'),str(v)); node.set(qn('w:type'),'dxa')

def set_repeat_header(row):
    trPr=row._tr.get_or_add_trPr(); el=OxmlElement('w:tblHeader'); el.set(qn('w:val'),'true'); trPr.append(el)

def set_cell_text(cell, text, bold=False, color='000000', size=9, align=WD_ALIGN_PARAGRAPH.LEFT):
    cell.text=''; p=cell.paragraphs[0]; p.alignment=align; p.paragraph_format.space_after=Pt(0)
    r=p.add_run(str(text)); r.bold=bold; r.font.name='Latin Modern Roman'; r._element.get_or_add_rPr().get_or_add_rFonts().set(qn('w:ascii'),'Latin Modern Roman'); r._element.rPr.rFonts.set(qn('w:hAnsi'),'Latin Modern Roman'); r.font.size=Pt(size); r.font.color.rgb=RGBColor.from_string(color)
    cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER; cell_margins(cell)

doc=Document()
sec=doc.sections[0]; sec.page_width=Cm(21.0); sec.page_height=Cm(29.7); sec.top_margin=Cm(1.8); sec.bottom_margin=Cm(1.7); sec.left_margin=Cm(2.1); sec.right_margin=Cm(2.1)
styles=doc.styles
styles['Normal'].font.name='Latin Modern Roman'; styles['Normal']._element.rPr.rFonts.set(qn('w:ascii'),'Latin Modern Roman'); styles['Normal']._element.rPr.rFonts.set(qn('w:hAnsi'),'Latin Modern Roman'); styles['Normal'].font.size=Pt(10.3); styles['Normal'].font.color.rgb=RGBColor.from_string('1F2930')
styles['Normal'].paragraph_format.space_after=Pt(5); styles['Normal'].paragraph_format.line_spacing=1.04
styles['Title'].font.name='Latin Modern Roman'; styles['Title']._element.rPr.rFonts.set(qn('w:ascii'),'Latin Modern Roman'); styles['Title']._element.rPr.rFonts.set(qn('w:hAnsi'),'Latin Modern Roman'); styles['Title'].font.size=Pt(25); styles['Title'].font.bold=True; styles['Title'].font.color.rgb=RGBColor(0,0,0)
for i,size in [(1,18),(2,13),(3,11)]:
    s=styles[f'Heading {i}']; s.font.name='Latin Modern Roman'; s._element.rPr.rFonts.set(qn('w:ascii'),'Latin Modern Roman'); s._element.rPr.rFonts.set(qn('w:hAnsi'),'Latin Modern Roman'); s.font.size=Pt(size); s.font.bold=True; s.font.color.rgb=RGBColor.from_string(BLUE); s.paragraph_format.space_before=Pt(9); s.paragraph_format.space_after=Pt(4); s.paragraph_format.keep_with_next=True

header=sec.header.paragraphs[0]; header.text='SPACESUIT THERMAL SHIELDING KIT     |     ENGINEERING PROJECT REPORT'; header.style=styles['Caption']; header.alignment=WD_ALIGN_PARAGRAPH.CENTER
for r in header.runs: r.font.name='Latin Modern Roman'; r.font.size=Pt(8); r.font.color.rgb=RGBColor.from_string(GREY)
footer=sec.footer.paragraphs[0]; footer.alignment=WD_ALIGN_PARAGRAPH.CENTER
footer.add_run('TUM Human Spaceflight Technology   •   9 September 2026   •   ')
fld=OxmlElement('w:fldSimple'); fld.set(qn('w:instr'),'PAGE'); footer._p.append(fld)
for r in footer.runs: r.font.name='Latin Modern Roman'; r.font.size=Pt(8); r.font.color.rgb=RGBColor.from_string(GREY)

def title(text):
    p=doc.add_paragraph(style='Title'); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.add_run(text); return p
def subtitle(text):
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after=Pt(8); r=p.add_run(text); r.font.size=Pt(14); r.font.color.rgb=RGBColor.from_string(BLUE); return p
def para(text='', boldlead=None):
    p=doc.add_paragraph();
    if boldlead and text.startswith(boldlead):
        p.add_run(boldlead).bold=True; p.add_run(text[len(boldlead):])
    else: p.add_run(text)
    return p
def bullet(text):
    p=doc.add_paragraph(style='List Bullet'); p.paragraph_format.space_after=Pt(3); p.add_run(text); return p
def figure(path, caption, width=6.25):
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.keep_with_next=True
    p.add_run().add_picture(str(path), width=Inches(width))
    c=doc.add_paragraph(); c.alignment=WD_ALIGN_PARAGRAPH.CENTER; c.paragraph_format.space_after=Pt(7); c.paragraph_format.keep_together=True
    r=c.add_run(caption); r.italic=True; r.font.name='Latin Modern Roman'; r.font.size=Pt(8.5); r.font.color.rgb=RGBColor.from_string(GREY)
def equation(name, width, number, explanation=None):
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_before=Pt(4); p.paragraph_format.space_after=Pt(2); p.paragraph_format.keep_together=True
    p.add_run().add_picture(str(eqs[name]), width=Inches(width))
    c=doc.add_paragraph(); c.alignment=WD_ALIGN_PARAGRAPH.CENTER; c.paragraph_format.space_after=Pt(5); c.paragraph_format.keep_together=True
    r=c.add_run(f'Equation {number}'); r.bold=True; r.font.size=Pt(8.5)
    if explanation: c.add_run(f'  {explanation}').italic=True
def table(headers, rows, widths=None, font=8.7):
    t=doc.add_table(rows=1, cols=len(headers)); t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.autofit=False
    for j,h in enumerate(headers):
        set_cell_text(t.rows[0].cells[j],h,True,NAVY,font,WD_ALIGN_PARAGRAPH.CENTER); shade(t.rows[0].cells[j],'E8EEF4')
        if widths: t.rows[0].cells[j].width=Inches(widths[j])
    set_repeat_header(t.rows[0])
    for i,row in enumerate(rows):
        cells=t.add_row().cells
        for j,val in enumerate(row):
            align=WD_ALIGN_PARAGRAPH.CENTER if j>0 and len(str(val))<18 else WD_ALIGN_PARAGRAPH.LEFT
            set_cell_text(cells[j],val,False,'000000',font,align)
            if widths: cells[j].width=Inches(widths[j])
            if i%2: shade(cells[j],PALE)
    doc.add_paragraph().paragraph_format.space_after=Pt(0)
    return t
def page(): doc.add_page_break()
def toc_entry(number, name, page_no):
    p=doc.add_paragraph(); p.paragraph_format.space_after=Pt(4)
    p.add_run(f'{number}  {name}').bold=True
    p.add_run('.' * max(5, 76-len(number)-len(name)))
    p.add_run(str(page_no))

# Cover
doc.add_paragraph().paragraph_format.space_after=Pt(54)
title('Spacesuit Thermal Shielding Kit')
subtitle('Development and Testing of a Space Related Learning Activity for School Lessons')
doc.add_paragraph().paragraph_format.space_after=Pt(58)
p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER
r=p.add_run('Engineering Project Report'); r.bold=True; r.font.size=Pt(16); r.font.color.rgb=RGBColor.from_string(NAVY)
for line in ['Human Spaceflight Technology','TUM School of Engineering and Design','Project team: Piyath Vithanage, Elio Krollpfeiffer, Dilan Fernando and Nuhansee Migelhewage','9 September 2026']:
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.add_run(line)

page(); doc.add_heading('Contents',0)
for args in [
    ('','Executive Summary',3),('1','Project Context and Objectives',4),('2','Thermodynamic Framework',5),
    ('3','Hardware and Test Configurations',8),('4','Experimental Method',10),('5','Software Integration and Data Workflow',13),
    ('6','Reference Model and Graphing',15),('7','Experimental Results',16),('8','Analysis and Model Limitations',18),
    ('9','Safety and Financial Feasibility',19),('10','Educational Delivery and Documentation',20),
    ('11','Individual Contribution Piyath Vithanage',21),('12','Individual Contribution Dilan Fernando',23),
    ('13','Conclusion and Recommendations',25),('A','Complete Worked Telemetry Dataset',26)]: toc_entry(*args)
doc.add_paragraph()
para('Figures and tables are numbered within the text. Page numbers in this editable version may update when the document is opened in Microsoft Word and fields are refreshed.')

page(); doc.add_heading('Executive Summary',0)
para('This report documents the SPHERE thermal-insulation laboratory, a controlled comparison of four 100 mL water capsules exposed to a cold water-bath boundary. The system combines physical test hardware, an interactive browser application, manual temperature logging, Newtonian cooling predictions, and post-test error analysis. The aim is to give school students a practical introduction to heat transfer, model validation, and experimental uncertainty through the context of spacesuit thermal protection.')
para('The test uses a bare control, bubble wrap, reflective Mylar, and a full multilayer package consisting of cotton, bubble wrap, and Mylar. Each run records the core temperature at t = 0, 1, …, 15 minutes. The website generates a reference curve and overlays manually entered measurements. The supplied test dataset shows the full MLI package retaining the most heat, while Mylar alone performed poorly in the liquid-bath environment. These observations are illustrative and depend on probe position, sealing, layer compression, bath temperature, and starting conditions.')
para('The experimental definition uses identical 100 mL wide-mouth glass jars, a water start temperature close to 80 °C, and a measured ice-water bath boundary. Four conditions are tested: a bare control, bubble wrap, Mylar-only, and a full multilayer package. Model coefficients are used to prepare reference curves, while the recorded telemetry is presented separately as experimental evidence. This separation allows students to see where prediction ends and measurement begins.')
para('The software is intentionally client-side. Students select a configuration, enter T₀ and Tenv, generate a Newtonian reference curve, and record one physical reading per minute. The website then presents measured and predicted values on common axes and calculates agreement metrics. This approach avoids Bluetooth and device-driver dependencies while preserving the discipline of manual scientific observation.')
doc.add_heading('Verified Project Settings',1)
table(['Setting','Current project value','Reason'],[
    ('Thermal core','100 mL wide-mouth glass jar','Consistent geometry and thermal mass'),
    ('Initial temperature','Approximately 80 °C; record actual T₀','Reproducible but never boiling'),
    ('Boundary','Measured ice-water bath; nominal 0 °C','Enter actual Tenv if the bath warms'),
    ('Sampling','Every minute from 0 through 15 min','16 time-temperature pairs'),
    ('Conditions','Bare, bubble wrap, Mylar-only, full MLI','Controlled comparison'),
    ('Analysis','Temperature drop, fitted k, residuals and MAE','Separates observation from prediction'),
], [1.35,2.35,2.65])
doc.add_heading('Work Distribution',1)
para('Piyath Vithanage developed the website and the graphing and data-visualisation workflow. Dilan Fernando developed the thermodynamic model and completed the remaining project work, including the experimental system, analysis, documentation, and integration. Elio Krollpfeiffer and Nuhansee Migelhewage are listed as members of the project team.')

page(); doc.add_heading('1 Project Context and Objectives',0)
para('The SPHERE project translates human-spaceflight engineering into accessible classroom activities. This module uses the thermal-control challenge of a spacesuit as the narrative frame for a measurable terrestrial experiment. The aim is not to reproduce vacuum; it is to let learners build, measure, model, and critique a simplified thermal system.')
doc.add_heading('1.1 Learning Objectives',1)
for x in ['Distinguish conduction, convection, and thermal radiation in a practical system.','Apply Newton’s law of cooling and interpret an effective cooling constant k.','Collect a controlled temperature time series and compare it with a prediction.','Use residuals and mean absolute error to evaluate model agreement.','Explain how uncontrolled variables can change an apparent insulation ranking.']: bullet(x)
doc.add_heading('1.2 Scope and Constraints',1)
para('The activity is designed for four groups working in parallel. The expected class duration is approximately 55–70 minutes, including setup, the 15-minute measurement interval, and post-processing. The equipment is reusable and relies on a web browser rather than a native application or wireless sensor link.')
para('The design had to satisfy several constraints at the same time. It needed to produce a visible temperature difference within one lesson, use components that teachers can replace locally, and remain understandable to students who have not yet studied differential equations. Safety controls had to be simple enough to apply in an ordinary classroom. The website also had to operate on school laptops and tablets without requiring an account, a native installation, or a paired sensor.')
doc.add_heading('1.3 Educational Engineering Approach',1)
para('The exercise follows the same sequence used in an engineering test programme. Students begin with a requirement, select a design, state a prediction, build a test article, define controlled variables, collect telemetry, and compare the result with a model. The physical package gives each mathematical term a visible meaning. Water mass controls thermal capacity, the bath sets the environmental boundary, and the insulation package changes the effective rate at which energy leaves the core.')
para('The spacesuit context supports engagement, but the learning objective remains thermal reasoning. The teacher should therefore make the analogy explicit: a spacesuit in vacuum is dominated externally by radiation, whereas this water-bath demonstrator includes strong conductive and convective transfer. NASA describes the spacesuit as a complete life-support system that uses circulating cooling water to regulate astronaut temperature [1]. The difference between that system and the classroom model asks students to decide which parts of an analogy are valid and which are not.')
doc.add_heading('1.4 How We Developed the Idea',1)
para('We began with the general idea of protecting a small warm object from a cold environment. At first the project was mainly described through the spacesuit story, but we soon realised that the experiment needed a clearer engineering question. We changed the question to: how much does a chosen layer arrangement reduce the cooling rate of the same water-filled core under the same boundary conditions? This gave us quantities that we could measure and compare.')
para('We also had to decide how complicated the equipment should be. A fully automated sensor system would have looked impressive, but it would have taken attention away from the heat-transfer problem and made the kit harder to reproduce. We kept a digital probe for accuracy and used manual entry for the data. This choice made the experiment easier to explain, repair, and run in different classrooms.')

page(); doc.add_heading('2 Thermodynamic Framework',0)
para('The warm water is treated as a lumped thermal mass. Its stored sensible energy change is estimated from Q = m cₚ ΔT, where m is the water mass, cₚ is the specific heat capacity of water, and ΔT is the measured temperature change. For 100 mL of water, the mass is approximately 0.10 kg, subject to the actual fill measurement.')
equation('heat_capacity', 1.75, 1, 'Sensible energy change of the water core')
doc.add_heading('2.1 Newtonian Cooling Model',1)
equation('energy_balance', 3.7, 2, 'Lumped energy balance')
equation('cooling_solution', 4.15, 3, 'Newtonian cooling solution used by Mission Control')
para('The effective cooling constant k has units of min⁻¹. It combines geometry, thermal mass, boundary conditions, and all heat-transfer paths; it is not a material thermal conductivity. A smaller k indicates slower approach to the bath temperature under comparable conditions.')
equation('cooling_constant', 1.65, 4, 'Definition of the effective cooling constant')
page(); doc.add_heading('2.2 Heat Transfer Interpretation',1)
table(['Mechanism','Classroom system','Spacesuit connection'],[
    ('Conduction','Direct heat flow through the jar, water, and solid layers','Layered fabrics and structural contacts create conductive paths.'),
    ('Convection','Water motion in the bath and air movement within gaps','External convection is absent in vacuum, but internal garment ventilation is important.'),
    ('Radiation','Infrared exchange among warm surfaces and surroundings','Reflective low-emissivity layers reduce radiative transfer in vacuum.'),
], [1.2,2.55,2.6])
para('The ice-water bath is primarily a conductive and convective environment. Consequently, a reflective sheet can perform poorly when used alone, especially if liquid contact or an open neck provides a stronger heat-loss path. The experiment is an analogy, not a vacuum qualification test.')

page(); doc.add_heading('2.3 Derivation and Parameter Meaning',1)
para('For a lumped body losing heat to an environment at approximately constant temperature, the energy balance is m cₚ dT/dt = -hA(T - Tenv). Separating variables and integrating gives the exponential temperature response used by the website. The effective coefficient k = hA/(m cₚ) collects the heat-transfer coefficient h, exposed area A, water mass m, and heat capacity cₚ into one parameter. The derivation explains why a larger water volume usually cools more slowly when the area and boundary conditions are otherwise similar.')
para('The project uses minutes as the time unit, so k is expressed in min⁻¹. This point matters because material thermal conductivity is also often written with the letter k in textbooks. In this report, material conductivity is described as λ in W/(m·K), while k always denotes the fitted or selected system cooling constant. Confusing these values would imply that the website coefficient is a property of Mylar, cotton, or bubble wrap alone, which it is not.')
doc.add_heading('2.4 Heat Capacity and Temperature Drop',1)
para('For 100 mL of water, m is approximately 0.10 kg. Using cₚ ≈ 4184 J/(kg·K), a 10 K temperature reduction corresponds to about 4.18 kJ of sensible energy leaving the water. The value is consistent with the liquid-water heat-capacity data compiled in the NIST Chemistry WebBook [2]. The measured temperature history therefore provides an indirect record of energy loss. The calculation is approximate because the jar, probe, and insulation also store energy, and because the water may not remain at a uniform temperature.')
doc.add_heading('2.5 Layered Thermal Resistance',1)
para('The full package combines several mechanisms. Cotton and bubble wrap create low-density regions that reduce direct conductive contact and restrict fluid motion. The reflective outer layer reduces radiative exchange when an air gap is present. NASA guidance describes spacecraft MLI as low-emittance films separated by low-conductance spacers and notes that gas pressure and solid contact can degrade performance [3, 4]. The classroom layers should therefore not be tightly compressed. Around the probe opening, a poor closure can create a thermal short circuit that dominates the behaviour of the rest of the package.')
equation('conduction', 1.65, 5, 'One-dimensional conductive resistance')
equation('radiation', 3.6, 6, 'Net radiative heat-transfer rate')
para('A simple resistance model can write Rtotal as the sum of the dominant layer resistances, but this should be interpreted cautiously. Contact resistance, wetting, geometry, and multidimensional heat flow make the physical capsule more complicated than a one-dimensional wall. For teaching, the effective cooling constant is more useful than assigning a separate exact resistance to each improvised layer.')

page(); doc.add_heading('3 Hardware and Test Configurations',0)
figure(imgs['hardware-schematic.png'], 'Current hardware arrangement: glass core, centred probe, closure, insulation, and external water bath.', 6.35)
doc.add_heading('3.1 Apparatus',1)
table(['Quantity','Item','Function'],[
    ('4','Identical 100 mL glass jars with probe access','Parallel thermal cores'),('4','Digital probe thermometers','Core temperature measurement'),('1+','Separate bath thermometer','Boundary calibration'),('1','Stable bucket or deep container','Cold bath and secondary containment'),('1 set','Cotton, bubble wrap, Mylar, tape or bands','Insulation configurations'),('1','Timer','One-minute sampling')
], [0.7,2.25,3.4])
doc.add_heading('3.2 Layer Construction',1)
table(['Condition','Construction','Reference k'],[
    ('Bare control','Uninsulated jar with consistent probe depth','0.150 min⁻¹'),('Bubble wrap','Two even layers; air cells uncrushed','0.040 min⁻¹'),('Mylar only','One reflective layer; neck closed','0.121 min⁻¹'),('Full MLI','Cotton inner, bubble wrap middle, Mylar outer','0.015 min⁻¹')
], [1.2,3.65,1.5])

page(); doc.add_heading('3.3 Hardware Integration',1)
para('The probe must measure the bulk water rather than the jar wall. It is therefore suspended near the vertical and horizontal centre of the 100 mL core. The closure supports the cable and limits water exchange while leaving the display outside the bath. Before every run, the jar is inspected for cracks and the closure is checked with cool water. The experiment is stopped immediately if liquid reaches the display or cable connector.')
para('During assembly we found that small details mattered more than expected. A probe that leaned against the glass responded differently from a probe hanging in the centre. Tape placed too tightly around bubble wrap flattened the air cells. The opening around the probe was also a weak point because it could admit moving air or bath water. We therefore treated probe position, layer compression, and neck closure as controlled variables instead of ordinary construction details.')
para('Using identical jars is more important than choosing a particular brand. Differences in diameter, wall thickness, lid geometry, or fill height change the surface-area-to-volume ratio and the heat-transfer path. Parallel groups should therefore receive matched cores, probes with comparable response time, and insulation pieces cut to the same nominal area.')
doc.add_heading('3.4 Construction of the Four Conditions',1)
para('The bare control establishes the fastest reference path and reveals the response of the jar and probe without added insulation. The bubble-wrap condition uses two even layers with intact cells. The Mylar-only condition uses a complete reflective sheet with the neck closed as consistently as possible. The full MLI condition places cotton next to the jar, bubble wrap around the cotton, and Mylar on the outside. Tape or elastic bands are applied only tightly enough to prevent movement.')
figure(imgs['equipments.png'], 'Toolkit components prepared for four parallel test conditions.', 3.8)
para('The photographs show the assembled glass cores and the four physical configurations used during the worked test. They also provide a visual record of the probe arrangement, layer order, and water-bath setup described in the student instructions.')

page(); doc.add_heading('4 Experimental Method',0)
doc.add_heading('4.1 Controlled Procedure',1)
steps=[
'Prepare a stable dry area and separate laptops and displays from water.',
'Measure and record the actual bath temperature Tenv.',
'Fill each thermal core with 100 mL of water near 80 °C and record its actual T₀.',
'Centre the probe at a repeatable depth and check the closure for leaks.',
'Apply the assigned insulation without compressing the cotton or bubble cells.',
'Place the core in the bath, start the timer immediately, and record t = 0.',
'Record the core temperature every minute through t = 15 minutes.',
'Calculate temperature drop, fit or select k, compute residuals and MAE, and discuss uncertainty.'
]
table(['Step','Action'],[(i+1,s) for i,s in enumerate(steps)],[0.55,5.8],9.0)
doc.add_heading('4.2 Fair-Test Requirements',1)
para('All conditions should use the same jar geometry, water volume, probe depth, sampling interval, bath location, and starting-temperature tolerance. When starting temperatures differ, rank designs using temperature drop, normalised heat retained above the measured boundary, or a fitted cooling constant rather than final temperature alone.')
figure(imgs['setup.jpg'], 'Physical setup immediately before immersion and timed measurement.', 4.7)

page(); doc.add_heading('4.3 Measurement Plan',1)
para('Each trial produces 16 ordered pairs from t = 0 through t = 15 minutes. The operator reads the displayed temperature at the scheduled minute and records the actual value to one decimal place when the instrument permits it. If a reading is late, the actual timestamp should be recorded rather than silently assigning it to the nominal minute. The model can then evaluate the same time coordinate.')
para('The bath temperature should be checked before the first run and again if ice melts noticeably. A nominal value of 0 °C is acceptable only when an ice-water mixture remains present and the measured boundary supports that assumption. During extended class sessions the bath may rise to 4.5 °C or 5 °C. Entering the measured Tenv in Mission Control prevents the software from comparing the experiment with the wrong boundary condition.')
doc.add_heading('4.4 Post Processing',1)
para('Analysis begins with the raw temperature drop T₀ - T15. Students then compare curves on the same axes and calculate residuals at each minute. MAE summarises the average absolute disagreement. A fitted k can be estimated from an individual point or, preferably, from several points. Repeated runs make it possible to separate random variation from a consistent construction effect.')
equation('normalised', 2.8, 7, 'Dimensionless temperature used for fairer comparison')
equation('fitted_k', 3.65, 8, 'Cooling constant estimated from a measured point')
para('We kept the original readings rather than adjusting them to make the curves look smoother. This was important for the Mylar-only run, where the behaviour differed strongly from the selected model. Keeping the unexpected curve made the later discussion more useful because it forced us to consider the setup instead of assuming that the reference coefficient must be correct.')
doc.add_heading('4.5 Acceptance Criteria',1)
for x in ['Every trial contains 16 time-temperature pairs or records the reason for a missing point.','The same water volume, probe depth, immersion depth, and timing method are used for all conditions.','The bath and initial temperatures are documented rather than assumed.','Photographs or notes identify the actual layer order and any visible gap, compression, or wetting.','Conclusions identify both the observed ranking and the limitations of the comparison.']: bullet(x)

page(); doc.add_heading('4.6 Physical Configuration Images',1)
t=doc.add_table(rows=2, cols=2); t.alignment=WD_TABLE_ALIGNMENT.CENTER
for cell,path,label in [
    (t.cell(0,0),imgs['barecapsule.jpeg'],'Bare control'),(t.cell(0,1),imgs['bubblewrap-only.png'],'Bubble wrap'),
    (t.cell(1,0),imgs['Onlymylar.jpg'],'Mylar only'),(t.cell(1,1),imgs['full-mli.png'],'Full MLI')]:
    p=cell.paragraphs[0]; p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after=Pt(0); p.add_run().add_picture(str(path),width=Inches(1.72))
    q=cell.add_paragraph(); q.alignment=WD_ALIGN_PARAGRAPH.CENTER; q.add_run(label).bold=True; cell_margins(cell,100,130,100,130)
doc.add_heading('4.7 Full MLI Stack',1)
para('The full package is assembled from the core outward: a uniform cotton layer, two layers of bubble wrap, and a reflective Mylar outer layer. Each layer is secured independently to avoid crushing trapped air. Probe position and neck closure must remain consistent across all tests.')

page(); doc.add_heading('5 Software Integration and Data Workflow',0)
para('The Mission Control website is a client-side application built with HTML, CSS, and JavaScript. It runs in a standard browser, provides the theory and assembly sequence, calculates reference curves, accepts manual temperature entries, and plots measured values against the model. Chart.js is used for dynamic visualisation; KaTeX supports equations; local browser storage preserves the active prediction and telemetry.')
figure(imgs['website-setting up.PNG'], 'Mission Control prediction interface with editable start temperature, bath temperature, model duration, and cooling constant.', 6.2)
doc.add_heading('5.1 Measurement and Analysis Flow',1)
table(['Stage','Website function','Student action'],[
    ('Prediction','Generate T(t) from T₀, Tenv, k, and duration','Select a configuration and record assumptions.'),('Acquisition','Timer and 16-point manual log','Read the physical display every minute.'),('Comparison','Overlay measurement and prediction','Inspect residuals and curve shape.'),('Evaluation','MAE and correlation-style feedback','Explain disagreement using physical mechanisms.')
], [1.0,2.65,2.7])
para('Piyath Vithanage developed the website and the graphing and data-visualisation workflow described in this section.')

page(); doc.add_heading('5.2 Software Architecture',1)
para('The application is implemented as a static single-page site. The HTML defines the mission sections and forms, the stylesheet provides the responsive dashboard layout, and app.js holds the model, timer, chart, telemetry, assessment, and browser-storage logic. The deployment does not require a database or server-side runtime. A teacher can host the files on a static service or run them from a local web server.')
para('We tested the page as a complete workflow rather than as separate screens. A user can read the briefing, check the assembly sequence, choose a model, start the timer, enter data, and open the study material without leaving the application. We used the same names for the four insulation conditions throughout the interface so that a student would not select one label in the simulator and see a different label in the telemetry table.')
para('External libraries are loaded from public content-delivery networks. Chart.js renders the model and telemetry graphs [5], KaTeX formats equations in the browser [6], and Lucide supplies interface icons. This keeps the repository compact, but complete offline operation requires those assets to be bundled locally. The project README states this dependency so instructors can plan for restricted school networks.')
doc.add_heading('5.3 Application State and Validation',1)
para('The software stores the selected model, the generated prediction curve, telemetry points, timer status, and interface preferences. Numeric inputs are parsed and bounded before a simulation is generated. The prediction curve is cached in local browser storage so a page reload does not immediately discard an active exercise. The storage is convenient for a classroom session but is not a substitute for a permanent scientific data repository.')
para('The telemetry table shows measured temperature, predicted temperature, and the difference at the corresponding time. A chart overlays both series. The print function creates a portable record for assessment, while the clear function lets a group restart after an invalid run. The instructor access screen is a client-side classroom gate and is not described as a security boundary.')
doc.add_heading('5.4 Manual Logging as a Design Choice',1)
para('Automatic acquisition would reduce transcription error, but it would also add a hardware interface, device permissions, and pairing failures. The project deliberately keeps the digital thermometer separate from the website. Students must observe the display, recognise the correct minute, and enter a value. This maintains attention during the 15-minute run and makes the origin of every graph point visible.')
figure(imgs['predicted-curve.png'], 'Prediction panel and cooling-curve output in the current website.', 5.8)

page(); doc.add_heading('6 Reference Model and Graphing',0)
para('The website ships with educational reference coefficients for a common starting point of T₀ = 80 °C and Tenv = 0 °C. These coefficients are model settings, not guaranteed material properties or validated universal values. They must be adjusted when geometry, water mass, bath temperature, or construction changes.')
figure(MODEL_CHART, 'Reference Newtonian cooling curves generated from the current website coefficients.', 6.4)
table(['Configuration','k (min⁻¹)','Model T15 at 80/0 °C','Interpretation'],[
    ('Bare control','0.150','8.4 °C','Fast reference decay'),('Bubble wrap','0.040','43.9 °C','Moderate retention'),('Mylar only','0.121','13.0 °C','Weak alone in this bath model'),('Full MLI','0.015','63.9 °C','Slowest model decay')
], [1.35,1.15,1.55,2.3])
para('At t = 15 minutes, the reference equations predict approximately 8.4 °C for the bare control, 43.9 °C for bubble wrap, 13.0 °C for Mylar-only, and 63.9 °C for full MLI. These values follow directly from the selected coefficients and the 80/0 °C boundary pair. They should never be presented as measurements unless a physical run actually produced them.')
doc.add_heading('6.1 Graph Design',1)
para('All curves use the same time axis and temperature scale so that slope and separation can be compared directly. Colour distinguishes the four configurations, while labels retain the configuration name and k value. The measured-results figure follows the same visual ordering. This consistency helps students compare the mathematical prediction with the experiment without mentally translating between two unrelated graph designs.')

page(); doc.add_heading('7 Experimental Results',0)
para('The following dataset was transcribed from the project telemetry records. It is used as a worked example and should not replace repeated student measurements. Because T₀ differs among trials, final temperature alone is not a fully controlled ranking metric.')
figure(OBS_CHART, 'Observed temperature histories from the supplied four-condition test.', 6.4)
table(['Condition','T₀','T15','Drop','Dashboard score'],[
    ('Full MLI','77.6 °C','62.7 °C','14.9 °C','93%'),('Bubble wrap','82.6 °C','52.6 °C','30.0 °C','83%'),('Bare control','80.1 °C','35.2 °C','44.9 °C','94%'),('Mylar only','80.5 °C','33.3 °C','47.2 °C','3%')
], [1.55,1.0,1.0,1.0,1.45])
para('The full MLI package showed the smallest measured drop. Bubble wrap was second. Mylar-only cooled slightly more than the bare control in this run; the low dashboard score indicates that the observed curve strongly disagreed with its selected reference model.')
doc.add_heading('7.1 Result Interpretation',1)
para('The full MLI core fell by 14.9 °C from a starting value of 77.6 °C. Bubble wrap fell by 30.0 °C from 82.6 °C. The bare control and Mylar-only conditions fell by 44.9 °C and 47.2 °C respectively. The large separation between the full MLI and bare curves is visible within the first several minutes and remains through the end of the run.')
equation('retained', 3.2, 9, 'Temperature retained above the measured boundary')
para('The starting temperatures were not identical, so the result should not be reduced to a simple comparison of T15. A normalised measure relative to the boundary gives a fairer indication of retained temperature. Repetition would also be required before quoting uncertainty or claiming a population-level performance difference. The dataset supports a worked classroom analysis, not certification of the materials.')

doc.add_heading('7.2 Comparison with the Reference Model',1)
para('The full MLI and bare-control dashboard scores were 93% and 94%, which indicates that the selected exponential curves followed the overall shape of those measured series reasonably closely under the website’s scoring method. Bubble wrap achieved 83%. The Mylar-only trial received 3%, signalling a severe mismatch rather than a small measurement error.')
para('Several physical explanations are consistent with the Mylar-only mismatch. The reflective sheet may have admitted water or air movement at the neck, the film may have been in direct liquid contact, or the probe and starting state may have differed from the reference assumption. Because Mylar chiefly addresses radiation, a liquid-bath model with a high direct-contact path can cool far faster than a coefficient chosen for a well-formed reflective enclosure.')
doc.add_heading('7.3 What the Dataset Establishes',1)
para('The worked dataset establishes that the complete layered package performed best in this particular test, that bubble wrap provided substantial heat retention, and that the Mylar-only construction did not behave like its intended reference curve. It does not establish exact material properties, long-term repeatability, or performance in vacuum. Those questions would require calibrated sensors, repeated trials, controlled geometry, and a different test environment.')
doc.add_heading('7.4 Observations During the Test',1)
para('The most obvious difference during the run was the slope of the displayed temperatures. The bare and Mylar-only values fell quickly, so missing a minute would have changed the recorded point noticeably. The full MLI temperature moved much more slowly. This made the effect visible before the final reading and helped us check that the graph was updating in the expected direction.')
para('The manual logging process also showed why a timer and a clear division of tasks are useful. One student should watch the thermometer, one should watch the time, and one should enter the value. When one person tried to do all three jobs, it was easier to enter a reading late or type the wrong digit. The group procedure in the manuals was written to reflect this practical point.')
figure(imgs['working.jpg'], 'Manual measurement entry during the physical test.', 3.6)

page(); doc.add_heading('8 Analysis and Model Limitations',0)
doc.add_heading('8.1 Error Metrics',1)
equation('residual', 3.6, 10, 'Signed difference at each measurement time')
equation('mae', 2.65, 11, 'Mean absolute error over the recorded series')
para('MAE reports the mean absolute temperature difference over all recorded points. A fitted cooling constant may be estimated from k = −ln[(T(t) − Tenv)/(T₀ − Tenv)] / t when the ratio is positive and the boundary is approximately constant.')
doc.add_heading('8.2 Main Sources of Uncertainty',1)
for x in ['Probe tip touching the jar wall instead of remaining centred in the water.','Leakage or an incompletely closed neck that creates a strong convective path.','Thermal stratification in the core and inconsistent mixing between trials.','Ice-bath warming above 0 °C or different immersion depths.','Different starting temperatures, water masses, layer areas, or compression.','The lumped model’s assumption of a uniform core temperature and constant effective k.']: bullet(x)
doc.add_heading('8.3 Interpretation of Mylar',1)
para('Mylar reflects infrared radiation, which is important in space vacuum. A single thin reflective layer does not block direct liquid conduction and can be defeated by convective leakage. The weak Mylar-only result therefore demonstrates a boundary-condition and construction issue; it does not establish that reflective insulation is ineffective in spacecraft thermal control.')
doc.add_heading('8.4 Recommended Improvements',1)
para('A stronger validation campaign would repeat every condition at least three times, randomise the run order, use one calibrated bath probe, and record the mass of water rather than relying only on nominal volume. Photographs should document the probe depth and neck closure before immersion. A single regression fitted to all points in a run would provide a more stable estimate of k than a value calculated from one endpoint.')
para('The next software improvement should allow students to export telemetry as CSV and attach run metadata such as group, configuration, water mass, probe identifier, and bath temperature. An offline bundle of Chart.js, KaTeX, Lucide, and fonts would make deployment more reliable in schools with filtered internet access.')
doc.add_heading('8.5 What We Would Change in a Second Build',1)
para('If we repeated the project, we would mark the probe depth directly on every cable and add a simple jig for holding the sensor in the centre of the jar. We would also prepare insulation templates so that every group received the same material area. These changes are small, but they would reduce variation without making the kit expensive or difficult to assemble.')
para('We would also record the bath temperature continuously with a separate probe. In the present setup, the website accepts one environmental value, even though the bath can warm during a long class. Recording the boundary as its own time series would allow a more accurate model and would show students that the environment is part of the experiment rather than a fixed number printed in the instructions.')

doc.add_heading('9 Safety and Financial Feasibility',0)
doc.add_heading('9.1 Mandatory Safety Controls',1)
for x in ['An instructor or adult prepares and handles water near 80 °C; boiling water is prohibited.','Wear eye protection and heat-resistant gloves or use tongs. Keep the bath below waist height on a stable surface.','Use only undamaged, heat-safe containers. Leak-test the closure before immersion.','Keep displays, connectors, laptops, and power supplies dry; only the intended probe enters water.','Stop if a probe slips, insulation wets through, the container leaks, or T₀ is outside the agreed tolerance.']: bullet(x)
doc.add_heading('9.2 Current Bill of Materials',1)
table(['Item','Quantity','Function'],[
    ('100 mL glass thermal cores','4','Comparable test vessels'),('Digital probe thermometers','4 + bath probe','Core and boundary measurement'),('Bucket or deep container','1','Cold bath and containment'),('Cotton, bubble wrap, Mylar','1 set','Layer configurations'),('Tape or elastic bands','As needed','Repeatable assembly'),('Gloves/tongs, towels, timer','1 set','Safe handling and timing')
], [2.2,1.2,3.0])
para('The hardware is reusable, and the browser application requires no installation. Exact cost depends on local sourcing; the older €35.20 estimate should be treated as a draft procurement figure rather than a verified current price.')
doc.add_heading('9.3 Risk Management',1)
para('The main credible hazard is scalding during water preparation and transfer. Administrative controls therefore place hot-water work under adult supervision and separate it from laptops. Engineering controls include a stable secondary container, heat-safe jars, a supported probe, and low-voltage thermometers. The procedure stops when containment or measurement integrity is uncertain; continuing a leaking run would create both a safety problem and invalid data.')

page(); doc.add_heading('10 Educational Delivery and Documentation',0)
para('The project repository contains a student manual, teacher manual, two-page task sheet, printable flashcards, an illustrated procedure, and the Mission Control website. The materials use a common sequence so students encounter the same variables and terminology in the briefing, physical procedure, simulation, worksheet, and assessment. This reduces the risk that one document instructs a different test from another.')
doc.add_heading('10.1 Student Materials',1)
para('The student manual explains the physical analogy, identifies the apparatus, introduces Newtonian cooling, and guides the complete test. The task sheet provides space for predictions, raw readings, calculations, and evaluation. Flashcards support review of heat-transfer mechanisms, the meaning of k, equilibrium, and experimental uncertainty. The website links these resources from the main navigation.')
doc.add_heading('10.2 Teacher Materials',1)
para('The teacher manual supplies lesson timing, safety expectations, discussion prompts, and assessment guidance. It also explains the difference between the external vacuum environment of a spacecraft and the liquid boundary used in class. This distinction prevents the demonstration from reinforcing the incorrect idea that space is cold because objects are surrounded by cold air.')
doc.add_heading('10.3 Assessment',1)
para('The assessment framework combines prediction, calculation, interpretation, and evaluation. Students are expected to identify mechanisms, use the exponential model, interpret a smaller k, calculate error, and explain why construction quality affects the result. One open response requires instructor review, while the remaining online items can be automatically checked for immediate feedback.')
doc.add_heading('10.4 Decisions Made While Writing the Materials',1)
para('We kept the student instructions short at the point of action and placed the longer explanations in the manual. For example, the assembly page tells students not to compress the bubble wrap, while the theory section explains that compression removes trapped air and increases solid contact. This separation lets a group follow the procedure during a busy lab without losing the engineering reason behind the instruction.')
para('We also used the same ten assessment topics across the online questions, teacher solutions, and printable task sheet. This made it easier to check that every assessed idea had already been introduced. Where the answer depends on the quality of an explanation, the teacher still reviews it instead of relying on automatic scoring.')
figure(imgs['preflight-thermal-lab.png'], 'Complete classroom system with four test articles and the digital interface.', 5.9)

doc.add_heading('11 Individual Contribution Piyath Vithanage',0)
doc.add_heading('11.1 Website Architecture and Implementation',1)
para('My principal contribution was the design and implementation of the Mission Control website. I organised the application as a single-page browser experience so students could move from briefing to assembly, simulation, measurement, study material, and assessment without installing software. The implementation uses HTML for the experiment structure, CSS for the responsive interface, and JavaScript for the model and interactive behaviour.')
para('I connected the page controls to a common application state. The selected configuration determines the reference coefficient and graph colour. Inputs for T₀, Tenv, and model duration update the simulation. The timer supports the 15-minute measurement sequence, while the telemetry controls validate and store each manually entered point. Browser storage preserves the generated curve and recorded data during an active session.')
para('I designed the interface to work on both desktop and smaller screens. Navigation collapses on mobile devices, control labels remain associated with their inputs, and measurement buttons use explicit text rather than relying only on icons. The dark mission-control visual language supports the project narrative, while high-contrast panels separate instructions, numerical inputs, graphs, and status feedback.')
doc.add_heading('11.2 Classroom Reliability',1)
para('I avoided a native mobile application and Bluetooth acquisition because both would add failure modes that teachers cannot easily resolve during a lesson. The static site can be hosted without a server-side database and can also be reviewed from a local web server. GitHub Pages supports direct publication of HTML, CSS, and JavaScript from a repository [7]. This architecture reduces maintenance and keeps the experimental workflow available on ordinary school laptops and tablets.')
figure(imgs['website-setting up.PNG'], 'Mission Control model configuration and graph interface.', 5.8)

page(); doc.add_heading('11.3 Graphing and Data Visualisation',1)
para('I developed the project’s graphing workflow so predicted and measured temperatures could be compared on the same time base. The reference graph evaluates the Newtonian equation at successive minutes. The telemetry graph then overlays the student’s physical readings, preserving the distinction between a calculated value and an observation. The associated table shows both values and their signed difference.')
para('Graph consistency was an important design choice. The same configuration names and colours are used in the selector, summary badge, prediction curve, telemetry overlay, and report figures. Axes include units, the time range matches the 15-minute procedure, and the temperature scale remains readable across configurations. These decisions make the graph useful for analysis rather than decoration.')
doc.add_heading('11.4 Error Feedback and Printed Record',1)
para('I implemented residual and MAE calculations to turn visual comparison into a quantitative exercise. The website calculates the absolute difference at each recorded point and summarises the series. The correlation-style score provides immediate classroom feedback, but the report explains that it is a teaching indicator rather than a formal statistical validation metric.')
para('The print view converts the active telemetry table and experiment settings into a record that can be attached to the student worksheet. This makes it possible to review the selected k, environmental temperature, initial temperature, recorded points, and model differences after the live session has ended.')
figure(MODEL_CHART, 'Reference curves prepared for consistent comparison across the four configurations.', 6.1)

page(); doc.add_heading('12 Individual Contribution Dilan Fernando',0)
doc.add_heading('12.1 Thermodynamic Model',1)
para('My main technical responsibility was the thermodynamic definition of the experiment and the interpretation of the physical results. I selected the lumped Newtonian cooling model because it gives secondary-school students a manageable equation while retaining the essential relationship among thermal mass, environmental temperature, and cooling rate. I defined k as a system coefficient in min⁻¹ and separated it from material thermal conductivity.')
para('I established the current 100 mL, approximately 80 °C, 15-minute test settings. The water volume provides enough thermal capacity for a gradual curve while still allowing a measurable separation among configurations during one class period. The ice-water bath provides a repeatable boundary, provided its actual temperature is measured and entered into the model when it differs from 0 °C.')
para('I also developed the interpretation of the three heat-transfer modes. Cotton and bubble wrap mainly interrupt conductive and convective paths in the classroom system, while Mylar addresses radiation. The water bath does not recreate vacuum, so I documented why Mylar-only can behave poorly even though reflective layers are important in spacecraft thermal design.')
doc.add_heading('12.2 Experimental Analysis',1)
para('I compared the measured series with the reference curves using temperature drop, residuals, MAE, and the fitted cooling constant. The worked data show that the full multilayer package retained the most heat. I treated the Mylar-only disagreement as evidence of model or construction mismatch and identified likely causes instead of presenting it as a universal material conclusion.')
figure(OBS_CHART, 'Worked telemetry used for thermodynamic interpretation and comparison.', 6.1)

page(); doc.add_heading('12.3 Hardware and Remaining Project Work',1)
para('I integrated the thermodynamic requirements with the physical test arrangement. This included the matched glass cores, 100 mL fill, centred probe position, cold-bath immersion, and repeatable layer construction. I connected these settings to the student procedure so the model assumptions and laboratory instructions referred to the same system.')
para('My remaining project work covered test planning, safety controls, result interpretation, technical writing, and integration of the manuals and website. I documented the requirement for adult handling of hot water, a stable secondary container, dry electronic displays, pre-test leak checks, and immediate termination of any leaking or unstable run.')
doc.add_heading('12.4 Documentation and Educational Integration',1)
para('I aligned the terminology and sequence across the student manual, teacher manual, task sheet, illustrated procedure, and report. Each document now uses the same core volume, start-temperature target, bath boundary, sampling interval, and four principal configurations. I also separated the website’s educational coefficients from the observed telemetry so readers can reproduce the calculations without mistaking a prediction for a result.')
para('The project team consists of Piyath Vithanage, Elio Krollpfeiffer, Dilan Fernando, and Nuhansee Migelhewage. Piyath completed the website and graphing work, while I completed the thermodynamics and the remaining project work described above.')
figure(imgs['hardware-schematic.png'], 'Integrated apparatus definition used across the website and documentation.', 5.9)

page(); doc.add_heading('13 Conclusion and Recommendations',0)
para('The SPHERE thermal-insulation laboratory provides a reusable teaching system for transient heat transfer and engineering validation. The report, website, manuals, procedure, and photographs use the same experimental settings. The full MLI worked example showed the best heat retention, while the analysis separates model settings from measured evidence and identifies the limits of the terrestrial water-bath analogy.')
para('The combination of a physical capsule, a visible prediction, and a manually recorded curve gives students a complete engineering cycle within a school lesson. The present system is suitable for comparative teaching when teachers apply the stated safety and control requirements. It is not a simulation of vacuum and does not qualify the improvised materials for aerospace use.')
doc.add_heading('13.1 Recommendations for the Next Test Campaign',1)
for x in ['Repeat every configuration at least three times and randomise the run order.','Measure water mass, probe depth, bath temperature, and immersion depth for every run.','Fit k using all usable points and report variability across repeats.','Bundle browser libraries locally for dependable offline classroom operation.','Add CSV export and run metadata to the website.']: bullet(x)
doc.add_heading('References',1)
for x in [
    '[1] NASA, Spacewalk Spacesuit Basics, Johnson Space Center, https://www.nasa.gov/centers-and-facilities/johnson/spacewalk-spacesuit-basics/, accessed 9 September 2026.',
    '[2] NIST, Water Liquid Phase Heat Capacity, Chemistry WebBook SRD 69, https://webbook.nist.gov/cgi/cbook.cgi?ID=C7732185&Table=on&Type=JANAFL, accessed 9 September 2026.',
    '[3] M. M. Finckenor and D. Dooling, Multilayer Insulation Material Guidelines, NASA/TP-1999-209263, 1999.',
    '[4] NASA, Passive Thermal Control Engineering Guidebook, Revision 4.0, 2023, https://ntrs.nasa.gov/api/citations/20230013900/downloads/NASA%20Thermal%20Control%20Engineering%20Guidebook%20v4.pdf.',
    '[5] Chart.js Contributors, Chart.js Documentation, https://www.chartjs.org/docs/latest/, accessed 9 September 2026.',
    '[6] Khan Academy and contributors, KaTeX API Documentation, https://katex.org/docs/api.html, accessed 9 September 2026.',
    '[7] GitHub, What is GitHub Pages, https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages, accessed 9 September 2026.'
]: bullet(x)
doc.add_heading('Project Sources',1)
for x in ['SPHERE Mission Control website: index.html, app.js, and styles.css.','SPHERE student manual, teacher manual, task sheet, and flashcards.','Experimental Toolkit Procedure: Thermal Insulation and Cooling Rates for Spacecraft Thermal Protection, version dated 24 July 2026.','Project photographs and diagrams in the images directory.']: bullet(x)
para('Safety note. This classroom experiment does not certify any material for aerospace, pressure-vessel, fire-protection, or personal-protective use.')

page(); doc.add_heading('Appendix A Complete Worked Telemetry Dataset',0)
table(['Time','Full MLI','Bubble wrap','Mylar only','Bare control'],[
    (f'{t} min',f'{obs["Full MLI"][t]:.1f} °C',f'{obs["Bubble wrap"][t]:.1f} °C',f'{obs["Mylar only"][t]:.1f} °C',f'{obs["Bare control"][t]:.1f} °C') for t in times
], [0.8,1.35,1.35,1.35,1.35], 8.8)
doc.add_heading('Appendix Notes',1)
para('The values above are the complete 16-point series used in the worked figures. They were transcribed from the project’s telemetry records. They should be retained with their original units and timestamps and should not be substituted for a new group’s measurements.')
para('For comparison across unequal starting temperatures, students may calculate the normalised temperature remaining above the boundary as (T(t) - Tenv)/(T₀ - Tenv). When the bath temperature is not measured, any normalised result inherits uncertainty from the assumed boundary.')

doc.core_properties.title='Spacesuit Thermal Shielding Kit'
doc.core_properties.subject='Updated SPHERE project settings, images, modelling, results and contribution attribution'
doc.core_properties.author='SPHERE Project Team'
doc.core_properties.comments='SPHERE thermal insulation engineering project report.'
doc.save(OUT)
print(OUT)
