# SPHERE Thermal Insulation Laboratory

![SPHERE thermal insulation laboratory cover](images/project-cover.png)

SPHERE is an undergraduate engineering laboratory demonstrator for comparing the transient cooling behaviour of insulated water capsules. The project combines a controlled ice-water-bath experiment, a lumped-parameter Newton cooling model, manual temperature acquisition and error analysis.

## Project team

- Piyath Vithanage
- Elio Krollpfeiffer
- Dilan Fernando
- Nuhansee Migelhewage

## Learning outcomes

After completing the laboratory, students should be able to:

- distinguish conduction, convection and radiation within the test system;
- apply Newton's law of cooling and interpret an effective cooling constant;
- acquire and present time-series temperature measurements;
- calculate residuals and mean absolute error (MAE);
- evaluate experimental uncertainty and the limitations of a lumped-parameter model.

## Deliverables

- `index.html` — interactive experiment interface, model and assessments;
- `student_manual.html` / `SPHERE_Mission_Control_Student_Manual.pdf` — student laboratory manual;
- `teacher_manual.html` / `SPHERE_Mission_Control_Teacher_Manual.pdf` — instructor guide and marking material;
- `student_task_sheet.html` / `student_task_sheet.pdf` — two-page A4 worksheet;
- `flashcards.html` / `SPHERE_Mission_Control_Flashcards.pdf` — printable revision cards;
- `Experimental_Toolkit_Thermal_Insulation_SOP_Illustrated.docx` — illustrated experimental procedure.

## Running the application

For a local review, start a static web server in the project directory:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/` in a current browser. Opening the files directly also works for most functions, but a local server provides more consistent browser behaviour.

## Engineering model

The reference temperature curve is

\[
T(t)=T_{\mathrm{env}}+(T_0-T_{\mathrm{env}})e^{-kt},
\]

where the effective cooling constant `k` is expressed in min⁻¹. It is a system-level parameter and must not be confused with material thermal conductivity, denoted by `λ` and expressed in W/(m·K).

Model agreement is evaluated using

\[
\mathrm{MAE}=\frac{1}{n}\sum_{i=1}^{n}|T_{\mathrm{meas},i}-T_{\mathrm{model},i}|.
\]

The default cooling constants are educational reference values. They must be calibrated or validated with repeated measurements before being presented as empirical results.

The learning materials use a single, unified 10-question assessment framework: a 10-inquiry printable task sheet (Inquiries 1–10), an online interactive evaluation sheet (Questions 1–10), and a complete 10-question instructor solution key in the Teacher Manual. The online percentage auto-scores nine multiple-choice items; its Question 4 requires instructor review.

## Experimental limitations

- The ice-water bath provides a repeatable cold boundary but does not reproduce vacuum heat transfer.
- The cotton, bubble-wrap and reflective-film assembly is inspired by layered thermal control; it is not flight-qualified multilayer insulation.
- The model assumes uniform capsule temperature and constant boundary conditions.
- Probe position, bath temperature, layer compression, leakage and timing affect repeatability.
- The instructor access-code screen is a client-side classroom gate, not a security mechanism.

## Safety

The experiment uses water at approximately 80 °C. A local risk assessment, instructor supervision, stable vessels, eye protection and heat-resistant gloves are required. Do not use boiling water. Inspect and leak-test every capsule before immersion.

## Browser dependencies

The HTML interface currently loads KaTeX, Chart.js, Lucide icons and web fonts from public content-delivery networks. An internet connection is therefore required for complete rendering unless these dependencies are bundled locally.
