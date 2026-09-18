from pathlib import Path
from xml.sax.saxutils import escape
import re
import shutil

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.shared import Cm, Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "output" / "final"
OUT.mkdir(parents=True, exist_ok=True)
ASSET_OUT = OUT / "assets"
TEX_PATH = OUT / "SPHERE_Team_Engineering_Report_IEEE_Two_Column.tex"
DOCX_PATH = OUT / "SPHERE_Team_Engineering_Report_IEEE_Two_Column.docx"


TEAM_PAGES = [
    {
        "title": "Executive Summary and Project Definition",
        "blocks": [
            ("p", "This report presents our SPACESUIT THERMAL SHIELDING KIT. We built the project around one engineering question: how much does a chosen layer arrangement reduce the cooling rate of the same 100 mL water-filled core under the same cold-water boundary? The kit combines four physical test articles, a browser-based Mission Control page, manual temperature logging, and a Newtonian cooling model. Our aim was to make heat transfer measurable in one school lesson without requiring specialist data-acquisition hardware."),
            ("p", "The four conditions are a bare control, two layers of bubble wrap, a Mylar-only wrap, and a full multilayer package made from cotton, bubble wrap, and Mylar. Students record the core temperature once per minute from 0 to 15 minutes. The website plots the recorded values against a reference curve and calculates residuals and mean absolute error. In the worked data, the full multilayer package retained the most heat. Mylar alone performed poorly in the water-bath setup, which showed why a reflective material cannot be judged without considering contact, convection, wetting, gaps, and closure quality."),
            ("h", "Main outcome"),
            ("p", "We produced a reusable experiment that links construction, measurement, modelling, and evaluation. The activity does not reproduce vacuum and does not test materials for real spacesuit use. It is a controlled teaching model for comparing cooling behaviour. The final design uses identical glass jars, a target start temperature near 80 °C, a measured ice-water bath, a centred probe, and a 16-point temperature record."),
            ("table", [["Item", "Final project setting"], ["Thermal core", "100 mL water in matched glass jars"], ["Boundary", "Measured ice-water bath"], ["Sampling", "Every minute from 0 to 15 min"], ["Outputs", "Measured curve, model curve, residuals, MAE"], ["Lesson length", "About 55-70 min including setup and review"]]),
            ("h", "Project scope"),
            ("p", "The team developed the thermal model, experimental method, physical test articles, browser application, telemetry workflow, assessment activities, classroom documentation, safety guidance, and final learning resources as one integrated engineering package."),
        ],
    },
    {
        "title": "1 Project Context and Requirements",
        "blocks": [
            ("h", "1.1 Context"),
            ("p", "SPHERE uses human-spaceflight engineering as the setting for classroom activities. Thermal protection was selected because students can see the construction, measure a temperature change, and compare a real curve with a mathematical prediction. The spacesuit story gives the task a clear purpose, but the measured system is a jar in a water bath. This distinction remains visible throughout the manuals and website."),
            ("h", "1.2 Engineering requirements"),
            ("bullets", ["Produce a visible difference between configurations within a 15-minute test.", "Use parts that a school can replace locally.", "Keep the procedure understandable without prior differential-equation study.", "Run on ordinary laptops and tablets without accounts, pairing, or a native app.", "Keep hot water, cold bath water, and electronic displays separated.", "Use the same variables and test settings in the website, manuals, worksheet, and report."]),
            ("h", "1.3 Learning requirements"),
            ("p", "Students should be able to distinguish conduction, convection, and radiation; explain the meaning of an effective cooling constant; collect an ordered time series; compare measurement with prediction; and discuss uncertainty. We also wanted them to see that an unexpected result is useful evidence. A disagreement should lead to checks of the setup and assumptions, not to editing the data until it matches the model."),
            ("table", [["Requirement", "Design response", "Check"], ["Comparable cores", "Matched 100 mL jars", "Same geometry and fill"], ["Repeatable boundary", "Shared ice-water bath", "Measure bath temperature"], ["Safe handling", "Adult pours hot water", "Pre-run safety checklist"], ["Accessible software", "Static browser app", "No login or driver"], ["Traceable result", "16 raw readings retained", "Table and graph agree"]]),
            ("h", "1.4 Decisions made during development"),
            ("p", "The team first considered automatic sensors and wireless transfer. That option was rejected because it would shift attention from the thermal problem to pairing, drivers, and battery faults. Manual entry makes the observation step explicit and is easier for a teacher to recover when something goes wrong. The design question was also changed from a general spacesuit demonstration to a controlled comparison of cooling rate. This change produced measurable inputs, a fair-test procedure, and a result that students could defend."),
        ],
    },
    {
        "title": "2 Thermodynamic Model",
        "blocks": [
            ("h", "2.1 Lumped cooling model"),
            ("p", "We model the water as one thermal mass with a uniform temperature. This is an approximation, but it gives a useful reference for a short classroom test. The stored sensible energy change is"),
            ("eq", r"Q = m c_p \Delta T."),
            ("p", "For 100 mL of water, the mass is approximately 0.10 kg. With a water heat capacity of about 4184 J kg$^{-1}$ K$^{-1}$, a 10 K drop represents about 4.18 kJ leaving the water. The jar, probe, and insulation also store energy, so this value is an estimate rather than a complete energy balance."),
            ("p", "For a body losing heat to an environment at approximately constant temperature, we use"),
            ("eq", r"m c_p \frac{dT}{dt} = -hA(T-T_{env}),"),
            ("p", "which gives the reference curve"),
            ("eq", r"T(t)=T_{env}+(T_0-T_{env})e^{-kt}."),
            ("p", "The website uses minutes, so the effective cooling constant k is in min$^{-1}$. It combines geometry, boundary conditions, thermal mass, and all heat-loss paths. It is not the material conductivity of cotton, bubble wrap, or Mylar."),
            ("h", "2.2 Model coefficients"),
            ("table", [["Condition", "Reference k (min^-1)", "Model T15 for 80/0 °C"], ["Bare control", "0.150", "8.4 °C"], ["Bubble wrap", "0.040", "43.9 °C"], ["Mylar only", "0.121", "13.0 °C"], ["Full MLI", "0.015", "63.9 °C"]]),
            ("h", "2.3 Interpretation"),
            ("p", "Cotton and bubble wrap reduce direct solid contact and trap low-density regions. Mylar mainly changes radiative exchange when a suitable air gap exists. In a water bath, conduction and convection can dominate, especially if water touches the wrap or enters through the neck. This is why the Mylar-only condition should not be treated as a direct test of spacecraft multilayer insulation."),
            ("p", "For runs with different starting temperatures, we compare the dimensionless temperature above the boundary:"),
            ("eq", r"\theta(t)=\frac{T(t)-T_{env}}{T_0-T_{env}}."),
        ],
    },
    {
        "title": "3 Hardware and Test Configurations",
        "blocks": [
            ("h", "3.1 Apparatus"),
            ("p", "The physical system uses four matched 100 mL glass jars, four digital probe thermometers, a separate bath thermometer, one stable bucket or deep container, insulation materials, a timer, towels, and heat-resistant handling tools. Each probe is suspended near the centre of the water volume. The display and cable connector stay dry and outside the bath."),
            ("image", ("images/equipments.png", "Image A. Complete apparatus set used for the four-condition classroom experiment.", 0.78)),
            ("image", ("images/hardware-schematic.png", "Image B. Capsule arrangement showing the warm-water core, centred probe, insulation wrap, and ice-water boundary.", 0.98)),
            ("table", [["Condition", "Construction", "Purpose"], ["Bare control", "Jar with no added insulation", "Reference heat-loss path"], ["Bubble wrap", "Two even layers with cells uncrushed", "Trapped-air layer"], ["Mylar only", "One reflective layer, neck closed", "Reflective layer by itself"], ["Full MLI", "Cotton, bubble wrap, outer Mylar", "Combined mechanisms"]]),
            ("h", "3.2 Construction controls"),
            ("p", "Small assembly differences changed the response during development. A probe touching the glass did not represent the bulk water. Tight tape flattened bubble cells. A loose opening around the probe created a direct heat-loss path and could let bath water enter. We therefore treated probe position, layer compression, closure, and immersion depth as controlled variables."),
            ("bullets", ["Use jars with the same diameter, wall thickness, and fill height.", "Cut insulation pieces to the same nominal size for repeated trials.", "Secure each layer only tightly enough to stop movement.", "Keep the jar neck and probe opening as consistent as possible.", "Record any wetting, gap, leak, or probe movement with the run data."]),
            ("image", ("images/barecapsule.jpeg", "Image C. Bare control capsule with the probe centred through the lid.", 0.53)),
            ("h", "3.3 Full multilayer package"),
            ("p", "The full package is built from the core outward: cotton next to the jar, two layers of bubble wrap around the cotton, and Mylar on the outside. The order was chosen so the soft inner layer follows the jar, the bubble layer provides trapped air, and the reflective sheet forms the outer surface. This arrangement is a classroom analogue only. Real spacecraft multilayer insulation uses carefully controlled low-emittance films, spacers, vacuum conditions, and qualification tests."),
            ("image", ("images/bubblewrap-only.png", "Image D. Bubble-wrap test article with two uncrushed layers and a closed probe opening.", 0.43)),
            ("image", ("images/full-mli.png", "Image E. Completed multilayer test article with the external reflective layer and digital probe.", 0.43)),
            ("h", "3.4 Integration with the learning kit"),
            ("p", "The hardware labels match the configuration names in Mission Control. This prevents a group from choosing one model coefficient while testing another construction. The same four names appear in the manuals, worksheet, result table, and assessment questions."),
        ],
    },
    {
        "title": "4 Experimental Method and Safety",
        "blocks": [
            ("h", "4.1 Controlled procedure"),
            ("numbered", ["Prepare a stable dry work area. Keep laptops and displays away from the bath.", "Build the assigned insulation and check the jar with cool water.", "Prepare the ice-water bath and record its actual temperature.", "Add 100 mL of water near 80 °C and record the actual starting temperature.", "Centre the probe, close the neck, immerse the jar to the agreed depth, and start the timer.", "Record the core temperature at t = 0 and once per minute through t = 15 min.", "Enter the readings without smoothing them. Calculate drop, residuals, MAE, and an effective k.", "Compare conditions and list the factors that limit the conclusion."]),
            ("h", "4.2 Fair-test criteria"),
            ("p", "Every condition should use the same jar geometry, water volume, probe depth, immersion depth, bath location, and timing method. The bath temperature must be measured rather than assumed. If a reading is late, the actual time should be recorded. A complete run contains 16 ordered time-temperature pairs or a written reason for each missing point."),
            ("h", "4.3 Safety precautions and risk assessment"),
            ("p", "Risks were assessed qualitatively from the likelihood and consequence of each hazard after controls were applied. The test must stop if a jar cracks, the bath becomes unstable, water reaches an electrical connector, or a significant leak occurs. Hot water is handled only by an adult or trained supervisor, and the work area remains dry and unobstructed."),
            ("table", [["Hazard", "Main risk", "Required control", "Residual"], ["Hot water", "Burn", "Supervised pouring; gloves or tongs", "Low"], ["Glass jar", "Cuts or spill", "Inspect before use; stable container", "Low"], ["Water and electronics", "Shock or damage", "Keep laptops, plugs, and displays dry", "Low"], ["Unstable bath or leak", "Scald or flooding", "Stop test; isolate and clean area", "Low"], ["Wet floor", "Slip", "Use towels and remove spills immediately", "Low"]]),
            ("h", "4.4 Data quality"),
            ("p", "The original readings were retained, including the unexpected Mylar-only curve. The purpose of the model is to support a comparison, not to force a match. Repeating each configuration at least three times and randomising the run order would improve the evidence. Future trials should also record water mass, bath temperature, probe depth, immersion depth, and construction notes for every run."),
        ],
    },
    {
        "title": "5 Software and Data Workflow",
        "blocks": [
            ("h", "5.1 Architecture"),
            ("p", "Mission Control is a browser-based single-page application built with HTML, CSS, and JavaScript. Chart.js draws prediction and telemetry curves, while KaTeX renders the mathematical notation. Local browser storage keeps the selected model, generated prediction, measurements, quiz state, and fallback leaderboard results. The core laboratory runs without a native installation, Bluetooth link, or device driver. The current project also supports an optional Supabase connection for a shared classroom quiz leaderboard; when it is not configured or cannot be reached, the leaderboard falls back to local storage."),
            ("h", "5.2 Workflow"),
            ("table", [["Stage", "Website action", "Student action"], ["Prediction", "Calculates T(t) from T0, Tenv, k, and time", "Choose a condition and record assumptions"], ["Measurement", "Provides timer and 16-point log", "Read and enter one value per minute"], ["Comparison", "Overlays measured and predicted curves", "Inspect curve shape and residuals"], ["Evaluation", "Calculates MAE and feedback score", "Explain the disagreement physically"], ["Assessment", "Runs a timed ten-question challenge", "Review answers and compare team score"]]),
            ("h", "5.3 Graphing choices"),
            ("p", "The prediction and telemetry use the same time axis and configuration colours. Axes include units, and the plotted interval matches the 15-minute procedure. The data table keeps the measured value separate from the predicted value. This makes it clear which numbers came from the physical test and which came from the model."),
            ("image", ("images/predicted-curve.png", "Image F. Current Mission Control prediction interface and 15-minute cooling curve.", 0.98)),
            ("p", "The residual at each time is the measured value minus the model value. We use mean absolute error as a simple summary:"),
            ("eq", r"\mathrm{MAE}=\frac{1}{n}\sum_{i=1}^{n}|T_{meas,i}-T_{model,i}|."),
            ("h", "5.4 Reliability and limitations"),
            ("p", "The site is easy to publish with GitHub Pages and can be opened from a local web server. The current build still loads several browser libraries and fonts from public content-delivery networks, so complete offline use requires those dependencies to be bundled locally. The optional shared leaderboard needs the supplied Supabase configuration and database setup; otherwise the application clearly reports local mode. CSV export and structured run metadata remain useful future additions. The dashboard score is classroom feedback, not a formal statistical validation result."),
        ],
    },
    {
        "title": "6 Experimental Results",
        "blocks": [
            ("h", "6.1 Recorded endpoints"),
            ("p", "The worked dataset contains 16 readings for each condition. The endpoint summary is shown below. Because starting temperatures were not identical, final temperature alone is not enough for a fair comparison; the temperature drop and full curve are more useful."),
            ("table", [["Condition", "T0", "T15", "Drop", "Dashboard score"], ["Full MLI", "77.6 °C", "62.7 °C", "14.9 °C", "93%"], ["Bubble wrap", "82.6 °C", "52.6 °C", "30.0 °C", "83%"], ["Bare control", "80.1 °C", "35.2 °C", "44.9 °C", "94%"], ["Mylar only", "80.5 °C", "33.3 °C", "47.2 °C", "3%"]]),
            ("h", "6.2 Main result"),
            ("p", "The full multilayer package had the smallest 15-minute temperature drop and therefore retained the most heat in this run. Bubble wrap ranked second. The bare control and Mylar-only condition cooled much faster. The Mylar-only result does not show that reflective insulation is generally ineffective. It shows that the selected reference coefficient and the physical water-bath construction did not agree for that run."),
            ("h", "6.3 Representative telemetry"),
            ("table", [["Time", "Full MLI", "Bubble", "Mylar", "Bare"], ["0 min", "77.6", "82.6", "80.5", "80.1"], ["3 min", "75.6", "72.5", "55.8", "59.9"], ["6 min", "73.9", "65.6", "44.9", "47.1"], ["9 min", "70.6", "60.6", "38.9", "40.9"], ["12 min", "67.4", "56.1", "35.5", "37.3"], ["15 min", "62.7", "52.6", "33.3", "35.2"]]),
            ("h", "6.4 Fitted cooling constant"),
            ("p", "A point estimate of k can be calculated when T(t), T0, and Tenv are known:"),
            ("eq", r"k=-\frac{1}{t}\ln\left(\frac{T(t)-T_{env}}{T_0-T_{env}}\right)."),
            ("p", "A fit using all usable points is better than a one-point estimate because it uses the curve shape and reduces the influence of one reading. Repeated trials are still needed before reporting material rankings as stable results."),
        ],
    },
    {
        "title": "7 Analysis and Model Limitations",
        "blocks": [
            ("h", "7.1 Comparison with the model"),
            ("p", "The full multilayer package and bare control followed their selected reference curves more closely than the Mylar-only case. The model is useful because it gives the class a common baseline, but k is an effective system value. It changes when the jar, fill, bath, probe, closure, or layer contact changes. A coefficient chosen for one setup should not be presented as a fixed property of a material."),
            ("h", "7.2 Likely error sources"),
            ("table", [["Source", "Effect on result", "Control"], ["Probe touches glass", "Biased core reading", "Centre probe with a guide"], ["Bath warms", "Changing boundary", "Measure before and during run"], ["Different start temperatures", "Unfair final-temperature ranking", "Use drop, theta, or fitted k"], ["Compressed layers", "Higher solid conduction", "Use repeatable light fastening"], ["Water reaches wrap", "Extra conductive path", "Improve closure and log wetting"], ["Timing delay", "Shifted data point", "Record actual timestamp"]]),
            ("h", "7.3 Limits of the analogy"),
            ("p", "A spacesuit operates in vacuum outside the garment, where there is no external air convection. The classroom jar is surrounded by water, so convection and conduction are strong. Real spacesuits also use an active liquid-cooling and ventilation garment. The activity therefore teaches the method of thermal testing and model checking; it does not reproduce the full physics or certify the materials."),
            ("h", "7.4 Confidence in the result"),
            ("p", "The recorded ordering is valid as a description of the worked runs: full MLI, bubble wrap, bare control, then Mylar-only by 15-minute temperature drop. Confidence in a general ranking is limited because the available dataset contains one series per condition and incomplete metadata for some construction details. We would not claim that the same ordering will always occur until repeated trials show the variation."),
            ("h", "7.5 Changes for the next campaign"),
            ("bullets", ["Run at least three repeats per condition and randomise the order.", "Use a simple probe-position jig and a fixed immersion-depth mark.", "Record bath temperature at the start and end of every run.", "Weigh the water instead of relying only on nominal volume.", "Store construction notes and export all telemetry as CSV."]),
        ],
    },
    {
        "title": "8 Educational Delivery and Feasibility",
        "blocks": [
            ("h", "8.1 Classroom sequence"),
            ("p", "The lesson starts with a short briefing on heat transfer and the limits of the spacesuit analogy. Groups then predict which condition will retain the most heat, assemble or inspect their test article, run the 15-minute measurement, and compare the recorded curve with the model. The final discussion asks students to defend a ranking and explain at least one source of disagreement."),
            ("h", "8.2 Supporting materials"),
            ("p", "The current project includes the Mission Control website, student manual, teacher manual and marking guide, task sheet, printable flashcards, illustrated procedure, leaderboard setup guide, and final presentation material. The learning materials use one aligned ten-question framework: written-response questions in the printable set, multiple-choice questions online, and complete solution guidance for students and instructors. We used the same configuration names, variables, test duration, and core volume throughout."),
            ("h", "8.3 Assessment"),
            ("table", [["Evidence", "What it checks"], ["Prediction", "Reasoning from heat-transfer mechanisms"], ["Raw data table", "Careful measurement and units"], ["Model comparison", "Use of k, residuals, and MAE"], ["Evaluation paragraph", "Limits, uncertainty, and fair testing"], ["Open response", "Explanation in the student's own words"]]),
            ("h", "8.4 Practical feasibility"),
            ("p", "The equipment is reusable, and the core laboratory does not require a paid account. Shared multi-device leaderboard synchronisation is optional and depends on a configured Supabase project; local scoring remains available without it. The item estimate is EUR 11 for jars and cable glands, EUR 16 for four digital probe thermometers, EUR 8 for insulation materials, and EUR 5 for the test tub. The EUR 40 total remains a planning value until checked against final receipts."),
            ("image", ("report/final/latex_assets/budget_items.png", "Budget graph. Item-level planning estimate: EUR 40 total, below the EUR 50 course target.", 0.92)),
            ("h", "8.5 Handover"),
            ("p", "A teacher should receive the full kit, printed safety checklist, spare insulation, towels, and a local copy of the website. The handover notes should state the measured jar volume, probe type, reference coefficients, and known limits. This information is more useful than a polished demonstration alone because it lets another class repeat the test and compare results."),
        ],
    },
    {
        "title": "9 Conclusions, Responsibilities, and References",
        "blocks": [
            ("h", "9.1 Conclusion"),
            ("p", "We developed a complete classroom engineering activity that connects a physical thermal test with a simple mathematical model. The full multilayer package retained the most heat in the worked data, while the Mylar-only result showed the importance of boundary conditions and construction. The strongest part of the project is the full workflow: students make a prediction, control a test, keep raw data, compare the result with a model, and explain the mismatch."),
            ("h", "9.2 Final recommendations"),
            ("bullets", ["Repeat all four conditions and report the variation, not only one curve.", "Bundle Chart.js and KaTeX locally for offline use.", "Add CSV export, run identifiers, and metadata fields.", "Use a probe guide and fixed immersion mark.", "Verify the final cost from current supplier quotes.", "Keep the vacuum-versus-water-bath limitation in every student briefing."]),
            ("h", "9.3 Project deliverables"),
            ("p", "The submitted engineering package contains the website, classroom documentation, assessment material, experimental procedure, and presentation resources listed below."),
            ("table", [["Deliverable", "Purpose and report connection"], ["Mission Control website", "Prediction, telemetry, model comparison, quiz, and leaderboard"], ["Student manual", "Student-facing theory, construction, procedure, and analysis guidance"], ["Teacher manual and marking guide", "Preparation, safety, solutions, and assessment criteria"], ["Task sheet", "Prediction, raw data, calculations, evaluation, and open response"], ["Printable flashcards", "Ten aligned revision and discussion topics"], ["Illustrated procedure", "Assembly sequence and experimental controls"], ["Final presentation", "Team overview, method, findings, and classroom delivery"], ["README and setup guides", "Deployment, resource links, and optional leaderboard configuration"]]),
            ("refs", ["[1] NASA, \"Spacewalk Spacesuit Basics,\" Johnson Space Center, accessed 9 Sep. 2026.", "[2] NIST, \"Water Liquid Phase Heat Capacity,\" Chemistry WebBook SRD 69, accessed 9 Sep. 2026.", "[3] M. M. Finckenor and D. Dooling, Multilayer Insulation Material Guidelines, NASA/TP-1999-209263, 1999.", "[4] NASA, Passive Thermal Control Engineering Guidebook, Rev. 4.0, 2023."]),
        ],
    },
]


CONTRIBUTIONS = [
    {
        "name": "Piyath Vithanage",
        "status": "",
        "blocks": [
            ("h", "Role and completed work"),
            ("p", "The current Mission Control application and integration of the final project resources formed the main contribution. The browser workflow connects briefing, assembly, prediction, measurement, study material, and assessment. HTML provides the experiment structure, CSS provides the responsive interface, and JavaScript controls the model, timer, telemetry, quiz, and leaderboard behaviour."),
            ("p", "The configuration selector, starting temperature, bath temperature, duration, and cooling constant were connected through a common application state. The 15-minute timer and manual telemetry workflow validate entries, store the active model and data, overlay measured and predicted curves, calculate mean absolute error, and produce a printable telemetry record."),
            ("h", "Graphing and analysis"),
            ("p", "The graphing workflow allows students to compare measured and predicted temperatures on the same time axis. Configuration names and colours remain consistent across the selector, summary, graph, and result table. Residual and mean absolute error calculations turn the graph into an analysis task instead of using it only as a visual display."),
            ("p", "The implementation keeps calculated and measured data as separate series and restores the current session from local browser storage. Defensive checks were added around optional interface elements so that one missing panel would not stop the main simulator. The printed telemetry view records the selected configuration, model settings, chart, measurement count, and error result in a form that can be attached to the student task sheet."),
            ("h", "Assessment and final integration"),
            ("p", "The assessment work covered the timed ten-question classroom challenge, answer review, scoring, winner presentation, and leaderboard. Results are stored locally by default and can synchronise across devices through the optional Supabase configuration. The student manual, teacher manual, task sheet, flashcards, presentation material, and README were aligned with the current experiment and website."),
            ("p", "The final integration work included checking the same question topics across online and printable resources, preserving mathematical notation through KaTeX, and maintaining a usable layout on desktop and mobile screens. Recent repository work also covered the three-page task-sheet layout, quiz progress flow, leaderboard fallback behaviour, and consistent naming across the public project pages."),
            ("h", "Reliability and maintainability"),
            ("p", "Later repository work included defensive interface checks, resource reorganisation, regenerated printable PDFs, and repeated layout corrections. The website, manuals, worksheets, and presentation were treated as one learning system rather than independent files. A changed experimental setting therefore required corresponding updates to the model controls, theory text, task sheet, teacher solution, and result explanation."),
            ("p", "The final application keeps the main activity usable when optional services fail. The thermal model and telemetry remain local to the browser. The competitive leaderboard reports its mode and falls back to saved local scores when the shared connection is unavailable. This separation reduces the risk that a network problem stops the laboratory. It also makes the optional database feature easier for another developer or teacher to configure later."),
        ],
    },
    {
        "name": "Elio Krollpfeiffer",
        "status": "",
        "blocks": [
            ("h", "Early website and interface development"),
            ("p", "The work focused on early development of the SPHERE website and the learning materials that established the project structure. Repository history records 78 commits from the associated development account. Most changes affected index.html, with additional work in styles.css, the student manual, the teacher manual, and project images."),
            ("p", "The first versions of the browser interface were developed and revised to organise the main content sections and establish the visual and instructional flow used by the later Mission Control application. This work gave the project a usable web base before telemetry, assessment, and leaderboard integration."),
            ("p", "The early interface revisions brought together the project introduction, heat-transfer content, experiment instructions, and supporting visuals in one location. Repeated changes to the main page show an iterative development process rather than a single upload. The structure established a clear path from project context to theory and practical activity, which remained the basis of the final site."),
            ("h", "Student and teacher documentation"),
            ("p", "Repeated work on the student and teacher manuals established the experiment purpose, task sequence, and information needed while using the website. The teacher material supported lesson preparation and classroom delivery, while revised media assets supported the early interface and documentation."),
            ("p", "The documentation contribution was important because the experiment depends on consistent instructions. The manuals needed to explain what students should build, what teachers should prepare, and how the physical activity related to the website. The early revisions supplied this instructional foundation and gave later versions a source that could be refined and aligned with the final settings."),
            ("h", "Content architecture and revision"),
            ("p", "The early website work also established the relationship between navigation, explanatory text, experiment instructions, and visual material. Keeping these elements in one browser page reduced the number of separate files that students had to manage during the lesson. It also created clear locations for later prediction, telemetry, study, and assessment panels."),
            ("p", "Repeated document and interface revisions improved the sequence, terminology, and presentation. The manuals and web interface share one instructional structure, while the final package uses the current experimental settings and expanded application functions."),
        ],
    },
    {
        "name": "Dilan Fernando",
        "status": "",
        "blocks": [
            ("h", "Role and completed work"),
            ("p", "The main technical responsibility covered the thermodynamic definition of the experiment and interpretation of the physical results. The lumped Newtonian cooling model gives students a manageable equation while retaining the relationship between thermal mass, environmental temperature, and cooling rate. The effective system coefficient k is expressed in min$^{-1}$ and remains separate from material thermal conductivity."),
            ("p", "The final test conditions use a 100 mL water core, a starting temperature near 80 °C, a measured ice-water bath, and readings every minute for 15 minutes. These settings were connected to the apparatus and student procedure so the model and physical experiment refer to the same system."),
            ("p", "The thermal formulation also separated the effective cooling constant from material conductivity. This distinction prevented the website values from being presented as fixed properties of cotton, bubble wrap, or reflective film. The selected coefficients were treated as educational reference values for complete configurations and as quantities that should be tested against measured curves."),
            ("h", "Experiment and analysis"),
            ("p", "The four-condition comparison was planned and analysed using temperature drop, residuals, mean absolute error, and the fitted cooling constant. The unexpected Mylar-only curve was retained as evidence of a model or construction mismatch. Likely influences included probe position, closure, wetting, layer compression, bath temperature, and unequal starting temperatures."),
            ("p", "The analysis retained the original measurement series rather than smoothing points to improve agreement. This decision preserved the evidence needed to discuss uncertainty. It also supported the recommendation to repeat every condition, randomise the test order, measure the actual bath temperature, and record construction details with each run."),
            ("h", "Safety, documentation, and integration"),
            ("p", "Safety controls were developed for hot water, glass, spills, and electronics. Terminology and sequence were aligned across the student manual, teacher manual, task sheet, procedure, website content, and report, together with the remaining technical writing and project integration."),
            ("p", "The technical integration checked that the physical settings, equations, result interpretation, and safety limits did not conflict across documents. This included the 100 mL fill, measured environmental boundary, 15-minute interval, four named configurations, and the limitation that a water bath does not reproduce vacuum heat transfer."),
            ("h", "Engineering judgement"),
            ("p", "The reporting method uses temperature drop, normalised temperature above the boundary, residuals, mean absolute error, and an effective fitted constant because each measure answers a different question. Using several measures prevents final temperature alone from hiding unequal starting conditions and separates the observed ranking from the strength of the general conclusion."),
            ("p", "The thermodynamic work provided the acceptance limits for later software and documentation changes. Any interface revision had to retain the correct units, environmental boundary, time base, and meaning of the coefficient. Any educational revision had to preserve the distinction between spacecraft thermal control and the conductive-convective water-bath demonstration. These checks maintained technical consistency while the presentation of the project changed."),
            ("h", "Model behaviour and uncertainty"),
            ("p", "The model implementation was checked dimensionally and against limiting behaviour. At the start of a run the calculated curve must equal the entered initial temperature, and over time it must approach the measured bath temperature without crossing it. A larger effective cooling constant must produce a steeper curve under otherwise identical conditions. These checks provided a direct way to verify changes in the browser calculation."),
            ("p", "The uncertainty review distinguished measurement repeatability from model adequacy. Probe resolution, reading time, water volume, and bath drift affect the observations, while the lumped-temperature assumption and constant boundary affect the reference curve. Reporting both groups prevents a low dashboard error from being interpreted as proof that the physical model is complete."),
        ],
    },
    {
        "name": "Nuhansee Migelhewage",
        "status": "",
        "blocks": [
            ("h", "Principles and theory"),
            ("p", "The main contribution covered development and explanation of the scientific principles behind the activity. The theory addresses conduction, convection, radiation, thermal capacity, and transient cooling at the appropriate student level. It connects the classroom water-bath system to the spacesuit context while retaining the important limitation that the experiment does not reproduce heat transfer in vacuum."),
            ("p", "The layered insulation system was interpreted by mechanism. Cotton and bubble wrap mainly reduce conductive and convective paths in the classroom setup, while the reflective layer addresses radiative exchange when a suitable gap is present. This explanation supports the prediction task and discussion of why Mylar alone can perform poorly in a water bath."),
            ("p", "The theory contribution also covered thermal capacity and the meaning of the effective cooling constant. The water mass stores sensible energy, while the fitted constant represents the response of the complete core, container, insulation, and boundary. Presenting these ideas separately helped students avoid treating the reference coefficient as a material property."),
            ("h", "Experimental setup"),
            ("p", "Preparation and checking of the physical experiment covered the glass water core, probe position, insulation layers, ice-water bath, and measurement sequence. Fair-test controls included equal water volume, comparable jars, repeatable probe depth, consistent immersion depth, and one-minute sampling so configuration differences could be discussed as engineering results rather than setup differences."),
            ("p", "The setup work included checking the layer order for the complete package: cotton next to the jar, bubble wrap as the trapped-air layer, and reflective film on the outside. Particular attention was given to avoiding compressed bubble cells, maintaining a repeatable neck closure, and keeping the probe centred rather than touching the glass wall."),
            ("h", "Safety and classroom preparation"),
            ("p", "Practical preparation addressed hot-water handling, stable bath placement, leak checks, dry thermometer displays, and separation of electronics from water. These controls linked the theory to a setup that could be demonstrated and repeated in a supervised lesson."),
            ("p", "Classroom preparation also required a clear sequence for measuring the bath temperature, adding the warm water, starting the timer, and recording the first reading. Connecting this sequence to the theoretical variables made it easier to explain why each control mattered and how a setup error would affect the curve."),
            ("h", "Theory to practice connection"),
            ("p", "The mathematical model was connected with the physical observations. A steep curve indicates rapid approach to the boundary temperature, while a shallow curve indicates greater heat retention in the tested system. Relating curve shape to probe placement, water volume, insulation contact, and bath condition gives students a practical way to discuss differences between measured and predicted values."),
            ("p", "The setup and theory work also supported the fair-test requirements used throughout the materials. Each group needs a comparable core, a known starting condition, the same sampling interval, and a recorded environmental temperature. When these controls cannot be held exactly, the deviation must be written down and included in the evaluation. This approach turns the practical activity into an engineering investigation rather than a simple demonstration."),
            ("h", "Setup preparation and learning resources"),
            ("p", "A pre-run inspection sequence was developed around the setup contribution. The jar is checked for damage, the probe is checked at room temperature, the layer order and closure are inspected, and the bath position is confirmed before hot water is introduced. This sequence reduces avoidable setup variation and gives the supervising teacher a clear stop point when a component is unsafe or inconsistent."),
            ("p", "The same setup logic was carried into the student manual, teacher manual, task sheet, illustrated procedure, and flashcards. The student-facing resources describe what must be observed and recorded, while the teacher material explains preparation, safety, and the reason for each control. This alignment helps the physical lesson follow the same sequence as the model and telemetry interface."),
            ("p", "The assessment material draws directly on the practical activity. Questions cover conduction, convection, radiation, effective cooling rate, fair testing, and the limitations of the spacesuit analogy. The assessment therefore tests interpretation of the experiment instead of recall of unrelated definitions."),
        ],
    },
]

CONTRIBUTION_PAGES = [
    {
        "title": "Individual Contributions Piyath Vithanage and Elio Krollpfeiffer",
        "blocks": [
            ("contrib", "Piyath Vithanage"),
            ("p", "Piyath Vithanage completed the current Mission Control application and the final integration of the project resources. The browser workflow connects the briefing, assembly instructions, prediction model, 15-minute measurement sequence, study materials, and assessment. The implementation uses HTML for structure, CSS for the responsive interface, and JavaScript for the thermal model, timer, telemetry, quiz, and leaderboard."),
            ("p", "The application state links the selected configuration, initial temperature, bath temperature, duration, and reference cooling constant. The telemetry system stores physical readings separately from the predicted series, restores active data from browser storage, overlays both curves, calculates mean absolute error, and generates a printable experiment record. Defensive checks and responsive layouts improve reliability across classroom laptops and tablets."),
            ("p", "Piyath also developed the timed ten-question challenge, scoring workflow, answer review, podium display, and leaderboard. Results remain available through local storage when the optional Supabase connection is unavailable. Final integration covered the student manual, teacher manual, task sheet, flashcards, README, presentation material, regenerated PDFs, and consistency checks across the complete resource set."),
            ("p", "The graphing workflow uses one time axis and consistent configuration colours for the measured and predicted series. Residuals and mean absolute error are calculated from the entered readings, while the printed telemetry record preserves the selected configuration, model settings, chart, measurement count, and error result for classroom assessment."),
            ("p", "The application was structured so the thermal model and telemetry remain available when optional services fail. Browser storage preserves the active session, and leaderboard results fall back to local storage when the shared connection is unavailable. Responsive layouts and defensive interface checks support use on classroom laptops and tablets."),
            ("columnbreak", ""),
            ("contrib", "Elio Krollpfeiffer"),
            ("p", "Elio Krollpfeiffer contributed the early website and interface development that established the project structure. Repository history records 78 commits from the associated development account, including 34 changes to index.html together with updates to styles.css, student documentation, teacher documentation, and project media. These iterations organised the project introduction, thermal content, experiment instructions, and supporting visuals into one browser-based learning sequence."),
            ("p", "The student and teacher manuals were developed alongside the website. The student material introduced the activity and task order, while the teacher material supported preparation and classroom delivery. This early separation of learner and instructor guidance created a documentation structure that could later be aligned with the final model, telemetry, assessment, and safety requirements."),
            ("p", "Elio's work provided the documented implementation foundation for later development. The combination of interface structure, visual styling, manuals, PDFs, and media assets allowed new functionality to be added within an established educational workflow rather than as isolated features."),
            ("p", "The early interface revisions combined the project introduction, heat-transfer theory, experiment instructions, and supporting visuals in one location. This structure created a clear sequence from scientific context to practical activity and remained the basis for the later prediction, telemetry, study, and assessment sections."),
            ("p", "Repeated revisions improved the navigation, terminology, instructional order, and visual presentation. Developing the learner and instructor materials alongside the website helped keep preparation guidance, operational instructions, and scientific explanations directed at the correct classroom audience."),
        ],
    },
    {
        "title": "Individual Contributions Dilan Fernando and Nuhansee Migelhewage",
        "blocks": [
            ("contrib", "Dilan Fernando"),
            ("p", "Dilan Fernando held the main technical responsibility for the thermodynamic model and the interpretation of the experimental results. The lumped Newtonian cooling model was selected to preserve the relationship between thermal mass, environmental temperature, and cooling rate while remaining understandable to students. The effective cooling constant was defined as a system coefficient in min$^{-1}$ and kept separate from material thermal conductivity."),
            ("p", "Dilan established the 100 mL water core, starting temperature near 80 °C, measured ice-water boundary, and one-minute readings over 15 minutes. The four-condition comparison was analysed using temperature drop, normalised temperature, residuals, mean absolute error, and a fitted cooling constant. The unexpected Mylar-only response was retained as evidence of model or construction mismatch rather than adjusted to fit the reference curve."),
            ("p", "The contribution also covered the safety controls for hot water, glass, spills, and electronics; the interpretation of probe position, closure, wetting, compression, and bath temperature; and the alignment of the model, experiment, manuals, website, and report. This technical work kept the conclusion limited to the tested system and supported the recommendation for repeated trials."),
            ("p", "The original measurement series was retained without smoothing. This preserved the unexpected Mylar-only response and allowed the discussion to distinguish measurement variation from model limitations. Recommended improvements included repeated trials, randomised run order, measured bath temperature, fixed probe depth, and construction notes for every run."),
            ("p", "The model was also checked through its physical behaviour. The calculated curve begins at the entered initial temperature, approaches the environmental temperature over time, and becomes steeper when the effective cooling constant increases. These relationships provided practical acceptance limits for the simulator and supporting documents."),
            ("columnbreak", ""),
            ("contrib", "Nuhansee Migelhewage"),
            ("p", "Nuhansee Migelhewage contributed the scientific principles, theory, experimental setup, and practical preparation. The theory work explained conduction, convection, radiation, thermal capacity, and transient cooling at the level required for the activity. It also connected the water-bath experiment to spacesuit thermal protection while maintaining the limitation that the classroom system does not reproduce vacuum heat transfer."),
            ("p", "The experimental setup contribution covered the glass water core, centred probe, insulation layers, ice-water bath, and measurement sequence. Fair-test controls included equal water volume, comparable jars, repeatable probe depth, consistent immersion depth, one-minute sampling, and a recorded boundary temperature. Layer-order checks also addressed compressed bubble cells, reflective-film placement, and the opening around the probe."),
            ("p", "Practical preparation included safe handling of hot water, stable bath placement, leak checks, dry thermometer displays, and separation of electronics from water. By linking each setup control to a thermal variable, the contribution helped students understand how experimental errors change the curve and why deviations must be documented during evaluation."),
            ("p", "A pre-run inspection sequence covered jar condition, room-temperature probe response, insulation order, closure quality, bath position, and cable routing before hot water was introduced. The same preparation sequence informed the student manual, teacher guide, task sheet, illustrated procedure, and classroom safety briefing."),
            ("p", "The theory contribution connected the curve shape with the physical setup. A steep curve indicates rapid approach to the bath temperature, while a shallow curve indicates greater heat retention in the tested system. Probe placement, water volume, insulation contact, layer compression, and bath condition were used to explain why measured and predicted values may differ."),
        ],
    },
]


def tex_escape(text):
    degree_token = "@@DEGREE@@"
    text = text.replace("°", degree_token)
    repl = {
        "&": r"\&", "%": r"\%", "#": r"\#", "_": r"\_",
        "^": r"\textasciicircum{}", "~": r"\textasciitilde{}",
    }
    escaped = "".join(repl.get(c, c) for c in text)
    return escaped.replace(degree_token, r"$^\circ$")


def latex_table(rows):
    cols = len(rows[0])
    if cols == 2:
        spec = r">{\raggedright\arraybackslash}p{0.31\columnwidth}>{\raggedright\arraybackslash}p{0.61\columnwidth}"
    elif cols == 3:
        spec = r">{\raggedright\arraybackslash}p{0.25\columnwidth}>{\raggedright\arraybackslash}p{0.31\columnwidth}>{\raggedright\arraybackslash}p{0.34\columnwidth}"
    elif cols == 4:
        spec = r">{\raggedright\arraybackslash}p{0.18\columnwidth}>{\raggedright\arraybackslash}p{0.20\columnwidth}>{\raggedright\arraybackslash}p{0.36\columnwidth}>{\centering\arraybackslash}p{0.12\columnwidth}"
    else:
        spec = r">{\raggedright\arraybackslash}p{0.22\columnwidth}cccc"
    out = [r"\begin{center}\footnotesize", r"\setlength{\tabcolsep}{2.5pt}", r"\renewcommand{\arraystretch}{1.14}", rf"\begin{{tabular}}{{{spec}}}", r"\toprule"]
    out.append(" & ".join(r"\textbf{" + tex_escape(x) + "}" for x in rows[0]) + r" \\")
    out.append(r"\midrule")
    for row in rows[1:]:
        out.append(" & ".join(tex_escape(x) for x in row) + r" \\")
    out += [r"\bottomrule", r"\end{tabular}", r"\end{center}"]
    return "\n".join(out)


def latex_blocks(blocks):
    out = []
    for kind, value in blocks:
        if kind == "contrib":
            out.append(r"\section*{Individual Contribution --- " + tex_escape(value) + "}")
        elif kind == "columnbreak":
            out.append(r"\newpage")
        elif kind == "h":
            out.append(r"\subsection*{" + tex_escape(value) + "}")
        elif kind == "p":
            # Keep intentional inline math from the source paragraphs.
            parts = re.split(r"(\$[^$]+\$)", value)
            out.append("".join(p if p.startswith("$") else tex_escape(p) for p in parts))
        elif kind == "eq":
            out.append(r"\begin{equation}" + value + r"\end{equation}")
        elif kind in ("bullets", "numbered"):
            env = "enumerate" if kind == "numbered" else "itemize"
            out.append(rf"\begin{{{env}}}[leftmargin=*,nosep]")
            out.extend(r"\item " + tex_escape(x) for x in value)
            out.append(rf"\end{{{env}}}")
        elif kind == "table":
            out.append(latex_table(value))
        elif kind == "image":
            path, caption, width = value
            latex_path = f"assets/{Path(path).name}"
            out.append(
                r"\begin{center}"
                + rf"\includegraphics[width={width:.2f}\linewidth]{{{tex_escape(latex_path)}}}"
                + r"\par\vspace{2pt}{\footnotesize "
                + tex_escape(caption)
                + r"}\end{center}"
            )
        elif kind == "refs":
            out.append(r"\begin{thebibliography}{00}")
            for i, item in enumerate(value, 1):
                clean = re.sub(r"^\[\d+\]\s*", "", item)
                out.append(rf"\bibitem{{b{i}}} " + tex_escape(clean))
            out.append(r"\end{thebibliography}")
    return "\n\n".join(out)


def build_tex():
    ASSET_OUT.mkdir(parents=True, exist_ok=True)
    for page in TEAM_PAGES:
        for kind, value in page["blocks"]:
            if kind == "image":
                source = ROOT / value[0]
                shutil.copy2(source, ASSET_OUT / source.name)
    preamble = r'''\documentclass[10pt,conference,a4paper]{IEEEtran}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage{amsmath,amssymb}
\usepackage{booktabs,array}
\usepackage{graphicx}
\usepackage{enumitem}
\usepackage{xcolor}
\usepackage{microtype}
\usepackage{fancyhdr}
\usepackage{lastpage}
\definecolor{sphereblue}{RGB}{15,64,96}
\setlength{\parindent}{1em}
\setlength{\parskip}{1.2pt}
\linespread{1.01}
\setlength{\columnsep}{0.22in}
\setlist{topsep=2pt,partopsep=0pt,itemsep=1pt,parsep=0pt}
\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\scriptsize SPACESUIT THERMAL SHIELDING KIT}
\fancyhead[R]{\scriptsize Team Engineering Report}
\fancyfoot[C]{\scriptsize \thepage\ / \pageref{LastPage}}
\renewcommand{\headrulewidth}{0.3pt}
\renewcommand{\footrulewidth}{0pt}
\title{SPACESUIT THERMAL SHIELDING KIT\\\large Team Engineering Report for the SPHERE Initiative}
\author{Piyath Vithanage, Elio Krollpfeiffer, Dilan Fernando, and Nuhansee Migelhewage\\
Professorship of Human Spaceflight Technology\\Prof. Dr.-Ing. Gisela Detrell\\
TUM School of Engineering and Design, Technical University of Munich}
\begin{document}
\maketitle
\begin{abstract}
The SPHERE team designed a classroom experiment that compares four insulation arrangements around a 100 mL warm-water core. Students record 16 temperatures, generate a Newtonian cooling reference curve, and evaluate the difference between measurement and prediction. The worked test ranked the full cotton--bubble-wrap--Mylar package first for heat retention. The report also explains why the water-bath test is not a vacuum or spacesuit qualification test.
\end{abstract}
\begin{IEEEkeywords}
heat transfer, Newtonian cooling, insulation, classroom experiment, data logging, model validation
\end{IEEEkeywords}
'''
    body = [preamble]
    for i, page in enumerate(TEAM_PAGES):
        body.append(r"\section*{" + tex_escape(page["title"]) + "}")
        body.append(latex_blocks(page["blocks"]))
    for item in CONTRIBUTIONS:
        body.append(r"\begingroup\normalsize\setlength{\parskip}{2pt}")
        body.append(r"\section*{Individual Contribution --- " + tex_escape(item["name"]) + "}")
        body.append(latex_blocks(item["blocks"]))
        body.append(r"\endgroup")
    body.append(r"\end{document}")
    TEX_PATH.write_text("\n\n".join(body), encoding="utf-8")


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)


def set_cell_margins(cell, top=70, start=80, bottom=70, end=80):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcMar = tcPr.first_child_found_in("w:tcMar")
    if tcMar is None:
        tcMar = OxmlElement("w:tcMar")
        tcPr.append(tcMar)
    for m, v in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tcMar.find(qn("w:" + m))
        if node is None:
            node = OxmlElement("w:" + m)
            tcMar.append(node)
        node.set(qn("w:w"), str(v))
        node.set(qn("w:type"), "dxa")


def set_columns(section, count, space=360):
    sectPr = section._sectPr
    cols = sectPr.xpath("./w:cols")
    if cols:
        el = cols[0]
    else:
        el = OxmlElement("w:cols")
        sectPr.append(el)
    el.set(qn("w:num"), str(count))
    el.set(qn("w:space"), str(space))
    el.set(qn("w:equalWidth"), "1")


def add_page_field(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("Page ")
    run.font.size = Pt(8)
    for fld_name in ("PAGE", "NUMPAGES"):
        fld = OxmlElement("w:fldSimple")
        fld.set(qn("w:instr"), fld_name)
        paragraph._p.append(fld)
        if fld_name == "PAGE":
            paragraph.add_run(" of ")


def add_docx_table(doc, rows):
    table = doc.add_table(rows=len(rows), cols=len(rows[0]))
    table.autofit = False
    available = Cm(7.75)
    col_width = int(available / len(rows[0]))
    tbl_pr = table._tbl.tblPr
    tbl_w = tbl_pr.first_child_found_in("w:tblW")
    if tbl_w is None:
        tbl_w = OxmlElement("w:tblW")
        tbl_pr.append(tbl_w)
    tbl_w.set(qn("w:w"), "5000")
    tbl_w.set(qn("w:type"), "pct")
    for r, row in enumerate(rows):
        for c, value in enumerate(row):
            cell = table.cell(r, c)
            cell.width = col_width
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            set_cell_margins(cell)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.space_before = Pt(0)
            run = p.add_run(value.replace("$^{-1}$", "⁻¹"))
            run.font.name = "Arial"
            run.font.size = Pt(7.3)
            if r == 0:
                run.bold = True
                run.font.color.rgb = RGBColor(255, 255, 255)
                set_cell_shading(cell, "0F4060")
            elif r % 2 == 0:
                set_cell_shading(cell, "EDF3F7")
    doc.add_paragraph().paragraph_format.space_after = Pt(0)


def add_docx_blocks(doc, blocks, individual=False):
    for kind, value in blocks:
        if kind == "contrib":
            p = doc.add_paragraph(style="Heading 1")
            run = p.add_run("Individual Contribution\n" + value)
            if individual:
                run.font.size = Pt(18)
                p.paragraph_format.space_after = Pt(10)
        elif kind == "columnbreak":
            p = doc.add_paragraph()
            p.add_run().add_break(WD_BREAK.COLUMN)
        elif kind == "h":
            p = doc.add_paragraph(style="Heading 2")
            run = p.add_run(value)
            if individual:
                run.font.size = Pt(12)
                p.paragraph_format.space_before = Pt(4)
                p.paragraph_format.space_after = Pt(2)
        elif kind == "p":
            p = doc.add_paragraph(style="Body Text")
            run = p.add_run(value.replace("$^{-1}$", "⁻¹"))
            if individual:
                run.font.size = Pt(13)
                p.paragraph_format.line_spacing = 1.25
                p.paragraph_format.space_after = Pt(5)
        elif kind == "eq":
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(3)
            equation_display = {
                r"Q = m c_p \Delta T.": "Q = m cₚ ΔT.",
                r"m c_p \frac{dT}{dt} = -hA(T-T_{env}),": "m cₚ dT/dt = −hA(T − Tenv),",
                r"T(t)=T_{env}+(T_0-T_{env})e^{-kt}.": "T(t) = Tenv + (T₀ − Tenv)e⁻ᵏᵗ.",
                r"\theta(t)=\frac{T(t)-T_{env}}{T_0-T_{env}}.": "θ(t) = [T(t) − Tenv] / [T₀ − Tenv].",
                r"\mathrm{MAE}=\frac{1}{n}\sum_{i=1}^{n}|T_{meas,i}-T_{model,i}|.": "MAE = (1/n) Σᵢ₌₁ⁿ |Tmeas,i − Tmodel,i|.",
                r"k=-\frac{1}{t}\ln\left(\frac{T(t)-T_{env}}{T_0-T_{env}}\right).": "k = −(1/t) ln([T(t) − Tenv] / [T₀ − Tenv]).",
            }
            pretty = equation_display.get(value, value)
            run = p.add_run(pretty)
            run.italic = True
            run.font.name = "Cambria Math"
            run.font.size = Pt(10)
        elif kind in ("bullets", "numbered"):
            style = "List Number" if kind == "numbered" else "List Bullet"
            for item in value:
                p = doc.add_paragraph(style=style)
                p.add_run(item)
        elif kind == "table":
            add_docx_table(doc, value)
        elif kind == "image":
            path, caption, width = value
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(3)
            p.paragraph_format.space_after = Pt(2)
            run = p.add_run()
            run.add_picture(str(ROOT / path), width=Cm(7.75 * width))
            cp = doc.add_paragraph()
            cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
            cp.paragraph_format.space_after = Pt(4)
            cr = cp.add_run(caption)
            cr.italic = True
            cr.font.name = "Arial"
            cr.font.size = Pt(7.7)
        elif kind == "refs":
            h = doc.add_paragraph(style="Heading 2")
            h.add_run("References")
            for item in value:
                p = doc.add_paragraph(style="References")
                p.add_run(item)


def configure_doc(doc):
    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Arial"
    normal.font.size = Pt(9.2)
    normal.font.color.rgb = RGBColor(0, 0, 0)
    normal.paragraph_format.line_spacing = 1.0
    normal.paragraph_format.space_after = Pt(2)
    for name in ("Body Text", "List Bullet", "List Number"):
        s = styles[name]
        s.font.name = "Arial"
        s.font.size = Pt(9.2)
        s.font.color.rgb = RGBColor(0, 0, 0)
        s.paragraph_format.line_spacing = 1.0
        s.paragraph_format.space_after = Pt(1.5)
    styles["Title"].font.name = "Arial"
    styles["Title"].font.size = Pt(19)
    styles["Title"].font.bold = True
    styles["Title"].font.color.rgb = RGBColor(0, 0, 0)
    for name, size in (("Heading 1", 11.5), ("Heading 2", 9.6)):
        s = styles[name]
        s.font.name = "Arial"
        s.font.size = Pt(size)
        s.font.bold = True
        s.font.color.rgb = RGBColor(0, 0, 0)
        s.paragraph_format.space_before = Pt(4)
        s.paragraph_format.space_after = Pt(2)
        s.paragraph_format.keep_with_next = True
    if "References" not in styles:
        styles.add_style("References", 1)
    refs = styles["References"]
    refs.font.name = "Arial"
    refs.font.size = Pt(8.2)
    refs.paragraph_format.left_indent = Cm(0.35)
    refs.paragraph_format.first_line_indent = Cm(-0.35)
    refs.paragraph_format.space_after = Pt(1)


def professionalise_report_voice():
    team_replacements = [
        ("We designed", "The SPHERE team designed"),
        ("We built", "The project was built"),
        ("We produced", "The team produced"),
        ("We model", "The model treats"),
        ("We use", "The analysis uses"),
        ("We first considered", "The team first considered"),
        ("We rejected", "The team rejected"),
        ("We also wanted", "The design also aimed"),
        ("We therefore treated", "The team therefore treated"),
        ("We kept", "The original readings were kept"),
        ("We would not claim", "The available evidence does not support a claim"),
        ("We used", "The team used"),
        ("We developed", "The team developed"),
        ("Our aim", "The project aim"),
        ("our aim", "the project aim"),
        (" our ", " the project's "),
        (" we ", " the team "),
    ]
    for page in TEAM_PAGES:
        revised = []
        for kind, value in page["blocks"]:
            if kind == "p":
                for old, new in team_replacements:
                    value = value.replace(old, new)
            revised.append((kind, value))
        page["blocks"] = revised

    for item in CONTRIBUTIONS:
        full_name = item["name"]
        given_name = full_name.split()[0]
        revised = []
        for kind, value in item["blocks"]:
            if kind == "p":
                value = re.sub(r"^My\b", full_name + "'s", value)
                value = re.sub(r"\bmy\b", given_name + "'s", value)
                value = re.sub(r"\bI\b", given_name, value)
            revised.append((kind, value))
        item["blocks"] = revised


def build_docx():
    doc = Document()
    configure_doc(doc)
    sec = doc.sections[0]
    sec.page_width = Cm(21.0)
    sec.page_height = Cm(29.7)
    sec.top_margin = Cm(1.45)
    sec.bottom_margin = Cm(1.35)
    sec.left_margin = Cm(1.45)
    sec.right_margin = Cm(1.45)
    sec.header_distance = Cm(0.55)
    sec.footer_distance = Cm(0.55)
    set_columns(sec, 1, 340)
    hp = sec.header.paragraphs[0]
    hp.text = "SPACESUIT THERMAL SHIELDING KIT                              Team Engineering Report"
    hp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for r in hp.runs:
        r.font.name = "Arial"; r.font.size = Pt(7.5)
    add_page_field(sec.footer.paragraphs[0])

    title = doc.add_paragraph(style="Title")
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.add_run("SPACESUIT THERMAL SHIELDING KIT\nTeam Engineering Report for the SPHERE Initiative")
    meta = doc.add_paragraph()
    meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    meta.add_run("Piyath Vithanage, Elio Krollpfeiffer, Dilan Fernando, and Nuhansee Migelhewage\nProfessorship of Human Spaceflight Technology\nProf. Dr.-Ing. Gisela Detrell\nTUM School of Engineering and Design, Technical University of Munich")
    abstract = doc.add_paragraph()
    abstract.add_run("Abstract—").bold = True
    abstract.add_run("The SPHERE team designed a classroom experiment that compares four insulation arrangements around a 100 mL warm-water core. Students record 16 temperatures, generate a Newtonian cooling reference curve, and evaluate the difference between measurement and prediction. The worked test ranked the full cotton–bubble-wrap–Mylar package first for heat retention. The report also explains why the water-bath test is not a vacuum or spacesuit qualification test.")
    key = doc.add_paragraph()
    key.add_run("Keywords—").bold = True
    key.add_run("heat transfer, Newtonian cooling, insulation, classroom experiment, data logging, model validation")

    team_sec = doc.add_section(WD_SECTION.CONTINUOUS)
    team_sec.page_width = Cm(21.0)
    team_sec.page_height = Cm(29.7)
    team_sec.top_margin = Cm(1.45)
    team_sec.bottom_margin = Cm(1.35)
    team_sec.left_margin = Cm(1.45)
    team_sec.right_margin = Cm(1.45)
    set_columns(team_sec, 2, 360)
    h = doc.add_paragraph(style="Heading 1")
    h.add_run(TEAM_PAGES[0]["title"])
    add_docx_blocks(doc, TEAM_PAGES[0]["blocks"])
    for page in TEAM_PAGES[1:]:
        h = doc.add_paragraph(style="Heading 1")
        h.add_run(page["title"])
        add_docx_blocks(doc, page["blocks"], individual=True)

    sec2 = doc.add_section(WD_SECTION.CONTINUOUS)
    sec2.page_width = Cm(21.0)
    sec2.page_height = Cm(29.7)
    sec2.top_margin = Cm(1.7)
    sec2.bottom_margin = Cm(1.6)
    sec2.left_margin = Cm(1.45)
    sec2.right_margin = Cm(1.45)
    set_columns(sec2, 1, 360)
    sec2.header.is_linked_to_previous = True
    sec2.footer.is_linked_to_previous = True

    for item in CONTRIBUTIONS:
        h = doc.add_paragraph(style="Heading 1")
        h.add_run("Individual Contribution\n" + item["name"])
        add_docx_blocks(doc, item["blocks"])

    props = doc.core_properties
    props.title = "SPACESUIT THERMAL SHIELDING KIT Team Engineering Report for the SPHERE Initiative"
    props.subject = "Compact IEEE-style final report and individual contribution statements"
    props.author = "SPHERE Project Team"
    props.keywords = "thermal insulation; Newtonian cooling; engineering report; SPHERE"
    doc.save(DOCX_PATH)


if __name__ == "__main__":
    professionalise_report_voice()
    build_tex()
    build_docx()
    print(TEX_PATH)
    print(DOCX_PATH)
