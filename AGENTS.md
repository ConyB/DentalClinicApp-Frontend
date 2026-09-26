# AGENTS.md
## Dental Practice Management System — Coding Agent Instructions

**Project:** Dental Practice Management System MVP  
**Target Market:** Ugandan Dental Clinics  
**Current Stage:** Frontend UI/UX Development  
**Backend Direction:** Laravel, only after frontend freeze  
**Prepared By:** BaCorn Tech  
**Date:** 21 September 2026

---

# 1. Purpose

This file contains the persistent instructions that every coding agent must follow while working on this project.

These rules apply to:

- Codex
- Claude
- Cursor agents
- other AI coding assistants
- human developers using the same project

The goal is to preserve:

- scope;
- architecture;
- role boundaries;
- workflow consistency;
- clinical safety;
- sample-data consistency;
- UI/UX consistency;
- Laravel readiness.

Do not ignore this file.

---

# 2. Current Project Stage

The project is currently in:

> **FRONTEND UI/UX IMPLEMENTATION**

The frontend must be completed and frozen before Laravel backend integration begins.

---

# 3. Critical Rule — Frontend Only

During the current phase, do **NOT** generate or modify backend code.

Do not create:

- Laravel controllers;
- Eloquent models;
- migrations;
- seeders;
- middleware;
- policies;
- API routes;
- database connections;
- SQL queries;
- real authentication;
- PHP business logic;
- payment integrations;
- SMS/WhatsApp integrations;
- email integrations;
- server-side validation.

Use:

- HTML5;
- CSS3;
- JavaScript;
- Bootstrap 5 where appropriate;
- SVG for the odontogram;
- centralized mock data;
- simulated frontend state.

If backend-looking code already exists, do not extend it unless the task explicitly switches the project into backend integration.

---

# 4. Source-of-Truth Documents

Before implementing any phase, consult the relevant documents in `docs/`.

Primary hierarchy:

```text
01_PRODUCT_VISION.md
02_MVP_SCOPE.md
03_ROLE_PERMISSION_MATRIX.md
04_INFORMATION_ARCHITECTURE.md
05_DENTAL_WORKFLOW_SPECIFICATION.md
06_DENTAL_CHART_SPECIFICATION.md
07_SRS.md
08_DATABASE_DESIGN.md
09_UI_UX_SYSTEM.md
10_SAMPLE_DATA_SPECIFICATION.md
11_FRONTEND_IMPLEMENTATION_PLAN.md
```

These documents are authoritative.

Do not silently contradict them.

If two documents appear inconsistent:

1. identify the conflict;
2. prefer the more specific/later approved requirement where appropriate;
3. report the conflict;
4. avoid inventing a new architecture.

---

# 5. Execution Model

Work one approved phase at a time.

For every phase:

```text
READ
→ ANALYSE
→ IMPLEMENT
→ SELF-AUDIT
→ FIX
→ VERIFY
→ REPORT PASS / INCOMPLETE
```

Do not jump ahead into unrelated modules.

---

# 6. Required End-of-Phase Report

At the end of each phase, report:

```text
PHASE X RESULT

Implemented:
- ...

Validated:
- ...

Files Changed:
- ...

Issues Found:
- ...

Outstanding:
- ...

PHASE STATUS: PASS / INCOMPLETE
```

Do not mark a phase PASS if required behavior is missing.

---

# 7. Analysis Quality Requirements

Before writing code:

1. Inspect the current project structure.
2. Read the relevant documentation.
3. Identify reusable existing components.
4. Inspect existing CSS and JavaScript conventions.
5. Confirm the sample-data entities required.
6. Check role permissions.
7. Check workflow state rules.
8. Check whether the requested feature already exists.
9. Avoid unnecessary rewrites.
10. Prefer surgical changes.

Do not regenerate stable modules without a clear reason.

---

# 8. Frontend Architecture Direction

Preferred architecture:

```text
index.html
    → login/authentication simulation

app.html
    → authenticated application shell
    → modular JavaScript-rendered views
```

Use a **small number of HTML shell files**.

Do not create dozens of standalone HTML pages containing duplicated:

- sidebar;
- header;
- modals;
- tables;
- styles;
- patient data.

The frontend must remain easy to convert into Laravel Blade templates.

---

# 9. Shared Component Rule

Reuse existing components before creating new ones.

Core shared components include:

- Sidebar
- Header
- Breadcrumb
- Page Header
- Patient Context Header
- Button
- Icon Button
- Input
- Textarea
- Select
- Search
- Filter Bar
- Card
- KPI Card
- Table
- Pagination
- Badge
- Toast
- Modal
- Drawer
- Confirmation Dialog
- Empty State
- Loading State
- Print Header

Do not create a second unrelated implementation of an existing shared component.

---

# 10. Centralized Mock Data Rule

All modules must use the canonical shared dataset from:

`10_SAMPLE_DATA_SPECIFICATION.md`

Do not hard-code unrelated patient or finance records inside individual modules.

Use stable references such as:

```text
patientId
dentistId
appointmentId
encounterId
treatmentPlanId
invoiceId
paymentId
receiptId
```

The frontend should behave like a relational system even before the backend exists.

---

# 11. Demo Data Consistency

The following must always reconcile:

```text
Patient
→ Appointment
→ Queue
→ Encounter
→ Dental Chart
→ Treatment Plan
→ Procedure
→ Invoice
→ Payment
→ Receipt
→ Recall
```

Examples:

- a receipt amount must equal its linked payment;
- invoice paid amount must equal valid linked payments;
- an overdue/cancelled appointment must not appear as an active waiting patient;
- completed treatment must correspond to a performed procedure;
- planned treatment must not appear as completed;
- dashboard KPIs must derive from actual mock records.

Never fake one module independently.

---

# 12. Role Model

The MVP has four roles:

```text
Clinic Administrator
Dentist
Receptionist
Cashier
```

Follow `03_ROLE_PERMISSION_MATRIX.md`.

---

# 13. Clinic Administrator Boundaries

Administrator may manage:

- dashboard/oversight;
- patients;
- appointments;
- finance oversight;
- reports;
- users;
- clinic settings;
- service catalogue.

Administrator should not routinely perform Dentist-only clinical actions such as:

- diagnosis;
- prescription;
- dental-chart findings;
- clinical procedure documentation.

Clinical oversight may be read-only where specified.

---

# 14. Dentist Boundaries

Dentist may manage:

- own/relevant appointments;
- patient clinical context;
- medical-history review;
- clinical encounters;
- dental chart;
- findings;
- diagnosis;
- treatment plans;
- procedures;
- prescriptions;
- recalls/follow-ups.

Dentist must not receive unrestricted:

- payment administration;
- user management;
- security settings.

---

# 15. Receptionist Boundaries

Receptionist may manage:

- patient registration;
- demographics;
- patient search;
- appointments;
- confirmations;
- check-in;
- waiting room;
- recalls;
- selected operational reports.

Receptionist must not edit:

- dental chart;
- diagnosis;
- clinical notes;
- prescriptions.

---

# 16. Cashier Boundaries

Cashier may manage:

- patient identification for billing;
- invoices;
- payments;
- receipts;
- outstanding balances;
- selected finance reports.

Cashier must not access detailed:

- medical history;
- diagnosis;
- clinical notes;
- odontogram.

---

# 17. UI Hiding Is Not the Final Security Model

During frontend simulation:

- hide unauthorized modules/actions;
- show Access Denied for simulated direct navigation where appropriate.

Later Laravel backend integration must enforce real authorization.

Do not treat hidden buttons as sufficient production security.

---

# 18. Core Workflow

The entire application must preserve this connected journey:

```text
Patient Registration
→ Appointment
→ Check-In
→ Waiting Room
→ Clinical Encounter
→ Dental Chart
→ Treatment Plan
→ Procedure
→ Invoice
→ Payment
→ Receipt
→ Recall
```

Do not build modules as isolated CRUD pages.

---

# 19. Appointment States

Allowed states:

```text
Scheduled
Confirmed
Checked In
Waiting
In Treatment
Completed
Cancelled
No Show
Rescheduled
```

Use only valid transitions from `05_DENTAL_WORKFLOW_SPECIFICATION.md`.

Do not permit arbitrary jumps.

---

# 20. Queue States

Allowed queue states:

```text
Checked In
Waiting
In Treatment
Ready for Checkout
Completed
```

Cancelled and no-show appointments must not remain in the active queue.

---

# 21. Clinical Encounter States

Allowed:

```text
Draft
In Progress
Completed
```

Completed encounters should visually behave as locked.

Do not casually allow direct editing of finalized clinical history.

---

# 22. Treatment Plan States

Plan:

```text
Draft
Proposed
Accepted
Partially Accepted
In Progress
Completed
Cancelled
```

Treatment item acceptance:

```text
Proposed
Accepted
Declined
```

Treatment progress:

```text
Planned
In Progress
Completed
Cancelled
```

Do not force a patient to accept the entire treatment plan.

Individual items must progress independently.

---

# 23. Invoice States

Allowed:

```text
Draft
Unpaid
Partially Paid
Paid
Cancelled
```

Finance must reconcile.

Do not allow payment on a cancelled or fully paid invoice.

---

# 24. Recall States

Allowed:

```text
Upcoming
Due
Contacted
Scheduled
Completed
Overdue
Cancelled
```

A `Scheduled` recall must reference a valid appointment in the mock state.

---

# 25. Dental Chart Standard

Use:

> **FDI Two-Digit Tooth Numbering**

Support:

- Permanent dentition
- Primary dentition
- mixed-dentition-ready data model

Permanent valid codes:

```text
11 12 13 14 15 16 17 18
21 22 23 24 25 26 27 28
31 32 33 34 35 36 37 38
41 42 43 44 45 46 47 48
```

Primary valid codes:

```text
51 52 53 54 55
61 62 63 64 65
71 72 73 74 75
81 82 83 84 85
```

---

# 26. Odontogram Orientation

Display teeth from the patient's perspective.

Permanent:

```text
18 17 16 15 14 13 12 11 | 21 22 23 24 25 26 27 28

48 47 46 45 44 43 42 41 | 31 32 33 34 35 36 37 38
```

Primary:

```text
55 54 53 52 51 | 61 62 63 64 65

85 84 83 82 81 | 71 72 73 74 75
```

Clearly label patient left/right orientation.

---

# 27. Tooth Surfaces

Posterior:

```text
M
D
B
L
O
```

Anterior:

```text
M
D
F
L
I
```

Support multiple surfaces.

Do not store/display impossible surface combinations due to UI mistakes.

---

# 28. Dental Chart Entry Types

Support:

```text
Condition
Existing Treatment
Planned Treatment
Completed Treatment
Observation
```

A condition is not the same as a procedure.

Example:

```text
Caries ≠ Filling
```

---

# 29. Dental Chart Historical Integrity

Do not overwrite clinical history.

Example:

```text
Caries O
→ Planned Composite Filling
→ Completed Restoration
```

The original caries finding must remain visible in history.

Do not replace the original state destructively.

---

# 30. Dental Chart Visual Rules

Distinguish:

- active/current condition;
- existing/completed treatment;
- planned treatment.

Do not rely on colour alone.

Use additional cues such as:

- pattern;
- icon;
- border;
- abbreviation;
- readable selected-tooth summary.

---

# 31. Odontogram Technology Direction

Prefer SVG for:

- scalable tooth shapes;
- surface selection;
- interactive hit areas;
- print support.

Do not use unrelated static tooth images if they prevent structured surface interaction.

Clinical clarity is more important than photorealistic teeth.

---

# 32. Clinical Review Rule

The frontend may proceed using the approved provisional dental-chart specification.

Before final clinical freeze:

> a practicing Dentist / Dental Surgeon should review the working odontogram and clinical interaction flow.

Do not stop development waiting for clinical review unless specifically instructed.

Apply later feedback surgically.

---

# 33. UI/UX Direction

Follow `09_UI_UX_SYSTEM.md`.

The interface should feel:

- modern;
- premium;
- calm;
- clean;
- clinical;
- trustworthy;
- efficient.

Avoid:

- flashy consumer-app design;
- neon palettes;
- inconsistent module themes;
- excessive animations;
- dense outdated admin-template appearance.

---

# 34. Default Visual Direction

Use a polished light interface.

Dark mode is not required for MVP.

Use centralized design tokens for:

- colour;
- spacing;
- typography;
- radius;
- shadows;
- layout sizing.

Do not hard-code visual values repeatedly across module files.

---

# 35. Sidebar Rules

Sidebar must:

- be role-aware;
- use clear spacing;
- use rounded active state;
- preserve active module;
- support collapsible groups;
- become off-canvas on mobile;
- reuse one implementation across roles.

Do not duplicate separate sidebars per module.

---

# 36. Header Rules

Header may include:

- contextual page title/breadcrumb;
- patient search where appropriate;
- quick action;
- notifications;
- user menu;
- role label.

Do not overcrowd it.

---

# 37. Toast Rules

Use consistent top-right toasts.

Types:

```text
Success
Info
Warning
Error
```

Keep messages concise.

Examples:

```text
Patient registered successfully.
Appointment rescheduled.
Payment recorded successfully.
```

Do not use toast notifications for decisions requiring confirmation.

---

# 38. Tables

Use one reusable table system.

Common structure:

```text
Page Header
Search
Filters
Primary Action
Table
Empty State
Pagination
```

Numeric finance columns should align right.

Do not overload each row with many visible action buttons.

Use an overflow menu for secondary actions.

---

# 39. Forms

Use visible labels.

Group long forms into sections.

Do not use placeholders as the only labels.

Show validation near affected fields.

Use consistent spacing.

---

# 40. Modals

Use modals for:

- compact forms;
- confirmations;
- payment capture;
- quick status changes.

Do not use giant modals for:

- patient profile;
- full encounter;
- odontogram;
- large treatment plan.

Use dedicated pages or workspaces for complex tasks.

---

# 41. Patient Context

On clinical and financial detail pages, preserve patient identity.

Recommended patient header fields:

- Name
- Patient Number
- Age / Sex
- Phone
- Allergy Alert where permitted
- Current Appointment
- Assigned Dentist
- Balance where role permits

Do not force repeated patient searches within one workflow.

---

# 42. Financial Display Rule

Always show:

```text
Invoice Total
Paid
Balance
```

when recording payment.

Use:

```text
UGX 150,000
```

Do not display USD.

---

# 43. Finance Integrity Rules

Always enforce in mock logic:

```text
Invoice Total = Paid + Balance
Receipt Amount = Payment Amount
Invoice Paid = Sum(valid posted payments)
```

Prevent silent overpayment.

Do not allow paid invoices to receive extra payment.

---

# 44. Print Requirements

Required print-ready outputs:

- Invoice
- Receipt
- Prescription
- Treatment Plan
- Dental Chart Summary
- Selected Reports

Print views must hide:

- sidebar;
- app header;
- buttons;
- toast containers;
- interactive controls.

Use clinic identity and patient/document context.

---

# 45. Responsive Direction

Target:

> **Desktop-first, tablet-friendly, practical mobile support**

Desktop:

- full sidebar;
- large workspace;
- full odontogram.

Tablet:

- collapsible sidebar;
- slide-over details;
- touch-friendly chart.

Mobile:

prioritize:

- patient search;
- registration;
- appointments;
- check-in;
- queue;
- invoice/payment lookup;
- receipts.

Do not shrink the odontogram into unusable controls.

---

# 46. Accessibility

Use:

- semantic HTML;
- visible labels;
- focus states;
- sufficient contrast;
- non-colour status cues;
- accessible tooth labels where practical.

Do not communicate critical information only with colour.

---

# 47. Sample Clinic

Use:

```text
Pearl Smile Dental Clinic
Kampala Main Branch
Currency: UGX
Timezone: Africa/Kampala
```

All demo data is fictional.

---

# 48. Sample Data Reference Date

Use:

```text
21 September 2026
```

for deterministic frontend sample-data logic unless a phase explicitly changes the demo-date strategy.

---

# 49. Dashboard Data Rule

Dashboard KPIs must be calculated from shared mock data.

Do not hard-code a KPI separately from its source records.

Example:

```text
todayCollections =
sum(posted payments on reference date)
```

---

# 50. Search

Patient search must support:

- patient number;
- name;
- phone.

Where other modules support search, use the shared search component.

---

# 51. Pagination

Use pagination on larger datasets.

The patient dataset includes extra lightweight records specifically for pagination testing.

Do not remove pagination simply because sample data is small.

---

# 52. Global Footer

A subtle footer may use:

> **Developed with love by BaCorn Tech**

Do not make developer branding dominate patient-facing printouts.

---

# 53. Login Direction

Create a premium split-layout login.

Include:

- clinic/product branding;
- dental visual/illustration area;
- clear login panel;
- validation;
- role-simulation credentials;
- inactive-user rejection;
- responsive layout.

This remains frontend-only simulation until backend integration.

---

# 54. No Random Demo Data

Do not generate new random patient data on every reload.

Demo records should be deterministic.

A developer-only reset function may restore canonical mock data.

---

# 55. No Scope Creep

Do not add the following during MVP frontend work unless explicitly approved:

- patient portal;
- marketing landing page;
- online booking;
- insurance;
- Mobile Money API;
- SMS;
- WhatsApp;
- lab management;
- inventory;
- payroll;
- HR;
- platform admin;
- subscriptions;
- branch switching;
- DICOM/PACS;
- AI diagnosis;
- AI X-ray interpretation;
- periodontal charting;
- advanced orthodontics;
- 3D odontogram.

---

# 56. Landing Page

A public marketing landing page is not currently required.

Current frontend entry point:

```text
Login
→ Clinic Application
```

Do not spend implementation time on a public marketing site unless specifically requested.

---

# 57. Comments & Code Readability

Use concise structural comments in non-obvious areas.

Examples:

```text
// Appointment state transition logic
// Odontogram surface rendering
// Shared permission guard
// Finance reconciliation
```

Do not flood simple markup with redundant comments.

Code should remain easy to inspect and later convert to Laravel Blade.

---

# 58. Naming

Use consistent names.

Preferred terms:

```text
Patient
Dentist
Appointment
Waiting Room
Clinical Encounter
Dental Chart
Treatment Plan
Procedure
Prescription
Invoice
Payment
Receipt
Recall
```

Do not switch casually between:

- Patient / Client
- Dentist / Doctor
- Invoice / Bill
- Encounter / Visit

unless intentionally defined.

---

# 59. Error Handling

Provide clear user-facing errors.

Examples:

```text
The selected appointment time conflicts with another booking for this Dentist.
```

```text
This invoice has already been paid in full.
```

Avoid generic failure messages when the cause is known.

---

# 60. Unsaved Changes

Warn users before leaving unsaved:

- encounter;
- dental chart changes;
- treatment plan;
- settings.

Do not silently discard clinical input.

---

# 61. Browser Audit

Before frontend freeze, manually verify in current Chromium.

Also test Edge/Firefox where practical.

Focus on:

- navigation;
- calendar;
- forms;
- modals;
- odontogram;
- print preview.

---

# 62. Frontend Freeze Rule

Do not declare the frontend frozen until the required audit phases in `11_FRONTEND_IMPLEMENTATION_PLAN.md` pass.

Required final gates include:

- responsive audit;
- print audit;
- role audit;
- cross-module data audit;
- clinical UX review;
- browser/manual workflow audit.

---

# 63. After Frontend Freeze

Only after frontend freeze should the project proceed to:

```text
Laravel Backend Integration Plan
→ Authentication / Authorization
→ Database Persistence
→ Module Backend Integration
```

Do not begin backend work early.

---

# 64. Conflict Rule

If a user instruction explicitly changes an approved project decision:

1. follow the latest explicit user instruction;
2. identify which document(s) now need updating;
3. avoid leaving documentation and implementation inconsistent.

---

# 65. High-Risk Areas

Give extra attention to:

- Appointment Calendar
- Queue state synchronization
- Clinical Encounter workspace
- Odontogram
- Treatment-plan partial acceptance
- Procedure → Chart linkage
- Invoice/payment reconciliation
- Role restrictions
- Cross-module data consistency

---

# 66. Definition of Good Implementation

A good implementation is not merely visually attractive.

It must be:

- consistent;
- reusable;
- role-correct;
- workflow-correct;
- clinically understandable;
- financially correct;
- responsive;
- print-ready;
- easy to convert to Laravel.

---

# 67. Final Instruction

When uncertain:

> **Do not invent. Re-read the project documentation and preserve the approved workflow.**

Prefer a small, correct, reusable implementation over a large speculative one.

---

# Persistent Project Directive

**Current Mode:** FRONTEND UI/UX ONLY  
**Architecture:** Small HTML shell + modular JavaScript views  
**Data:** Centralized fictional relational mock dataset  
**Clinical Standard:** FDI odontogram, Permanent + Primary dentition  
**Currency:** UGX  
**Timezone:** Africa/Kampala  
**Roles:** Clinic Administrator, Dentist, Receptionist, Cashier  
**Backend:** Laravel only after frontend freeze  
**Footer:** Developed with love by BaCorn Tech
