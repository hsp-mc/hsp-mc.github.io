from pathlib import Path
from shutil import copy2
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from docx.enum.style import WD_STYLE_TYPE
from PIL import Image
import re


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "report" / "final"
ASSETS = OUT / "latex_assets"
OUT.mkdir(parents=True, exist_ok=True)
ASSETS.mkdir(parents=True, exist_ok=True)

MEDIA = ROOT / "tmp" / "report_media_assets"
asset_map = {
    "figure2_cross_section.jpg": "e62dcf818e936d22fb835d26b56565ed5eff301f.jpg",
    "figure7_configurations.jpg": "a7db8d5a1da5f1868d9b535a81254e5d5115bd0d.jpg",
    "figure8_mission_control.jpg": "b7165f5e5d12679417ca429ddfef69caa18ee42c.jpg",
    "figure11_results.png": "c4afb1bead68c99b8e6bb896c20123be7cfdc28b.png",
    "figure13_complete_system.jpg": "a7db8d5a1da5f1868d9b535a81254e5d5115bd0d.jpg",
}
for dst, src in asset_map.items():
    copy2(MEDIA / src, ASSETS / dst)


TEAM = "Piyath Vithanage · Elio Krollpfeiffer · Dilan Fernando · Nuhansee Migelhewage"
TITLE = "SPACESUIT THERMAL SHIELDING KIT"
SUBTITLE = "Team Engineering Report and Individual Contributions"


pages = [
    {
        "kind": "cover",
        "title": TITLE,
        "subtitle": SUBTITLE,
        "meta": ["Human Spaceflight Technology", "TUM School of Engineering and Design", TEAM, "17 September 2026"],
        "lead": "SPHERE is a reusable classroom thermal laboratory in which students predict, build, measure and evaluate a spacesuit-inspired insulation system. Four matched 100 mL water capsules are cooled in an ice-water bath under four insulation conditions. A browser tool, Mission Control, generates a Newtonian-cooling prediction, records sixteen manual readings and compares model and measurement.",
        "sections": [
            ("Executive summary", [
                "The worked example shows the full multilayer package retaining the most heat, followed by bubble wrap. Mylar alone performed poorly because the water-bath boundary emphasizes conduction and convection, whereas reflective foil primarily limits radiation. The experiment is therefore a classroom analogy for thermal-control reasoning, not a vacuum simulation or an aerospace qualification test.",
                "This submission follows the kickoff brief: pages 1–10 are the team engineering report; pages 11–14 provide one page of documented contribution per team member. Figure numbers follow the established project record so earlier technical references remain traceable.",
            ]),
            ("Key project settings", [
                "100 mL matched cores · approximately 80 °C start · measured ice-water boundary · one reading per minute from 0–15 min · bare, bubble-wrap, Mylar-only and full multilayer conditions · analysis by temperature drop, residuals, mean absolute error and effective cooling coefficient k.",
            ]),
        ],
    },
    {
        "title": "1 Project purpose and learning design",
        "sections": [
            ("1.1 Educational objective", [
                "The project converts the problem of spacesuit thermal protection into a school experiment that can be completed during a double lesson. Students distinguish conduction, convection and radiation; use Newton's cooling model; collect a controlled temperature series; compare prediction with observation; and explain disagreement through uncertainty and physical mechanisms.",
                "The learning sequence mirrors an engineering test campaign: define a requirement, choose a configuration, commit to a prediction, assemble the test article, control variables, collect telemetry and evaluate the evidence. The spacesuit context motivates the exercise, while the teacher explicitly states where the analogy ends. In vacuum, external convection is absent and radiation is important; in the classroom bath, liquid contact and convection dominate.",
            ]),
            ("1.2 Classroom workflow", [
                "Four groups work in parallel, one per insulation condition. A complete session requires about 55–70 minutes: briefing and safety check, assembly, a fifteen-minute measurement window, graphing and interpretation. No user account, native application or wireless sensor link is required.",
            ]),
            ("1.3 Success criteria", [
                "A successful run contains all sixteen time-temperature points or documents missing readings; records the actual start and bath temperatures; uses matched geometry, water volume, probe depth and immersion depth; documents layer order and wetting; and reports both the observed ranking and the limitations of that comparison.",
            ]),
        ],
        "table": {
            "headers": ["Requirement", "Implementation", "Evidence"],
            "rows": [
                ["Engaging", "Spacesuit narrative and four-way comparison", "Prediction, physical build and visible curves"],
                ["Reusable", "Matched jars, probes and removable wraps", "Repeated classroom use"],
                ["Safe", "Adult hot-water handling and stop criteria", "Risk controls in Section 6"],
                ["Assessable", "Residuals, MAE and written interpretation", "Worksheet and ten-question assessment"],
            ],
        },
    },
    {
        "title": "2 Thermodynamic framework and insulation design",
        "sections": [
            ("2.1 Reference model", [
                "The water is treated as a lumped thermal mass. Its temperature is modelled as T(t) = Tenv + (T0 − Tenv)e^(−kt). The effective coefficient k, expressed in min⁻¹, represents the complete assembled system: geometry, thermal mass, boundary conditions and every active heat-transfer path. It is not the thermal conductivity of a material. A smaller k means a slower approach to the bath temperature.",
                "For 100 mL of water, m is approximately 0.10 kg. With cp ≈ 4184 J/(kg·K), a 10 K fall corresponds to about 4.18 kJ of sensible energy leaving the water. The jar, probe and insulation also store energy, and the water may not remain perfectly uniform, so the calculation is deliberately approximate.",
            ]),
            ("2.2 Layer strategy", [
                "The bare jar establishes the baseline. Bubble wrap traps air and interrupts conductive and convective paths. A single Mylar layer chiefly changes radiative exchange and provides little protection against direct liquid contact. The full package places cotton against the jar, bubble wrap in the middle and Mylar outside. Layers are secured without compression because trapped air is part of the thermal resistance.",
            ]),
        ],
        "figure": ("figure2_cross_section.jpg", "Figure 2. Cross-section of the full multilayer package: cotton, bubble wrap and outer Mylar."),
        "table": {
            "headers": ["Condition", "Construction", "Reference k (min⁻¹)"],
            "rows": [
                ["Bare", "Uninsulated matched core", "0.150"],
                ["Bubble wrap", "Two uncompressed layers", "0.040"],
                ["Mylar only", "One reflective layer; neck closed", "0.121"],
                ["Full MLI", "Cotton + bubble wrap + Mylar", "0.015"],
            ],
        },
    },
    {
        "title": "3 Hardware and controlled experimental method",
        "sections": [
            ("3.1 Apparatus", [
                "The apparatus comprises four matched 100 mL heat-safe cores, four core thermometers, a separate bath thermometer, a stable bath container, a timer, cotton, bubble wrap, Mylar and reusable fastening material. The probe is centred in the water and supported by the closure; the display and cable connection remain dry.",
            ]),
            ("3.2 Procedure", [
                "1. Prepare a stable dry work area and separate electronics from water. 2. Measure Tenv. 3. Fill each core with 100 mL of water near 80 °C and record T0. 4. Centre the probe and leak-test the closure. 5. Apply the assigned wrap without compression. 6. Immerse the core and start the timer. 7. Record temperature every minute through t = 15 min. 8. Calculate drop, residuals, MAE and fitted or selected k.",
                "If starting temperatures differ, configurations are compared by temperature drop, normalized retention above the boundary or fitted k rather than final temperature alone. Actual timestamps are used for late readings. The bath is checked again when ice visibly melts.",
            ]),
            ("3.3 Fair-test controls", [
                "Jar geometry, fill mass, probe depth, immersion depth, sampling interval and bath position are held constant. Photographs or written notes record layer order, gaps, compression, leakage and wetting. A run is rejected when containment or measurement integrity is lost.",
            ]),
        ],
        "figure": ("figure7_configurations.jpg", "Figure 7. Four physical configurations prepared for comparative testing."),
    },
    {
        "title": "4 Mission Control and data workflow",
        "sections": [
            ("4.1 Software role", [
                "Mission Control is a static HTML, CSS and JavaScript application hosted at hsp-mc.github.io. Students select a configuration, enter T0 and Tenv, generate a reference curve and manually enter measured temperatures. Chart.js plots the series and KaTeX renders equations. Browser storage protects an active session from an accidental refresh; it is not a permanent scientific repository.",
            ]),
            ("4.2 Prediction to evaluation", [
                "The workflow has four stages: Prediction generates T(t) from T0, Tenv, k and duration. Acquisition runs the timer and holds the sixteen-point log. Comparison overlays observation and prediction and lists signed residuals. Evaluation summarizes the absolute disagreement with MAE and prompts students to explain the physical causes.",
                "Manual entry is intentional. It avoids pairing and sensor-interface failures while keeping students responsible for each observation. A print view preserves the settings and telemetry for a worksheet. The instructor gate is only a classroom convenience and is not presented as a security boundary.",
            ]),
            ("4.3 Reliability and offline use", [
                "The core application needs no database or server runtime. For fully offline delivery, Chart.js, KaTeX, Lucide and fonts should be bundled locally. The printed procedure and task sheet provide an analog fallback when a school cannot depend on internet access or student devices.",
            ]),
        ],
        "figure": ("figure8_mission_control.jpg", "Figure 8. Mission Control prediction interface with model inputs and cooling curve."),
    },
    {
        "title": "5 Worked results and model comparison",
        "sections": [
            ("5.1 Observed ranking", [
                "The supplied worked example gives the smallest temperature drop for the full multilayer package (14.9 °C), followed by bubble wrap (30.0 °C). The bare control dropped 44.9 °C and the Mylar-only condition dropped 47.2 °C. Because T0 differed among runs, the ranking is based on drop and normalized retention, not final temperature alone.",
            ]),
            ("5.2 Model agreement", [
                "Dashboard scores were 93% for full MLI, 83% for bubble wrap, 94% for the bare control and 3% for Mylar only. The low Mylar score signals a severe model/build mismatch. Possible causes include liquid contact at the neck, an absent air gap, probe variation or a reference k that did not match the assembled condition.",
                "These data support a classroom worked example, not a general material certification. Repeated trials with calibrated probes are required before reporting uncertainty or population-level differences.",
            ]),
        ],
        "figure": ("figure11_results.png", "Figure 11. Observed temperature histories for the supplied four-condition worked example."),
        "table": {
            "headers": ["Condition", "T0", "T15", "Drop", "Score"],
            "rows": [
                ["Full MLI", "77.6 °C", "62.7 °C", "14.9 °C", "93%"],
                ["Bubble wrap", "82.6 °C", "52.6 °C", "30.0 °C", "83%"],
                ["Bare", "80.1 °C", "35.2 °C", "44.9 °C", "94%"],
                ["Mylar only", "80.5 °C", "33.3 °C", "47.2 °C", "3%"],
            ],
        },
    },
    {
        "title": "6 Uncertainty, safety and risk controls",
        "sections": [
            ("6.1 Measurement uncertainty", [
                "The principal uncertainty sources are probe contact with the jar wall, leakage at the neck, thermal stratification, bath warming, unequal immersion depth, different starting conditions, varying wrap area and layer compression. The lumped model also assumes a uniform core temperature and constant effective k. Residuals and MAE show disagreement but do not identify its cause.",
            ]),
            ("6.2 Mandatory controls", [
                "An instructor handles the near-80 °C water; boiling water is not used. Eye protection and heat-resistant gloves or tongs are required. The bath is stable, below waist height and separated from devices. Only undamaged heat-safe containers are used, closures are leak-tested, and displays and connectors remain dry. The run stops immediately for leakage, probe movement, wet insulation or an out-of-tolerance start.",
            ]),
            ("6.3 Risk assessment", [
                "The dominant hazard is scalding during filling and transfer. Administrative controls assign hot-water handling to an adult and keep the hot zone separate from data-entry devices. Engineering controls include secondary containment, supported probes and low-voltage thermometers. Continuing a leaking run would create both an unsafe condition and invalid data, so the stop rule is absolute.",
            ]),
            ("6.4 Recommended validation", [
                "Repeat every condition at least three times; randomize run order; weigh the water; photograph probe depth and closure; record actual bath temperature; and fit k from all valid points rather than a single endpoint. Report variability across repeats.",
            ]),
        ],
        "table": {
            "headers": ["Hazard or failure", "Control", "Stop criterion"],
            "rows": [
                ["Scalding", "Adult handling; PPE; stable bath", "Spill or unstable vessel"],
                ["Water/electronics", "Dry-zone separation", "Wet display or connector"],
                ["Loss of containment", "Pre-test leak check", "Leak or wet insulation"],
                ["Invalid measurement", "Centred supported probe", "Probe shift or bad T0"],
            ],
        },
    },
    {
        "title": "7 Budget, feasibility and classroom package",
        "sections": [
            ("7.1 Documented budgeting", [
                "The kickoff brief set an affordability target of around €50. The project correspondence documented two sourcing totals: €10.20 through AliExpress and €21.08 through Amazon marketplace links. The AliExpress option was rejected under TUM procurement rules; some Amazon marketplace items were blocked in the purchasing system. Cable glands and bubble wrap were confirmed as ordered, while the final invoiced total for all substituted items is not present in the supplied record. The defensible conclusion is therefore that the design was planned within the €50 envelope, not that either quotation equals the final cost.",
            ]),
            ("7.2 Reusability and operating cost", [
                "Jars, probes, bath container and fasteners are reusable. Cotton, bubble wrap and Mylar can also be reused when kept dry and uncompressed. The software has no license fee and runs in an ordinary browser. Schools should re-quote locally and record quantities, shipping and substitutions before adoption.",
            ]),
            ("7.3 Delivered learning package", [
                "The kit is accompanied by student and teacher manuals, an illustrated procedure, a two-page task sheet, revision flashcards, Mission Control and an aligned assessment. All materials use the same variables, settings and four configurations. This consistency reduces setup errors and lets teachers move between explanation, test and assessment without translating terminology.",
            ]),
        ],
        "table": {
            "headers": ["Budget record", "Amount", "Status"],
            "rows": [
                ["Kickoff affordability target", "≈ €50", "Course guideline"],
                ["AliExpress bulk proposal", "€10.20", "Rejected by procurement"],
                ["Amazon marketplace proposal", "€21.08", "Partly blocked/substituted"],
                ["Final invoiced total", "Not supplied", "Verify from receipts"],
            ],
        },
    },
    {
        "title": "8 Educational delivery and conclusions",
        "sections": [
            ("8.1 Student and teacher use", [
                "Students predict the ranking, build one condition, collect readings, calculate error and explain why the model and experiment differ. Teachers receive timing, safety guidance, discussion prompts and assessment criteria. Inquiry prompts such as “What happens if the wrap is compressed?” or “How does a warmer bath change the curve?” support design iteration without changing the core procedure.",
            ]),
            ("8.2 Main engineering conclusion", [
                "SPHERE closes a complete theory-to-evidence loop with accessible hardware. In the worked example, full MLI performed best and bubble wrap second. The weak Mylar-only result is pedagogically valuable because it shows that a good material for one transfer mechanism can perform poorly when another mechanism dominates. The correct conclusion is conditional on the water-bath boundary and construction quality.",
            ]),
            ("8.3 Next steps", [
                "The next test campaign should add replicate runs, randomized order, calibrated probes, measured water mass and run metadata. Mission Control should add CSV export and an offline asset bundle. The team should also retain a one-page equipment checklist and a receipt-based bill of materials for future classroom deployment.",
            ]),
            ("8.4 Scope statement", [
                "The kit is suitable for comparative classroom teaching when the stated controls are used. It is not a vacuum simulation and does not certify any material for aerospace, pressure-vessel, fire-protection or personal-protective use.",
            ]),
        ],
        "figure": ("figure13_complete_system.jpg", "Figure 13. Complete classroom system with four test articles and the digital interface."),
    },
    {
        "title": "9 Team report references and submission record",
        "sections": [
            ("References", [
                "[1] NASA Johnson Space Center, “Spacewalk spacesuit basics,” accessed 9 September 2026.",
                "[2] NIST Chemistry WebBook, SRD 69, “Water, liquid-phase heat capacity,” accessed 9 September 2026.",
                "[3] M. M. Finckenor and D. Dooling, Multilayer Insulation Material Guidelines, NASA/TP-1999-209263, 1999.",
                "[4] NASA, Passive Thermal Control Engineering Guidebook, Rev. 4.0, 2023.",
                "[5] Chart.js Contributors, Chart.js documentation, accessed 9 September 2026.",
                "[6] Khan Academy and KaTeX Contributors, KaTeX API documentation, accessed 9 September 2026.",
                "[7] SPHERE Project Team, Mission Control, https://hsp-mc.github.io/, accessed 9 September 2026.",
                "[8] Human Spaceflight Technology, Engineering Project Kick-Off presentation, TUM, 5 May 2026.",
                "[9] SPHERE Project Team, student manual, teacher manual, task sheet, flashcards, illustrated procedure and project telemetry, 2026.",
            ]),
            ("Submission record", [
                "Team engineering report: pages 1–10, including this reference page. Individual contributions: pages 11–14, one page per team member. Figure numbering follows the established project record. No appendix is included so the team report remains within the ten-page maximum.",
                "Contribution statements use only responsibilities documented in the supplied report, project correspondence and four-presenter guide. Where the record does not assign a separate design/build task, the statement says so rather than inferring work.",
            ]),
        ],
        "table": {
            "headers": ["Member", "Documented primary responsibility"],
            "rows": [
                ["Piyath Vithanage", "Mission Control website, graphing and data-visualization workflow"],
                ["Dilan Fernando", "Thermodynamic model, physical test system, analysis, technical writing and integration"],
                ["Elio Krollpfeiffer", "Final presentation opening, project purpose and learning objectives"],
                ["Nuhansee Migelhewage", "Final presentation evidence, interpretation and closing; project follow-up communication"],
            ],
        },
    },
    {
        "title": "Individual contribution — Piyath Vithanage",
        "individual": True,
        "sections": [
            ("Documented responsibility", [
                "My main contribution was the design and implementation of Mission Control and its graphing and data-visualization workflow. I organized the application as a single-page browser experience covering briefing, assembly, simulation, measurement, study content and assessment. The build uses HTML for structure, CSS for the responsive interface and JavaScript for model evaluation, timing, telemetry, charts and application state.",
            ]),
            ("Implementation decisions", [
                "I connected the selected configuration to a reference k value and consistent visual identity. Inputs for T0, Tenv and duration generate the prediction; the measurement screen validates and stores each manually entered point. Browser storage protects an active session from a page refresh. I designed the layout for both desktops and tablets, using explicit labels and high-contrast panels so the experiment remains usable on common school devices.",
                "I deliberately kept thermometer acquisition manual and avoided a native app or Bluetooth link. That choice reduces pairing and device-permission failures while keeping students responsible for observation. The static application can be hosted without a database and can be prepared for offline use by bundling its external libraries.",
            ]),
            ("Analysis and presentation", [
                "I implemented overlays of predicted and measured temperatures, signed residuals, MAE and a printable telemetry record. I maintained consistent axes, units, configuration names and colors across the interface and report. For the final presentation I owned the Mission Control demonstration and fallback decision, including the verified full-MLI example with k = 0.015 min⁻¹, T(15) = 63.9 °C and MAE = 0.98 °C.",
            ]),
            ("Reflection", [
                "The main improvement I would make is CSV export with run metadata and a packaged offline build. These changes would make the classroom record more reproducible without adding sensor complexity.",
            ]),
        ],
    },
    {
        "title": "Individual contribution — Dilan Fernando",
        "individual": True,
        "sections": [
            ("Documented responsibility", [
                "My main technical responsibility was the thermodynamic model and the interpretation of the physical results. I selected the lumped Newtonian-cooling model because it preserves the relationship between thermal mass, boundary temperature and cooling rate while remaining usable by secondary-school students. I defined k as an effective coefficient for the full test system and separated it explicitly from material thermal conductivity.",
            ]),
            ("Physical system and analysis", [
                "I established the 100 mL core, approximately 80 °C start and fifteen-minute measurement window; integrated matched jars, centred probes, cold-bath immersion and fixed layer construction; and aligned these settings with the student procedure. I compared the worked series using temperature drop, residuals, MAE and fitted k. I treated the Mylar-only mismatch as evidence about boundary conditions and build quality, not as a universal material conclusion.",
            ]),
            ("Safety, procurement and documentation", [
                "I documented adult handling of hot water, stable secondary containment, dry electronics, leak checks and immediate stop criteria. I also assembled component sourcing options. The correspondence records an AliExpress proposal of €10.20 and an Amazon marketplace proposal of €21.08; procurement restrictions rejected or blocked parts of those proposals, so I do not present either as the final invoiced cost.",
                "My remaining work covered test planning, result interpretation, technical writing and alignment of the student manual, teacher manual, task sheet, illustrated procedure and website. For the final presentation I was assigned the hardware, insulation builds, model, method and safety section.",
            ]),
            ("Reflection", [
                "The next technical priority is a replicated test campaign with measured water mass, calibrated probes and regression-based estimates of k. That would separate construction effects from random variation and improve the teaching dataset.",
            ]),
        ],
    },
    {
        "title": "Individual contribution — Elio Krollpfeiffer",
        "individual": True,
        "sections": [
            ("Documented contribution", [
                "The supplied project record documents my final-presentation responsibility for the opening and objectives section. I was assigned slides 1–4 and the first response role for questions about project purpose, audience and learning objectives. My task was to give the audience a clear reason to care about the project, define SPHERE accurately and establish the learning sequence before the technical sections began.",
            ]),
            ("Communication of the engineering concept", [
                "I framed SPHERE as a measurable classroom experiment inspired by spacesuit thermal protection. The opening explains the central question—how layered materials change the cooling rate of a protected thermal mass—and introduces the warm-water core, repeatable cold boundary and four insulation builds. It also presents the project as an integrated package of physical kit, Mission Control, manuals, illustrated procedure, task sheet, flashcards and assessment.",
                "I communicated the learning objectives as actions: students distinguish the three heat-transfer mechanisms, use Newton's cooling model, collect a sixteen-point temperature history and explain differences between prediction and observation. I also emphasized that the water bath is an analogy that makes heat transfer visible, not a vacuum simulation.",
            ]),
            ("Team handoff and scope of this statement", [
                "My handoff connected the educational purpose to Dilan's explanation of hardware, insulation and thermodynamics. The four-presenter guide assigned approximately 2.5–3 minutes to this section and required one complete conclusion before naming the next speaker.",
                "The supplied report does not document a separate design, build or software work package under my name. To avoid overstating responsibility, this contribution statement records only the presentation and communication role supported by the available project record. Any additional work should be added by the team only if it can be verified from its planning notes or version history.",
            ]),
            ("Reflection", [
                "The opening is most effective when it leads with what students do rather than with a long theory explanation. That keeps the audience oriented and creates a clear path into the technical evidence.",
            ]),
        ],
    },
    {
        "title": "Individual contribution — Nuhansee Migelhewage",
        "individual": True,
        "sections": [
            ("Documented contribution", [
                "The supplied project record documents my final-presentation responsibility for evidence and closing. I was assigned slides 12–14 and the first response role for questions about results, uncertainty, the classroom package and next steps. Project correspondence also records my follow-up with the teaching team after submission of the initial draft.",
            ]),
            ("Interpretation of evidence", [
                "My presentation section states the measured ranking without overclaiming: full MLI had the smallest drop at 14.9 °C, bubble wrap ranked second, and the bare and Mylar-only samples cooled more quickly. Because the trials started at different temperatures, I explained why temperature drop and normalized retention are fairer than final temperature alone. I also stated that one worked run supports discussion but not material validation.",
                "I explained the unusual Mylar-only result through mechanism and boundary condition. Reflective foil targets infrared radiation; in the water bath, direct liquid contact, leakage and construction quality can dominate. The result therefore demonstrates the importance of test conditions and does not imply that reflective insulation is ineffective in space.",
            ]),
            ("Project close and scope of this statement", [
                "I closed by describing the complete offer: a reusable experiment, Mission Control, manuals, illustrated procedure, task sheet, flashcards and aligned assessment. The closing connects theory, measurement and engineering judgment and invites questions on the experiment, model, software and classroom use.",
                "The supplied report does not document a separate design, build or software work package under my name. I have therefore limited this statement to responsibilities supported by the presenter guide and correspondence. Any additional contribution should be inserted only when the team can verify it from internal notes or repository history.",
            ]),
            ("Reflection", [
                "The strongest closing does not repeat every feature. It states the result, explains the limitation and leaves the audience with the integrated learning workflow as the project's main value.",
            ]),
        ],
    },
]


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_border(cell, color="D9D9D9", size="6"):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = "w:" + edge
        node = borders.find(qn(tag))
        if node is None:
            node = OxmlElement(tag)
            borders.append(node)
        node.set(qn("w:val"), "single")
        node.set(qn("w:sz"), size)
        node.set(qn("w:color"), color)


def set_cell_margins(cell, top=80, start=100, bottom=80, end=100):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for m, v in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn("w:" + m))
        if node is None:
            node = OxmlElement("w:" + m)
            tc_mar.append(node)
        node.set(qn("w:w"), str(v))
        node.set(qn("w:type"), "dxa")


def add_page_number(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = paragraph.add_run("Page ")
    fld = OxmlElement("w:fldSimple")
    fld.set(qn("w:instr"), "PAGE")
    run._r.addnext(fld)


def set_run_font(run, name="Liberation Sans", size=9.5, bold=None, color=None):
    run.font.name = name
    run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), name)
    run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), name)
    run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if color:
        run.font.color.rgb = RGBColor.from_string(color)


def add_body(doc, text, compact=False):
    p = doc.add_paragraph(style="Body Text")
    p.paragraph_format.space_after = Pt(3 if compact else 5)
    p.paragraph_format.line_spacing = 1.03 if compact else 1.06
    p.paragraph_format.keep_together = True
    r = p.add_run(text)
    set_run_font(r, size=9.2 if compact else 9.5)
    return p


def add_heading(doc, text):
    p = doc.add_paragraph(style="Heading 2")
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.space_before = Pt(7)
    p.paragraph_format.space_after = Pt(3)
    r = p.add_run(text)
    set_run_font(r, size=11, bold=True, color="000000")
    return p


def add_table(doc, spec):
    table = doc.add_table(rows=1, cols=len(spec["headers"]))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True
    for i, h in enumerate(spec["headers"]):
        c = table.rows[0].cells[i]
        c.text = h
        c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        set_cell_shading(c, "203864")
        set_cell_border(c)
        set_cell_margins(c)
        for p in c.paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in p.runs:
                set_run_font(r, size=8.5, bold=True, color="FFFFFF")
    for ri, row in enumerate(spec["rows"]):
        cells = table.add_row().cells
        for i, value in enumerate(row):
            c = cells[i]
            c.text = value
            c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            set_cell_border(c)
            set_cell_margins(c)
            if ri % 2:
                set_cell_shading(c, "F3F6FA")
            for p in c.paragraphs:
                p.paragraph_format.space_after = Pt(0)
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER if i > 0 and len(value) < 22 else WD_ALIGN_PARAGRAPH.LEFT
                for r in p.runs:
                    set_run_font(r, size=8.0)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)
    return table


def add_figure(doc, filename, caption, max_width_cm=15.5, max_height_cm=6.0):
    path = ASSETS / filename
    with Image.open(path) as im:
        w, h = im.size
    ratio = w / h
    width = min(max_width_cm, max_height_cm * ratio)
    height = width / ratio
    if height > max_height_cm:
        height = max_height_cm
        width = height * ratio
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.space_before = Pt(5)
    p.paragraph_format.space_after = Pt(2)
    p.add_run().add_picture(str(path), width=Cm(width), height=Cm(height))
    cp = doc.add_paragraph()
    cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cp.paragraph_format.keep_together = True
    cp.paragraph_format.space_after = Pt(4)
    r = cp.add_run(caption)
    set_run_font(r, size=8, color="404040")


def configure_docx():
    doc = Document()
    sec = doc.sections[0]
    sec.page_width = Cm(21.0)
    sec.page_height = Cm(29.7)
    sec.top_margin = Cm(1.65)
    sec.bottom_margin = Cm(1.55)
    sec.left_margin = Cm(1.75)
    sec.right_margin = Cm(1.75)
    sec.header_distance = Cm(0.7)
    sec.footer_distance = Cm(0.65)

    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Liberation Sans"
    normal.font.size = Pt(9.5)
    normal._element.rPr.rFonts.set(qn("w:ascii"), "Liberation Sans")
    normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Liberation Sans")
    for name, size in (("Title", 24), ("Heading 1", 16), ("Heading 2", 11)):
        st = styles[name]
        st.font.name = "Liberation Sans"
        st.font.size = Pt(size)
        st.font.color.rgb = RGBColor(0, 0, 0)
        st._element.rPr.rFonts.set(qn("w:ascii"), st.font.name)
        st._element.rPr.rFonts.set(qn("w:hAnsi"), st.font.name)
    if "Body Text" not in styles:
        styles.add_style("Body Text", WD_STYLE_TYPE.PARAGRAPH)
    body = styles["Body Text"]
    body.font.name = "Liberation Sans"
    body.font.size = Pt(9.5)
    body._element.rPr.rFonts.set(qn("w:ascii"), "Liberation Sans")
    body._element.rPr.rFonts.set(qn("w:hAnsi"), "Liberation Sans")

    header = sec.header.paragraphs[0]
    header.alignment = WD_ALIGN_PARAGRAPH.LEFT
    rr = header.add_run("SPHERE  |  Human Spaceflight Technology  |  Team Engineering Report")
    set_run_font(rr, size=8, color="666666")
    add_page_number(sec.footer.paragraphs[0])
    for r in sec.footer.paragraphs[0].runs:
        set_run_font(r, size=8, color="666666")
    return doc


def build_docx():
    doc = configure_docx()
    for idx, page in enumerate(pages):
        if idx:
            doc.add_page_break()
        if page.get("kind") == "cover":
            p = doc.add_paragraph(style="Title")
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(18)
            p.paragraph_format.space_after = Pt(4)
            r = p.add_run(page["title"])
            set_run_font(r, name="Liberation Sans", size=24, bold=True)
            sp = doc.add_paragraph()
            sp.paragraph_format.space_after = Pt(14)
            sr = sp.add_run(page["subtitle"])
            set_run_font(sr, name="Liberation Sans", size=14, color="203864")
            for m in page["meta"]:
                mp = doc.add_paragraph()
                mp.paragraph_format.space_after = Pt(1)
                mr = mp.add_run(m)
                set_run_font(mr, size=9.5, color="404040")
            doc.add_paragraph().paragraph_format.space_after = Pt(3)
            lp = doc.add_paragraph()
            lp.paragraph_format.space_after = Pt(10)
            lr = lp.add_run(page["lead"])
            set_run_font(lr, size=11)
        else:
            p = doc.add_paragraph(style="Heading 1")
            p.paragraph_format.space_after = Pt(7)
            p.paragraph_format.keep_with_next = True
            r = p.add_run(page["title"])
            set_run_font(r, name="Liberation Sans", size=16, bold=True)

        compact = bool(page.get("individual"))
        for heading, paras in page.get("sections", []):
            add_heading(doc, heading)
            for para in paras:
                add_body(doc, para, compact=compact)
        if page.get("figure"):
            add_figure(doc, *page["figure"], max_height_cm=5.3 if page.get("table") else 7.0)
        if page.get("table"):
            add_table(doc, page["table"])

    props = doc.core_properties
    props.title = TITLE
    props.subject = "Final engineering report and individual contribution statements"
    props.author = "SPHERE Project Team"
    props.keywords = "thermal insulation, Newtonian cooling, classroom experiment, spacesuit"
    out = OUT / "SPHERE_Final_Engineering_Report.docx"
    doc.save(out)
    return out


LATEX_SPECIAL = {
    "&": r"\&", "%": r"\%", "$": r"\$", "#": r"\#", "_": r"\_",
    "{": r"\{", "}": r"\}", "~": r"\textasciitilde{}", "^": r"\textasciicircum{}",
}


def tex_escape(s):
    s = "".join(LATEX_SPECIAL.get(ch, ch) for ch in s)
    s = s.replace("°", r"\textdegree{}")
    s = s.replace("≈", r"$\approx$")
    s = s.replace("−", "--")
    s = s.replace("·", r"\,\textperiodcentered\,")
    s = s.replace("¹", r"$^{-1}$")
    return s


def tex_table(spec):
    n = len(spec["headers"])
    widths = "|" + "|".join([">{\\raggedright\\arraybackslash}X"] * n) + "|"
    lines = [r"\begin{center}\small", rf"\begin{{tabularx}}{{\textwidth}}{{{widths}}}\hline",]
    lines.append(" & ".join(r"\textbf{" + tex_escape(x) + "}" for x in spec["headers"]) + r" \\ \hline")
    for row in spec["rows"]:
        lines.append(" & ".join(tex_escape(x) for x in row) + r" \\ \hline")
    lines += [r"\end{tabularx}", r"\end{center}"]
    return "\n".join(lines)


def build_tex():
    preamble = r'''\documentclass[10pt,a4paper]{article}
\usepackage[margin=1.7cm,top=1.65cm,bottom=1.55cm]{geometry}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage{lmodern,graphicx,tabularx,array,xcolor,booktabs,fancyhdr,hyperref,textcomp}
\definecolor{SPHEREblue}{HTML}{203864}
\hypersetup{colorlinks=true,linkcolor=SPHEREblue,urlcolor=SPHEREblue}
\pagestyle{fancy}\fancyhf{}
\lhead{\footnotesize SPHERE | Human Spaceflight Technology | Team Engineering Report}
\rfoot{\footnotesize Page \thepage}
\setlength{\parindent}{0pt}\setlength{\parskip}{4pt}
\renewcommand{\arraystretch}{1.15}
\begin{document}
'''
    out = [preamble]
    for idx, page in enumerate(pages):
        if idx:
            out.append(r"\newpage")
        if page.get("kind") == "cover":
            out.append(r"{\Huge\bfseries " + tex_escape(page["title"]) + r"\par}")
            out.append(r"\vspace{2mm}{\Large\color{SPHEREblue} " + tex_escape(page["subtitle"]) + r"\par}\vspace{6mm}")
            for m in page["meta"]:
                out.append(tex_escape(m) + r"\\")
            out.append(r"\vspace{5mm}{\large " + tex_escape(page["lead"]) + r"\par}")
        else:
            out.append(r"\section*{" + tex_escape(page["title"]) + "}")
        for heading, paras in page.get("sections", []):
            out.append(r"\subsection*{" + tex_escape(heading) + "}")
            for para in paras:
                out.append(tex_escape(para) + "\n")
        if page.get("figure"):
            fn, cap = page["figure"]
            out.append(r"\begin{figure}[h!]\centering")
            out.append(r"\includegraphics[width=0.78\textwidth,height=6.2cm,keepaspectratio]{latex_assets/" + fn + "}")
            out.append(r"\caption*{\small " + tex_escape(cap) + "}")
            out.append(r"\end{figure}")
        if page.get("table"):
            out.append(tex_table(page["table"]))
    out.append(r"\end{document}")
    tex = OUT / "SPHERE_Final_Engineering_Report.tex"
    tex.write_text("\n".join(out), encoding="utf-8")
    return tex


if __name__ == "__main__":
    print(build_docx())
    print(build_tex())
