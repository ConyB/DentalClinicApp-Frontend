# Dental Practice Management System
## 06 — Dental Chart / Odontogram Specification

**Document Version:** 1.0  
**Status:** Draft for Clinical Review / Odontogram Foundation  
**Prepared For:** Dental Practice Management System MVP  
**Target Market:** Ugandan Dental Clinics  
**Primary Technology Direction:** PHP / Laravel  
**Prepared By:** BaCorn Tech  
**Date:** 21 September 2026

---

# 1. Document Purpose

This document defines the functional, visual, and data behavior of the Dental Chart / Odontogram for the Dental Practice Management System MVP.

It builds on:

- `01_PRODUCT_VISION.md`
- `02_MVP_SCOPE.md`
- `03_ROLE_PERMISSION_MATRIX.md`
- `04_INFORMATION_ARCHITECTURE.md`
- `05_DENTAL_WORKFLOW_SPECIFICATION.md`

Its purpose is to remove ambiguity before UI/UX generation and backend implementation.

This specification defines:

- tooth numbering;
- permanent and primary dentition;
- tooth surfaces;
- chartable conditions;
- existing, planned, and completed treatment states;
- visual conventions;
- selection behavior;
- chart history;
- encounter linkage;
- treatment-plan linkage;
- procedure linkage;
- edit/correction rules;
- permissions;
- accessibility requirements;
- data-model direction;
- MVP boundaries.

The odontogram must not be independently improvised by the frontend or backend implementation.

---

# 2. Clinical Review Requirement

This document is a **software design specification**, not a replacement for professional dental judgment.

Before the odontogram is formally frozen for production use, a qualified dentist should review:

- tooth numbering;
- supported conditions;
- chart symbols;
- terminology;
- surface behavior;
- treatment-state behavior;
- workflow terminology.

The application's charting system records a clinician's observations and treatment decisions. It must not diagnose disease automatically.

---

# 3. Reference Standard

The MVP will use:

> **FDI Two-Digit Tooth Designation System — ISO 3950:2016**

ISO 3950:2016 defines a two-digit system for designating teeth and areas of the oral cavity.

For an individual tooth:

- the first digit identifies the quadrant and dentition;
- the second digit identifies the tooth position in that quadrant.

Reference:

- ISO 3950:2016 — Dentistry — Designation system for teeth and areas of the oral cavity
- https://www.iso.org/standard/68292.html

The system should store the FDI code as the primary human-readable tooth identifier.

---

# 4. Core Odontogram Principle

The odontogram should answer four questions quickly:

1. Which tooth is being discussed?
2. What condition currently exists?
3. What treatment is planned?
4. What treatment has already been completed?

The user should not need to open several unrelated screens to understand the patient's current dental status.

---

# 5. MVP Dentition Decision

The MVP should support:

- Permanent dentition
- Primary dentition

The underlying data model must also support mixed-dentition patients.

A dedicated advanced mixed-dentition visualization may be refined after the MVP if necessary, but the database must not prevent primary and permanent teeth from coexisting in the same patient's longitudinal history.

---

# 6. Permanent Dentition — FDI Numbering

## 6.1 Permanent Quadrants

| Quadrant | Location | FDI First Digit |
|---|---|---:|
| 1 | Upper Right | 1 |
| 2 | Upper Left | 2 |
| 3 | Lower Left | 3 |
| 4 | Lower Right | 4 |

## 6.2 Permanent Tooth Positions

| Position | Tooth Type |
|---:|---|
| 1 | Central Incisor |
| 2 | Lateral Incisor |
| 3 | Canine |
| 4 | First Premolar |
| 5 | Second Premolar |
| 6 | First Molar |
| 7 | Second Molar |
| 8 | Third Molar |

## 6.3 Permanent Tooth Layout

The chart should display teeth from the **patient's perspective**.

```text
PATIENT'S UPPER RIGHT                         PATIENT'S UPPER LEFT

18  17  16  15  14  13  12  11 | 21  22  23  24  25  26  27  28


48  47  46  45  44  43  42  41 | 31  32  33  34  35  36  37  38

PATIENT'S LOWER RIGHT                         PATIENT'S LOWER LEFT
```

The UI must clearly label orientation to reduce charting errors.

---

# 7. Primary Dentition — FDI Numbering

## 7.1 Primary Quadrants

| Quadrant | Location | FDI First Digit |
|---|---|---:|
| 5 | Upper Right | 5 |
| 6 | Upper Left | 6 |
| 7 | Lower Left | 7 |
| 8 | Lower Right | 8 |

## 7.2 Primary Tooth Positions

| Position | Tooth Type |
|---:|---|
| 1 | Central Incisor |
| 2 | Lateral Incisor |
| 3 | Canine |
| 4 | First Molar |
| 5 | Second Molar |

## 7.3 Primary Tooth Layout

```text
PATIENT'S UPPER RIGHT              PATIENT'S UPPER LEFT

55  54  53  52  51 | 61  62  63  64  65


85  84  83  82  81 | 71  72  73  74  75

PATIENT'S LOWER RIGHT              PATIENT'S LOWER LEFT
```

---

# 8. Dentition Selection

The patient dental-chart page should support a dentition selector.

Recommended options:

```text
Permanent
Primary
Mixed / All Recorded Teeth
```

For the MVP:

- Permanent view is mandatory.
- Primary view is mandatory.
- Mixed/All view may be simplified if necessary, but stored records must remain compatible with it.

The application must never automatically delete primary-tooth history merely because permanent teeth are later recorded.

---

# 9. Tooth Identity Data

Each chartable tooth definition should contain at least:

- FDI code;
- dentition type;
- quadrant;
- arch;
- side;
- tooth position;
- tooth type;
- display name;
- anterior/posterior classification;
- permitted surface set.

Example:

```text
FDI Code: 16
Dentition: Permanent
Arch: Maxillary
Side: Right
Type: First Molar
Classification: Posterior
```

---

# 10. Tooth Surfaces

Surface-level charting is included in the MVP where a specific tooth surface matters.

The design should support:

| Code | Surface |
|---|---|
| M | Mesial |
| D | Distal |
| B | Buccal |
| L | Lingual |
| O | Occlusal |
| F | Facial / Labial |
| I | Incisal |

Reference terminology aligns with common ADA tooth-surface designations.

---

# 11. Posterior Tooth Surface Model

Posterior teeth should normally support:

- Mesial
- Distal
- Buccal
- Lingual
- Occlusal

The graphic should provide clearly selectable surface regions.

The exact drawing may be simplified for clarity and touch usability.

---

# 12. Anterior Tooth Surface Model

Anterior teeth should normally support:

- Mesial
- Distal
- Facial / Labial
- Lingual
- Incisal

The UI should use a suitable anterior surface selector rather than forcing an Occlusal surface onto anterior teeth.

---

# 13. Multi-Surface Selection

The user must be able to select more than one applicable surface for one chart entry.

Examples:

- MO
- DO
- MOD
- MODB

Surfaces should be stored structurally rather than as uncontrolled free text.

Conceptually:

```text
surfaces = [M, O, D]
```

The UI may display:

```text
MOD
```

---

# 14. Surface Applicability Rules

The UI should prevent or strongly discourage invalid combinations caused by interface mistakes.

Examples:

- posterior teeth use Occlusal rather than Incisal;
- anterior teeth use Incisal rather than Occlusal;
- facial/labial behavior should be consistent with the tooth type.

The implementation should use a configured tooth-surface map rather than scattered hard-coded rules.

---

# 15. Chart Entry Categories

A dental-chart entry should belong to one of these broad categories:

1. **Existing Condition**
2. **Existing / Historical Treatment**
3. **Planned Treatment**
4. **Completed Treatment**
5. **Observation / Other**

A condition is not the same thing as a procedure.

Example:

- Caries = condition
- Composite Filling = treatment/procedure

---

# 16. MVP Clinical Condition Set

## 16.1 Whole-Tooth / General Conditions

- Healthy / No Recorded Abnormality
- Missing
- Unerupted
- Partially Erupted
- Impacted
- Fractured
- Mobile
- Retained Root / Root Remnant
- Extraction Required
- Other Condition

## 16.2 Surface-Based Conditions

- Caries
- Defective Restoration
- Fracture / Defect where surface-specific
- Other Surface Finding

The final labels should be confirmed during clinical review.

---

# 17. MVP Existing Treatment / Restoration Set

The odontogram should support historical/existing treatment such as:

- Filling / Restoration
- Crown
- Bridge Abutment
- Pontic / Bridge Unit
- Implant
- Root Canal Treated
- Extracted
- Denture-related notation where appropriate
- Sealant if approved during clinical review
- Other Existing Treatment

---

# 18. Planned Treatment Set

Planned treatment should connect to a treatment-plan item where possible.

Examples:

- Filling
- Extraction
- Root Canal Treatment
- Crown
- Bridge
- Implant-related treatment
- Other procedure from the service catalogue

A planned-treatment chart entry should normally carry:

- treatment-plan reference;
- treatment-plan item;
- tooth;
- surface(s), where applicable;
- status;
- Dentist;
- date created.

---

# 19. Completed Treatment Set

When a tooth-specific procedure is completed:

- a clinical procedure record must exist;
- a chart entry may represent the resulting dental state;
- the related treatment-plan item should update where applicable;
- historical pre-treatment findings must remain traceable.

Example:

```text
Caries on 16-O
      ↓
Plan: Composite Filling 16-O
      ↓
Procedure Completed
      ↓
Completed Restoration shown on 16-O
```

The system must not overwrite the original caries record and lose the historical sequence.

---

# 20. Chart Status Layers

The odontogram should conceptually support separate visual layers.

Recommended:

```text
Current Conditions
Planned Treatment
Completed / Existing Treatment
```

The UI may provide layer filters such as:

```text
[✓] Conditions
[✓] Existing / Completed
[✓] Planned
```

This reduces visual clutter for patients with extensive histories.

---

# 21. Visual Encoding Principle

The chart must not rely on colour alone.

Every state should have at least two cues, for example:

- colour + pattern;
- colour + icon;
- colour + border;
- colour + abbreviation.

This improves:

- accessibility;
- printed output;
- low-quality display usability;
- usability for colour-vision deficiencies.

---

# 22. Colour Direction

The MVP may use distinct visual families for:

- active pathology/conditions;
- existing/completed treatment;
- planned treatment.

Exact colours are a UI/UX decision and must be finalized in `09_UI_UX_SYSTEM.md`.

The legend must always explain the active symbols.

---

# 23. Odontogram Legend

The chart page should include an accessible legend covering at least:

- condition notation;
- completed-treatment notation;
- planned-treatment notation;
- missing tooth;
- extracted tooth;
- implant;
- crown;
- root canal;
- caries/restoration surface notation.

The legend may be:

- inline;
- collapsible;
- side-panel based.

It must remain easy to access.

---

# 24. Tooth Selection Behavior

When the Dentist selects a tooth:

```text
Select tooth
      ↓
Selected tooth highlighted
      ↓
Tooth detail panel opens
      ↓
Current chart summary shown
      ↓
Valid clinical actions shown
```

The selected-tooth panel should display:

- FDI number;
- tooth name;
- current conditions;
- existing treatment;
- planned treatment;
- completed treatment;
- recent chart history;
- add-entry actions.

---

# 25. Selected Tooth Panel

Recommended structure:

```text
Tooth 16 — Upper Right First Molar

Current Status
- Caries: O
- Existing Restoration: MO

Planned Treatment
- Composite Filling: O

Recent History
- 18 Sep 2026 — Caries O — Dentist
- 04 Jan 2025 — Restoration MO — Dentist

Actions
[Add Finding] [Add Planned Treatment] [View Full History]
```

Only actions permitted for the current user's role should appear.

---

# 26. Multi-Tooth Selection

MVP decision:

> Routine charting should primarily use one tooth at a time.

Multi-tooth selection may be added only where it improves accuracy and efficiency without creating ambiguous changes.

The MVP should prioritize charting accuracy over bulk editing.

---

# 27. Add Finding Workflow

```text
Select Tooth
   ↓
Add Finding
   ↓
Choose Condition
   ↓
Choose Surface(s) if applicable
   ↓
Add Clinical Note if necessary
   ↓
Confirm Encounter Context
   ↓
Save
   ↓
Odontogram updates
```

Required metadata:

- patient;
- tooth;
- condition;
- surface(s), where relevant;
- encounter;
- Dentist;
- timestamp;
- notes where applicable.

---

# 28. Whole-Tooth Condition Workflow

For a whole-tooth condition such as Missing or Impacted:

```text
Select Tooth
   ↓
Select Whole-Tooth Condition
   ↓
Confirm
   ↓
Store Condition
   ↓
Update Whole-Tooth Graphic
```

Surface selection should not be required.

---

# 29. Surface-Based Finding Workflow

For Caries:

```text
Select Tooth
   ↓
Select Caries
   ↓
Select one or more valid surfaces
   ↓
Save
   ↓
Affected surfaces update visually
```

---

# 30. Healthy / No Abnormality Behavior

`Healthy` must be treated carefully.

The absence of a recorded condition does not prove that a tooth was examined and found healthy.

Recommended MVP behavior:

- do not automatically mark all untouched teeth as Healthy;
- allow the Dentist to record a healthy/no-abnormality observation when appropriate;
- distinguish:
  - **not charted**
  - **examined with no recorded abnormality**

This prevents misleading clinical representation.

---

# 31. Missing vs Extracted

The system should distinguish:

## Missing

The tooth is absent, but the chart does not necessarily assert a known extraction event.

## Extracted

A known extraction procedure/history is documented.

This improves longitudinal clinical history.

---

# 32. Extraction Required

`Extraction Required` is a finding/planned-care indicator and is not equivalent to Missing or Extracted.

Typical lifecycle:

```text
Tooth Present
   ↓
Extraction Required
   ↓
Treatment Plan: Extraction
   ↓
Procedure Completed
   ↓
Tooth = Extracted
```

---

# 33. Implant Behavior

An implant should not appear as a natural healthy tooth.

The chart must be able to represent:

- missing natural tooth;
- implant present;
- future implant-supported restoration where later expanded.

A simplified Implant state is acceptable for the MVP.

---

# 34. Crown Behavior

A crown normally represents whole-tooth restorative treatment.

The odontogram should display the crown state at tooth level rather than as an arbitrary single surface.

Historical conditions should remain in chart history.

---

# 35. Root Canal Behavior

`Root Canal Treated` should be represented separately from crown/restoration state.

A tooth may therefore have concurrent states, for example:

```text
Root Canal Treated
+
Crown
```

The data model must support clinically compatible concurrent entries.

---

# 36. Bridge Behavior

Bridge charting may involve:

- abutment tooth/teeth;
- pontic / missing-tooth replacement.

The MVP may use a simplified visual representation, but a bridge should not be stored only as one ambiguous free-text note.

A bridge record should be able to reference multiple tooth positions.

Detailed prosthodontic modeling may come later.

---

# 37. Concurrent Conditions

A tooth may have multiple simultaneous chart entries.

Examples:

```text
Tooth 16
- Existing MO restoration
- New distal caries
```

or:

```text
Tooth 21
- Root canal treated
- Crown
```

The chart model must not assume exactly one status per tooth.

---

# 38. Current State vs Historical State

The odontogram should derive its current view from active/latest valid chart records.

Historical entries remain separately queryable.

Conceptually:

```text
CURRENT VIEW
What is clinically relevant now?

HISTORY VIEW
What was recorded previously, when, and by whom?
```

---

# 39. Dental Chart History

Every meaningful chart change should be traceable.

A history entry should include:

- date/time;
- FDI tooth number;
- condition/treatment;
- surface(s);
- action;
- Dentist/user;
- encounter;
- notes;
- state;
- correction information where applicable.

---

# 40. History Timeline

The chart page should offer a history/timeline view.

MVP filters should support at least:

- date;
- tooth;
- entry type.

Later enhancements may include:

- Dentist;
- encounter;
- procedure;
- condition.

---

# 41. Encounter Linkage

A new chart entry created during an encounter should normally reference that encounter.

```text
Patient
   ↓
Encounter
   ↓
Dental Chart Entry
```

This allows the clinic to determine why and when the chart changed.

---

# 42. Charting Outside an Encounter

The MVP may allow authorized baseline/historical charting outside a live encounter.

Example:

- initial data migration;
- Dentist records an existing crown at first assessment.

If used:

- the user must have clinical permission;
- source should indicate baseline/historical entry;
- date and user must be recorded.

---

# 43. Baseline / Initial Chart

At a patient's first clinical assessment, the Dentist may establish a baseline chart.

The MVP should support incremental charting.

The application should not force every tooth to be explicitly marked if no clinical need exists.

---

# 44. Treatment Plan Integration

From a chart finding, the Dentist should be able to initiate treatment planning.

Example:

```text
Tooth 26
Caries — MO
      ↓
Create Treatment Item
      ↓
Composite Restoration
      ↓
Tooth 26
Surfaces MO
```

Relevant context should be prefilled where safe, but the Dentist must confirm/edit the treatment item.

---

# 45. Planned Treatment Display

If a treatment-plan item is associated with a tooth:

- the tooth may display a planned-treatment indicator;
- surface-level planned treatment may appear on applicable surfaces;
- planned treatment must be visually distinct from completed treatment.

A proposed treatment must never look like a performed procedure.

---

# 46. Procedure Integration

When a tooth-specific procedure is completed:

```text
Treatment Plan Item
        ↓
Procedure Record
        ↓
Dental Chart Update
```

Where appropriate, the procedure-completion workflow may propose the resulting chart state.

Examples:

- Filling completed → Restoration state
- Extraction completed → Extracted state
- Crown completed → Crown state
- Root canal completed → Root Canal Treated state

The Dentist should confirm the resulting chart state.

---

# 47. Avoid Duplicate Clinical Entry

The frontend should minimize repetitive entry.

Example:

If a treatment-plan item already contains:

```text
Tooth 16
Composite Restoration
Surface O
```

procedure completion should carry forward the tooth, surface, and procedure.

The Dentist confirms the details rather than retyping identical information.

---

# 48. Correction Workflow

Clinical chart history should not be hard-deleted after becoming part of a completed encounter.

Preferred correction flow:

```text
Chart Entry
   ↓
Correct Entry
   ↓
Reason required
   ↓
Original marked Corrected/Superseded
   ↓
New corrected entry created
   ↓
Audit history preserved
```

---

# 49. Draft Chart Entries

While an encounter is Draft/In Progress:

- chart entries may be editable by the responsible Dentist;
- unsaved visual selections are not clinical records;
- saved draft entries remain traceable.

Once the encounter is Completed:

- routine direct editing should stop;
- controlled correction rules apply.

---

# 50. Deletion Rules

## Allowed

- discard unsaved selection;
- remove an accidental draft entry before encounter completion according to backend rules.

## Not Allowed

- silently delete chart history from a completed encounter;
- remove completed treatment history because it is no longer visually current.

---

# 51. Chart Permission Rules

## Dentist

May:

- view chart;
- add findings;
- update permitted draft/in-progress chart data;
- add planned treatment;
- complete chart-linked procedures;
- view history.

## Clinic Administrator

May:

- view when authorized;
- access oversight/history;
- participate in controlled correction workflows where clinic policy allows.

The Administrator should not routinely create clinical findings.

## Receptionist

No dental-chart editing access in the MVP.

## Cashier

No dental-chart access in the MVP except unrelated finance context.

---

# 52. Patient Header on Dental Chart

The page should keep a compact patient context header visible.

Recommended fields:

- patient name;
- patient number;
- age;
- sex;
- allergy alert;
- current appointment;
- current Dentist;
- encounter status.

Sensitive fields remain permission-aware.

---

# 53. Dental Chart Page Layout

Recommended desktop layout:

```text
┌──────────────────────────────────────────────────────────────────┐
│ Patient Context Header                                           │
├──────────────────────────────────────────────────────────────────┤
│ Dentition: [Permanent] [Primary] [Mixed/All]   Chart Legend      │
├───────────────────────────────────────────┬──────────────────────┤
│                                           │ Selected Tooth Panel │
│              ODONTOGRAM                   │                      │
│                                           │ Conditions           │
│   Upper Teeth                             │ Treatments           │
│                                           │ History              │
│   Lower Teeth                             │ Actions              │
│                                           │                      │
├───────────────────────────────────────────┴──────────────────────┤
│ Chart Timeline / Recent Changes                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

# 54. Tablet Layout

On tablet:

- odontogram must remain usable;
- selected-tooth panel may become a slide-over;
- excessive horizontal scrolling should be avoided;
- touch targets must remain practical.

---

# 55. Mobile Boundary

Detailed odontogram editing is not a phone-first workflow for the MVP.

On small screens:

- chart may be viewable;
- tooth history may be accessible;
- basic chart information may be reviewed.

Advanced editing may recommend tablet/desktop if a usable mobile interaction cannot be provided.

The system should not shrink a complex odontogram into unusable tiny targets merely to claim mobile parity.

---

# 56. Tooth Interaction Requirements

Each tooth graphic should support:

- hover/focus state on desktop;
- selected state;
- touch selection;
- keyboard focus where practical;
- tooltip or accessible label;
- clear tooth number.

Example accessible label:

```text
Tooth 16, upper right first molar
```

---

# 57. Accessibility Requirements

The odontogram should:

- not rely on colour alone;
- provide text labels;
- provide visible focus state;
- maintain sufficient contrast;
- expose tooth identity to assistive technologies where practical;
- provide a non-graphical history/list representation.

---

# 58. Printable Dental Chart

The MVP should support a print-friendly dental-chart summary.

Possible print content:

- clinic identity;
- patient identity;
- date;
- current odontogram;
- legend;
- current conditions summary;
- treatment summary;
- Dentist name.

Interactive controls must not appear in print.

---

# 59. Chart Filters

Recommended MVP controls:

```text
View:
[Current] [History]

Layers:
[Conditions]
[Existing/Completed Treatment]
[Planned Treatment]

Dentition:
[Permanent]
[Primary]
[Mixed/All]
```

The page should not be overloaded with filters.

---

# 60. Search / Jump to Tooth

Optional MVP enhancement:

```text
Jump to Tooth: [16]
```

This may improve keyboard-heavy workflows but is not essential to frontend freeze.

---

# 61. Chart Notes

The odontogram must not replace the encounter clinical notes.

A chart entry may hold a short relevant note.

Detailed narrative belongs in:

- examination findings;
- diagnosis;
- encounter clinical notes.

---

# 62. Data Model Direction

The final schema will be defined in `08_DATABASE_DESIGN.md`.

Do **not** use a schema such as:

```text
patients
- tooth11_status
- tooth12_status
- tooth13_status
...
```

That design is not acceptable.

Use normalized dental-chart records.

---

# 63. Conceptual Tooth Definition Entity

A reference entity may contain:

```text
tooth_definitions
- id
- fdi_code
- dentition
- quadrant
- arch
- side
- position
- tooth_type
- is_anterior
- is_active
```

---

# 64. Conceptual Dental Chart Entry

A chart entry may conceptually contain:

```text
dental_chart_entries
- id
- patient_id
- encounter_id
- tooth_fdi_code
- entry_type
- condition_id / treatment_reference
- status
- notes
- recorded_by
- recorded_at
- corrected_entry_id
- correction_reason
- created_at
- updated_at
```

Exact implementation will be refined in the database design.

---

# 65. Conceptual Surface Records

For multiple surfaces, a normalized direction is recommended:

```text
dental_chart_entry_surfaces
- id
- dental_chart_entry_id
- surface_code
```

This is preferable to inconsistent free-text surface strings.

---

# 66. Conceptual Entry Types

Suggested values:

```text
CONDITION
EXISTING_TREATMENT
PLANNED_TREATMENT
COMPLETED_TREATMENT
OBSERVATION
```

The final backend may use enums or reference data according to project conventions.

---

# 67. Current-State Derivation

Do not rely on one mutable `tooth_status` field to represent a tooth.

A tooth may simultaneously have:

- multiple surface findings;
- existing restoration;
- crown;
- root canal history;
- planned work.

The current visual chart should be built from persisted, valid chart records.

---

# 68. Sample Data Direction

Example patient A:

```text
16 — Existing MO restoration
26 — Caries O
36 — Root canal treated + Crown
46 — Missing
```

Example patient B:

```text
11 — Healthy observation
21 — Fractured
24 — Caries DO
```

Sample chart records must reconcile with encounters, treatment plans, procedures, and invoices where relevant.

---

# 69. UX Action Menu

When a tooth is selected, suggested actions may include:

```text
Add Condition
Add Existing Treatment
Add Planned Treatment
View History
```

`Record Completed Treatment` should normally happen through the procedure/encounter workflow rather than as an isolated drawing action.

---

# 70. Visual Conflict Handling

If multiple states affect the same tooth or surface, avoid ambiguous overpainting.

Recommended techniques:

- layers;
- patterns;
- outlines;
- state markers;
- selected-tooth summary.

The tooth graphic does not need to encode every fact by itself.

The selected-tooth panel should provide the authoritative readable summary.

---

# 71. Legend Consistency

The same chart legend/state meaning must be used in:

- Patient Dental Chart
- Encounter Dental Chart
- Treatment Plan preview
- Printed Dental Chart
- Clinical summary

Do not assign different meanings to the same symbol between modules.

---

# 72. Treatment Plan Preview

When creating treatment from a chart finding, the UI may show:

```text
Current Condition
Tooth 26 — Caries MO

Proposed Treatment
Composite Restoration — MO
Estimated Price: UGX ...
```

Pricing belongs to the treatment plan/service catalogue, not the underlying clinical condition.

---

# 73. Financial Separation

The odontogram should not become a billing screen.

It may indicate treatment as:

- planned;
- in progress;
- completed.

Detailed invoice totals, discounts, payments, and balances belong to Finance.

---

# 74. Medical Alert Separation

System-level medical alerts such as allergies should be visible near clinical charting where appropriate, but they must not be encoded as tooth conditions.

---

# 75. Mixed Dentition Direction

The data model must support patients in whom:

- primary teeth remain;
- permanent teeth have erupted;
- both are clinically relevant.

MVP UI options include:

1. Permanent / Primary toggles with history retained; or
2. a Mixed/All view.

A polished mixed-dentition renderer may be refined after MVP if it creates disproportionate interface complexity.

The database must support mixed dentition from Day 1.

---

# 76. Supernumerary / Anomalous Teeth

Advanced modeling of:

- supernumerary teeth;
- complex tooth anomalies;
- nonstandard positions

is outside the core MVP chart.

The system should provide an `Other / Clinical Note` path so a Dentist can document unusual findings without corrupting standard FDI records.

The data model should remain extendable.

---

# 77. Periodontal Charting

Detailed periodontal charting is outside the core MVP.

Deferred features include:

- pocket depth;
- gingival recession;
- bleeding points;
- mobility grading grids;
- furcation;
- six-point periodontal measurements.

If later implemented, periodontal charting should be a related clinical feature rather than overloading the basic odontogram.

---

# 78. Orthodontic Charting

Advanced orthodontic charting is outside MVP.

Deferred examples:

- malocclusion classification;
- bracket status;
- archwire tracking;
- cephalometric records;
- orthodontic treatment stages.

---

# 79. Imaging Integration

The dental chart may link to patient images/X-rays.

Example:

```text
Tooth 36
[View Related X-Ray]
```

MVP only requires ordinary attachment relationships.

It does not require:

- DICOM;
- PACS;
- automatic image-tooth mapping;
- AI image interpretation.

---

# 80. Audit Requirements

Important chart events should be auditable.

Suggested event types:

```text
DENTAL_CHART_ENTRY_CREATED
DENTAL_CHART_ENTRY_UPDATED_DRAFT
DENTAL_CHART_ENTRY_CORRECTED
DENTAL_CHART_ENTRY_SUPERSEDED
DENTAL_CHART_PROCEDURE_COMPLETED
```

Audit data should identify:

- user;
- patient;
- tooth;
- encounter;
- timestamp;
- action.

---

# 81. Validation Rules Summary

## DC-01
Every chart entry must belong to a valid patient.

## DC-02
Every tooth-specific entry must use a valid supported FDI code.

## DC-03
A surface-based condition must include at least one applicable surface.

## DC-04
A whole-tooth condition must not require arbitrary surfaces.

## DC-05
Only authorized clinical users may create clinical chart entries.

## DC-06
Entries created during an encounter should reference that encounter.

## DC-07
Completed historical chart entries must not be silently deleted.

## DC-08
Planned treatment must not visually appear as completed treatment.

## DC-09
Completed procedures must remain traceable to the Dentist and encounter.

## DC-10
Treatment completion must not destroy original diagnostic history.

## DC-11
Primary and permanent teeth must use separate valid FDI ranges.

## DC-12
The UI must clearly indicate patient left/right orientation.

## DC-13
Chart state must not depend on colour alone.

## DC-14
Cashier and Receptionist must not edit odontogram clinical data.

## DC-15
Current chart view must be reproducible from persisted records.

---

# 82. Permanent Tooth Validation Set

Valid MVP permanent FDI codes:

```text
11 12 13 14 15 16 17 18
21 22 23 24 25 26 27 28
31 32 33 34 35 36 37 38
41 42 43 44 45 46 47 48
```

---

# 83. Primary Tooth Validation Set

Valid MVP primary FDI codes:

```text
51 52 53 54 55
61 62 63 64 65
71 72 73 74 75
81 82 83 84 85
```

---

# 84. Example Workflow A — Caries to Restoration

```text
Encounter opened
   ↓
Tooth 16 selected
   ↓
Caries recorded on O
   ↓
Chart shows active condition
   ↓
Treatment item created:
Composite Filling — 16-O
   ↓
Patient accepts
   ↓
Procedure completed
   ↓
Chart records completed restoration on O
   ↓
Original caries entry remains in history
```

---

# 85. Example Workflow B — Extraction

```text
Tooth 46 selected
   ↓
Extraction Required recorded
   ↓
Treatment Plan:
Simple Extraction — 46
   ↓
Accepted
   ↓
Extraction completed
   ↓
Procedure record saved
   ↓
Current chart shows Extracted
   ↓
Previous history retained
```

---

# 86. Example Workflow C — Root Canal + Crown

```text
Tooth 36
   ↓
Treatment Plan
   ↓
Root Canal Treatment completed
   ↓
Chart shows Root Canal Treated
   ↓
Crown later completed
   ↓
Chart shows:
Root Canal Treated + Crown
```

The crown must not erase root-canal history.

---

# 87. Example Workflow D — Primary Tooth

```text
Primary Dentition
   ↓
Tooth 75
   ↓
Caries O recorded
   ↓
Treatment planned
   ↓
History remains after later exfoliation/extraction
```

---

# 88. UI Error Prevention

The odontogram should reduce common input errors.

Recommended safeguards:

- selected tooth clearly highlighted;
- FDI number always visible;
- tooth name shown alongside number;
- invalid surfaces disabled;
- role-aware actions;
- warning when an expected encounter context is absent;
- patient identity prominently displayed;
- confirmation for correction/reversal actions.

---

# 89. Unsaved Changes

If the Dentist has unsaved chart input and attempts to leave:

- warn about unsaved changes;
- offer Save or Discard;
- do not silently lose charting.

---

# 90. Performance Requirement

The odontogram should feel immediate.

Selecting a tooth, switching layers, or opening the detail panel should not require full-page navigation.

The frontend should remain responsive after backend integration.

---

# 91. Frontend Implementation Direction

The odontogram may use:

- SVG;
- semantic HTML/SVG combinations;
- reusable JavaScript components.

SVG is strongly suitable because it supports:

- scalable tooth graphics;
- selectable surface regions;
- interactive hit targets;
- reusable visual states;
- print scalability.

Avoid representing every tooth as an unrelated static image with no structured surface interaction.

---

# 92. Tooth Asset Requirement

If custom tooth SVG assets are created, they should:

- use consistent sizing/view boxes;
- support reusable state classes;
- expose surface regions where needed;
- contain no hard-coded patient data;
- remain reusable for permanent and primary charts.

Clinical clarity is more important than photorealism.

---

# 93. Frontend State Direction

The frontend should render from structured data.

Example:

```text
Patient
 └── Tooth 16
      ├── Condition: Caries [O]
      ├── Existing Treatment: Restoration [M,O]
      └── Planned Treatment: Composite Restoration [O]
```

Medical state should not exist only as temporary DOM/CSS classes.

---

# 94. Backend/API Direction

Later Laravel integration should provide structured chart data supporting:

- current-state rendering;
- history;
- filtering;
- encounter context;
- treatment-plan links;
- procedure links.

Exact resources/endpoints will be defined during backend integration.

---

# 95. Sample Odontogram Data Requirement

`10_SAMPLE_DATA_SPECIFICATION.md` should include at least:

- one mostly healthy adult;
- one adult with several existing restorations;
- one patient with active caries and planned treatment;
- one patient with extraction history;
- one root-canal + crown example;
- one primary-dentition example;
- one partially completed treatment-plan example.

This will test realistic chart density and state combinations.

---

# 96. MVP Odontogram Acceptance Scenario

The chart is functionally adequate for MVP when a Dentist can:

1. Open a patient.
2. Open the dental chart.
3. Switch between Permanent and Primary dentition where relevant.
4. Select a tooth.
5. See the FDI number and tooth name.
6. Record a whole-tooth condition.
7. Record a surface-specific condition.
8. Select multiple valid surfaces.
9. View existing treatment.
10. Create a chart-linked treatment-plan item.
11. See planned treatment visually distinguished.
12. Complete a related procedure.
13. See the resulting completed-treatment state.
14. View the original finding in history.
15. Print a readable chart summary.
16. Complete the workflow without Receptionist/Cashier clinical edit access.

---

# 97. MVP Scope Decisions Locked by This Document

## Included

- FDI two-digit numbering
- ISO 3950:2016 alignment
- Permanent dentition
- Primary dentition
- Surface-level charting
- Whole-tooth conditions
- Multiple concurrent entries
- Conditions vs treatments separation
- Planned vs completed treatment separation
- Chart history
- Encounter linkage
- Treatment-plan linkage
- Procedure linkage
- Correction history
- Printable summary
- Role restrictions

## Deferred

- Full periodontal charting
- Advanced orthodontic charting
- 3D odontogram
- DICOM/PACS
- AI diagnosis
- AI X-ray interpretation
- Advanced anomaly/supernumerary modeling
- Complex implant prosthodontic modeling
- Automated clinical recommendations

---

# 98. Clinical Review Checklist

Before freezing this document, a dental professional should confirm:

- [ ] FDI numbering is appropriate.
- [ ] Permanent chart layout is correct.
- [ ] Primary chart layout is correct.
- [ ] Surface terminology is acceptable.
- [ ] Condition terminology is acceptable.
- [ ] Existing-treatment terminology is acceptable.
- [ ] Planned-treatment behavior is acceptable.
- [ ] Completed-treatment behavior is acceptable.
- [ ] Missing vs Extracted distinction is acceptable.
- [ ] Root Canal + Crown concurrent states are appropriate.
- [ ] Bridge representation is acceptable for MVP.
- [ ] Extraction workflow is clinically understandable.
- [ ] Chart-history behavior is suitable.
- [ ] No common MVP dental condition has been omitted.

---

# 99. Dental Chart Freeze Conditions

This specification may be frozen after:

- numbering standard is accepted;
- permanent/primary dentition is accepted;
- tooth-surface model is accepted;
- condition list is clinically reviewed;
- treatment-state list is reviewed;
- visual-layer model is accepted;
- history rules are accepted;
- treatment-plan integration is accepted;
- procedure integration is accepted;
- correction rules are accepted;
- permissions are accepted;
- qualified Dentist review is completed.

---

# 100. Dental Chart Summary

The MVP odontogram should behave as a longitudinal clinical record, not merely as a colourful tooth diagram.

The intended model is:

```text
PATIENT
   ↓
DENTITION
   ↓
TOOTH
   ↓
SURFACE(S) where applicable
   ↓
CONDITION
   ↓
TREATMENT PLAN
   ↓
PROCEDURE
   ↓
UPDATED CURRENT STATE
   ↓
HISTORY PRESERVED
```

The current visual chart provides a fast clinical overview.

The underlying history explains how that state developed over time.

---

# Dental Chart Specification Decision

**Recommended Status:** READY FOR CLINICAL REVIEW

**Recommended Tooth Standard:** FDI Two-Digit System / ISO 3950:2016

**MVP Chart Scope:** Permanent + Primary Dentition, Surface-Level Charting, Historical State Preservation

**Next Document:** `07_SRS.md`

The next document should consolidate all approved product, scope, permission, architecture, workflow, and dental-chart decisions into the formal Software Requirements Specification for the Dental Practice Management System MVP.
