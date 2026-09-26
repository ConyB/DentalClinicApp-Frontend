# Dental Practice Management System
## 07 — Software Requirements Specification (SRS)

**Document Version:** 1.0  
**Status:** Draft for Review / Formal Requirements Baseline  
**Prepared For:** Dental Practice Management System MVP  
**Target Market:** Ugandan Dental Clinics  
**Primary Technology Direction:** PHP / Laravel  
**Prepared By:** BaCorn Tech  
**Date:** 21 September 2026

---

# 1. Introduction

## 1.1 Purpose

This Software Requirements Specification defines the functional and non-functional requirements of the Dental Practice Management System MVP.

It consolidates the decisions established in:

- `01_PRODUCT_VISION.md`
- `02_MVP_SCOPE.md`
- `03_ROLE_PERMISSION_MATRIX.md`
- `04_INFORMATION_ARCHITECTURE.md`
- `05_DENTAL_WORKFLOW_SPECIFICATION.md`
- `06_DENTAL_CHART_SPECIFICATION.md`

This document is intended to serve as the formal requirements baseline for:

- UI/UX generation;
- frontend implementation;
- database design;
- Laravel backend integration;
- authorization;
- validation;
- testing;
- pilot preparation;
- future change control.

The system must not introduce behavior that conflicts with the approved requirements in this document without an explicit documented change.

---

## 1.2 Product Summary

The Dental Practice Management System is a web-based application intended initially for small and medium private dental clinics in Uganda.

The product should help clinics manage the full patient journey:

```text
Patient Registration
        ↓
Appointment
        ↓
Check-In
        ↓
Waiting Room
        ↓
Clinical Encounter
        ↓
Dental Chart
        ↓
Diagnosis / Treatment Planning
        ↓
Procedure
        ↓
Invoice
        ↓
Payment
        ↓
Receipt
        ↓
Recall / Follow-Up
```

The application should replace disconnected paper, spreadsheet, notebook, and manual workflows with a single coordinated system.

---

## 1.3 Intended Audience

This SRS is intended for:

- Project Owner / Product Stakeholders
- Dental Clinical Reviewers
- UI/UX Designers
- Frontend Developers
- Laravel Developers
- Database Designers
- QA/Testers
- Future SaaS/Platform Developers

---

## 1.4 Product Scope

The MVP will support:

- one dental organisation;
- one main branch;
- multiple users;
- multiple patients;
- role-based access;
- core dental clinical workflows;
- billing and payments;
- operational and management reports.

The architecture must remain compatible with future multi-branch and SaaS expansion.

---

# 2. Overall Description

## 2.1 Product Perspective

The application is a standalone web-based dental practice management platform.

The MVP will operate as a single-clinic implementation but should be designed so it can later evolve into:

```text
Platform Administrator
        ↓
Dental Organisation
        ↓
One or More Branches
        ↓
Users + Patients + Clinical Data + Finance
```

The SaaS/platform layer is not part of the MVP.

---

## 2.2 Product Objectives

The system should:

1. Centralize patient information.
2. Improve appointment scheduling.
3. Support real dental charting.
4. Preserve clinical history.
5. Support treatment planning.
6. Track performed procedures.
7. Connect clinical work to billing.
8. Support partial payments and balances.
9. Produce receipts.
10. Support recall/follow-up workflows.
11. Provide role-based access.
12. Provide reliable operational reports.
13. Support professional print outputs.
14. Remain usable in a Ugandan dental-clinic context.

---

## 2.3 Primary Users

The MVP must support:

- Clinic Administrator
- Dentist
- Receptionist
- Cashier

---

## 2.4 Future Users

The architecture should allow future roles such as:

- Dental Assistant / Nurse
- Practice Manager
- Accountant
- Head Dentist
- Laboratory User
- Patient Portal User
- Platform Administrator

---

# 3. Role Summary

## 3.1 Clinic Administrator

The Clinic Administrator manages:

- users;
- clinic settings;
- service catalogue;
- operational oversight;
- reports;
- financial oversight;
- patient visibility;
- system configuration.

The Administrator should not routinely create clinical findings or prescriptions.

---

## 3.2 Dentist

The Dentist manages:

- patient examination;
- medical-history review;
- dental chart;
- findings;
- diagnosis;
- treatment planning;
- clinical encounters;
- procedures;
- prescriptions;
- follow-up recommendations.

---

## 3.3 Receptionist

The Receptionist manages:

- patient registration;
- patient search;
- appointment booking;
- appointment confirmation;
- rescheduling;
- cancellation;
- check-in;
- waiting room;
- recall communication;
- basic demographic updates.

The Receptionist must not receive unrestricted clinical access.

---

## 3.4 Cashier

The Cashier manages:

- invoices;
- payments;
- partial payments;
- balances;
- receipts;
- finance-focused reports.

The Cashier must not access detailed clinical records.

---

# 4. Functional Requirements

---

# 4.1 Authentication

## FR-AUTH-01
The system shall allow registered active users to log in.

## FR-AUTH-02
The system shall authenticate users using secure credentials.

## FR-AUTH-03
The system shall deny login to inactive users.

## FR-AUTH-04
The system shall redirect authenticated users to the appropriate role dashboard.

## FR-AUTH-05
The system shall allow users to log out.

## FR-AUTH-06
The system shall protect authenticated routes from unauthenticated users.

## FR-AUTH-07
The system shall deny access to restricted routes even when a user manually enters the URL.

## FR-AUTH-08
The system shall support user password change.

---

# 4.2 Dashboard

## FR-DASH-01
The system shall provide a role-specific dashboard.

## FR-DASH-02
The Clinic Administrator dashboard shall display operational and financial summary indicators.

## FR-DASH-03
The Dentist dashboard shall prioritize today's clinical work.

## FR-DASH-04
The Receptionist dashboard shall prioritize appointments, check-in, and recall activity.

## FR-DASH-05
The Cashier dashboard shall prioritize invoices, payments, collections, and balances.

## FR-DASH-06
Dashboard data shall respect role permissions.

---

# 4.3 Patient Management

## FR-PAT-01
The system shall allow authorized users to register a patient.

## FR-PAT-02
The system shall generate or assign a unique patient number.

## FR-PAT-03
The system shall support patient search by:

- patient number;
- patient name;
- phone number.

## FR-PAT-04
The system shall allow authorized users to edit demographic information.

## FR-PAT-05
The system shall support patient status as Active or Inactive.

## FR-PAT-06
Patient deactivation shall not delete historical records.

## FR-PAT-07
The system shall support emergency contact information.

## FR-PAT-08
The system shall support guardian information where applicable.

## FR-PAT-09
The system shall warn of likely duplicate patients before creation.

## FR-PAT-10
The patient profile shall act as a central hub.

---

# 4.4 Patient Profile

## FR-PROF-01
The patient profile shall display a role-aware summary.

## FR-PROF-02
The patient profile shall support tabs or equivalent sections for:

- Overview
- Medical History
- Dental Chart
- Encounters / Visits
- Treatment Plans
- Prescriptions
- Documents & Images
- Appointments
- Billing
- Recalls

## FR-PROF-03
Restricted tabs shall be hidden or denied according to role.

## FR-PROF-04
The patient header shall display key identity and alert information.

---

# 4.5 Medical History

## FR-MED-01
The system shall allow authorized clinical users to record medical history.

## FR-MED-02
The system shall support:

- allergies;
- current medication;
- relevant medical conditions;
- relevant dental history;
- clinical notes.

## FR-MED-03
The Dentist shall be able to mark medical history as reviewed.

## FR-MED-04
Important allergy/medical alerts shall remain visible during clinical workflow.

## FR-MED-05
The system shall preserve prior medical-history information where version/history support is implemented.

---

# 4.6 Appointment Management

## FR-APT-01
The system shall allow authorized users to create an appointment.

## FR-APT-02
Each appointment shall reference a valid patient.

## FR-APT-03
Each appointment shall reference a Dentist.

## FR-APT-04
The system shall record:

- date;
- start time;
- duration;
- appointment type/reason;
- status;
- notes where applicable.

## FR-APT-05
The system shall support Day and Week calendar views.

## FR-APT-06
The system shall allow filtering by Dentist and status.

## FR-APT-07
The system shall detect scheduling conflicts.

## FR-APT-08
The system shall allow appointments to be:

- confirmed;
- rescheduled;
- cancelled;
- marked no-show;
- checked in.

## FR-APT-09
The system shall preserve rescheduled/cancelled/no-show history.

## FR-APT-10
The system shall support same-day walk-in appointments.

---

# 4.7 Appointment Statuses

The system shall support:

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

## FR-APT-11
The system shall validate appointment status transitions.

---

# 4.8 Waiting Room / Queue

## FR-QUE-01
The system shall provide a waiting-room view.

## FR-QUE-02
The queue shall display:

- patient;
- appointment time;
- arrival time;
- waiting duration;
- Dentist;
- visit reason;
- current state.

## FR-QUE-03
The queue shall support:

- Checked In
- Waiting
- In Treatment
- Ready for Checkout
- Completed

## FR-QUE-04
Receptionist and Dentist actions shall respect role boundaries.

---

# 4.9 Clinical Encounters

## FR-ENC-01
The Dentist shall be able to start a clinical encounter.

## FR-ENC-02
Each encounter shall reference:

- patient;
- Dentist;
- appointment where applicable.

## FR-ENC-03
The system shall support encounter statuses:

- Draft
- In Progress
- Completed

## FR-ENC-04
The system shall allow recording of:

- chief complaint;
- examination findings;
- diagnosis;
- clinical notes;
- dental-chart updates;
- procedures;
- prescriptions;
- follow-up instructions.

## FR-ENC-05
Completed encounters shall not be routinely editable.

## FR-ENC-06
A controlled correction/reopen workflow shall preserve history.

---

# 4.10 Dental Chart / Odontogram

## FR-DEN-01
The system shall provide an interactive odontogram.

## FR-DEN-02
The system shall use the FDI two-digit tooth designation system.

## FR-DEN-03
The MVP shall support Permanent and Primary dentition.

## FR-DEN-04
The data model shall support mixed dentition.

## FR-DEN-05
The system shall support tooth selection.

## FR-DEN-06
The system shall display tooth number and name.

## FR-DEN-07
The system shall support whole-tooth conditions.

## FR-DEN-08
The system shall support surface-level conditions.

## FR-DEN-09
The system shall support multiple surfaces.

## FR-DEN-10
The system shall support multiple concurrent chart entries for one tooth.

## FR-DEN-11
The system shall distinguish:

- conditions;
- existing treatment;
- planned treatment;
- completed treatment.

## FR-DEN-12
The system shall preserve chart history.

## FR-DEN-13
Chart entries created during an encounter shall link to that encounter.

## FR-DEN-14
Planned treatment shall be visually distinguishable from completed treatment.

## FR-DEN-15
The system shall not rely on colour alone for chart-state meaning.

## FR-DEN-16
The system shall support a chart legend.

## FR-DEN-17
The system shall support a chart history/timeline.

## FR-DEN-18
The system shall support print-friendly chart output.

---

# 4.11 Tooth Surface Support

The system shall support applicable surface codes:

- M — Mesial
- D — Distal
- B — Buccal
- L — Lingual
- O — Occlusal
- F — Facial / Labial
- I — Incisal

## FR-DEN-19
The interface shall prevent clearly invalid surface combinations.

---

# 4.12 Clinical Findings and Diagnosis

## FR-DIAG-01
The Dentist shall be able to record clinical findings.

## FR-DIAG-02
Findings may reference a tooth or area where applicable.

## FR-DIAG-03
The Dentist shall be able to record diagnosis.

## FR-DIAG-04
Findings and diagnosis shall remain linked to the encounter.

---

# 4.13 Treatment Plans

## FR-TP-01
The Dentist shall be able to create a treatment plan.

## FR-TP-02
A treatment plan shall contain one or more treatment items.

## FR-TP-03
Each item shall support:

- procedure;
- tooth/area where applicable;
- surface(s) where applicable;
- quantity;
- default price;
- adjusted price where permitted;
- notes;
- acceptance status;
- treatment status.

## FR-TP-04
The system shall allow partial acceptance of a treatment plan.

## FR-TP-05
The system shall not force acceptance of all items.

## FR-TP-06
The system shall support plan statuses:

- Draft
- Proposed
- Accepted
- Partially Accepted
- In Progress
- Completed
- Cancelled

## FR-TP-07
The system shall support item statuses:

- Proposed
- Accepted
- Declined
- Planned
- In Progress
- Completed
- Cancelled

## FR-TP-08
The system shall support print-friendly treatment plans.

---

# 4.14 Procedure / Service Catalogue

## FR-SVC-01
The Administrator shall be able to manage the service catalogue.

## FR-SVC-02
A service shall support:

- code;
- name;
- category;
- default price;
- default duration;
- description;
- active/inactive status.

## FR-SVC-03
Used services shall be deactivated rather than removed from historical records.

---

# 4.15 Procedures Performed

## FR-PROC-01
The Dentist shall be able to record a performed procedure.

## FR-PROC-02
A performed procedure shall reference:

- patient;
- encounter;
- Dentist;
- procedure;
- tooth/area where applicable;
- treatment-plan item where applicable;
- date;
- quantity;
- price;
- clinical note.

## FR-PROC-03
Completed procedures shall be eligible for billing.

## FR-PROC-04
A completed tooth-specific procedure may update the dental chart.

## FR-PROC-05
Procedure completion shall not destroy earlier findings/history.

---

# 4.16 Prescriptions

## FR-RX-01
The Dentist shall be able to create a prescription.

## FR-RX-02
A prescription shall support:

- medicine;
- strength;
- dose;
- route where applicable;
- frequency;
- duration;
- quantity where appropriate;
- instructions.

## FR-RX-03
The system shall support print-friendly prescriptions.

## FR-RX-04
The system shall not automatically prescribe medication.

---

# 4.17 Documents & Images

## FR-DOC-01
The system shall support patient attachments.

## FR-DOC-02
Supported categories shall include:

- X-rays;
- clinical photos;
- referral letters;
- consent forms;
- other documents.

## FR-DOC-03
The system shall store:

- patient;
- document type;
- description;
- date;
- uploader;
- related encounter where applicable.

## FR-DOC-04
The system shall validate file type and file size.

## FR-DOC-05
The backend shall protect clinical attachments from unauthorized access.

---

# 4.18 Billing / Invoices

## FR-INV-01
The system shall allow authorized finance users to create invoices.

## FR-INV-02
An invoice shall reference a patient.

## FR-INV-03
The invoice shall support one or more invoice items.

## FR-INV-04
The invoice shall support:

- quantity;
- unit price;
- line total;
- discount where permitted;
- subtotal;
- total;
- paid amount;
- balance.

## FR-INV-05
The system shall support invoice statuses:

- Draft
- Unpaid
- Partially Paid
- Paid
- Cancelled

## FR-INV-06
The system shall calculate balances automatically.

## FR-INV-07
Invoices with valid payments shall not be silently cancelled or deleted.

## FR-INV-08
The system shall support print-friendly invoices.

---

# 4.19 Payments

## FR-PAY-01
The Cashier shall be able to record a payment.

## FR-PAY-02
The system shall support:

- Cash
- Mobile Money
- Bank
- Card
- Other

## FR-PAY-03
The system shall support partial payment.

## FR-PAY-04
The system shall validate payment amount.

## FR-PAY-05
The system shall prevent silent overpayment.

## FR-PAY-06
A payment shall record the user who received it.

## FR-PAY-07
Finalized payments shall not be hard-deleted.

## FR-PAY-08
A controlled reversal/void workflow shall preserve history.

---

# 4.20 Receipts

## FR-REC-01
The system shall generate a receipt from a valid payment.

## FR-REC-02
A receipt shall include:

- clinic identity;
- receipt number;
- patient;
- payment date;
- invoice reference;
- amount;
- payment method;
- received by;
- remaining balance where applicable.

## FR-REC-03
The system shall support receipt printing.

## FR-REC-04
Issued receipts shall not be directly edited.

---

# 4.21 Outstanding Balances

## FR-BAL-01
The system shall calculate patient outstanding balances.

## FR-BAL-02
The system shall provide an outstanding-balance list.

## FR-BAL-03
The Cashier shall be able to open an outstanding invoice and record additional payment.

---

# 4.22 Recalls & Follow-Ups

## FR-FUP-01
The system shall support recalls/follow-ups.

## FR-FUP-02
A recall shall support:

- patient;
- recall type;
- due date;
- related encounter/treatment where applicable;
- assigned Dentist where applicable;
- notes;
- contact outcome;
- status.

## FR-FUP-03
The system shall support statuses:

- Upcoming
- Due
- Contacted
- Scheduled
- Completed
- Overdue
- Cancelled

## FR-FUP-04
The Receptionist shall be able to record contact outcomes.

## FR-FUP-05
A recall shall be convertible into an appointment.

---

# 4.23 Reports

## FR-REP-01
The system shall provide patient reports.

## FR-REP-02
The system shall provide appointment reports.

## FR-REP-03
The system shall provide clinical summary reports.

## FR-REP-04
The system shall provide financial reports.

## FR-REP-05
The system shall provide recall reports.

## FR-REP-06
Reports shall respect role permissions.

## FR-REP-07
Reports shall support printing.

## FR-REP-08
CSV export may be provided where practical.

---

# 4.24 Users & Roles

## FR-USR-01
The Administrator shall be able to list users.

## FR-USR-02
The Administrator shall be able to add a user.

## FR-USR-03
The Administrator shall be able to edit a user.

## FR-USR-04
The Administrator shall assign one MVP role.

## FR-USR-05
The Administrator shall activate/deactivate users.

## FR-USR-06
Deactivation shall preserve historical user references.

## FR-USR-07
Ordinary users shall not change their own role.

---

# 4.25 Clinic Settings

## FR-SET-01
The Administrator shall be able to configure clinic profile data.

## FR-SET-02
Settings shall support:

- clinic name;
- logo;
- address;
- phone;
- email;
- working hours;
- appointment defaults;
- procedure catalogue;
- payment methods;
- invoice prefix;
- receipt prefix;
- patient-number prefix;
- recall types.

## FR-SET-03
The default currency shall be UGX.

---

# 4.26 User Profile

## FR-UPR-01
Each user shall be able to view their own profile.

## FR-UPR-02
Each user shall be able to edit permitted personal information.

## FR-UPR-03
Each user shall be able to change their password.

## FR-UPR-04
A user shall not be able to change their own role or account status.

---

# 5. Permission Requirements

## PR-01
The frontend shall hide actions not available to the current role.

## PR-02
The backend shall independently enforce all role permissions.

## PR-03
The system shall use a default-deny principle.

## PR-04
Receptionist users shall not edit clinical records.

## PR-05
Cashier users shall not access detailed clinical records.

## PR-06
Dentists shall not record payments unless explicitly granted future finance permission.

## PR-07
Only authorized clinical users shall create or alter dental-chart entries.

## PR-08
Only the Administrator shall manage users and system configuration.

---

# 6. Data Requirements

## DR-01
Every major record shall have a unique internal identifier.

## DR-02
Clinical records shall reference the patient.

## DR-03
Clinical records shall reference the responsible user/Dentist.

## DR-04
Financial records shall reference the responsible user.

## DR-05
Historical clinical and financial records shall remain traceable.

## DR-06
The system shall preserve timestamps for important actions.

## DR-07
The database design shall avoid duplicated mutable patient data across unrelated tables where a relationship is appropriate.

## DR-08
Dental-chart data shall use normalized chart records rather than one column per tooth.

## DR-09
Dental surface data shall be stored structurally.

## DR-10
The data model shall support future multi-branch expansion.

---

# 7. Business Rules

## BR-01
Every appointment must reference a valid patient.

## BR-02
Every encounter must reference a Dentist.

## BR-03
A dental-chart entry must reference a patient.

## BR-04
Tooth-specific chart entries must use valid FDI codes.

## BR-05
Surface-based findings must use valid tooth surfaces.

## BR-06
A treatment plan belongs to one patient.

## BR-07
Treatment-plan items may be accepted or declined individually.

## BR-08
Completed procedures must remain traceable.

## BR-09
An invoice belongs to one patient.

## BR-10
A payment must reference a valid invoice or approved billing context.

## BR-11
A receipt must reference a valid payment.

## BR-12
Partial payments must leave a visible remaining balance.

## BR-13
Completed clinical records must not be silently deleted.

## BR-14
Finalized payments must not be silently deleted.

## BR-15
Issued receipts must not be directly edited.

## BR-16
Inactive users must not authenticate.

## BR-17
Used service definitions should be deactivated rather than deleted.

## BR-18
Planned treatment must not appear as completed treatment.

## BR-19
Treatment completion must not erase diagnostic history.

## BR-20
Role restrictions must remain consistent between UI and backend.

---

# 8. Non-Functional Requirements

---

# 8.1 Usability

## NFR-USA-01
The application shall use a consistent visual language.

## NFR-USA-02
Common tasks should normally be reachable within 2–3 meaningful actions.

## NFR-USA-03
The system shall preserve patient context during connected workflows.

## NFR-USA-04
Common actions shall have clear labels.

## NFR-USA-05
The interface shall provide:

- empty states;
- loading states;
- error states;
- confirmation dialogs;
- toast feedback.

---

# 8.2 Responsive Design

## NFR-RES-01
The application shall be desktop-optimized.

## NFR-RES-02
The application shall be tablet-friendly.

## NFR-RES-03
Mobile support shall cover common administrative tasks.

## NFR-RES-04
Advanced odontogram editing may remain optimized for desktop/tablet.

---

# 8.3 Performance

## NFR-PERF-01
Routine navigation should feel immediate.

## NFR-PERF-02
The odontogram shall respond quickly to tooth selection and layer changes.

## NFR-PERF-03
Large list pages shall use pagination.

## NFR-PERF-04
The frontend should avoid unnecessarily large assets and scripts.

---

# 8.4 Security

## NFR-SEC-01
Passwords shall be securely hashed.

## NFR-SEC-02
Sessions shall be handled securely.

## NFR-SEC-03
The backend shall enforce authorization.

## NFR-SEC-04
Sensitive attachments shall not be publicly exposed.

## NFR-SEC-05
The application shall validate all server-side input.

## NFR-SEC-06
The system shall protect against common web vulnerabilities according to Laravel best practices.

## NFR-SEC-07
Sensitive clinical/financial actions should be auditable.

---

# 8.5 Privacy

## NFR-PRIV-01
The system shall use least-privilege access.

## NFR-PRIV-02
Users shall only see patient data necessary for their role.

## NFR-PRIV-03
Clinical records shall be treated as sensitive data.

## NFR-PRIV-04
Finance records shall be protected according to role.

## NFR-PRIV-05
The production implementation should be reviewed for compliance with applicable Ugandan data-protection obligations.

---

# 8.6 Reliability

## NFR-REL-01
Important multi-record operations should use database transactions where appropriate.

Examples:

- payment + receipt;
- invoice finalization;
- appointment rescheduling;
- procedure completion + treatment-item update.

## NFR-REL-02
The system shall avoid silent data loss.

## NFR-REL-03
Historical records shall remain retrievable.

---

# 8.7 Accessibility

## NFR-ACC-01
The UI shall not rely solely on colour to communicate status.

## NFR-ACC-02
Interactive elements shall use visible focus states where practical.

## NFR-ACC-03
Dental-chart tooth identity shall be available as text.

## NFR-ACC-04
The odontogram shall have a non-graphical history/list representation.

---

# 8.8 Maintainability

## NFR-MNT-01
The frontend should use reusable components/patterns.

## NFR-MNT-02
The system should avoid duplicated role-specific logic where shared components can be permission-aware.

## NFR-MNT-03
The Laravel backend should use clear service/policy boundaries.

## NFR-MNT-04
Business logic should not be scattered across views.

---

# 8.9 Printability

## NFR-PRN-01
The system shall provide print-friendly layouts for:

- invoices;
- receipts;
- prescriptions;
- treatment plans;
- selected reports;
- dental-chart summary.

## NFR-PRN-02
Print layouts shall exclude navigation and interactive controls.

---

# 9. Localization Requirements

## LOC-01
The default currency shall be:

> UGX — Uganda Shillings

## LOC-02
Currency should display using clear formatting such as:

```text
UGX 150,000
```

## LOC-03
The system shall support Uganda-relevant phone-number usage.

## LOC-04
Patient address fields shall remain flexible.

## LOC-05
The MVP shall support:

- Cash
- Mobile Money
- Bank
- Card
- Other

as payment methods.

---

# 10. Audit Requirements

The backend should be designed to support audit events including:

- login;
- patient creation/edit;
- appointment changes;
- encounter completion/reopen;
- dental-chart changes;
- treatment-plan changes;
- procedure completion;
- prescription issuance;
- invoice creation/cancellation;
- payment creation/reversal;
- receipt issuance;
- recall changes;
- user activation/deactivation;
- settings changes.

A full audit-log interface may remain limited in the MVP.

---

# 11. Search Requirements

## SRCH-01
The system shall support patient search by:

- number;
- name;
- phone.

## SRCH-02
The system should support search for:

- invoices;
- receipts;
- appointments;
- users;
- services.

## SRCH-03
Global search may be introduced if it can be implemented cleanly.

---

# 12. Status Requirements

The system shall use consistent status models.

## Appointment

- Scheduled
- Confirmed
- Checked In
- Waiting
- In Treatment
- Completed
- Cancelled
- No Show
- Rescheduled

## Encounter

- Draft
- In Progress
- Completed

## Treatment Plan

- Draft
- Proposed
- Accepted
- Partially Accepted
- In Progress
- Completed
- Cancelled

## Treatment Item

- Proposed
- Accepted
- Declined
- Planned
- In Progress
- Completed
- Cancelled

## Invoice

- Draft
- Unpaid
- Partially Paid
- Paid
- Cancelled

## Recall

- Upcoming
- Due
- Contacted
- Scheduled
- Completed
- Overdue
- Cancelled

---

# 13. Navigation Requirements

The application shall provide role-specific navigation.

## Clinic Administrator

```text
Dashboard
Patients
Appointments
Waiting Room
Clinical Overview
Treatment Plans
Billing
Recalls
Reports
Users & Roles
Clinic Settings
Profile
```

## Dentist

```text
Dashboard
My Appointments
Waiting Patients
Patients
Clinical
    ├── Encounters
    ├── Dental Chart
    ├── Treatment Plans
    └── Prescriptions
Recalls
Reports
Profile
```

## Receptionist

```text
Dashboard
Patients
Appointments
Waiting Room
Recalls
Selected Reports
Profile
```

## Cashier

```text
Dashboard
Patient Search
Invoices
Payments
Receipts
Outstanding Balances
Selected Reports
Profile
```

---

# 14. User Interface Requirements

## UI-01
The application shall use a consistent authenticated shell.

## UI-02
The shell shall include:

- sidebar;
- header;
- content area;
- user menu;
- responsive behavior.

## UI-03
The active sidebar item shall be visually clear.

## UI-04
Tables shall use consistent:

- search;
- filters;
- actions;
- pagination;
- empty states.

## UI-05
Large detail entities shall use dedicated pages.

## UI-06
Small quick actions may use modals.

## UI-07
Critical actions shall require appropriate confirmation.

## UI-08
The application shall provide top-right toast notifications or equivalent consistent feedback.

---

# 15. Dental Chart UI Requirements

## UI-DEN-01
The patient dental-chart page shall show:

- patient context;
- dentition selector;
- odontogram;
- legend;
- selected-tooth panel;
- chart history.

## UI-DEN-02
The selected tooth shall be clearly highlighted.

## UI-DEN-03
The chart shall clearly label patient left/right orientation.

## UI-DEN-04
The selected-tooth panel shall summarize:

- conditions;
- existing treatment;
- planned treatment;
- completed treatment;
- history.

## UI-DEN-05
Tooth interaction shall be suitable for mouse and touch on supported screens.

---

# 16. Error Handling Requirements

## ERR-01
The application shall provide a clear 403 page/message.

## ERR-02
The application shall provide a clear 404 page.

## ERR-03
The application shall provide a generic server-error page.

## ERR-04
Validation errors shall be shown near affected fields.

## ERR-05
The application shall preserve entered data where practical after validation failure.

## ERR-06
Invalid workflow transitions shall be rejected with a clear message.

---

# 17. Data Integrity Requirements

## INT-01
The system shall validate relationships before creating dependent records.

## INT-02
The system shall not allow a payment against a cancelled invoice.

## INT-03
The system shall not allow a receipt without a valid payment.

## INT-04
The system shall not allow invalid tooth codes.

## INT-05
The system shall not allow a clinical encounter without a responsible Dentist.

## INT-06
Dashboard totals shall reconcile with source data.

## INT-07
Financial reports shall reconcile with invoice/payment records.

---

# 18. File Upload Requirements

## FILE-01
The system shall restrict allowed file types.

## FILE-02
The system shall restrict file size.

## FILE-03
The system shall store attachment metadata.

## FILE-04
The system shall protect clinical files with authorization checks.

---

# 19. MVP Reports

The MVP shall include at least:

## Patient Reports
- registrations;
- visits.

## Appointment Reports
- appointments by date;
- appointments by Dentist;
- appointment-status summary;
- cancellations;
- no-shows.

## Clinical Reports
- procedures performed;
- procedures by Dentist;
- treatment-plan status.

## Financial Reports
- daily collections;
- revenue by period;
- revenue by Dentist;
- revenue by procedure;
- outstanding balances;
- payment-method summary.

## Recall Reports
- upcoming recalls;
- overdue recalls;
- completed recalls.

---

# 20. MVP Exclusions

The following are outside the MVP:

- AI diagnosis;
- AI treatment recommendation;
- AI X-ray interpretation;
- PACS;
- DICOM infrastructure;
- direct X-ray device integration;
- advanced periodontal charting;
- advanced orthodontic charting;
- 3D odontogram;
- patient mobile app;
- native mobile apps;
- patient portal;
- online booking portal;
- insurance claims;
- insurance pre-authorization;
- online payment gateway;
- direct Mobile Money API;
- SMS gateway;
- WhatsApp automation;
- pharmacy inventory;
- dental-material inventory;
- lab management;
- procurement;
- payroll;
- HR;
- full accounting;
- multi-tenant subscriptions;
- platform administration;
- branch switching;
- advanced BI;
- multi-country localization.

---

# 21. Future Expansion Requirements

The design should remain extendable for:

- multi-branch;
- SaaS tenancy;
- patient portal;
- online booking;
- SMS/WhatsApp reminders;
- insurance;
- inventory;
- lab tracking;
- periodontal charting;
- orthodontic workflows;
- imaging integration;
- subscription management;
- platform administration.

These are not implementation requirements for Version 1.

---

# 22. End-to-End Acceptance Requirements

The MVP must successfully demonstrate the following.

## Scenario A — New Patient Visit

1. Receptionist registers patient.
2. Receptionist books appointment.
3. Appointment appears in schedule.
4. Receptionist confirms appointment.
5. Patient checks in.
6. Patient enters waiting queue.
7. Dentist starts encounter.
8. Dentist reviews medical history.
9. Dentist updates dental chart.
10. Dentist records findings/diagnosis.
11. Dentist creates treatment plan.
12. Patient accepts at least one item.
13. Dentist completes a procedure.
14. Procedure becomes billable.
15. Cashier creates/reviews invoice.
16. Cashier records payment.
17. Receipt is generated.
18. Recall is created.
19. Patient history shows the completed workflow.

---

## Scenario B — Returning Patient

1. Patient is found by name/number/phone.
2. Previous chart is visible.
3. Previous treatment plan remains intact.
4. New appointment is created.
5. New encounter is created.
6. New chart updates do not overwrite history.
7. New billing data is added without damaging previous records.

---

## Scenario C — Role Security

1. Receptionist cannot edit clinical data.
2. Cashier cannot access medical history.
3. Dentist cannot perform unrestricted finance actions.
4. Only Administrator manages users/settings.
5. Direct URL access is denied where unauthorized.

---

## Scenario D — Partial Payment

1. Invoice is created.
2. Partial payment is recorded.
3. Receipt reflects the payment.
4. Remaining balance is correct.
5. Later payment clears the balance.
6. Invoice changes to Paid.

---

## Scenario E — Odontogram

1. Dentist selects a tooth.
2. Dentist records a surface-specific finding.
3. Dentist creates a related treatment item.
4. Planned work displays differently from current pathology.
5. Procedure is completed.
6. Current chart changes.
7. Original finding remains in history.

---

# 23. UI/UX Freeze Requirements

The frontend shall not be considered frozen until:

- all MVP modules exist;
- role navigation is correct;
- patient workflow is connected;
- appointments work coherently;
- waiting-room flow is stable;
- odontogram interaction is stable;
- treatment planning is stable;
- invoice/payment totals reconcile;
- receipts print correctly;
- prescription layout is usable;
- reports use consistent sample data;
- responsive behavior is acceptable;
- print layouts are acceptable;
- no major placeholder pages remain;
- permissions are represented correctly;
- sample data is internally consistent.

---

# 24. Backend Completion Requirements

Laravel integration shall not be considered complete until:

- authentication works;
- authorization works;
- all core entities persist;
- server-side validation works;
- workflow rules are enforced;
- financial calculations reconcile;
- clinical history remains traceable;
- secure file access works;
- print outputs use persisted data;
- demo data can be seeded;
- core integration tests pass.

---

# 25. Clinical Validation Gate

The project may proceed with UI/UX development using the current dental-chart specification.

However, before the dental-chart module is formally frozen for real-world clinical deployment:

> A qualified Dentist / Dental Surgeon should review the odontogram terminology, chart symbols, common conditions, surface behavior, and treatment workflow.

Clinical review may result in:

- terminology changes;
- additional chart conditions;
- modified symbols;
- workflow adjustments;
- minor UI refinements.

These changes should be applied before final clinical freeze.

---

# 26. Technology Direction

The intended backend framework is:

> PHP / Laravel

The frontend should be developed in a way that remains easy to convert into Laravel Blade templates.

The initial UI/UX phase may use:

- HTML;
- CSS;
- JavaScript;
- Bootstrap or approved UI dependencies;
- reusable components;
- structured sample data.

The frontend should avoid unnecessary backend logic during the design phase.

---

# 27. Architecture Direction

Conceptual architecture:

```text
Dental Organisation
   └── Main Branch
        ├── Users
        ├── Patients
        ├── Appointments
        ├── Encounters
        ├── Dental Charts
        ├── Treatment Plans
        ├── Procedures
        ├── Prescriptions
        ├── Invoices
        ├── Payments
        ├── Receipts
        ├── Recalls
        └── Reports
```

The database and backend should avoid assumptions that permanently prevent future multi-branch support.

---

# 28. Data Ownership Direction

In a future SaaS architecture:

> Operational and clinical data belongs to the subscribing dental organisation.

This future direction should influence:

- organisation identifiers;
- branch readiness;
- data isolation;
- export strategy;
- subscription/offboarding planning.

The MVP does not yet implement tenancy.

---

# 29. Change Control

Changes to this SRS should be documented when they affect:

- scope;
- role permissions;
- core workflow;
- database design;
- clinical model;
- finance logic;
- navigation;
- security;
- report definitions.

Minor visual refinements that do not alter behavior may be handled in the UI/UX specification.

---

# 30. Requirements Traceability Direction

Later implementation/testing should be able to trace major features back to requirement identifiers such as:

```text
FR-PAT-*
FR-APT-*
FR-ENC-*
FR-DEN-*
FR-TP-*
FR-PAY-*
NFR-SEC-*
```

This will make UI/UX and backend audits easier.

---

# 31. SRS Approval Checklist

Before this SRS is frozen, stakeholders should confirm:

- [ ] Target clinic type is correct.
- [ ] Four MVP roles are sufficient.
- [ ] Patient workflow is complete.
- [ ] Appointment workflow is correct.
- [ ] Queue workflow is correct.
- [ ] Encounter workflow is correct.
- [ ] Dental chart direction is acceptable.
- [ ] Treatment-plan workflow is correct.
- [ ] Billing/payment workflow is correct.
- [ ] Recall workflow is correct.
- [ ] Reports are sufficient for MVP.
- [ ] Exclusions are accepted.
- [ ] Future SaaS direction is preserved.
- [ ] Dentist clinical review is planned before final clinical freeze.

---

# 32. SRS Summary

The MVP must function as one connected dental practice system.

The core requirement is:

```text
PATIENT
   ↓
APPOINTMENT
   ↓
CHECK-IN
   ↓
WAITING ROOM
   ↓
CLINICAL ENCOUNTER
   ↓
DENTAL CHART
   ↓
TREATMENT PLAN
   ↓
PROCEDURE
   ↓
INVOICE
   ↓
PAYMENT
   ↓
RECEIPT
   ↓
RECALL
```

Each module must preserve:

- patient identity;
- role ownership;
- workflow state;
- historical integrity;
- authorization;
- data consistency.

---

# Software Requirements Specification Decision

**Recommended Status:** READY FOR REVIEW

**Requirements Baseline:** MVP scope consolidated and suitable for UI/UX and database design.

**Clinical Status:** Dental-chart requirements remain provisionally approved for development, with Dentist/Dental Surgeon review required before final clinical freeze.

**Next Document:** `08_DATABASE_DESIGN.md`

The next document should translate the approved requirements into a relational data model, including tables, keys, relationships, statuses, audit fields, dental-chart structures, treatment-plan structures, finance tables, indexes, and future multi-branch readiness.
