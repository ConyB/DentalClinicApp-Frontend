# Dental Practice Management System
## 01 — Product Vision

**Document Version:** 1.0  
**Status:** Draft for Review / Foundation Document  
**Prepared For:** Dental Practice Management System MVP  
**Target Market:** Ugandan Dental Clinics  
**Primary Technology Direction:** PHP / Laravel  
**Prepared By:** BaCorn Tech  
**Date:** 20 September 2026

---

## 1. Document Purpose

This document defines the product vision for a modern web-based Dental Practice Management System designed initially for dental clinics in Uganda.

It establishes the high-level direction that all subsequent project documents, UI/UX decisions, database structures, workflows, permissions, and implementation phases must follow.

This document is intentionally strategic. It does not define detailed functional requirements, database tables, or page-by-page interface specifications. Those will be handled in later documents such as:

- `02_MVP_SCOPE.md`
- `03_ROLE_PERMISSION_MATRIX.md`
- `04_INFORMATION_ARCHITECTURE.md`
- `05_DENTAL_WORKFLOW_SPECIFICATION.md`
- `06_DENTAL_CHART_SPECIFICATION.md`
- `07_SRS.md`
- `08_DATABASE_DESIGN.md`
- `09_UI_UX_SYSTEM.md`
- `10_SAMPLE_DATA_SPECIFICATION.md`
- `11_FRONTEND_IMPLEMENTATION_PLAN.md`

The purpose of this file is to ensure that every later decision contributes to the same product.

---

## 2. Product Working Name

For the MVP and internal development phase, the system may be referred to as:

> **Dental Practice Management System**

A commercial product name may be introduced later after validation with real dental-clinic users.

The internal naming should remain neutral during development so that branding decisions do not interfere with product design.

---

## 3. Product Vision Statement

> To build a modern, secure, easy-to-use web-based dental practice management platform that helps Ugandan dental clinics manage patients, appointments, clinical records, dental charting, treatment plans, billing, payments, recalls, and operational reporting from one connected system.

The product should replace fragmented workflows involving notebooks, paper patient cards, spreadsheets, standalone appointment books, manual receipts, and disconnected clinical records with a unified digital workflow.

The product must be simple enough for a small dental clinic to adopt, while being architecturally strong enough to later support larger practices, multiple branches, multiple dental professionals, and commercial SaaS deployment.

---

## 4. Product Inspiration

The MVP takes workflow inspiration from established dental practice management products, especially:

- Open Dental
  - https://opendental.com/site/trial.html
- Dental4Web by Centaur Software
  - https://centaursoftware.com.au/solutions/dental-practice-management/dental4web/

These platforms are reference points for understanding mature dental workflows.

The project must **not** attempt to clone their entire feature sets or user interfaces.

Instead, the system should:

- learn from proven dental workflows;
- simplify them for an MVP;
- localize the experience for Ugandan clinics;
- prioritize usability and clarity;
- avoid unnecessary enterprise complexity;
- preserve room for future growth.

---

## 5. Core Product Problem

Many small and medium dental clinics may rely on a mixture of:

- paper-based patient records;
- notebooks or diaries for appointments;
- handwritten treatment notes;
- manual dental charts;
- spreadsheets for payments;
- physical receipts;
- informal reminders;
- disconnected X-ray or image storage;
- manual follow-up tracking.

This creates several operational problems:

1. Patient information can become fragmented.
2. Appointment management becomes difficult as patient volume grows.
3. Treatment history may not be easy to retrieve quickly.
4. Dental-chart changes may be difficult to track over time.
5. Outstanding balances may be overlooked.
6. Follow-up appointments and recalls may be missed.
7. Management may lack reliable operational and financial reports.
8. Different staff members may access information without clearly defined permission boundaries.
9. Multi-branch expansion becomes difficult when each branch uses a different process.
10. Data backup, auditability, and continuity may become weak.

The proposed system should address these problems through one connected digital workflow.

---

## 6. Target Market

### 6.1 Initial Target

The first target is:

> **Small and medium private dental clinics in Uganda.**

Typical early customers may include clinics with:

- one or more dentists;
- one receptionist;
- a cashier or finance person;
- dental assistants;
- one physical location;
- moderate daily patient volume.

The MVP must work well for a single-clinic environment before attempting complex enterprise use cases.

---

### 6.2 Secondary Target

After successful validation, the system should be able to evolve toward:

- multi-dentist practices;
- multi-branch dental clinics;
- larger dental centres;
- specialist dental practices;
- dental chains;
- teaching dental clinics;
- franchise or group dental practices.

---

## 7. Primary Users

The initial product should serve four main operational roles.

### 7.1 Clinic Administrator

Responsible for:

- clinic configuration;
- staff and user management;
- service and price setup;
- operational oversight;
- financial visibility;
- reports;
- clinic settings;
- permission administration;
- branch management in future versions.

---

### 7.2 Dentist

Responsible for:

- reviewing scheduled patients;
- clinical examination;
- dental charting;
- diagnoses;
- clinical notes;
- treatment planning;
- performing and recording procedures;
- prescribing medication;
- follow-up recommendations;
- viewing patient treatment history.

---

### 7.3 Receptionist

Responsible for:

- patient registration;
- patient search;
- booking appointments;
- rescheduling;
- appointment confirmation;
- patient check-in;
- queue/waiting-room management;
- recall and follow-up coordination;
- basic patient demographic updates.

The receptionist should not automatically receive unrestricted access to sensitive clinical information.

---

### 7.4 Cashier

Responsible for:

- invoices;
- payments;
- outstanding balances;
- receipts;
- payment history;
- payment-method capture;
- authorized discounts where allowed.

---

## 8. Future User Roles

The architecture should allow later support for:

- Dental Assistant / Nurse
- Practice Manager
- Accountant
- Head Dentist / Clinical Lead
- Laboratory User
- Records Officer
- Patient Portal User
- Platform Administrator
- Pharmacy/Medication Integration User where applicable

These roles are not required for the initial UI/UX MVP unless later approved.

---

## 9. Core Product Value Proposition

The Dental Practice Management System should provide a single source of truth for:

> **Patient → Appointment → Check-In → Clinical Encounter → Dental Chart → Diagnosis → Treatment Plan → Procedure → Invoice → Payment → Receipt → Recall / Follow-Up**

This connected patient journey is the central value of the application.

The system must not become a collection of unrelated CRUD pages.

Every major module must contribute to this workflow.

---

## 10. MVP Product Pillars

The MVP should be built around the following product pillars.

### 10.1 Patient-Centred Record

A patient should have one consolidated profile that brings together:

- demographics;
- medical history;
- allergies;
- appointments;
- clinical encounters;
- dental chart;
- treatment plans;
- procedures;
- prescriptions;
- documents/images;
- invoices;
- payments;
- balances;
- recalls;
- visit history.

---

### 10.2 Appointment-Driven Workflow

Appointments should serve as an operational entry point into the patient's visit.

The appointment workflow should support statuses such as:

- Scheduled
- Confirmed
- Checked In
- Waiting
- In Treatment
- Completed
- Cancelled
- No Show
- Rescheduled

The interface should make the day's patient flow easy to understand at a glance.

---

### 10.3 Dental-Specific Clinical Workflow

The application must feel like dental software, not a generic clinic system.

Core dental features include:

- odontogram/dental chart;
- tooth-specific findings;
- treatment planning;
- procedure history;
- dental clinical notes;
- follow-up/recall workflows.

---

### 10.4 Treatment Planning

The treatment plan should connect:

- clinical findings;
- diagnosis;
- recommended treatment;
- tooth or area;
- estimated cost;
- patient acceptance;
- treatment status;
- completed procedures.

Treatment plans must support partial completion and multiple treatment items.

---

### 10.5 Transparent Billing

The finance workflow should clearly connect:

> **Performed/Planned Services → Invoice → Payment → Receipt → Balance**

The system should support:

- UGX as the default currency;
- full payments;
- partial payments;
- outstanding balances;
- discounts with permission;
- printable receipts;
- payment history;
- multiple payment methods.

---

### 10.6 Follow-Up and Recall Management

Dental care often requires recurring follow-up.

The product should support recalls such as:

- routine dental review;
- scaling review;
- post-extraction review;
- root-canal follow-up;
- denture review;
- orthodontic review;
- other clinic-defined follow-ups.

---

### 10.7 Role-Based Access

Users should only see and perform actions appropriate to their responsibilities.

Clinical data, financial data, user management, settings, and reports should be permission-aware.

---

### 10.8 Management Visibility

Clinic management should be able to answer questions such as:

- How many patients were seen today?
- Which dentist has the most appointments?
- How much revenue was collected?
- How much money remains outstanding?
- Which procedures are most common?
- How many appointments were cancelled or missed?
- Which patients are due for follow-up?
- How many new patients were registered?
- What is the daily or monthly clinic trend?

---

## 11. High-Level MVP Modules

The intended MVP should contain the following major modules.

### 11.1 Authentication
- Login
- Logout
- Session handling
- Role-based landing experience

### 11.2 Dashboard
- Role-specific KPIs
- Today's activity
- Appointments
- Revenue summary where permitted
- Recall alerts
- Recent activity

### 11.3 Patients
- Registration
- Search
- Profile
- Medical history
- Visit history
- Contacts
- Guardian information where necessary

### 11.4 Appointments
- Calendar
- Appointment creation
- Rescheduling
- Cancellation
- Confirmation
- Status tracking
- Dentist assignment

### 11.5 Waiting Room / Patient Queue
- Check-in
- Waiting status
- In-treatment status
- Visit progression
- Checkout/completion

### 11.6 Dental Chart / Odontogram
- Tooth selection
- Dental condition recording
- Tooth history
- Procedure indicators
- Permanent dentition
- Foundation for future primary dentition support

### 11.7 Clinical Encounters
- Chief complaint
- Examination
- Findings
- Diagnosis
- Clinical notes
- Procedures
- Follow-up notes

### 11.8 Treatment Plans
- Treatment items
- Associated tooth/area
- Cost
- Acceptance status
- Progress status
- Completion status

### 11.9 Procedures / Services
- Service catalogue
- Categories
- Prices
- Duration
- Active/inactive state

### 11.10 Prescriptions
- Medication
- Strength
- Dose
- Frequency
- Duration
- Instructions
- Printable prescription layout

### 11.11 Imaging & Documents
- Patient photos
- X-ray attachments
- Referral letters
- Consent documents
- Supporting files

### 11.12 Billing & Payments
- Invoices
- Payments
- Partial payments
- Balances
- Receipts
- Payment methods
- Discounts where authorized

### 11.13 Recalls & Follow-Ups
- Due date
- Recall type
- Contact status
- Scheduling status
- Completion status

### 11.14 Reports
- Revenue
- Collections
- Patient visits
- Appointments
- Procedures
- Outstanding balances
- Dentist workload
- Recalls

### 11.15 Users & Roles
- Users
- Roles
- Permissions
- Activation/deactivation
- Password reset support in later backend phases

### 11.16 Clinic Settings
- Clinic profile
- Logo
- Contacts
- Working hours
- Procedure catalogue
- Receipt settings
- Appointment settings
- Payment methods
- Numbering/reference formats

---

## 12. Important Uganda-Specific Product Considerations

The system should feel locally appropriate rather than imported.

### 12.1 Currency

The default currency should be:

> **UGX — Uganda Shillings**

The interface should use clear formatting such as:

`UGX 150,000`

rather than assuming USD.

---

### 12.2 Payment Methods

The MVP should support payment methods relevant to the local environment, including:

- Cash
- Mobile Money
- Bank
- Card
- Other

Specific payment-gateway integrations can come later.

---

### 12.3 Patient Contacts

Phone number should be treated as an important patient identifier/contact field.

The design should work well for users who may not provide an email address.

---

### 12.4 Address Structure

Patient address capture should remain flexible.

Possible fields may include:

- District
- Town / City
- Area / Village
- Street / Landmark
- Address notes

The MVP should avoid forcing address formats designed for another country.

---

### 12.5 Internet Reliability

The system should be designed with practical performance in mind.

The UI should avoid unnecessary page weight and excessive dependency on large assets.

Future implementation may consider resilience strategies where appropriate, but the initial system remains a web application.

---

### 12.6 Printing

Printed documents remain important in many clinics.

The system should provide professional print layouts for items such as:

- receipts;
- invoices;
- treatment plans;
- prescriptions;
- patient summaries where authorized;
- reports.

---

## 13. Privacy, Security, and Clinical Data Principles

Dental records are sensitive.

The product must therefore treat privacy and security as architectural concerns, not optional later additions.

The system should be designed to support:

- authentication;
- authorization;
- least-privilege access;
- audit logging;
- protected clinical records;
- controlled financial access;
- user accountability;
- secure attachments;
- record timestamps;
- activity traceability;
- backup strategy;
- safe session handling;
- secure password handling;
- privacy-conscious user interfaces.

The application should also be designed with Uganda's data-protection obligations in mind.

Detailed legal/compliance interpretation should be handled separately when preparing the production deployment and operational policies.

---

## 14. Clinical Safety Principle

The application is a **practice management and clinical documentation system**.

It should help dental professionals record and manage their work.

It should **not** independently:

- diagnose disease;
- prescribe medication;
- recommend treatment without practitioner input;
- replace professional clinical judgment;
- automatically interpret X-rays for MVP;
- present AI-generated clinical decisions as medical advice.

Clinical decisions must remain under the responsibility of qualified practitioners.

---

## 15. Design Philosophy

The product should feel:

- modern;
- premium;
- trustworthy;
- calm;
- clinical;
- efficient;
- professional;
- easy to learn;
- fast to operate.

The interface should avoid:

- excessive visual clutter;
- unnecessary animations;
- overly technical language;
- long multi-step forms where avoidable;
- desktop-only layouts;
- confusing nested navigation;
- generic admin-template appearance.

The UI should be designed around real dental tasks rather than around database tables.

---

## 16. UX Principles

### 16.1 Reduce Clicks for Common Tasks

Frequently used actions should be easy to reach.

Examples:

- register patient;
- find patient;
- create appointment;
- check in patient;
- open dental chart;
- create treatment plan;
- record payment;
- print receipt.

---

### 16.2 Keep Patient Context Visible

When the user is working inside a patient record, important context should remain easy to identify.

Examples:

- patient name;
- patient number;
- age;
- phone;
- allergies;
- outstanding balance where permitted;
- next appointment.

---

### 16.3 Role-Aware Interfaces

The Dentist should not see the same dashboard emphasis as the Cashier.

The Receptionist should not see the same navigation as the Clinic Administrator.

Role separation must be visible in the UI.

---

### 16.4 Safe Clinical Actions

Potentially important clinical actions should use confirmation, clear status feedback, and traceable history where appropriate.

---

### 16.5 Consistency

Components such as:

- modals;
- tables;
- filters;
- pagination;
- forms;
- status badges;
- toasts;
- empty states;
- buttons;
- confirmation dialogs;
- print layouts

should behave consistently across modules.

---

## 17. Technical Direction

The intended backend framework is:

> **PHP / Laravel**

The frontend MVP may initially be developed as a polished HTML/CSS/JavaScript template before deep Laravel integration.

The documentation-first workflow should ensure that the frontend structure maps cleanly to future Blade templates, controllers, services, policies, validation, database models, and Laravel routes.

The project should avoid unnecessary framework coupling in the early UI design.

---

## 18. Architectural Direction

Although the first pilot may operate as a single clinic, the internal architecture should anticipate:

```text
BaCorn Tech Platform
        |
        +-- Dental Clinic / Organisation
                |
                +-- Branch
                |
                +-- Users
                |
                +-- Patients
                |
                +-- Appointments
                |
                +-- Clinical Records
                |
                +-- Dental Charts
                |
                +-- Treatment Plans
                |
                +-- Billing
```

The first deployment may effectively operate as:

```text
Dental Clinic
└── Main Branch
```

However, data structures and frontend concepts should avoid assumptions that permanently restrict the product to one location.

---

## 19. Long-Term SaaS Direction

If the MVP is validated successfully, the product may evolve into a reusable SaaS platform.

A future commercial structure may look like:

```text
Platform Administrator — BaCorn Tech
        |
        +-- Dental Organisation A
        |       +-- Branch 1
        |       +-- Branch 2
        |
        +-- Dental Organisation B
        |       +-- Main Branch
        |
        +-- Dental Organisation C
                +-- Branch 1
```

Each organisation may eventually have:

- subscription plan;
- organisation settings;
- one or more branches;
- its own users;
- its own patients;
- isolated clinical data;
- isolated financial data;
- usage limits;
- subscription lifecycle.

The MVP does **not** need to implement this entire SaaS model.

It only needs to avoid architectural decisions that would make this evolution unnecessarily difficult.

---

## 20. Multi-Branch Direction

Future multi-branch functionality may support:

- branch-specific appointments;
- branch-specific users;
- dentist assignment by branch;
- branch-level reporting;
- branch-level revenue;
- branch-level patient visits;
- organisation-wide patient visibility where allowed;
- inter-branch patient history;
- branch-specific working hours;
- branch-specific receipt details.

The first MVP may use one seeded branch.

---

## 21. Data Ownership Principle

In a future SaaS model:

> Clinical and operational data belongs to the subscribing dental organisation, not to the software platform user account personally.

This distinction is important for:

- security;
- permissions;
- branch design;
- tenancy;
- data export;
- subscription handling;
- future offboarding.

---

## 22. MVP Success Criteria

The MVP should be considered successful if a dental clinic can demonstrate the following complete workflow without relying on disconnected external records:

1. Register a patient.
2. Book an appointment.
3. Confirm or reschedule the appointment.
4. Check the patient in.
5. Place the patient in the waiting queue.
6. Open the clinical encounter.
7. Review relevant medical history.
8. Record dental findings.
9. Update the dental chart.
10. Record diagnosis/clinical notes.
11. Build a treatment plan.
12. Record an accepted or completed procedure.
13. Generate an invoice.
14. Capture a payment.
15. Print a receipt.
16. Schedule a recall or follow-up.
17. View the patient's history later.
18. Produce relevant operational/financial reports.
19. Ensure each role only accesses appropriate functions.

If this journey works convincingly, the MVP has achieved its primary objective.

---

## 23. MVP Non-Goals

The following items should not be allowed to inflate the first MVP unless explicitly approved later:

- AI X-ray diagnosis;
- AI treatment recommendations;
- full PACS/DICOM server infrastructure;
- direct integration with every X-ray device;
- full medical-insurance electronic claims;
- advanced insurance pre-authorisation;
- patient mobile applications;
- native Android/iOS applications;
- advanced stock/material inventory;
- complete pharmacy inventory;
- laboratory management;
- full accounting software;
- payroll;
- human-resource management;
- complex procurement;
- automated WhatsApp integration;
- bulk SMS gateway integration;
- online payment gateway integration;
- online deposits;
- advanced orthodontic modelling;
- 3D dental imaging;
- tele-dentistry;
- multi-tenant SaaS subscription billing;
- franchise management;
- enterprise business intelligence.

These may be future modules.

---

## 24. Future Expansion Opportunities

Potential future versions may introduce:

### Clinical
- paediatric dental charting;
- periodontal charting;
- orthodontic records;
- specialist modules;
- advanced treatment templates;
- clinical photo comparison;
- X-ray integration;
- lab-case tracking.

### Patient Experience
- patient portal;
- online booking;
- appointment reminders;
- online forms;
- consent signing;
- online treatment-plan acceptance;
- payment links;
- patient statements.

### Communication
- SMS reminders;
- WhatsApp notifications;
- email reminders;
- automated recall campaigns.

### Finance
- insurance support;
- credit accounts;
- corporate billing;
- finance exports;
- accounting integration;
- advanced financial analytics.

### Operations
- dental-material inventory;
- procurement;
- suppliers;
- equipment tracking;
- sterilisation workflows;
- maintenance logs.

### SaaS / Commercial
- platform administrator;
- tenant onboarding;
- subscriptions;
- plan limits;
- trial periods;
- grace periods;
- suspension;
- organisation billing;
- usage analytics.

---

## 25. Product Differentiation Strategy

The product should compete primarily through:

### 25.1 Simplicity

Avoid forcing small clinics to navigate enterprise-level complexity.

### 25.2 Local Relevance

Design around:

- UGX;
- local payment methods;
- flexible addresses;
- phone-first communication;
- practical print workflows.

### 25.3 Dental-Specific Workflow

The product must provide a real dental chart and treatment workflow rather than merely storing general medical notes.

### 25.4 Modern UI/UX

The application should look contemporary and polished compared with older desktop-style clinic systems.

### 25.5 Connected Workflow

Appointments, clinical work, treatment planning, billing, payments, and follow-up should work together.

### 25.6 Growth Path

The architecture should support a clinic growing from:

```text
1 Dentist
1 Receptionist
1 Branch
```

to:

```text
Multiple Dentists
Multiple Staff
Multiple Branches
```

without requiring a complete product rewrite.

---

## 26. Product Principles

All future project decisions should respect the following principles.

### Principle 1 — Dental First

If a feature does not improve a dental-clinic workflow, its priority should be questioned.

### Principle 2 — MVP Discipline

Do not add features simply because competing products have them.

### Principle 3 — One Connected Patient Journey

Avoid disconnected modules.

### Principle 4 — Privacy by Design

Protect patient and clinical information from the beginning.

### Principle 5 — Role Separation

Access should follow responsibility.

### Principle 6 — Mobile-Aware, Desktop-Optimized

The application should be responsive, but primary clinical workflows may remain optimized for desktop/tablet where larger screens improve dental-chart usability.

### Principle 7 — Performance Matters

Routine clinic tasks should feel immediate.

### Principle 8 — Auditability

Important clinical and financial actions should be traceable.

### Principle 9 — Local First, Expandable Later

Solve the Ugandan clinic problem first without blocking later regional expansion.

### Principle 10 — Design Before Backend Complexity

Freeze workflows and UI/UX direction before deep Laravel backend integration.

---

## 27. Frontend-First Development Philosophy

The initial implementation should focus on a realistic, high-quality UI/UX template.

The purpose of the frontend stage is to validate:

- module structure;
- navigation;
- workflows;
- terminology;
- role separation;
- form layouts;
- dental-chart interactions;
- treatment planning;
- billing flow;
- responsive behavior;
- print layouts;
- visual consistency.

During this stage:

- business logic should be simulated only where necessary;
- seeded sample data should be consistent;
- pages should behave realistically;
- no unnecessary backend implementation should be introduced;
- the architecture should remain Laravel-friendly.

Once the frontend is validated and frozen, Laravel backend integration can begin against a stable interface and documented workflow.

---

## 28. Documentation-First Development Philosophy

No major module should be generated until its expected behavior is clear.

The documentation order should be:

```text
01_PRODUCT_VISION.md
        ↓
02_MVP_SCOPE.md
        ↓
03_ROLE_PERMISSION_MATRIX.md
        ↓
04_INFORMATION_ARCHITECTURE.md
        ↓
05_DENTAL_WORKFLOW_SPECIFICATION.md
        ↓
06_DENTAL_CHART_SPECIFICATION.md
        ↓
07_SRS.md
        ↓
08_DATABASE_DESIGN.md
        ↓
09_UI_UX_SYSTEM.md
        ↓
10_SAMPLE_DATA_SPECIFICATION.md
        ↓
11_FRONTEND_IMPLEMENTATION_PLAN.md
        ↓
AGENTS.md
        ↓
UI/UX DEVELOPMENT PHASES
```

Every later document must inherit decisions made in earlier approved documents.

Where documents conflict, the conflict must be identified and resolved rather than silently introducing a different architecture.

---

## 29. Product Vision Freeze Conditions

This Product Vision may be considered ready to freeze when the project stakeholders agree on:

- target market;
- primary users;
- core patient journey;
- MVP modules;
- dental-specific workflows;
- frontend-first strategy;
- Laravel direction;
- single-clinic MVP;
- future multi-branch readiness;
- future SaaS readiness;
- initial non-goals;
- security/privacy principles;
- local Uganda-focused design direction.

Once frozen, later documents may refine these areas but should not contradict them without an explicit documented change.

---

## 30. Vision Summary

The Dental Practice Management System should become a modern digital operating system for dental clinics.

Its MVP is not intended to replicate every feature found in mature international products.

Instead, the first release should excel at the workflows that matter most:

```text
PATIENT
   ↓
APPOINTMENT
   ↓
CHECK-IN / QUEUE
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
FOLLOW-UP / RECALL
```

If these processes are intuitive, connected, secure, and professionally presented, the system will provide a strong foundation for real-world pilot testing and future commercial expansion.

---

# Product Vision Decision

**Recommended Direction:** APPROVED FOR MVP PLANNING

**Next Document:** `02_MVP_SCOPE.md`

The next phase should define exactly what is included in the first MVP, what is deferred, the boundaries of each module, and the minimum functionality required before UI/UX implementation begins.
