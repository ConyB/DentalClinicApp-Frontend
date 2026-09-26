# Dental Practice Management System
## 02 — MVP Scope

**Document Version:** 1.0  
**Status:** Draft for Review / MVP Boundary Document  
**Prepared For:** Dental Practice Management System MVP  
**Target Market:** Ugandan Dental Clinics  
**Primary Technology Direction:** PHP / Laravel  
**Prepared By:** BaCorn Tech  
**Date:** 20 September 2026

---

## 1. Document Purpose

This document defines the exact functional scope of Version 1 of the Dental Practice Management System.

It translates the strategic direction established in `01_PRODUCT_VISION.md` into a controlled MVP boundary.

The purpose of this file is to answer four questions clearly:

1. What must be included in the MVP?
2. What is allowed to remain simple in the MVP?
3. What must be excluded from the MVP?
4. What conditions must be satisfied before the MVP can be considered functionally complete?

This document must be treated as a scope-control reference during UI/UX generation, database design, Laravel backend integration, testing, and pilot preparation.

The project must not introduce new major features outside this scope without an explicit documented change.

---

## 2. MVP Definition

For this project, the MVP is:

> A complete, usable, role-based dental practice management web application that allows a Ugandan dental clinic to manage the full patient journey from registration and appointment booking through dental examination, treatment planning, treatment recording, billing, payment, receipt generation, and follow-up.

The MVP is not a prototype consisting only of screens.

It must represent a believable clinic workflow with consistent data relationships across modules.

The MVP must support the following connected journey:

```text
Patient Registration
        ↓
Appointment Booking
        ↓
Appointment Confirmation / Rescheduling
        ↓
Patient Check-In
        ↓
Waiting Queue
        ↓
Clinical Encounter
        ↓
Dental Examination / Dental Chart
        ↓
Diagnosis / Clinical Notes
        ↓
Treatment Plan
        ↓
Procedure Recording
        ↓
Invoice
        ↓
Payment
        ↓
Receipt
        ↓
Recall / Follow-Up
```

---

## 3. MVP Primary Objectives

The MVP must achieve the following objectives.

### 3.1 Replace Fragmented Clinic Workflows

The system should provide one connected place for:

- patients;
- appointments;
- dental records;
- treatment plans;
- clinical procedures;
- prescriptions;
- billing;
- receipts;
- follow-ups;
- reports.

---

### 3.2 Support the Main Clinic Roles

The MVP must support:

- Clinic Administrator
- Dentist
- Receptionist
- Cashier

Each role must have a distinct navigation and permission profile.

---

### 3.3 Demonstrate Real Dental Workflows

The product must include dental-specific workflows.

It must not behave like a generic hospital CRUD system.

At minimum, the MVP must include:

- dental charting;
- tooth-specific findings;
- treatment plans;
- dental procedures;
- clinical notes;
- recalls.

---

### 3.4 Keep the First Version Manageable

The MVP must avoid unnecessary enterprise features.

Features should only be included if they are required to demonstrate the complete daily workflow of a typical small or medium dental clinic.

---

## 4. MVP Operational Model

The MVP will assume:

```text
1 Dental Organisation
        ↓
1 Main Branch
        ↓
Multiple Users
        ↓
Multiple Patients
```

The MVP frontend and data design should be compatible with later multi-branch and multi-tenant expansion.

However, the first implementation does not need to include:

- tenant onboarding;
- subscription management;
- branch switching;
- organisation isolation across multiple customers;
- platform administrator workflows.

---

## 5. MVP Roles

### 5.1 Clinic Administrator

The Clinic Administrator has broad operational access.

Primary MVP responsibilities:

- dashboard;
- patient visibility;
- appointment visibility;
- staff/user management;
- service/procedure catalogue;
- clinic settings;
- finance oversight;
- reports;
- operational monitoring.

---

### 5.2 Dentist

Primary MVP responsibilities:

- view assigned appointments;
- open patient records;
- review medical history;
- record clinical encounters;
- update dental chart;
- record findings;
- record diagnosis;
- create treatment plans;
- record procedures;
- issue prescriptions;
- schedule follow-up recommendations;
- review patient treatment history.

---

### 5.3 Receptionist

Primary MVP responsibilities:

- patient registration;
- patient search;
- appointment booking;
- appointment rescheduling;
- appointment cancellation;
- appointment confirmation;
- patient check-in;
- waiting queue management;
- recall scheduling;
- basic demographic updates.

Receptionist access to sensitive clinical information should be limited.

---

### 5.4 Cashier

Primary MVP responsibilities:

- view billable patient items;
- generate/view invoices;
- record payments;
- support partial payments;
- issue receipts;
- view balances;
- view payment history;
- process authorized discounts where permitted.

---

## 6. Core MVP Modules

The following modules are included in Version 1.

---

# 6.1 Authentication

## Required

- Login
- Logout
- Role-based access
- Session-based authenticated state
- User active/inactive state
- Role-specific redirect after login
- Unauthorized-access handling

## Allowed to Remain Simple

- Password reset may initially be administrator-assisted
- Advanced MFA is not required in MVP
- Social login is not required

## Deferred

- Two-factor authentication
- SSO
- biometric authentication
- external identity providers

---

# 6.2 Dashboard

The dashboard must be role-specific.

## Clinic Administrator Dashboard

Minimum widgets:

- today's appointments;
- checked-in patients;
- completed visits;
- new patients;
- today's revenue;
- outstanding balances;
- upcoming recalls;
- appointment-status summary;
- recent payments;
- recent activity.

## Dentist Dashboard

Minimum widgets:

- today's assigned appointments;
- waiting patients;
- patients in treatment;
- pending treatment items;
- upcoming follow-ups;
- recent clinical encounters.

## Receptionist Dashboard

Minimum widgets:

- today's appointments;
- confirmed appointments;
- waiting patients;
- no-shows;
- pending confirmations;
- upcoming recalls.

## Cashier Dashboard

Minimum widgets:

- today's invoices;
- today's collections;
- unpaid/partial invoices;
- recent payments;
- outstanding balances.

## Deferred

- predictive analytics;
- AI summaries;
- advanced business intelligence;
- custom dashboard builders.

---

# 6.3 Patients

## Required

The Patients module must support:

- patient list;
- patient registration;
- patient search;
- patient filtering;
- patient profile;
- patient editing;
- active/inactive patient status;
- patient number/reference;
- demographic information;
- contact information;
- emergency contact;
- guardian information where applicable;
- medical-history summary;
- allergy summary;
- appointment history;
- clinical history;
- billing summary.

## Minimum Patient Fields

At minimum:

- patient number;
- first name;
- last name;
- other name where applicable;
- date of birth;
- sex;
- phone number;
- alternative phone;
- email where available;
- district;
- town/area;
- address/landmark;
- occupation;
- emergency contact name;
- emergency contact phone;
- relationship;
- registration date;
- patient status.

## Medical Information

At minimum:

- known allergies;
- current medication;
- relevant medical conditions;
- pregnancy status where clinically appropriate;
- bleeding disorders;
- diabetes;
- hypertension;
- heart conditions;
- other notes.

## Guardian Information

For minors where applicable:

- guardian name;
- relationship;
- phone number;
- alternative contact.

## Deferred

- national-ID validation;
- biometric capture;
- external patient-record exchange;
- patient self-registration portal.

---

# 6.4 Appointments

## Required

The Appointments module must support:

- appointment calendar;
- create appointment;
- edit appointment;
- reschedule appointment;
- cancel appointment;
- confirm appointment;
- assign dentist;
- appointment reason;
- appointment type;
- date/time;
- estimated duration;
- appointment status;
- appointment notes;
- patient lookup;
- filtering by dentist;
- filtering by date;
- filtering by status.

## Required Appointment Statuses

At minimum:

- Scheduled
- Confirmed
- Checked In
- Waiting
- In Treatment
- Completed
- Cancelled
- No Show
- Rescheduled

## Calendar Views

MVP must include:

- Day view
- Week view

Month view may be included if useful, but is not mandatory.

## Deferred

- online self-booking;
- online deposit;
- external calendar sync;
- automated optimization;
- waiting-list auto-fill;
- recurring appointment engine.

---

# 6.5 Waiting Room / Patient Queue

## Required

The queue should support:

- patient check-in;
- waiting status;
- dentist assignment;
- arrival time;
- appointment time;
- wait duration;
- in-treatment status;
- completed/checkout status.

## Minimum Queue States

```text
Checked In
    ↓
Waiting
    ↓
In Treatment
    ↓
Checkout / Completed
```

## Deferred

- queue ticket printers;
- display-board integration;
- patient SMS queue alerts;
- live TV waiting-room boards.

---

# 6.6 Medical History

## Required

A patient's clinical profile must support:

- allergies;
- current medication;
- medical conditions;
- previous relevant conditions;
- relevant dental history;
- notes;
- last reviewed date;
- reviewed by user.

The dentist must be able to review this information before treatment.

## Deferred

- advanced structured medical coding;
- external EHR integration;
- automated clinical warnings from third-party knowledge bases.

---

# 6.7 Dental Chart / Odontogram

This is a mandatory MVP feature.

## Required

The system must provide an interactive dental chart capable of:

- displaying teeth;
- selecting a tooth;
- recording a condition;
- viewing existing conditions;
- viewing completed procedures;
- differentiating current vs historical charting;
- connecting chart entries to encounters.

## Minimum Supported Conditions / States

At minimum:

- Healthy
- Caries
- Missing
- Filled
- Crown
- Bridge
- Implant
- Root Canal
- Extraction Required
- Extracted
- Impacted
- Fractured
- Other

## Tooth Numbering

The exact numbering convention must be standardized in `06_DENTAL_CHART_SPECIFICATION.md`.

## Permanent Dentition

Permanent dentition is required for MVP.

## Primary Dentition

Primary dentition should be supported if it can be implemented cleanly without destabilizing the MVP.

If not, it may be deferred to the first post-MVP enhancement.

## Surface-Level Charting

Detailed tooth-surface charting may be included in the specification, but the MVP may begin with whole-tooth condition tracking if surface-level interactions prove too complex for the first release.

This decision must be finalized in `06_DENTAL_CHART_SPECIFICATION.md`.

## Deferred

- periodontal charting;
- 3D charting;
- automated X-ray interpretation;
- AI caries detection;
- advanced orthodontic charting.

---

# 6.8 Clinical Encounters

## Required

A dentist must be able to create and complete a clinical encounter.

Minimum fields:

- encounter date/time;
- dentist;
- related appointment;
- chief complaint;
- history of presenting complaint where needed;
- examination notes;
- findings;
- diagnosis;
- dental chart updates;
- treatment discussion;
- procedures performed;
- prescription;
- follow-up instructions;
- clinical notes;
- next review recommendation.

## Encounter Statuses

At minimum:

- Draft
- In Progress
- Completed

## Required Relationship

A clinical encounter should be linked to:

- patient;
- dentist;
- appointment where applicable.

## Deferred

- voice dictation;
- AI note generation;
- automatic diagnosis generation;
- specialty-specific advanced encounter templates.

---

# 6.9 Diagnosis / Clinical Findings

## Required

Dentists must be able to record:

- finding;
- diagnosis;
- tooth/area where relevant;
- clinical notes;
- relationship to encounter.

## Allowed to Remain Simple

Diagnosis may begin as controlled clinic-defined text entries or structured selections plus notes.

## Deferred

- ICD integration;
- automatic code assignment;
- AI diagnostic support;
- external terminology services.

---

# 6.10 Treatment Plans

## Required

A dentist must be able to create a treatment plan containing multiple treatment items.

Each treatment item must support:

- procedure/service;
- associated tooth/area where applicable;
- quantity;
- default price;
- adjusted price where permitted;
- notes;
- acceptance status;
- treatment status.

## Required Treatment Plan Statuses

At minimum:

- Draft
- Proposed
- Accepted
- Partially Accepted
- In Progress
- Completed
- Cancelled

## Required Treatment Item Statuses

At minimum:

- Proposed
- Accepted
- Declined
- Planned
- In Progress
- Completed
- Cancelled

## Important Rule

A patient must not be forced to accept the entire plan.

Individual treatment items should be able to progress independently.

## Deferred

- digital signature;
- online patient approval;
- financing plans;
- insurance pre-authorization;
- automated cost optimization.

---

# 6.11 Procedures / Services Catalogue

## Required

The administrator must be able to manage:

- procedure code;
- procedure name;
- category;
- default price;
- default duration;
- description;
- active/inactive state.

## Example Categories

- Consultation
- Preventive
- Restorative
- Extraction
- Endodontic
- Prosthodontic
- Orthodontic
- Cosmetic
- Diagnostic
- Other

## Example Services

- Consultation
- Dental Examination
- X-Ray
- Scaling
- Polishing
- Composite Filling
- Amalgam Filling
- Simple Extraction
- Surgical Extraction
- Root Canal Treatment
- Crown
- Bridge
- Denture
- Teeth Whitening

## Deferred

- complex bundled pricing;
- insurance price books;
- supplier-linked procedure costing;
- dynamic regional pricing.

---

# 6.12 Procedures Performed

## Required

A completed treatment/procedure record must support:

- patient;
- encounter;
- dentist;
- procedure;
- tooth/area where relevant;
- treatment-plan item where applicable;
- date;
- quantity;
- price;
- clinical note;
- completion status.

## Important Rule

A procedure performed should be capable of contributing to billing.

## Deferred

- consumables usage;
- automatic inventory deduction;
- laboratory-cost calculation.

---

# 6.13 Prescriptions

## Required

A dentist must be able to create a prescription linked to a patient and encounter.

Minimum fields:

- medicine;
- strength;
- dose;
- route where relevant;
- frequency;
- duration;
- quantity where appropriate;
- instructions;
- prescribing dentist;
- prescription date.

## Required Output

- printer-friendly prescription layout.

## Important Rule

The system records practitioner decisions.

It must not automatically determine what medication should be prescribed.

## Deferred

- e-prescribing network integration;
- drug interaction databases;
- pharmacy inventory;
- automatic dosage recommendation;
- national prescription exchange.

---

# 6.14 Imaging & Documents

## Required

The system must support attachment metadata and UI for:

- dental X-rays;
- clinical photographs;
- referral letters;
- consent forms;
- other patient documents.

Minimum functions:

- upload;
- view;
- description;
- date;
- document type;
- related patient;
- related encounter where applicable.

## Allowed to Remain Simple

The first version may use standard file upload and secure storage patterns.

## Deferred

- DICOM/PACS;
- direct X-ray-device integration;
- automatic image enhancement;
- 3D imaging;
- AI image interpretation.

---

# 6.15 Billing / Invoices

## Required

The system must support:

- invoice creation;
- invoice number;
- patient;
- invoice date;
- invoice items;
- quantity;
- unit price;
- discount where permitted;
- total;
- paid amount;
- outstanding balance;
- payment status;
- invoice notes;
- print-friendly invoice.

## Required Invoice Statuses

At minimum:

- Draft
- Unpaid
- Partially Paid
- Paid
- Cancelled

## Required Relationship

Invoices should be linked to patient services/procedures where appropriate.

## Deferred

- insurance claims;
- credit-provider financing;
- electronic tax integration;
- external accounting platform sync.

---

# 6.16 Payments

## Required

The system must support:

- payment reference;
- patient;
- invoice;
- amount;
- payment date/time;
- payment method;
- received by;
- notes;
- printable receipt;
- partial payments.

## Required Payment Methods

At minimum:

- Cash
- Mobile Money
- Bank
- Card
- Other

## Important Rules

- payment amount must not silently exceed the valid balance;
- payment history must remain traceable;
- cancelled or corrected payments should not simply disappear;
- receipts must reference the associated payment.

## Deferred

- direct mobile-money API integration;
- card gateway integration;
- payment links;
- automatic bank reconciliation.

---

# 6.17 Receipts

## Required

A receipt must include:

- clinic identity;
- receipt number;
- patient;
- payment date;
- invoice reference;
- amount paid;
- payment method;
- received by;
- remaining balance where applicable;
- print layout.

## Branding

The receipt should be capable of displaying:

- clinic logo;
- clinic name;
- address;
- contact details.

## Deferred

- fiscal-device integration;
- automated tax authority transmission;
- electronic signing.

---

# 6.18 Recalls & Follow-Ups

## Required

The system must support creation and tracking of recalls/follow-ups.

Minimum fields:

- patient;
- recall type;
- due date;
- related treatment/encounter where applicable;
- assigned dentist where applicable;
- status;
- notes;
- contact outcome.

## Required Recall Statuses

At minimum:

- Upcoming
- Due
- Contacted
- Scheduled
- Completed
- Overdue
- Cancelled

## Example Recall Types

- Routine Dental Review
- Scaling Review
- Post-Extraction Review
- Root Canal Follow-Up
- Denture Review
- Orthodontic Review
- Custom Follow-Up

## Deferred

- automated SMS;
- automated WhatsApp;
- email campaigns;
- intelligent recall optimization.

---

# 6.19 Reports

## Required MVP Reports

At minimum:

### Patient Reports
- patient registration report;
- new patients by period;
- patient visit history.

### Appointment Reports
- appointments by date;
- appointments by dentist;
- appointment statuses;
- cancellations;
- no-shows.

### Clinical Reports
- procedures performed;
- procedures by dentist;
- procedures by period;
- treatment-plan status summary.

### Financial Reports
- daily collections;
- collections by period;
- revenue by dentist;
- revenue by procedure;
- outstanding balances;
- payment-method summary.

### Recall Reports
- upcoming recalls;
- overdue recalls;
- completed recalls.

## Export / Print

MVP should support:

- print-friendly reports;
- CSV export where practical.

## Deferred

- advanced BI dashboards;
- custom report builder;
- Excel templates;
- scheduled report emailing;
- predictive analytics.

---

# 6.20 Users & Roles

## Required

The Administrator must be able to:

- list users;
- add users;
- edit users;
- assign role;
- activate/deactivate users;
- view user status.

Minimum user fields:

- full name;
- username/email;
- phone;
- role;
- active/inactive status;
- job title;
- dentist profile linkage where relevant.

## Roles Required

- Clinic Administrator
- Dentist
- Receptionist
- Cashier

## Deferred

- custom role builder;
- nested permission groups;
- delegated admin;
- enterprise directory synchronization.

---

# 6.21 Clinic Settings

## Required

The clinic settings module must support:

### Clinic Identity
- clinic name;
- logo;
- address;
- phone;
- email;
- website where applicable.

### Operational Settings
- working hours;
- appointment duration defaults;
- clinic timezone;
- default currency;
- receipt prefix;
- invoice prefix;
- patient-number prefix.

### Finance Settings
- enabled payment methods;
- basic discount rules.

### Clinical Settings
- procedure catalogue;
- recall types.

## Deferred

- multiple legal entities;
- advanced tax engine;
- subscription settings;
- branch switching;
- multi-language support.

---

## 7. MVP Navigation Scope

The exact navigation will be finalized in `04_INFORMATION_ARCHITECTURE.md`.

However, the MVP navigation should not exceed the following conceptual areas:

```text
Dashboard
Patients
Appointments
Waiting Room
Clinical
    ├── Encounters
    ├── Dental Chart
    ├── Treatment Plans
    └── Prescriptions
Billing
    ├── Invoices
    ├── Payments
    └── Receipts
Recalls
Reports
Users & Roles
Clinic Settings
Profile
```

Role-specific navigation must hide inaccessible modules.

---

## 8. MVP Data Relationships

The MVP must preserve these core relationships:

```text
Patient
 ├── Appointments
 ├── Medical History
 ├── Clinical Encounters
 │     ├── Findings
 │     ├── Diagnoses
 │     ├── Dental Chart Entries
 │     ├── Procedures
 │     └── Prescriptions
 ├── Treatment Plans
 │     └── Treatment Plan Items
 ├── Invoices
 │     └── Invoice Items
 ├── Payments
 ├── Receipts
 ├── Recalls
 └── Documents / Images
```

The later database design must preserve this connected model.

---

## 9. UI/UX MVP Scope

The frontend must include:

- responsive sidebar;
- responsive header;
- role-aware navigation;
- desktop-first clinical layouts;
- tablet-aware clinical layouts;
- responsive patient lists;
- responsive forms;
- modal patterns;
- reusable tables;
- consistent filters;
- pagination;
- search;
- status badges;
- toasts;
- confirmations;
- empty states;
- loading states;
- print layouts;
- dental chart interaction;
- calendar/appointment layout;
- role dashboards.

---

## 10. Responsive Design Boundary

The MVP should be:

> **Desktop-optimized and tablet-friendly, with mobile support for common administrative tasks.**

Full clinical workflows such as detailed dental charting may remain optimized for larger screens.

The system should not sacrifice usability on desktop merely to force every clinical interface into a phone-sized layout.

---

## 11. Frontend Data Strategy

During UI/UX development:

- sample data must be centralized where practical;
- data must remain consistent across modules;
- patient names must not randomly change between pages;
- appointments must reference existing patients;
- invoices must reference valid patients;
- procedures must map to valid treatment items where applicable;
- payment balances must reconcile;
- dashboard KPIs must reflect seeded records;
- dental chart history must relate to the same patient.

`10_SAMPLE_DATA_SPECIFICATION.md` will define the sample dataset.

---

## 12. Localization Scope

### Required

- UGX currency;
- Uganda-relevant phone formats;
- flexible local address fields;
- local payment methods;
- print-friendly workflows;
- clinic-centered terminology.

### Deferred

- Luganda translation;
- Swahili translation;
- multilingual UI;
- automatic exchange rates.

---

## 13. Search Scope

The MVP should support practical search for:

- patients;
- appointments;
- invoices;
- receipts;
- users;
- procedures.

Patient search should support combinations such as:

- patient number;
- patient name;
- phone number.

Global application-wide search may be added if the frontend architecture supports it cleanly.

It is not mandatory for MVP freeze.

---

## 14. Notifications Scope

### Required

In-app UI feedback:

- success toasts;
- warning toasts;
- error toasts;
- confirmation dialogs;
- status indicators.

### Deferred

- SMS;
- email;
- WhatsApp;
- push notifications;
- mobile notifications.

---

## 15. Auditability Scope

The MVP architecture should be prepared to record important actions such as:

- user login;
- patient changes;
- appointment changes;
- clinical record completion;
- procedure recording;
- invoice creation;
- payment recording;
- receipt creation;
- user activation/deactivation.

The UI/UX MVP does not need a full advanced audit-log viewer unless later included.

However, database and backend design should anticipate audit tracking.

---

## 16. Deletion Rules

The MVP should prefer controlled status changes over destructive deletion for clinically or financially important records.

### Records that should normally not be hard-deleted after use

- completed clinical encounters;
- dental chart history;
- completed procedures;
- issued invoices;
- recorded payments;
- receipts.

### Records that may be deactivated or cancelled instead

- users;
- procedures/services;
- appointments;
- invoices where appropriate;
- recalls.

Exact rules will be defined later.

---

## 17. Data Privacy Scope

The MVP must account for:

- restricted access to clinical data;
- restricted access to finance data;
- user-specific permissions;
- session protection;
- secure password handling;
- secure patient documents;
- patient-data confidentiality;
- controlled access to medical history.

Detailed production compliance implementation is outside the UI/UX scope but must be reflected in architecture and backend planning.

---

## 18. Printing Scope

The MVP must support print-friendly layouts for:

- receipt;
- invoice;
- treatment plan;
- prescription;
- selected reports.

Optional if useful:

- patient summary.

The UI must prevent navigation/sidebar/header content from polluting print output.

---

## 19. MVP Business Rules

The following rules are considered part of the MVP boundary.

### BR-01
Every appointment must reference a valid patient.

### BR-02
A dentist must be associated with a clinical encounter.

### BR-03
Dental chart entries must belong to a patient and, where appropriate, an encounter.

### BR-04
Treatment plans must belong to a patient.

### BR-05
Treatment-plan items may be accepted or declined individually.

### BR-06
Completed procedures should be traceable to the practitioner who recorded/performed them.

### BR-07
Invoices must belong to a patient.

### BR-08
Payments must be traceable to the user who recorded them.

### BR-09
Partial payment must leave a visible remaining balance.

### BR-10
Receipt values must agree with the related payment.

### BR-11
Sensitive clinical actions must not be available to Receptionist/Cashier roles unless explicitly permitted.

### BR-12
Users marked inactive must not be treated as active operational users.

### BR-13
Historical clinical and financial records must not silently disappear.

### BR-14
Completed appointments should retain their historical relationship to the patient and provider.

### BR-15
A completed treatment-plan item should remain visible in treatment history.

---

## 20. Explicit MVP Exclusions

The following are outside Version 1 unless the scope is formally changed:

- AI diagnosis;
- AI treatment recommendation;
- AI X-ray interpretation;
- DICOM server;
- PACS;
- direct X-ray-device integration;
- direct imaging-device control;
- advanced periodontal charting;
- advanced orthodontic modelling;
- 3D tooth visualization;
- tele-dentistry;
- patient mobile app;
- native mobile app;
- patient self-service portal;
- online booking portal;
- SMS gateway integration;
- WhatsApp integration;
- email campaign automation;
- online payment gateway;
- direct Mobile Money API;
- insurance claims;
- insurance pre-authorization;
- insurance price-book management;
- pharmacy inventory;
- dental-material inventory;
- supplier management;
- procurement;
- lab management;
- payroll;
- HR management;
- accounting software;
- advanced tax integration;
- enterprise BI;
- AI analytics;
- multi-tenant subscription billing;
- SaaS onboarding;
- platform administration;
- franchise management;
- branch switching;
- multi-country localization.

---

## 21. Post-MVP Candidate Features

The following features are suitable for later phases after successful pilot validation.

### Phase 2 Candidates

- SMS reminders;
- WhatsApp reminders;
- patient portal;
- online appointment requests;
- consent forms;
- digital signatures;
- enhanced paediatric charting;
- periodontal charting;
- dental-material inventory;
- lab-case tracking;
- insurance support.

### Phase 3 Candidates

- multi-branch;
- SaaS tenancy;
- platform administrator;
- subscriptions;
- patient online booking;
- payment gateway;
- Mobile Money integration;
- imaging-device integration;
- advanced reporting.

### Long-Term Candidates

- PACS;
- AI-assisted imaging;
- orthodontic workflows;
- multi-country deployment;
- enterprise analytics;
- third-party integrations.

---

## 22. MVP Acceptance Criteria

The MVP should not be considered complete unless the following end-to-end workflow can be demonstrated successfully.

### Scenario A — New Patient Visit

1. Receptionist registers a new patient.
2. Receptionist books an appointment.
3. Appointment appears in calendar.
4. Appointment is confirmed.
5. Patient checks in.
6. Patient appears in waiting queue.
7. Dentist opens patient record.
8. Dentist reviews medical history.
9. Dentist starts clinical encounter.
10. Dentist records findings.
11. Dentist updates dental chart.
12. Dentist records diagnosis/notes.
13. Dentist creates treatment plan.
14. Patient accepts at least one treatment item.
15. Dentist records a procedure as completed.
16. Procedure becomes billable.
17. Invoice is generated.
18. Cashier records partial or full payment.
19. Receipt is generated.
20. Patient balance is correct.
21. Follow-up/recall is created.
22. Patient history displays the completed visit.

---

### Scenario B — Returning Patient

1. Patient is found by name, number, or phone.
2. Existing chart/history is visible.
3. A new appointment is booked.
4. Previous treatment plan remains intact.
5. New encounter is created without overwriting history.
6. Additional chart changes are recorded.
7. New procedure and billing records are added.
8. Prior records remain traceable.

---

### Scenario C — Role Restrictions

1. Dentist can access clinical functions.
2. Receptionist can manage bookings/check-in.
3. Cashier can manage finance.
4. Administrator can manage configuration and users.
5. Restricted modules are hidden or denied appropriately.
6. Direct unauthorized navigation does not expose restricted functions.

---

### Scenario D — Finance Integrity

1. Invoice total equals its items minus valid discounts.
2. Partial payment updates outstanding balance.
3. Full payment changes invoice to paid.
4. Receipt equals recorded payment.
5. Dashboard finance totals reconcile with transactions.

---

### Scenario E — Recall

1. Follow-up is created.
2. Recall appears in upcoming/due list.
3. Patient can be marked contacted.
4. Recall can lead to a booked appointment.
5. Recall can be marked completed.

---

## 23. UI/UX Freeze Conditions

The frontend may be considered ready for freeze when:

- all MVP modules exist;
- all role sidebars are correct;
- role dashboards are consistent;
- patient workflow is connected;
- appointment workflow is connected;
- waiting queue works visually;
- dental chart behavior is stable;
- treatment planning is stable;
- billing and payment totals reconcile;
- receipts print correctly;
- prescription print layout is usable;
- reports show consistent seeded data;
- responsive behavior passes agreed breakpoints;
- print layouts pass manual review;
- no major placeholder pages remain;
- no contradictory sample data remains;
- role-access behavior is visually correct;
- global UI components are consistent.

---

## 24. Backend MVP Completion Conditions

The Laravel backend MVP should not be considered complete until:

- authentication works;
- authorization works;
- all core entities persist;
- validation works;
- core business rules are enforced server-side;
- clinical history remains traceable;
- finance calculations reconcile;
- role permissions are enforced server-side;
- file uploads are secured;
- print outputs use real data;
- sample/demo data can be seeded;
- major flows pass integration testing.

---

## 25. Scope Change Control

A proposed feature should be rejected from MVP unless at least one of the following is true:

1. It is necessary for the complete patient journey.
2. It is required for privacy/security.
3. It is required to preserve financial integrity.
4. It is required to preserve clinical record integrity.
5. It is necessary for one of the four MVP roles to perform a core responsibility.
6. It was explicitly approved through a documented scope change.

Features should not be added merely because:

- a competitor has them;
- they look impressive;
- AI can generate them quickly;
- they may be useful someday;
- they appear in a generic clinic template.

---

## 26. MVP Scope Summary

The first version will focus on:

```text
AUTHENTICATION
        ↓
ROLE-BASED DASHBOARDS
        ↓
PATIENTS
        ↓
APPOINTMENTS
        ↓
WAITING ROOM
        ↓
CLINICAL ENCOUNTERS
        ↓
DENTAL CHART
        ↓
TREATMENT PLANS
        ↓
PROCEDURES
        ↓
PRESCRIPTIONS / DOCUMENTS
        ↓
INVOICING
        ↓
PAYMENTS
        ↓
RECEIPTS
        ↓
RECALLS
        ↓
REPORTS
```

Everything outside this journey should remain secondary until the core workflow is validated.

---

# MVP Scope Decision

**Recommended Scope Status:** READY FOR REVIEW

**Scope Philosophy:** Small enough to finish, complete enough to pilot.

**Next Document:** `03_ROLE_PERMISSION_MATRIX.md`

The next document should define, action by action, which of the four MVP roles may view, create, edit, cancel, complete, print, export, configure, or administer each area of the system.
