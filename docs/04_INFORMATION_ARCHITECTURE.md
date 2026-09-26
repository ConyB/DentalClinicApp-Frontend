# Dental Practice Management System
## 04 — Information Architecture

**Document Version:** 1.0  
**Status:** Draft for Review / Navigation & Structure Foundation  
**Prepared For:** Dental Practice Management System MVP  
**Target Market:** Ugandan Dental Clinics  
**Primary Technology Direction:** PHP / Laravel  
**Prepared By:** BaCorn Tech  
**Date:** 20 September 2026

---

## 1. Document Purpose

This document defines the information architecture of the Dental Practice Management System MVP.

It translates the approved product vision, MVP scope, and role-permission model into a structured application map.

The purpose is to define:

- the complete page hierarchy;
- role-specific navigation;
- module grouping;
- page relationships;
- patient profile structure;
- clinical workflow entry points;
- finance workflow entry points;
- cross-module navigation;
- conceptual routes;
- utility pages;
- print destinations;
- responsive navigation behavior.

This document should be treated as the primary reference when generating the UI/UX shell, sidebar navigation, header, breadcrumbs, page layouts, and module-to-module links.

The application must feel like one connected dental workflow rather than a collection of isolated pages.

---

# 2. Information Architecture Principles

The system should follow these principles.

## 2.1 Patient-Centred Architecture

The patient is the primary business entity around which most workflows revolve.

From a patient record, authorized users should be able to reach:

- appointments;
- medical history;
- dental chart;
- clinical encounters;
- treatment plans;
- procedures;
- prescriptions;
- documents/images;
- invoices;
- payments;
- receipts;
- recalls.

---

## 2.2 Role-Based Navigation

Each role should see only modules relevant to its responsibilities.

The system should not use one oversized sidebar for every user.

---

## 2.3 Workflow-Oriented Grouping

Navigation groups should match real clinic tasks.

For example:

```text
Clinical
    ├── Encounters
    ├── Dental Chart
    ├── Treatment Plans
    └── Prescriptions
```

rather than grouping pages only because they map to similar database tables.

---

## 2.4 Clear Context

When users move between related pages, the system should preserve context.

Examples:

- Patient → New Appointment
- Appointment → Check In
- Queue → Open Encounter
- Encounter → Dental Chart
- Encounter → Treatment Plan
- Treatment Plan → Invoice
- Invoice → Payment
- Payment → Receipt
- Recall → Book Appointment

---

## 2.5 Shallow Navigation

Common tasks should normally be reachable within:

> **2 to 3 meaningful navigation actions**

Deep nested menus should be avoided.

---

## 2.6 Dedicated Detail Pages

Complex entities should use full detail pages rather than oversized modals.

Examples:

- Patient profile
- Clinical encounter
- Treatment plan
- Invoice details

Modals should be reserved for quick tasks such as:

- confirmations;
- quick appointment creation;
- quick status change;
- small forms;
- filters;
- lightweight edits.

---

# 3. Global Application Structure

The conceptual application structure is:

```text
APPLICATION
│
├── Authentication
│   ├── Login
│   └── Forgot/Reset Password (future/backend phase)
│
├── Role Workspace
│   ├── Dashboard
│   ├── Role Navigation
│   ├── Global Header
│   └── Utility Actions
│
├── Operational Modules
│   ├── Patients
│   ├── Appointments
│   ├── Waiting Room
│   ├── Clinical
│   ├── Billing
│   ├── Recalls
│   └── Reports
│
├── Administration
│   ├── Users & Roles
│   └── Clinic Settings
│
└── User
    └── Profile
```

---

# 4. Global Layout

Every authenticated page should use a consistent application shell.

## 4.1 Desktop Layout

```text
┌─────────────────────────────────────────────────────────────┐
│ Header / Topbar                                             │
├───────────────┬─────────────────────────────────────────────┤
│               │ Breadcrumb / Page Context                  │
│ Sidebar       ├─────────────────────────────────────────────┤
│ Navigation    │                                             │
│               │ Main Content Area                           │
│               │                                             │
│               │                                             │
├───────────────┴─────────────────────────────────────────────┤
│ Optional Footer                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4.2 Sidebar Responsibilities

The sidebar should provide:

- logo/clinic identity;
- role-appropriate module navigation;
- active module highlighting;
- grouped navigation;
- collapsible sections where useful;
- profile/settings access where permitted;
- logout access.

The sidebar should not contain links the current role cannot use.

---

## 4.3 Header Responsibilities

The top header should contain selected global actions such as:

- page title or contextual title;
- quick patient search;
- quick appointment action where permitted;
- notifications/alerts;
- user profile dropdown;
- current role;
- optional clinic identity;
- logout.

Future multi-branch versions may add a branch selector.

The MVP should not show branch switching unless explicitly introduced later.

---

# 5. Global Utility Components

The following utilities should behave consistently across the application.

## 5.1 Global Search

Optional but recommended if it can be implemented cleanly.

Search targets may include:

- patient name;
- patient number;
- phone number;
- appointment reference;
- invoice number;
- receipt number.

The MVP may begin with patient-focused global search.

---

## 5.2 Notifications / Alerts

Potential alert categories:

- upcoming recall;
- overdue recall;
- appointment requiring confirmation;
- patient waiting too long;
- unpaid/partial balance;
- system message.

These should remain operational alerts rather than a complex notification centre in MVP.

---

## 5.3 Breadcrumbs

Breadcrumbs should appear on deeper pages.

Examples:

```text
Patients / John Doe
Patients / John Doe / Dental Chart
Appointments / Appointment Details
Billing / Invoices / INV-000123
Reports / Financial / Daily Collections
```

---

# 6. Role-Specific Main Navigation

---

# 6.1 Clinic Administrator Navigation

Recommended sidebar:

```text
Dashboard

Patients

Appointments

Waiting Room

Clinical Overview
    ├── Encounters
    ├── Treatment Plans
    └── Procedures Performed

Billing
    ├── Invoices
    ├── Payments
    ├── Receipts
    └── Outstanding Balances

Recalls & Follow-Ups

Reports

Users & Roles

Clinic Settings

Profile
```

### Administrator Navigation Notes

The Clinic Administrator should have broad oversight but should not be encouraged to perform dentist-only clinical actions.

Clinical pages for the administrator may be:

- read-only;
- summary-based;
- oversight-focused.

---

# 6.2 Dentist Navigation

Recommended sidebar:

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

Recalls & Follow-Ups

Reports

Profile
```

### Dentist Navigation Notes

The Dentist sidebar should prioritize the current day's clinical workflow.

The most frequently used paths should be:

```text
Dashboard → Waiting Patients → Patient → Encounter
```

and:

```text
My Appointments → Patient → Encounter
```

---

# 6.3 Receptionist Navigation

Recommended sidebar:

```text
Dashboard

Patients

Appointments

Waiting Room

Recalls & Follow-Ups

Selected Reports

Profile
```

### Receptionist Navigation Notes

Receptionist navigation should emphasize:

- fast patient lookup;
- registration;
- appointment booking;
- check-in;
- queue visibility;
- recall follow-up.

Clinical submodules should not be exposed.

---

# 6.4 Cashier Navigation

Recommended sidebar:

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

### Cashier Navigation Notes

The Cashier interface should minimize clinical distractions.

The workflow should make it easy to move:

```text
Patient → Invoice → Payment → Receipt
```

---

# 7. Dashboard Information Architecture

Each role should have a dedicated dashboard route/page.

Conceptual routes:

```text
/dashboard
```

The actual dashboard content should be resolved by role.

Alternative implementation may use role-specific routes later.

---

## 7.1 Administrator Dashboard Sections

Suggested structure:

```text
Admin Dashboard
│
├── KPI Cards
│   ├── Today's Appointments
│   ├── Checked-In Patients
│   ├── Completed Visits
│   ├── New Patients
│   ├── Today's Revenue
│   └── Outstanding Balance
│
├── Today's Appointment Status
├── Revenue Trend
├── Dentist Workload
├── Upcoming Recalls
├── Recent Payments
└── Recent Activity
```

---

## 7.2 Dentist Dashboard Sections

```text
Dentist Dashboard
│
├── KPI Cards
│   ├── Today's Appointments
│   ├── Waiting Patients
│   ├── In Treatment
│   └── Follow-Ups Due
│
├── My Schedule
├── Waiting Patient Queue
├── Recent Encounters
├── Pending Treatment Items
└── Upcoming Recalls
```

---

## 7.3 Receptionist Dashboard Sections

```text
Receptionist Dashboard
│
├── KPI Cards
│   ├── Today's Appointments
│   ├── Confirmed
│   ├── Waiting
│   ├── No Shows
│   └── Pending Confirmations
│
├── Today's Schedule
├── Waiting Room
├── Upcoming Recalls
└── Quick Actions
```

Suggested quick actions:

- Register Patient
- Book Appointment
- Check In Patient
- Search Patient

---

## 7.4 Cashier Dashboard Sections

```text
Cashier Dashboard
│
├── KPI Cards
│   ├── Today's Invoices
│   ├── Today's Collections
│   ├── Unpaid Invoices
│   └── Partial Payments
│
├── Recent Invoices
├── Recent Payments
├── Outstanding Balances
└── Quick Patient Search
```

---

# 8. Patients Module Architecture

The Patients module is one of the most important structures in the system.

Conceptual main route:

```text
/patients
```

---

## 8.1 Patient List Page

Structure:

```text
Patients
│
├── Search
├── Filters
├── Add Patient
├── Patient Table
├── Status Filter
└── Pagination
```

Recommended list columns:

- Patient Number
- Patient Name
- Phone
- Age
- Sex
- Last Visit
- Next Appointment
- Status
- Actions

Actions:

- View
- Edit where permitted
- Book Appointment
- Open Patient Profile

---

## 8.2 New Patient Registration

Conceptual route:

```text
/patients/create
```

Recommended form sections:

```text
New Patient
│
├── Personal Information
├── Contact Information
├── Address
├── Emergency Contact
├── Guardian Information
├── Basic Medical Alerts
└── Registration Notes
```

The form should avoid overwhelming users.

Long medical history should be completed from the patient clinical profile rather than forcing reception to complete every clinical detail during registration.

---

# 9. Patient Profile Architecture

Conceptual route:

```text
/patients/{patient}
```

The Patient Profile should be a major hub.

Recommended layout:

```text
Patient Header
├── Photo / Initials
├── Patient Name
├── Patient Number
├── Age / Sex
├── Phone
├── Allergy Alert
├── Upcoming Appointment
└── Quick Actions

Patient Tabs
├── Overview
├── Medical History
├── Dental Chart
├── Visits / Encounters
├── Treatment Plans
├── Prescriptions
├── Documents & Images
├── Appointments
├── Billing
└── Recalls
```

Tabs should be role-aware.

For example:

- Receptionist does not see detailed clinical tabs.
- Cashier sees billing-focused content.
- Dentist sees full clinical tabs.

---

# 10. Patient Profile — Overview Tab

The overview should summarize important information without requiring multiple page loads.

Suggested sections:

```text
Overview
│
├── Demographics
├── Contact Information
├── Medical Alert Summary
├── Next Appointment
├── Recent Visit
├── Active Treatment Plan
├── Outstanding Balance
└── Upcoming Recall
```

Visible content must respect role permissions.

---

# 11. Patient Profile — Medical History Tab

Conceptual route:

```text
/patients/{patient}/medical-history
```

Suggested structure:

```text
Medical History
│
├── Allergies
├── Current Medications
├── Medical Conditions
├── Relevant Dental History
├── Other Notes
├── Review Status
└── Medical History Timeline
```

Only authorized clinical users should edit.

---

# 12. Patient Profile — Dental Chart Tab

Conceptual route:

```text
/patients/{patient}/dental-chart
```

Suggested page structure:

```text
Dental Chart
│
├── Patient Clinical Header
├── Chart Legend
├── Odontogram
├── Selected Tooth Panel
│   ├── Tooth Number
│   ├── Existing Conditions
│   ├── Add Finding
│   └── Planned/Completed Procedures
│
├── Chart History
└── Encounter Context
```

The detailed interaction model will be defined in:

`06_DENTAL_CHART_SPECIFICATION.md`

---

# 13. Patient Profile — Visits / Encounters Tab

Conceptual route:

```text
/patients/{patient}/encounters
```

Suggested structure:

```text
Encounters
│
├── New Encounter
├── Encounter Timeline
│   ├── Date
│   ├── Dentist
│   ├── Complaint
│   ├── Diagnosis Summary
│   └── Status
└── View Encounter
```

The Dentist should be able to open an encounter detail page.

---

# 14. Encounter Detail Architecture

Conceptual route:

```text
/encounters/{encounter}
```

Recommended layout:

```text
Encounter Header
├── Patient
├── Date / Time
├── Dentist
├── Appointment Reference
└── Encounter Status

Encounter Sections / Tabs
├── Chief Complaint
├── Medical Review
├── Examination & Findings
├── Dental Chart
├── Diagnosis
├── Treatment Plan
├── Procedures Performed
├── Prescription
├── Clinical Notes
└── Follow-Up
```

This page should minimize context switching for the Dentist.

---

# 15. Treatment Plans Architecture

Main route:

```text
/treatment-plans
```

Patient-specific route:

```text
/patients/{patient}/treatment-plans
```

Detail route:

```text
/treatment-plans/{plan}
```

---

## 15.1 Treatment Plan List

Suggested columns:

- Plan Number
- Patient
- Dentist
- Date
- Total Estimate
- Accepted Amount
- Status
- Actions

---

## 15.2 Treatment Plan Detail

Suggested structure:

```text
Treatment Plan
│
├── Patient Summary
├── Plan Metadata
├── Treatment Items
│   ├── Tooth / Area
│   ├── Procedure
│   ├── Qty
│   ├── Unit Price
│   ├── Total
│   ├── Acceptance Status
│   └── Treatment Status
├── Plan Totals
├── Notes
├── Print
└── Related Invoice / Billing Context
```

---

# 16. Appointments Module Architecture

Main route:

```text
/appointments
```

Recommended structure:

```text
Appointments
│
├── Calendar Toolbar
│   ├── Date Navigation
│   ├── Day / Week View
│   ├── Dentist Filter
│   ├── Status Filter
│   └── New Appointment
│
├── Calendar / Schedule
└── Appointment Detail / Drawer / Modal
```

---

## 16.1 Appointment Detail

Conceptual route:

```text
/appointments/{appointment}
```

Suggested content:

- patient;
- patient phone;
- appointment type;
- dentist;
- date/time;
- duration;
- reason;
- status;
- notes;
- check-in action;
- reschedule;
- cancel;
- mark no-show;
- open patient;
- open encounter where permitted.

---

# 17. Waiting Room Architecture

Main route:

```text
/waiting-room
```

Recommended columns/cards:

- Patient
- Appointment Time
- Arrival Time
- Waiting Duration
- Dentist
- Visit Reason
- Current Status
- Actions

Suggested sections:

```text
Waiting Room
│
├── Checked In
├── Waiting
├── In Treatment
└── Ready for Checkout
```

This could be represented by:

- grouped table;
- status columns;
- cards.

The UI/UX phase should select the clearest approach.

---

# 18. Clinical Module Architecture

For the Dentist, the Clinical navigation group may contain:

```text
Clinical
│
├── Encounters
├── Dental Chart
├── Treatment Plans
└── Prescriptions
```

---

## 18.1 Encounters List

Route:

```text
/encounters
```

Suggested filters:

- patient;
- dentist;
- date;
- encounter status.

---

## 18.2 Dental Chart Entry Points

Dental chart should usually be opened from:

- patient profile;
- encounter;
- waiting patient flow.

A global Dental Chart page should not become a disconnected generic list.

---

## 18.3 Prescriptions

Main route:

```text
/prescriptions
```

Patient route:

```text
/patients/{patient}/prescriptions
```

Detail route:

```text
/prescriptions/{prescription}
```

Suggested list columns:

- Prescription No.
- Patient
- Dentist
- Date
- Related Encounter
- Status
- Actions

---

# 19. Imaging & Documents Architecture

Patient-specific route:

```text
/patients/{patient}/documents
```

Suggested structure:

```text
Documents & Images
│
├── Upload
├── Type Filter
├── X-Rays
├── Clinical Photos
├── Referral Letters
├── Consent Forms
└── Other Documents
```

Metadata per item:

- title;
- type;
- date;
- uploaded by;
- related encounter;
- notes.

---

# 20. Billing Architecture

Billing should be grouped into:

```text
Billing
│
├── Invoices
├── Payments
├── Receipts
└── Outstanding Balances
```

---

# 21. Invoice Architecture

Main route:

```text
/invoices
```

Detail route:

```text
/invoices/{invoice}
```

Suggested list columns:

- Invoice Number
- Patient
- Date
- Total
- Paid
- Balance
- Status
- Actions

---

## 21.1 Invoice Detail

Suggested structure:

```text
Invoice
│
├── Clinic Header
├── Patient Information
├── Invoice Metadata
├── Invoice Items
├── Subtotal
├── Discount
├── Total
├── Paid
├── Balance
├── Payment History
└── Actions
    ├── Record Payment
    ├── Print Invoice
    └── Cancel where permitted
```

---

# 22. Payments Architecture

Main route:

```text
/payments
```

Suggested columns:

- Payment Reference
- Patient
- Invoice
- Date
- Amount
- Method
- Received By
- Status
- Actions

Payment form should be reachable from:

- invoice detail;
- patient billing tab;
- cashier patient search.

---

# 23. Receipts Architecture

Main route:

```text
/receipts
```

Detail/print route:

```text
/receipts/{receipt}
```

Suggested list columns:

- Receipt Number
- Patient
- Date
- Amount
- Payment Method
- Invoice
- Received By
- Actions

Primary actions:

- View
- Print
- Reprint where permitted

---

# 24. Outstanding Balances Architecture

Main route:

```text
/outstanding-balances
```

Suggested list columns:

- Patient
- Phone
- Total Invoiced
- Total Paid
- Outstanding
- Oldest Unpaid Date
- Actions

Actions:

- Open Patient
- View Invoice
- Record Payment

---

# 25. Recalls & Follow-Ups Architecture

Main route:

```text
/recalls
```

Suggested sections:

```text
Recalls
│
├── Upcoming
├── Due
├── Overdue
├── Contacted
├── Scheduled
└── Completed
```

Suggested list columns:

- Patient
- Recall Type
- Dentist
- Due Date
- Status
- Contact Outcome
- Next Action

Actions:

- Mark Contacted
- Book Appointment
- Reschedule Recall
- Mark Completed
- Cancel

---

# 26. Reports Architecture

Main route:

```text
/reports
```

Recommended report categories:

```text
Reports
│
├── Patients
│   ├── Patient Registration
│   └── Patient Visits
│
├── Appointments
│   ├── Appointment Summary
│   ├── Cancellations
│   └── No-Shows
│
├── Clinical
│   ├── Procedures Performed
│   ├── Dentist Activity
│   └── Treatment Plan Summary
│
├── Financial
│   ├── Daily Collections
│   ├── Revenue by Period
│   ├── Revenue by Dentist
│   ├── Revenue by Procedure
│   ├── Outstanding Balances
│   └── Payment Methods
│
└── Recalls
    ├── Upcoming
    ├── Overdue
    └── Completed
```

Reports shown must depend on role.

---

# 27. Users & Roles Architecture

Main route:

```text
/users
```

Suggested structure:

```text
Users & Roles
│
├── User List
├── Add User
├── User Detail/Edit
└── Role Reference
```

Recommended columns:

- Name
- Username/Email
- Phone
- Role
- Job Title
- Status
- Last Login where available
- Actions

---

# 28. Clinic Settings Architecture

Main route:

```text
/settings
```

Recommended sections:

```text
Clinic Settings
│
├── Clinic Profile
├── Working Hours
├── Appointment Settings
├── Procedure / Service Catalogue
├── Payment Methods
├── Numbering & Prefixes
├── Recall Types
└── Security / Administrative Settings
```

The MVP may implement these as:

- tabs;
- grouped cards;
- secondary settings sidebar.

---

# 29. Profile Architecture

Main route:

```text
/profile
```

Suggested sections:

```text
Profile
│
├── Personal Information
├── Contact Information
├── Role / Account Information
├── Profile Photo
└── Change Password
```

Users must not be able to change their own role.

---

# 30. Conceptual Route Map

The following route map is a frontend information-architecture reference.

It is not the final Laravel routes file.

```text
/login

/dashboard

/patients
/patients/create
/patients/{patient}
/patients/{patient}/edit
/patients/{patient}/medical-history
/patients/{patient}/dental-chart
/patients/{patient}/encounters
/patients/{patient}/treatment-plans
/patients/{patient}/prescriptions
/patients/{patient}/documents
/patients/{patient}/appointments
/patients/{patient}/billing
/patients/{patient}/recalls

/appointments
/appointments/{appointment}

/waiting-room

/encounters
/encounters/{encounter}

/treatment-plans
/treatment-plans/{plan}

/prescriptions
/prescriptions/{prescription}

/invoices
/invoices/{invoice}

/payments
/receipts
/receipts/{receipt}

/outstanding-balances

/recalls

/reports
/reports/patients/*
/reports/appointments/*
/reports/clinical/*
/reports/financial/*
/reports/recalls/*

/users
/users/create
/users/{user}/edit

/settings

/profile
```

---

# 31. Key Cross-Module Navigation Paths

The system should deliberately support the following transitions.

## 31.1 Reception Workflow

```text
Dashboard
   ↓
Patient Search
   ↓
Patient Profile
   ↓
Book Appointment
   ↓
Appointments
   ↓
Check In
   ↓
Waiting Room
```

---

## 31.2 Dentist Workflow

```text
Dashboard / Waiting Patients
   ↓
Patient
   ↓
Encounter
   ↓
Medical History Review
   ↓
Dental Chart
   ↓
Diagnosis
   ↓
Treatment Plan
   ↓
Procedure
   ↓
Send to Checkout
```

---

## 31.3 Cashier Workflow

```text
Dashboard
   ↓
Patient Search / Checkout Queue
   ↓
Invoice
   ↓
Payment
   ↓
Receipt
```

---

## 31.4 Follow-Up Workflow

```text
Encounter / Treatment
   ↓
Create Recall
   ↓
Recall List
   ↓
Contact Patient
   ↓
Book Appointment
```

---

# 32. Quick Actions

Quick actions should reduce unnecessary navigation.

Possible header/dashboard quick actions by role:

## Administrator

- Add Patient
- Book Appointment
- Add User
- View Reports

## Dentist

- Open Waiting Patient
- New Encounter
- Open Dental Chart
- New Treatment Plan

## Receptionist

- Register Patient
- Book Appointment
- Check In Patient
- Search Patient

## Cashier

- Search Patient
- Open Invoice
- Record Payment
- Reprint Receipt

---

# 33. Table Design Consistency

Most list pages should follow a shared pattern:

```text
Page Header
│
├── Title
├── Primary Action
├── Search
├── Filters
├── Table
├── Empty State
└── Pagination
```

Common table actions should use consistent patterns.

Avoid using radically different table layouts across modules unless the workflow requires it.

---

# 34. Form Design Consistency

Large forms should be divided into logical sections.

Recommended pattern:

```text
Form Header
│
├── Context
├── Section 1
├── Section 2
├── Section 3
├── Validation Feedback
└── Actions
    ├── Save
    └── Cancel
```

Clinical forms may use:

- tabs;
- step sections;
- accordions only where appropriate.

Do not hide critical clinical information inside excessive accordions.

---

# 35. Detail Page Pattern

Complex detail pages should use a consistent shell:

```text
Entity Header
├── Primary Identity
├── Key Status
├── Quick Actions
└── Contextual Metadata

Secondary Navigation / Tabs

Main Detail Content
```

Examples:

- Patient
- Encounter
- Treatment Plan
- Invoice

---

# 36. Status Badge Strategy

Status should be visually consistent throughout the system.

Examples:

## Appointment
- Scheduled
- Confirmed
- Checked In
- Waiting
- In Treatment
- Completed
- Cancelled
- No Show

## Treatment Plan
- Draft
- Proposed
- Accepted
- Partially Accepted
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

Exact visual styling will be defined in `09_UI_UX_SYSTEM.md`.

---

# 37. Empty States

Every major list/page should define an intentional empty state.

Examples:

- No patients found
- No appointments today
- No recalls due
- No treatment plans yet
- No invoices found
- No documents uploaded

Useful empty states may include an appropriate action such as:

> Add Patient

or:

> Book Appointment

where the user's role permits it.

---

# 38. Error & Unauthorized Pages

The system should include designs for:

```text
403 — Access Denied
404 — Page Not Found
500 — Something Went Wrong
Session Expired / Login Required
```

These pages should use the same visual identity as the main system.

---

# 39. Print Architecture

Print destinations should be treated as dedicated layouts.

Required print views:

```text
/print/invoice/{invoice}
/print/receipt/{receipt}
/print/prescription/{prescription}
/print/treatment-plan/{plan}
```

Conceptual only.

Selected reports should also support print-friendly rendering.

Print layouts should exclude:

- sidebar;
- application header;
- navigation;
- interactive-only buttons.

---

# 40. Responsive Navigation

## Desktop

- expanded sidebar;
- full topbar;
- large clinical workspace.

## Tablet

- collapsible sidebar;
- preserved clinical workspace;
- usable dental chart.

## Mobile

Common operational actions should remain accessible.

Mobile support should prioritize:

- patient search;
- appointment lookup;
- basic registration;
- queue viewing;
- billing lookup;
- receipt access.

Detailed odontogram and complex treatment-plan editing may remain desktop/tablet optimized.

---

# 41. Information Hierarchy Priority

The visual hierarchy should generally follow:

```text
1. Patient / Page Identity
2. Current Status
3. Primary Action
4. Important Alerts
5. Main Working Content
6. Secondary Actions
7. Historical / Supporting Information
```

Clinical alerts such as allergies should receive appropriate prominence when relevant.

---

# 42. Patient Context Header

Clinical patient pages should reuse a compact patient context header.

Recommended fields:

- Patient Name
- Patient Number
- Age / Sex
- Phone
- Allergy Alert
- Current Appointment
- Assigned Dentist
- Outstanding Balance where role permits

This avoids forcing users to repeatedly leave the clinical workflow to check basic patient information.

---

# 43. Appointment Context Header

Appointment detail/clinical transition screens may show:

- Patient
- Appointment Time
- Dentist
- Appointment Type
- Status
- Reason
- Arrival Time if checked in

---

# 44. Billing Context Header

Billing pages should make the following immediately visible:

- Patient
- Invoice Number
- Invoice Total
- Paid
- Balance
- Status

---

# 45. Navigation State Rules

The application must preserve navigation state consistently.

Examples:

- active sidebar item remains highlighted;
- expanded sidebar group remains expanded;
- current patient remains clearly identified;
- filters should remain when returning from details where practical;
- pagination should not reset unnecessarily;
- role change is not available from ordinary navigation.

---

# 46. Information Architecture Anti-Patterns

The UI/UX phase must avoid:

- one huge sidebar containing every page;
- exposing clinical pages to Receptionist/Cashier;
- duplicate patient details spread inconsistently across modules;
- unrelated standalone Dental Chart page with no patient context;
- duplicate finance screens that represent the same record differently;
- excessively deep nested navigation;
- using modals for complex clinical encounters;
- requiring users to repeatedly search for the same patient within one workflow;
- sending users back to Dashboard after every action;
- hidden critical actions;
- inconsistent terminology.

---

# 47. Terminology Standards

Use consistent terms throughout the application.

Preferred terms:

- Patient
- Appointment
- Check-In
- Waiting Room
- Clinical Encounter
- Dental Chart
- Treatment Plan
- Procedure
- Prescription
- Invoice
- Payment
- Receipt
- Recall / Follow-Up
- Dentist
- Clinic Administrator
- Receptionist
- Cashier

Avoid switching between equivalent labels unnecessarily.

For example:

Do not alternate between:

- Client / Patient
- Bill / Invoice
- Doctor / Dentist
- Visit / Encounter

unless the distinction is intentional.

---

# 48. Frontend File Structure Direction

The exact frontend implementation will be defined later.

However, the information architecture suggests reusable page groups such as:

```text
assets/
    css/
    js/
    images/

pages/
    auth/
    dashboard/
    patients/
    appointments/
    waiting-room/
    clinical/
    billing/
    recalls/
    reports/
    admin/
    profile/
```

If the implementation uses a JavaScript-driven shell similar to the Pharmacy Management System, the actual number of HTML files may remain small while module views are rendered through reusable JavaScript structures.

The UI architecture should remain easy to convert into Laravel Blade templates later.

---

# 49. Laravel Blade Mapping Direction

A future Blade structure may conceptually resemble:

```text
resources/views/
│
├── layouts/
├── components/
├── auth/
├── dashboard/
├── patients/
├── appointments/
├── waiting-room/
├── encounters/
├── treatment-plans/
├── prescriptions/
├── billing/
├── recalls/
├── reports/
├── users/
├── settings/
└── profile/
```

This is directional only.

The backend integration plan will determine the final structure.

---

# 50. Information Architecture Validation Scenarios

The architecture should support the following without confusion.

## Scenario A — New Patient

Receptionist can:

```text
Dashboard
→ Add Patient
→ Patient Profile
→ Book Appointment
→ Appointment Calendar
```

---

## Scenario B — Patient Arrives

Receptionist can:

```text
Appointments
→ Appointment Detail
→ Check In
→ Waiting Room
```

---

## Scenario C — Dentist Treats Patient

Dentist can:

```text
Waiting Patients
→ Patient
→ Encounter
→ Dental Chart
→ Treatment Plan
→ Procedure
→ Complete Encounter
```

without losing patient context.

---

## Scenario D — Checkout

Cashier can:

```text
Patient / Checkout Context
→ Invoice
→ Payment
→ Receipt
```

without access to restricted clinical detail.

---

## Scenario E — Recall

Receptionist can:

```text
Recalls
→ Due Recall
→ Patient
→ Book Appointment
```

---

# 51. Information Architecture Freeze Conditions

This document may be considered ready to freeze when:

- all four role sidebars are accepted;
- patient profile tabs are accepted;
- clinical navigation is clear;
- billing navigation is clear;
- appointment flow is clear;
- waiting-room flow is clear;
- report categories are accepted;
- settings hierarchy is accepted;
- cross-module paths are coherent;
- no major MVP module lacks a navigation entry point;
- no role sees inappropriate modules;
- conceptual routes are internally consistent.

---

# 52. Architecture Summary

The application should be organized around four major operational journeys:

```text
RECEPTION
Patients → Appointments → Check-In → Waiting Room

CLINICAL
Patient → Encounter → Dental Chart → Treatment Plan → Procedure

FINANCE
Patient → Invoice → Payment → Receipt

FOLLOW-UP
Encounter / Treatment → Recall → Contact → Appointment
```

These journeys must share a single patient record and consistent data relationships.

The patient profile should act as the central hub connecting the application.

---

# Information Architecture Decision

**Recommended Status:** READY FOR REVIEW

**Core Architecture Principle:** Patient-centred, role-aware, workflow-driven, shallow navigation.

**Next Document:** `05_DENTAL_WORKFLOW_SPECIFICATION.md`

The next document should define the detailed business workflow for each major clinical and operational process, including states, transitions, actors, validation rules, exception paths, and end-to-end lifecycle behavior.
