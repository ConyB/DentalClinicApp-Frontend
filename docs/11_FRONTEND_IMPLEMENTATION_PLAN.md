# Dental Practice Management System
## 11 — Frontend Implementation Plan

**Document Version:** 1.0  
**Status:** Draft for Review / UI/UX Execution Baseline  
**Prepared For:** Dental Practice Management System MVP  
**Target Market:** Ugandan Dental Clinics  
**Frontend Direction:** HTML5 + CSS3 + JavaScript + Bootstrap 5 + SVG where appropriate  
**Backend Direction:** Laravel integration only after frontend freeze  
**Prepared By:** BaCorn Tech  
**Date:** 21 September 2026

---

# 1. Document Purpose

This document defines the exact phased implementation plan for building the frontend UI/UX template of the Dental Practice Management System MVP.

It converts the approved documentation set into an actionable execution sequence:

- `01_PRODUCT_VISION.md`
- `02_MVP_SCOPE.md`
- `03_ROLE_PERMISSION_MATRIX.md`
- `04_INFORMATION_ARCHITECTURE.md`
- `05_DENTAL_WORKFLOW_SPECIFICATION.md`
- `06_DENTAL_CHART_SPECIFICATION.md`
- `07_SRS.md`
- `08_DATABASE_DESIGN.md`
- `09_UI_UX_SYSTEM.md`
- `10_SAMPLE_DATA_SPECIFICATION.md`

The purpose of this file is to ensure that an AI coding assistant or developer:

- builds the frontend in the correct order;
- does not generate backend logic prematurely;
- does not improvise scope;
- reuses shared components;
- keeps sample data consistent;
- implements role-specific workspaces correctly;
- validates every module before moving forward;
- performs final responsive, print, permission, workflow, and cross-module audits before frontend freeze.

This document should be treated as the **execution roadmap** for the frontend phase.

---

# 2. Global Frontend Rule

> **This implementation phase is UI/UX ONLY.**

Until the frontend is formally frozen, the implementation must not introduce Laravel backend logic.

Do not generate:

- PHP controllers;
- Eloquent models;
- migrations;
- seeders;
- middleware;
- Laravel policies;
- database connections;
- SQL queries;
- real authentication;
- APIs;
- server-side validation;
- email/SMS integrations;
- payment-gateway integrations.

The frontend must simulate required behavior using structured JavaScript mock data and frontend state.

Laravel integration begins only after the UI/UX is accepted and frozen.

---

# 3. Frontend Architecture Direction

The preferred frontend architecture should remain lightweight and Laravel-friendly.

Recommended conceptual structure:

```text
dental-mgt/
│
├── index.html
├── app.html
│
├── assets/
│   ├── css/
│   │   ├── tokens.css
│   │   ├── base.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   ├── utilities.css
│   │   ├── print.css
│   │   └── modules/
│   │       ├── auth.css
│   │       ├── dashboard.css
│   │       ├── patients.css
│   │       ├── appointments.css
│   │       ├── waiting-room.css
│   │       ├── clinical.css
│   │       ├── odontogram.css
│   │       ├── treatment.css
│   │       ├── billing.css
│   │       ├── recalls.css
│   │       ├── reports.css
│   │       └── settings.css
│   │
│   ├── js/
│   │   ├── core/
│   │   │   ├── app.js
│   │   │   ├── router.js
│   │   │   ├── state.js
│   │   │   ├── permissions.js
│   │   │   └── storage.js
│   │   ├── components/
│   │   ├── modules/
│   │   ├── data/
│   │   └── utils/
│   │
│   ├── images/
│   ├── icons/
│   └── svg/
│       └── teeth/
│
├── docs/
│   └── [project documentation]
│
└── README.md
```

This is a direction, not a rigid file-count requirement.

The implementation should prefer:

> **A small number of HTML shell files + reusable JavaScript-rendered module views**

rather than creating dozens of independent HTML files with duplicated markup.

---

# 4. Recommended HTML Strategy

For the MVP template, the preferred approach is:

```text
index.html
    → Login / authentication simulation

app.html
    → Main authenticated application shell
    → JavaScript-rendered modules
```

Optional:

```text
print-preview.html
```

only if the print architecture genuinely benefits from a separate shell.

The majority of pages should not require separate standalone HTML documents.

This mirrors the modular approach successfully used in previous projects and will make later Blade conversion cleaner.

---

# 5. Frontend State Strategy

The template must use one centralized mock-data/state model.

Conceptually:

```text
state
├── currentUser
├── currentRole
├── clinic
├── branch
├── patients
├── appointments
├── queue
├── encounters
├── dentalChart
├── treatmentPlans
├── procedures
├── prescriptions
├── documents
├── invoices
├── payments
├── receipts
├── recalls
└── settings
```

No module should invent unrelated duplicate patient records.

---

# 6. Frontend Persistence Strategy

During the UI/UX phase, lightweight persistence may use:

- sessionStorage;
- localStorage;
- a centralized in-memory store;
- controlled mock-data reset.

Recommended rule:

> Use one centralized storage/state service rather than scattering storage logic across modules.

All persisted frontend state must remain resettable to the canonical sample dataset.

---

# 7. Global Coding Rules

The frontend implementation must follow these rules.

## GCR-01 — Frontend Only

Do not implement backend code.

## GCR-02 — Reuse Before Duplication

Before creating a new component, inspect whether an existing:

- table;
- modal;
- drawer;
- badge;
- filter;
- button;
- card;
- toast;
- form control

can be reused.

## GCR-03 — No Hard-Coded Module Data in Markup

Data should come from the centralized mock-data layer.

Do not hard-code repeated patient names, totals, appointments, or invoice amounts inside individual HTML fragments.

## GCR-04 — Role-Aware UI

Navigation and actions must respect `03_ROLE_PERMISSION_MATRIX.md`.

## GCR-05 — Workflow-Aware UI

Actions must respect `05_DENTAL_WORKFLOW_SPECIFICATION.md`.

## GCR-06 — Dental Chart Compliance

Odontogram behavior must respect `06_DENTAL_CHART_SPECIFICATION.md`.

## GCR-07 — Visual Consistency

All styling must respect `09_UI_UX_SYSTEM.md`.

## GCR-08 — Shared Sample Data

All modules must use `10_SAMPLE_DATA_SPECIFICATION.md`.

## GCR-09 — No Scope Creep

Do not add deferred features unless explicitly approved.

## GCR-10 — Laravel-Friendly Markup

Keep the structure easy to convert into Blade components and partials.

## GCR-11 — Accessible Interactions

Use labels, keyboard focus, semantic controls, and non-colour-only status meaning.

## GCR-12 — No Silent Failures

Every user action should produce appropriate visual feedback.

---

# 8. Analysis Quality Requirements

Before modifying or generating code for any phase, the implementation agent must:

1. Read the documentation relevant to the phase.
2. Inspect the existing project structure.
3. Identify reusable components.
4. Identify existing CSS/JS conventions.
5. Verify which sample data entities are needed.
6. Check role permissions.
7. Check workflow state rules.
8. Avoid creating duplicate component systems.
9. Avoid rewriting stable modules unnecessarily.
10. Report conflicts between implementation and documentation rather than silently choosing one.

---

# 9. Phase Execution Rule

Each phase must follow:

```text
READ
  ↓
ANALYSE
  ↓
IMPLEMENT
  ↓
SELF-AUDIT
  ↓
FIX
  ↓
VERIFY
  ↓
PHASE PASS
```

The next phase should not begin until the current phase passes its acceptance criteria.

---

# 10. Phase 0 — Project & Documentation Preflight

## Objective

Prepare the project for controlled frontend development.

## Required Work

- Read all files from `01` through `11`.
- Inspect existing assets if any.
- Confirm Bootstrap version.
- Confirm icon library.
- Confirm no backend code exists.
- Establish folder structure.
- Establish CSS architecture.
- Establish JavaScript architecture.
- Establish mock-data strategy.
- Establish routing/view-rendering strategy.
- Establish responsive breakpoints.
- Establish print strategy.
- Establish demo reset mechanism.

## Deliverables

- frontend folder structure;
- empty/shared shells;
- initial design tokens;
- centralized app bootstrap;
- mock-state initialization;
- documentation reference comments.

## Phase 0 Gate

PASS only when:

- project boots without errors;
- no backend code has been introduced;
- shared architecture is clear;
- mock state can load;
- subsequent modules have a stable foundation.

---

# 11. Phase 1 — Global Design Tokens & Base Styles

## Objective

Create the visual foundation before module-specific styling.

## Implement

- colour tokens;
- typography;
- spacing scale;
- border radii;
- shadows;
- surfaces;
- form states;
- button variants;
- table tokens;
- status tokens;
- responsive breakpoints;
- print base rules.

## Do Not

- style module pages independently before global tokens exist;
- hard-code different colour values across modules.

## Phase 1 Gate

PASS when:

- tokens are centralized;
- typography hierarchy is consistent;
- base controls render correctly;
- no module-specific colour system competes with global styles.

---

# 12. Phase 2 — Shared Components

## Objective

Build the reusable component library.

## Required Shared Components

- Button
- Icon Button
- Input
- Textarea
- Select
- Search
- Filter Bar
- Date/Time Input
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
- Breadcrumb
- Page Header
- Patient Context Header
- Print Header

## Phase 2 Gate

PASS when:

- components are reusable;
- keyboard/focus behavior is acceptable;
- no major module needs to reinvent basic controls.

---

# 13. Phase 3 — Application Shell & Role Navigation

## Objective

Create the authenticated application structure.

## Implement

- sidebar;
- header/topbar;
- user dropdown;
- breadcrumbs;
- main content container;
- responsive sidebar behavior;
- footer;
- active navigation state;
- collapsible navigation groups;
- role-based menu generation.

## Roles

Generate navigation for:

- Clinic Administrator
- Dentist
- Receptionist
- Cashier

## Phase 3 Gate

PASS when:

- each role sees the correct menu;
- inaccessible modules are absent;
- active state is correct;
- sidebar works at desktop/tablet/mobile widths;
- footer displays correctly;
- no navigation flicker or duplication exists.

---

# 14. Phase 4 — Login & Role Simulation

## Objective

Create a polished login experience and simulate authenticated role sessions.

## Implement

- premium split-layout login;
- logo/branding;
- email/password inputs;
- remember-me UI;
- validation;
- loading state;
- login error state;
- sample role accounts;
- role-based redirect to `app.html`;
- logout;
- session simulation.

## Important

This is a **frontend authentication simulation only**.

Do not create real authentication.

## Phase 4 Gate

PASS when:

- each sample role can enter the correct workspace;
- inactive user simulation is rejected;
- logout clears the simulated session;
- login is responsive and polished.

---

# 15. Phase 5 — Centralized Sample Data Layer

## Objective

Implement the canonical dataset from `10_SAMPLE_DATA_SPECIFICATION.md`.

## Include

- clinic;
- branch;
- roles;
- users;
- patients;
- guardians;
- medical summaries;
- appointments;
- contact logs;
- queue;
- encounters;
- dental chart;
- treatment plans;
- procedures;
- prescriptions;
- documents;
- invoices;
- payments;
- receipts;
- recalls;
- settings.

## Required Behavior

- shared IDs;
- lookup utilities;
- calculated totals;
- stable demo state;
- reset function.

## Phase 5 Gate

PASS when:

- all references resolve;
- dashboard calculations can derive from data;
- no duplicate inconsistent patient data exists;
- finance data reconciles.

---

# 16. Phase 6 — Role Dashboards

## Objective

Build all four dashboards using the same shared design system but different role priorities.

## 6A — Clinic Administrator Dashboard

Build:

- today's appointments;
- checked-in patients;
- completed visits;
- today's collections;
- outstanding balance;
- appointment-status summary;
- revenue trend;
- Dentist workload;
- upcoming recalls;
- recent payments;
- recent activity.

## 6B — Dentist Dashboard

Build:

- today's appointments;
- waiting patients;
- in-treatment patients;
- follow-ups due;
- schedule;
- recent encounters;
- pending treatment items.

## 6C — Receptionist Dashboard

Build:

- today's appointments;
- confirmed;
- waiting;
- no-shows;
- pending confirmations;
- schedule;
- waiting-room preview;
- recall preview;
- quick actions.

## 6D — Cashier Dashboard

Build:

- today's invoices;
- collections;
- unpaid invoices;
- partial payments;
- recent invoices;
- recent payments;
- outstanding balances.

## Phase 6 Gate

PASS when:

- all KPI values derive from mock data;
- role dashboards do not expose restricted information;
- layout remains consistent.

---

# 17. Phase 7 — Patients Module

## Objective

Build the patient administrative workflow.

## Implement

### Patient List

- search;
- status filter;
- pagination;
- columns from UI/UX spec;
- view/edit actions;
- role-aware controls.

### Registration

- personal information;
- contact information;
- address;
- emergency contact;
- guardian information;
- basic medical alerts;
- duplicate warning simulation.

### Edit

- demographic updates;
- active/inactive state where permitted.

## Phase 7 Gate

PASS when:

- patient search works by number/name/phone;
- pagination works;
- registration updates shared mock state;
- duplicate warning works;
- role restrictions are correct.

---

# 18. Phase 8 — Patient Profile Hub

## Objective

Build the patient-centred workspace.

## Implement

Patient header:

- name;
- patient number;
- age/sex;
- phone;
- patient status;
- allergy alert;
- next appointment;
- role-aware actions.

Tabs:

- Overview
- Medical History
- Dental Chart
- Encounters
- Treatment Plans
- Prescriptions
- Documents
- Appointments
- Billing
- Recalls

## Role-Aware Tabs

Receptionist:

- Overview
- Appointments
- Recalls
- permitted demographics

Cashier:

- Overview
- Billing
- limited patient identity

Dentist:

- clinical tabs

Administrator:

- permitted oversight tabs

## Phase 8 Gate

PASS when:

- patient context remains stable across tabs;
- tabs obey permissions;
- patient data is shared, not duplicated;
- no tab leads to placeholder-only content for required MVP modules.

---

# 19. Phase 9 — Appointment Calendar

## Objective

Build the major scheduling workspace.

## Implement

- Day view;
- Week view;
- date navigation;
- Today button;
- Dentist filter;
- status filter;
- appointment blocks;
- new appointment modal;
- appointment detail drawer;
- confirm;
- reschedule;
- cancel;
- no-show;
- check-in;
- appointment conflict warning.

## State Rules

Use only transitions defined in `05_DENTAL_WORKFLOW_SPECIFICATION.md`.

## Phase 9 Gate

PASS when:

- calendar data derives from shared appointments;
- status transitions update the same appointment data;
- rescheduling preserves history;
- conflict warnings work;
- role restrictions work.

---

# 20. Phase 10 — Waiting Room / Queue

## Objective

Build the live patient-flow workspace.

## Implement

States:

- Checked In
- Waiting
- In Treatment
- Ready for Checkout
- Completed

Display:

- patient;
- appointment time;
- arrival time;
- waiting duration;
- Dentist;
- reason;
- status;
- next valid action.

## Interaction

Receptionist:

- check in;
- move to waiting.

Dentist:

- start treatment;
- complete clinical stage;
- send to checkout.

Cashier:

- view checkout context only.

## Phase 10 Gate

PASS when:

- cancelled/no-show appointments never appear as active queue records;
- queue state remains consistent with appointments;
- waiting duration is calculated correctly;
- role handoffs are clear.

---

# 21. Phase 11 — Medical History & Clinical Encounter Workspace

## Objective

Build the Dentist's primary clinical work area.

## Implement

### Medical History

- allergies;
- medications;
- medical conditions;
- relevant dental history;
- review status.

### Encounter Workspace

- chief complaint;
- medical review;
- findings;
- diagnosis;
- dental chart integration point;
- treatment plan integration point;
- procedures;
- prescription;
- clinical notes;
- follow-up;
- Save Draft;
- Complete Encounter.

## Phase 11 Gate

PASS when:

- non-clinical roles cannot edit clinical data;
- allergy alerts remain visible;
- encounter status works correctly;
- completed encounters visually behave as locked;
- unsaved-change warning exists.

---

# 22. Phase 12 — Odontogram / Dental Chart

## Objective

Build the signature dental chart according to `06_DENTAL_CHART_SPECIFICATION.md`.

This phase should receive focused implementation and audit effort.

## 12A — Tooth Definitions & Rendering

Implement:

- Permanent dentition;
- Primary dentition;
- FDI numbering;
- correct quadrant layout;
- patient-left/right labels;
- tooth labels.

## 12B — Tooth Interaction

Implement:

- hover/focus;
- selected state;
- touch selection;
- selected-tooth panel;
- accessible labels.

## 12C — Surface Selection

Posterior:

- M
- D
- B
- L
- O

Anterior:

- M
- D
- F
- L
- I

## 12D — Chart Entry Types

Support:

- Condition
- Existing Treatment
- Planned Treatment
- Completed Treatment
- Observation

## 12E — Visual Layers

Implement:

- Conditions
- Existing/Completed
- Planned

Do not rely on colour alone.

## 12F — Chart History

Implement:

- date;
- tooth;
- type;
- Dentist;
- encounter context.

## 12G — Clinical Actions

Implement:

- Add Condition;
- Add Existing Treatment;
- Add Planned Treatment;
- View History.

Completed treatment should normally come from procedure completion.

## Phase 12 Gate

PASS only when:

- FDI layouts are correct;
- Primary and Permanent views work;
- surfaces are valid;
- current vs planned vs completed are visually distinct;
- history is preserved;
- Receptionist/Cashier cannot edit;
- patient context remains visible;
- print preview is readable;
- clinical-review notes can later be applied without structural redesign.

---

# 23. Phase 13 — Treatment Plans & Procedures

## Objective

Build the bridge between diagnosis and billable care.

## Treatment Plan List

Implement:

- search;
- filters;
- status;
- patient;
- Dentist;
- totals;
- actions.

## Treatment Plan Detail

Implement:

- plan header;
- treatment items;
- tooth/area;
- surfaces;
- service;
- quantity;
- price;
- acceptance;
- treatment status;
- totals;
- notes;
- print.

## Acceptance

Support:

- full acceptance;
- partial acceptance;
- decline.

## Procedures

Implement procedure completion linked to:

- patient;
- encounter;
- treatment item;
- tooth/surfaces;
- service;
- amount.

## Phase 13 Gate

PASS when:

- partial acceptance works;
- accepted items progress independently;
- completed procedure updates relevant treatment item;
- odontogram can reflect confirmed completed treatment;
- totals remain correct.

---

# 24. Phase 14 — Prescriptions & Documents

## Objective

Complete supporting clinical workflows.

## Prescriptions

Implement:

- prescription list;
- create/edit draft;
- medicine items;
- print preview;
- issue state.

Use generic demo medication data unless clinical examples are explicitly approved.

## Documents

Implement:

- X-rays;
- clinical photos;
- referral letters;
- consent forms;
- upload simulation;
- metadata;
- view preview;
- patient association.

## Phase 14 Gate

PASS when:

- clinical permissions are enforced;
- print prescription layout is professional;
- document categories work;
- no real file upload backend is introduced.

---

# 25. Phase 15 — Billing, Payments & Receipts

## Objective

Build the complete finance workflow.

## 15A — Invoice List

Implement:

- search;
- status filters;
- date filter;
- patient;
- total;
- paid;
- balance;
- actions.

## 15B — Invoice Detail

Implement:

- items;
- subtotal;
- discount;
- total;
- paid;
- balance;
- payment history;
- print.

## 15C — Payment Modal

Implement:

- balance;
- amount;
- method;
- external reference;
- notes;
- validation.

## 15D — Partial Payments

Ensure:

```text
Invoice Total = Paid + Balance
```

## 15E — Receipt

Implement:

- receipt number;
- clinic identity;
- patient;
- invoice;
- payment amount;
- method;
- cashier;
- balance;
- print.

## 15F — Outstanding Balances

Implement:

- patient;
- total invoiced;
- paid;
- outstanding;
- oldest unpaid date;
- record payment action.

## Phase 15 Gate

PASS only when:

- all finance totals reconcile;
- partial payments work;
- overpayment is blocked;
- paid invoices cannot accept another payment;
- receipt = payment amount;
- no clinical detail leaks to Cashier.

---

# 26. Phase 16 — Recalls & Follow-Ups

## Objective

Complete the patient-care loop.

## Implement

Filters/tabs:

- Upcoming
- Due
- Overdue
- Contacted
- Scheduled
- Completed

Actions:

- Mark Contacted
- Record Outcome
- Book Appointment
- Reschedule Recall
- Complete
- Cancel

## Required Link

Scheduled recall → valid appointment.

## Phase 16 Gate

PASS when:

- scheduled recalls link to appointments;
- overdue logic works;
- receptionist workflow is clear;
- Dentist can create/review appropriate follow-up.

---

# 27. Phase 17 — Reports, Users, Settings & Profile

## Objective

Complete management and configuration modules.

---

## 17A — Reports & Analytics

Build:

### Patient
- registrations;
- visits.

### Appointment
- summary;
- cancellations;
- no-shows.

### Clinical
- procedures;
- Dentist activity;
- treatment-plan status.

### Financial
- daily collections;
- revenue by period;
- revenue by Dentist;
- revenue by procedure;
- outstanding balances;
- payment methods.

### Recall
- upcoming;
- overdue;
- completed.

Reports must derive from shared data.

---

## 17B — Users & Staff

Build:

- user list;
- add/edit user;
- status;
- role;
- inactive user state.

Do not build a custom role designer in MVP.

---

## 17C — Clinic Settings, Profile & Change Password

Build:

- clinic and main-branch identity;
- supported appointment settings;
- current-user profile and contact details;
- read-only role and account status in Profile;
- simulated change-password validation;
- source-scoped dirty-state and local persistence.

---

## 17D — Final Cross-Module Audit & Functional Freeze

Audit:

- every visible sidebar destination for every role;
- Reports, Users & Staff, Clinic Settings, Profile, and Change Password in Chromium;
- role, session, privacy, dirty-state, and cross-module data integrity;
- responsive layout, browser console/network, and recent surgical regressions.

## Phase 17 Gate

PASS when:

- reports reconcile with mock data;
- user permissions remain correct;
- settings use shared design components;
- profile cannot change role;
- the consolidated Phase 17D browser audit and relevant regressions pass.

---

# 28. Phase 18 — Global Responsive & Interaction Audit

## Objective

Audit the complete application across breakpoints.

## Test

- wide desktop;
- standard laptop;
- tablet landscape;
- tablet portrait;
- mobile.

## Focus Areas

- sidebar;
- header;
- tables;
- patient tabs;
- appointment calendar;
- waiting room;
- encounter workspace;
- odontogram;
- treatment plan;
- invoice detail;
- reports.

## Required Fixes

- overflow;
- clipped controls;
- broken spacing;
- unusable touch targets;
- hidden critical actions;
- modal overflow;
- calendar readability;
- odontogram usability.

## Phase 18 Gate

PASS when no major responsive blocker remains.

---

# 29. Phase 19 — Print Audit

## Objective

Verify all required print surfaces.

## Print Targets

- Invoice
- Receipt
- Prescription
- Treatment Plan
- Dental Chart Summary
- Selected Reports

## Verify

- correct orientation;
- no application chrome;
- clinic identity;
- patient identity;
- no clipped tables;
- proper page breaks;
- readable font size;
- UGX formatting;
- print preview in Chromium.

## Phase 19 Gate

PASS when every required print output is usable.

---

# 30. Phase 20 — Permission & Role Audit

## Objective

Verify the UI against `03_ROLE_PERMISSION_MATRIX.md`.

## Test Every Role

### Clinic Administrator

Verify:

- administrative access;
- finance oversight;
- clinical oversight;
- no inappropriate Dentist-only edit actions.

### Dentist

Verify:

- clinical access;
- no unrestricted finance administration;
- no user management.

### Receptionist

Verify:

- patients;
- appointments;
- queue;
- recalls;
- no clinical chart editing.

### Cashier

Verify:

- invoices;
- payments;
- receipts;
- balances;
- no medical history/odontogram.

## Phase 20 Gate

PASS when:

- sidebar access is correct;
- action buttons are correct;
- restricted tabs are hidden;
- simulated direct navigation displays Access Denied where appropriate.

---

# 31. Phase 21 — Cross-Module Data Consistency Audit

## Objective

Ensure the frontend tells one consistent story.

## Audit

### Patients

Same identity everywhere.

### Appointments

Patient, Dentist, time, status consistent.

### Queue

Only valid appointments present.

### Encounters

Correct patient and appointment links.

### Dental Chart

Matches clinical history.

### Treatment Plans

Matches chart findings.

### Procedures

Match treatment completion.

### Invoices

Match procedures/services.

### Payments

Match invoice balances.

### Receipts

Match payments.

### Recalls

Match related visits/appointments.

### Dashboards

KPIs derive from the same records.

### Reports

Totals reconcile with source data.

## Phase 21 Gate

PASS only when no material inconsistency remains.

---

# 32. Phase 22 — Clinical UX Review Gate

## Objective

Obtain practical clinical review before final frontend freeze.

This review can occur after the working UI exists.

## Reviewer

A practicing Dentist / Dental Surgeon.

## Focus

- FDI layout;
- primary/permanent dentition;
- tooth surface interaction;
- common condition terminology;
- chart symbols;
- planned vs completed treatment;
- bridge/crown/root-canal representation;
- treatment workflow;
- encounter usability;
- clinical alerts.

## Important

The reviewer is not required to approve the entire software architecture.

The review is specifically intended to validate the clinical interaction model.

## Outcome

- PASS with no changes;
or
- surgical clinical adjustments.

Do not redesign the whole product unless the review identifies a genuine workflow problem.

---

# 33. Phase 23 — Browser & Manual Workflow Audit

## Objective

Perform final manual browser verification.

## Primary Browser

Current Chromium.

## Secondary

- Edge
- Firefox

where practical.

## Test Workflows

### Receptionist

```text
Login
→ Register Patient
→ Book Appointment
→ Confirm
→ Check In
→ Waiting Room
```

### Dentist

```text
Login
→ Waiting Patient
→ Encounter
→ Medical Review
→ Dental Chart
→ Treatment Plan
→ Procedure
→ Complete Encounter
```

### Cashier

```text
Login
→ Patient / Invoice
→ Partial Payment
→ Receipt
→ Remaining Balance
```

### Follow-Up

```text
Recall
→ Contact
→ Book Appointment
```

## Phase 23 Gate

PASS when the complete workflows function manually without navigation dead ends or inconsistent state.

---

# 34. Phase 24 — Frontend Freeze Audit

## Objective

Determine whether the frontend is ready for backend integration.

## Freeze Checklist

- [ ] All MVP modules exist.
- [ ] Login is complete.
- [ ] All role sidebars are correct.
- [ ] Dashboards are role-specific.
- [ ] Patient list/registration/profile work.
- [ ] Appointment calendar is stable.
- [ ] Waiting-room flow is stable.
- [ ] Encounter workspace is complete.
- [ ] Medical alerts are visible.
- [ ] Odontogram passes functional review.
- [ ] Primary dentition works.
- [ ] Treatment plans work.
- [ ] Partial acceptance works.
- [ ] Procedures work.
- [ ] Prescriptions print.
- [ ] Documents UI works.
- [ ] Invoices reconcile.
- [ ] Partial payments reconcile.
- [ ] Receipts match payments.
- [ ] Outstanding balances reconcile.
- [ ] Recalls work.
- [ ] Reports reconcile.
- [ ] Users/settings/profile are complete.
- [ ] Responsive audit passes.
- [ ] Print audit passes.
- [ ] Permission audit passes.
- [ ] Cross-module consistency passes.
- [ ] Browser audit passes.
- [ ] Clinical review changes are applied.
- [ ] No major placeholder UI remains.
- [ ] No hard-coded conflicting data remains.
- [ ] No backend code has been introduced.

---

# 35. Frontend Freeze Statement

When Phase 24 passes, the project may declare:

> **DENTAL PRACTICE MANAGEMENT SYSTEM — FRONTEND UI/UX FROZEN**

At that point:

- major layout redesign stops;
- major navigation changes stop;
- mock workflow behavior is treated as the backend contract;
- database/backend integration can begin;
- only surgical frontend changes should occur unless a serious issue is discovered.

---

# 36. Post-Freeze Sequence

After frontend freeze, recommended next work:

```text
1. FRONTEND FREEZE
        ↓
2. BACKEND INTEGRATION PLAN
        ↓
3. LARAVEL PROJECT SETUP / AUDIT
        ↓
4. AUTHENTICATION & AUTHORIZATION
        ↓
5. MASTER / REFERENCE DATA
        ↓
6. PATIENT BACKEND
        ↓
7. APPOINTMENTS / QUEUE
        ↓
8. CLINICAL ENCOUNTERS
        ↓
9. DENTAL CHART
        ↓
10. TREATMENT PLANS / PROCEDURES
        ↓
11. PRESCRIPTIONS / DOCUMENTS
        ↓
12. BILLING / PAYMENTS / RECEIPTS
        ↓
13. RECALLS
        ↓
14. REPORTS
        ↓
15. SETTINGS / USERS
        ↓
16. INTEGRATION AUDIT
        ↓
17. PILOT PREPARATION
```

The backend plan should be generated separately after frontend freeze.

---

# 37. Phase Order Summary

```text
PHASE 0   — Project & Documentation Preflight
PHASE 1   — Global Design Tokens & Base Styles
PHASE 2   — Shared Components
PHASE 3   — Application Shell & Role Navigation
PHASE 4   — Login & Role Simulation
PHASE 5   — Centralized Sample Data Layer
PHASE 6   — Role Dashboards
PHASE 7   — Patients Module
PHASE 8   — Patient Profile Hub
PHASE 9   — Appointment Calendar
PHASE 10  — Waiting Room / Queue
PHASE 11  — Medical History & Clinical Encounter
PHASE 12  — Odontogram / Dental Chart
PHASE 13  — Treatment Plans & Procedures
PHASE 14  — Prescriptions & Documents
PHASE 15  — Billing, Payments & Receipts
PHASE 16  — Recalls & Follow-Ups
PHASE 17  — Reports, Users, Settings & Profile
PHASE 18  — Responsive & Interaction Audit
PHASE 19  — Print Audit
PHASE 20  — Permission & Role Audit
PHASE 21  — Cross-Module Data Consistency Audit
PHASE 22  — Clinical UX Review Gate
PHASE 23  — Browser & Manual Workflow Audit
PHASE 24  — Frontend Freeze Audit
```

---

# 38. High-Risk Phases

The following phases require extra care:

## Phase 9 — Appointment Calendar

Risk:

- state conflicts;
- scheduling logic;
- responsive calendar complexity.

## Phase 11 — Clinical Encounter

Risk:

- too many sections;
- workflow complexity;
- patient context loss.

## Phase 12 — Odontogram

Risk:

- clinical terminology;
- FDI orientation;
- surfaces;
- visual clutter;
- chart history.

## Phase 13 — Treatment Plans

Risk:

- partial acceptance;
- treatment status;
- link to chart and procedure.

## Phase 15 — Finance

Risk:

- incorrect totals;
- partial payments;
- receipt mismatch.

## Phase 21 — Data Consistency

Risk:

- modules looking correct independently while telling different stories.

These phases should receive deeper audit effort.

---

# 39. Recommended Execution Style for AI Coding Assistants

For each phase, the prompt should instruct the coding agent to:

1. Read the relevant documentation.
2. Inspect current files.
3. Reuse existing styles/components.
4. Implement only the named phase.
5. Avoid unrelated refactoring.
6. Avoid backend code.
7. Use shared mock data.
8. Test role access.
9. Test responsive behavior relevant to the phase.
10. Report changed files.
11. Report any documentation conflict.
12. End with a clear Phase PASS/INCOMPLETE result.

---

# 40. Recommended Phase Completion Format

At the end of every implementation phase, the coding agent should report:

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

This makes progress easy to audit.

---

# 41. Change Control During Frontend Build

If the coding agent identifies a needed change that contradicts approved documentation:

> Do not silently change architecture.

Instead:

1. identify the conflict;
2. explain impact;
3. apply only a safe temporary UI decision if necessary;
4. flag the relevant document for surgical update.

---

# 42. No-Redesign Rule After Module Sign-Off

Once a module passes and is signed off:

- do not redesign it casually in later phases;
- only make changes required for:
  - shared consistency;
  - responsive fixes;
  - permissions;
  - workflow correctness;
  - accessibility;
  - clinical review.

This prevents late-stage design drift.

---

# 43. Reuse Strategy

Later phases must reuse:

- shared table component;
- modal system;
- toast system;
- pagination;
- search;
- filters;
- status badges;
- page headers;
- patient context header;
- print header;
- responsive shell.

No phase should create a second unrelated version of these components.

---

# 44. Token / AI Efficiency Direction

To reduce unnecessary AI token usage during coding:

- scope one phase at a time;
- instruct the agent to inspect before editing;
- request surgical changes;
- avoid asking it to regenerate entire modules unnecessarily;
- provide only relevant document references per phase;
- use existing components;
- avoid repeated full-project rewrites.

---

# 45. MVP Frontend Non-Goals During Implementation

Do not add:

- landing/marketing website unless separately approved;
- patient portal;
- online booking;
- SMS integration;
- WhatsApp integration;
- Mobile Money API;
- insurance;
- inventory;
- lab management;
- SaaS platform console;
- subscriptions;
- branch switching;
- AI clinical features;
- DICOM/PACS;
- advanced periodontal charting;
- advanced orthodontics.

---

# 46. Landing Page Decision

A public marketing landing page is **not required for the internal dental-clinic MVP UI/UX template**.

The immediate frontend scope begins at:

```text
Login
→ Authenticated Clinic Application
```

A commercial landing page may be added later when:

- the product is validated;
- branding is decided;
- SaaS commercialization begins.

This prevents marketing work from delaying the actual clinic application.

---

# 47. Frontend Completion Definition

The frontend is not considered complete merely because all menu links open.

Completion requires:

- working interaction;
- consistent shared data;
- correct workflow states;
- role restrictions;
- responsive behavior;
- print behavior;
- coherent end-to-end journey.

---

# 48. Final End-to-End Demonstration

Before freeze, the following demonstration should work:

```text
RECEPTIONIST
Login
→ Search/Register Patient
→ Book Appointment
→ Confirm
→ Check In
→ Waiting Room

DENTIST
Login
→ Open Waiting Patient
→ Review Medical History
→ Start Encounter
→ Select Tooth
→ Record Finding
→ Create Treatment Plan
→ Record Acceptance
→ Complete Procedure
→ Send to Checkout

CASHIER
Login
→ Open Patient Invoice
→ Record Partial/Full Payment
→ Print Receipt

RECEPTIONIST / DENTIST
→ Create / Process Recall
→ Book Follow-Up Appointment

ADMINISTRATOR
Login
→ Review Dashboard
→ Users
→ Services
→ Reports
→ Settings
```

All steps must use the same underlying patient and shared mock data.

---

# 49. Final Documentation Relationship

The implementation agent should treat the documentation set as a hierarchy:

```text
01 PRODUCT VISION
        ↓
02 MVP SCOPE
        ↓
03 ROLE PERMISSIONS
        ↓
04 INFORMATION ARCHITECTURE
        ↓
05 WORKFLOWS
        ↓
06 DENTAL CHART
        ↓
07 SRS
        ↓
08 DATABASE DESIGN
        ↓
09 UI/UX SYSTEM
        ↓
10 SAMPLE DATA
        ↓
11 FRONTEND IMPLEMENTATION PLAN
        ↓
FRONTEND BUILD
```

No lower layer should contradict an approved higher-level decision without explicit change control.

---

# 50. Frontend Implementation Plan Decision

**Recommended Status:** READY FOR EXECUTION

**Implementation Strategy:** Documentation-first, frontend-only, phase-gated, reusable-component architecture.

**Preferred HTML Strategy:** Small number of shell HTML files + modular JavaScript-rendered views.

**Preferred Development Sequence:** Build shared foundations first, operational workflows second, audits last.

**Final Frontend Gate:** Clinical review + responsive audit + print audit + role audit + cross-module consistency + manual browser workflow verification.

**Next Project Artifact After Approval:** `AGENTS.md`

`AGENTS.md` should convert the approved project rules into concise, persistent instructions for the coding assistant so that every implementation phase follows the same scope, architecture, UI/UX, role, and no-backend constraints.
