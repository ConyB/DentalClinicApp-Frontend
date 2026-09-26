# Dental Practice Management System
## 09 — UI/UX System Specification

**Document Version:** 1.0  
**Status:** Draft for Review / Frontend Design System Baseline  
**Prepared For:** Dental Practice Management System MVP  
**Target Market:** Ugandan Dental Clinics  
**Primary Technology Direction:** HTML / CSS / JavaScript frontend template → Laravel Blade integration  
**Prepared By:** BaCorn Tech  
**Date:** 21 September 2026

---

# 1. Document Purpose

This document defines the visual and interaction system for the Dental Practice Management System MVP.

It translates the approved product, architecture, workflow, dental-chart, and database decisions into a consistent UI/UX framework for frontend implementation.

This document governs:

- application shell;
- sidebar and header;
- typography;
- spacing;
- layout grids;
- colour roles;
- cards;
- buttons;
- forms;
- tables;
- filters;
- search;
- pagination;
- status badges;
- toasts;
- modals;
- drawers;
- empty states;
- loading states;
- dashboards;
- patient profile;
- appointment calendar;
- waiting room;
- clinical encounter workspace;
- odontogram;
- treatment planning;
- billing;
- reports;
- responsive behavior;
- print layouts;
- accessibility;
- frontend consistency.

The UI/UX phase must not improvise a new visual system independently for each module.

---

# 2. Design Vision

The Dental Practice Management System should feel:

- modern;
- premium;
- calm;
- clean;
- trustworthy;
- clinical;
- efficient;
- professional;
- friendly without being playful;
- easy to learn;
- fast to operate.

The system must avoid looking like:

- a generic admin template;
- an accounting-only application;
- an outdated desktop application ported to the web;
- an overly colourful consumer app;
- a hospital system crowded with unnecessary complexity.

The design should communicate:

> **Clinical confidence + operational clarity + modern simplicity**

---

# 3. UX Philosophy

The user interface should support real clinic work.

The design must prioritize:

1. Patient context
2. Current workflow state
3. Primary action
4. Alerts and safety information
5. Main working content
6. Secondary actions
7. Historical/supporting information

The system should not prioritize decorative visuals over task completion.

---

# 4. Core Design Principles

## 4.1 Patient Context First

Whenever a user is working on:

- an encounter;
- dental chart;
- treatment plan;
- prescription;
- invoice;
- receipt;
- recall;

the patient identity should remain obvious.

---

## 4.2 Role-Aware Experience

Different roles should not receive identical dashboards or sidebars.

The interface should visually reinforce role responsibility.

---

## 4.3 Shallow Navigation

Common actions should be reachable quickly.

Avoid:

- deeply nested menus;
- repeated patient searches;
- unnecessary intermediate pages.

---

## 4.4 Consistent Components

A button should behave the same across modules.

A table should use the same:

- search;
- filters;
- pagination;
- action patterns.

A modal should use the same:

- header;
- spacing;
- footer;
- dismissal behavior.

---

## 4.5 Clinical Safety

Important clinical information should be easy to notice.

Examples:

- allergies;
- medical alerts;
- active appointment;
- encounter status;
- selected tooth;
- planned vs completed treatment.

---

## 4.6 Financial Clarity

Invoice totals, paid amounts, and balances must be unambiguous.

---

# 5. Frontend Technology Direction

The initial frontend should use:

- semantic HTML5;
- CSS3;
- JavaScript;
- Bootstrap 5 where helpful;
- an approved icon library such as Lucide or Font Awesome;
- lightweight reusable components;
- SVG for odontogram/tooth graphics where practical.

Avoid introducing frontend frameworks solely for novelty.

The frontend must remain easy to convert to Laravel Blade templates.

---

# 6. Application Shell

All authenticated pages should use one consistent shell.

Recommended desktop structure:

```text
┌──────────────────────────────────────────────────────────────┐
│ Top Header                                                   │
├─────────────────┬────────────────────────────────────────────┤
│                 │ Page Header / Breadcrumb                  │
│ Sidebar         ├────────────────────────────────────────────┤
│                 │                                            │
│                 │ Main Content                               │
│                 │                                            │
│                 │                                            │
├─────────────────┴────────────────────────────────────────────┤
│ Optional Footer                                              │
└──────────────────────────────────────────────────────────────┘
```

---

# 7. Sidebar

## 7.1 Purpose

The sidebar is the primary module navigation.

It should:

- show clinic/product branding;
- display role-appropriate modules;
- highlight active module;
- group related modules;
- support collapse on smaller screens;
- remain visually calm.

---

## 7.2 Sidebar Width

Recommended desktop ranges:

```text
Expanded: 248–272px
Collapsed: 72–84px
```

The exact value may be refined visually.

---

## 7.3 Sidebar Spacing

Navigation items should have:

- sufficient vertical separation;
- rounded active state;
- consistent icon alignment;
- clear hierarchy.

Avoid tightly packed links.

---

## 7.4 Active Navigation Item

The active module should use:

- rounded container;
- stronger text weight;
- visible icon emphasis;
- clear foreground/background contrast.

The active state should not rely on a tiny left border alone.

---

## 7.5 Navigation Groups

Examples:

```text
Clinical
    Encounters
    Dental Chart
    Treatment Plans
    Prescriptions
```

Use collapsible groups only when they improve clarity.

The active child should keep the parent group expanded.

---

# 8. Header / Topbar

The header may contain:

- breadcrumb/page context;
- quick patient search;
- quick appointment action where permitted;
- notifications;
- user profile dropdown;
- current role;
- logout.

The header should remain visually lighter than the main working content.

---

# 9. User Profile Dropdown

Recommended items:

- Profile
- Change Password
- Role label
- Logout

Do not allow users to change their own role from this menu.

---

# 10. Footer

A subtle footer may be included throughout the system.

Recommended text:

> **Developed with love by BaCorn Tech**

The heart icon should be subtle and not visually distract from clinical work.

The footer should not consume large vertical space.

---

# 11. Layout Width

The application should use a fluid content layout.

Recommended behavior:

- wide dashboards and clinical workspaces use available width;
- forms and reading-heavy pages use constrained inner widths;
- odontogram pages should receive maximum useful horizontal space.

Avoid a narrow fixed-width layout for the entire app.

---

# 12. Spacing System

Use a consistent spacing scale.

Suggested system:

```text
4px
8px
12px
16px
20px
24px
32px
40px
48px
64px
```

Common usage:

- icon/text gap: 8px
- small component spacing: 12px
- form field spacing: 16px
- card padding: 20–24px
- section spacing: 24–32px

---

# 13. Border Radius

Use soft but professional radii.

Suggested:

```text
Small controls: 8px
Buttons/inputs: 8–10px
Cards: 12–16px
Modals: 16px
Active nav items: 10–12px
```

Avoid excessive pill-shaped containers unless the element is naturally a chip/status badge.

---

# 14. Elevation / Shadows

Use minimal shadows.

Recommended:

- subtle shadow for cards;
- slightly stronger shadow for modals/drawers;
- avoid floating every panel.

Clinical software should feel stable rather than decorative.

---

# 15. Typography

Use a clean modern sans-serif font.

Recommended candidates:

- Inter
- Roboto
- system-ui fallback

Typography hierarchy should be clear and restrained.

---

# 16. Typography Scale

Suggested:

```text
Page Title: 28–32px / semibold
Section Title: 20–24px / semibold
Card Title: 16–18px / semibold
Body: 14–16px
Table Text: 14px
Caption/Meta: 12–13px
Button: 14px / medium
```

Avoid overly small text in tables and clinical forms.

---

# 17. Colour System

The UI should use semantic colour roles rather than hard-coded colours scattered across files.

Required semantic tokens:

```text
--color-primary
--color-primary-hover
--color-primary-soft

--color-bg
--color-surface
--color-surface-muted
--color-border

--color-text
--color-text-muted

--color-success
--color-warning
--color-danger
--color-info

--color-clinical-alert
```

Exact palette values should be finalized during frontend implementation.

---

# 18. Colour Direction

The overall palette should feel:

- clean;
- clinical;
- calm;
- professional.

Recommended visual direction:

- light neutral background;
- white or near-white cards;
- restrained primary accent;
- strong readable text;
- subtle borders.

Avoid:

- neon colours;
- multiple competing accents;
- overly dark body backgrounds for the MVP;
- excessively saturated dashboard cards.

---

# 19. Accessibility Contrast

Text and interactive states must maintain sufficient contrast.

Status meaning should not depend on colour alone.

Use:

- icon;
- label;
- border;
- pattern;
- text.

---

# 20. Buttons

Required button types:

- Primary
- Secondary
- Tertiary/Text
- Success
- Danger
- Icon Button

---

# 21. Button Rules

Primary button:

- one dominant action per section where possible.

Examples:

- Add Patient
- Book Appointment
- Save Treatment Plan
- Record Payment

Secondary button:

- supporting action.

Danger button:

- destructive/cancellation action.

Avoid placing several equally prominent primary buttons together.

---

# 22. Button States

Buttons should support:

- default;
- hover;
- focus;
- active;
- disabled;
- loading.

Loading buttons should communicate progress without allowing duplicate submission.

---

# 23. Icons

Use one primary icon library consistently.

Recommended:

- Lucide
or
- Font Awesome

Do not mix several icon styles unless unavoidable.

Icons should reinforce meaning, not replace clear text for important actions.

---

# 24. Cards

Cards are suitable for:

- KPIs;
- patient summaries;
- appointment summaries;
- report panels;
- settings groups.

Cards should generally include:

- clear title;
- optional supporting value;
- optional icon;
- concise action.

Avoid nesting cards within cards repeatedly.

---

# 25. KPI Cards

Dashboard KPI cards should display:

- label;
- primary number/value;
- small context/trend where useful;
- optional icon.

Example:

```text
Today's Appointments
24
6 remaining
```

Do not use misleading trend arrows without real underlying data.

---

# 26. Status Badges

Status badges should be small, readable, and consistent.

Examples:

```text
Scheduled
Confirmed
Waiting
In Treatment
Completed
Cancelled
No Show
```

A badge should include readable text.

Do not use colour-only dots for major statuses.

---

# 27. Status Semantic Direction

Typical mapping:

- neutral/info → Scheduled
- positive → Confirmed / Completed / Paid
- warning → Waiting / Due / Partially Paid
- danger → Cancelled / Overdue / No Show
- active → In Treatment / In Progress

Exact palette values belong in frontend variables.

---

# 28. Tables

Tables are central to the system.

Use one reusable table pattern.

Structure:

```text
Page Header
Search / Filters / Actions
Table
Empty State
Pagination
```

---

# 29. Table Visual Rules

Tables should use:

- comfortable row height;
- readable headers;
- subtle separators;
- sticky headers where useful;
- responsive behavior;
- clearly aligned numeric columns;
- consistent action menus.

Avoid dense spreadsheet-style layouts unless required.

---

# 30. Table Actions

Recommended row actions:

- View
- Edit
- Print
- More menu

Avoid showing 6–8 action buttons inside every row.

Use an overflow menu for secondary actions.

---

# 31. Responsive Tables

On tablet/mobile:

- preserve key columns;
- hide lower-priority columns;
- allow horizontal scroll only when necessary;
- optionally use card transformation for simple lists.

Clinical/finance tables should never truncate essential values invisibly.

---

# 32. Search

Search fields should:

- be clearly identifiable;
- support fast typing;
- include icon;
- use placeholder text relevant to module.

Example:

```text
Search patient by name, number or phone
```

---

# 33. Filters

Use filters for:

- status;
- date;
- Dentist;
- payment method;
- branch in future;
- report parameters.

Filters should not dominate the screen.

Recommended layout:

```text
Search | Status | Date Range | Dentist | Reset
```

---

# 34. Pagination

All larger datasets should use pagination.

Pagination should include:

- previous;
- next;
- current page;
- total records where practical.

Keep the control visually simple.

---

# 35. Forms

Forms should be grouped into logical sections.

Avoid one extremely long uninterrupted form.

Example patient registration:

```text
Personal Information
Contact Information
Address
Emergency Contact
Guardian Information
Basic Medical Alerts
```

---

# 36. Form Labels

Labels should remain visible above inputs.

Do not rely on placeholders as the only label.

Use helper text where needed.

---

# 37. Required Fields

Required fields should be clearly marked.

Use:

- asterisk;
- validation messaging;
- semantic field state.

Do not over-mark optional fields.

---

# 38. Input States

Inputs must support:

- normal;
- focus;
- disabled;
- readonly;
- valid;
- invalid.

Validation messages should appear near the field.

---

# 39. Select Controls

Use searchable select controls where long datasets exist.

Examples:

- patient;
- Dentist;
- service;
- procedure.

Avoid massive native select lists when hundreds of records may exist.

---

# 40. Date & Time Controls

Appointment forms should provide clear date/time inputs.

The UI should display local time appropriate to the clinic.

For MVP:

```text
Africa/Kampala
```

---

# 41. Modals

Use modals for:

- small create/edit tasks;
- confirmations;
- quick status changes;
- payment capture;
- compact appointment actions.

Avoid using modals for:

- full clinical encounters;
- patient profile;
- large treatment plans;
- complex dental charting.

---

# 42. Modal Structure

```text
Modal Header
Modal Body
Validation Feedback
Modal Footer
```

Footer actions:

```text
Cancel
Primary Action
```

Dangerous actions should use danger styling.

---

# 43. Drawers / Slideovers

Drawers are useful for contextual details without losing the current page.

Suitable examples:

- appointment details;
- selected tooth panel;
- filter panel on tablet;
- quick patient summary.

Do not overuse drawers for complex clinical work.

---

# 44. Toast Notifications

The system should use modern toast notifications sliding in from the top-right.

Toast types:

- Success
- Info
- Warning
- Error

Examples:

```text
Patient registered successfully.
Appointment rescheduled.
Payment recorded.
Unable to save changes.
```

---

# 45. Toast Rules

Toasts should:

- auto-dismiss after reasonable time;
- allow manual close;
- not cover important controls;
- remain concise.

Do not use toasts for information that requires user decision.

---

# 46. Confirmation Dialogs

Require confirmation for actions such as:

- cancel appointment;
- deactivate patient;
- deactivate user;
- reverse payment;
- cancel invoice;
- correct finalized clinical data.

The confirmation should describe the consequence.

---

# 47. Loading States

The UI should provide:

- button loading states;
- skeletons for major page content where appropriate;
- table loading state;
- chart loading state.

Avoid blank screens during load.

---

# 48. Empty States

Examples:

```text
No appointments today.
No treatment plans yet.
No outstanding invoices.
No recalls due.
No documents uploaded.
```

Where permitted, provide a useful CTA.

Example:

```text
No patients found.
[Register Patient]
```

---

# 49. Error States

Errors should be calm and actionable.

Avoid technical stack traces.

Examples:

```text
We couldn't save this appointment because the selected time conflicts with another booking.
```

or:

```text
You do not have permission to view this clinical record.
```

---

# 50. Role-Specific Dashboards

Each role gets a distinct dashboard composition.

The shell remains consistent.

---

# 51. Clinic Administrator Dashboard

Recommended sections:

```text
KPI Row
- Today's Appointments
- Patients Checked In
- Completed Visits
- Today's Collections
- Outstanding Balance

Charts / Summaries
- Appointment Status
- Revenue Trend
- Dentist Workload

Operational Lists
- Upcoming Recalls
- Recent Payments
- Recent Activity
```

---

# 52. Dentist Dashboard

Recommended:

```text
KPI Row
- Today's Appointments
- Waiting Patients
- In Treatment
- Follow-Ups Due

Main Area
- My Schedule
- Waiting Queue
- Recent Encounters
- Pending Treatment Items
```

The Dentist dashboard should make it easy to start the next patient encounter.

---

# 53. Receptionist Dashboard

Recommended:

```text
KPI Row
- Today's Appointments
- Confirmed
- Waiting
- No Shows
- Pending Confirmations

Main Area
- Today's Schedule
- Waiting Room
- Upcoming Recalls
- Quick Actions
```

Quick actions:

- Register Patient
- Book Appointment
- Check In Patient
- Search Patient

---

# 54. Cashier Dashboard

Recommended:

```text
KPI Row
- Today's Invoices
- Today's Collections
- Unpaid Invoices
- Partial Payments

Main Area
- Recent Invoices
- Recent Payments
- Outstanding Balances
- Quick Patient Search
```

---

# 55. Patient List Page

Recommended header:

```text
Patients
Manage patient records and visit history

[Search] [Status Filter] [Register Patient]
```

Table columns:

- Patient No.
- Name
- Phone
- Age
- Sex
- Last Visit
- Next Appointment
- Status
- Actions

---

# 56. Patient Registration Page

Use structured sections.

Recommended desktop arrangement:

```text
Personal Information          Contact Information
Address                       Emergency Contact
Guardian Information          Basic Medical Alerts
```

Use one-column stacking on smaller screens.

---

# 57. Patient Profile Header

The patient profile should begin with a strong contextual header.

Display:

- avatar/photo or initials;
- full name;
- patient number;
- age / sex;
- phone;
- patient status;
- allergy/medical alert;
- next appointment;
- role-aware quick actions.

---

# 58. Patient Profile Tabs

Recommended:

```text
Overview
Medical History
Dental Chart
Encounters
Treatment Plans
Prescriptions
Documents
Appointments
Billing
Recalls
```

Tabs must be role-aware.

---

# 59. Patient Overview

Use summary cards/panels.

Recommended:

- demographics;
- contact information;
- medical alert;
- next appointment;
- recent visit;
- active treatment plan;
- balance where permitted;
- upcoming recall.

---

# 60. Medical History UI

The medical history should be readable, not just form-heavy.

Suggested sections:

```text
Allergies
Current Medications
Medical Conditions
Relevant Dental History
Other Notes
Review Status
```

Allergy alerts should be visually prominent.

---

# 61. Appointment Calendar

The calendar is a major product surface.

Required MVP views:

- Day
- Week

Recommended controls:

```text
[Today] [Previous] [Next]
[Day] [Week]
Dentist Filter
Status Filter
[New Appointment]
```

---

# 62. Appointment Block Design

Each appointment block should communicate:

- time;
- patient;
- Dentist;
- type/reason;
- status.

Do not overcrowd calendar blocks.

Full details may open in a drawer/modal.

---

# 63. Appointment Status Visuals

Use consistent state styling.

Examples:

- Scheduled
- Confirmed
- Checked In
- Waiting
- In Treatment
- Completed
- Cancelled
- No Show

Cancelled/no-show entries should remain visible but visually subdued/distinct.

---

# 64. Appointment Detail Drawer

Recommended sections:

```text
Patient
Date & Time
Dentist
Appointment Type
Reason
Status
Notes

Actions:
Confirm
Check In
Reschedule
Cancel
Mark No Show
Open Patient
```

Actions shown depend on state and role.

---

# 65. Waiting Room

The waiting room should feel operational and live.

Possible desktop presentation:

```text
Checked In | Waiting | In Treatment | Ready for Checkout
```

or a grouped table.

Use the approach that remains most readable.

---

# 66. Waiting Room Row/Card

Display:

- patient;
- appointment time;
- arrival time;
- wait duration;
- Dentist;
- reason;
- status;
- primary next action.

Long waiting times may receive a warning indicator.

---

# 67. Clinical Encounter Workspace

The encounter page should minimize unnecessary navigation.

Recommended structure:

```text
Patient Context Header

Encounter Header
- Status
- Dentist
- Date/Time
- Appointment Reference

Clinical Sections / Tabs
- Chief Complaint
- Medical Review
- Findings
- Dental Chart
- Diagnosis
- Treatment Plan
- Procedures
- Prescription
- Clinical Notes
- Follow-Up
```

---

# 68. Encounter Save Behavior

Recommended controls:

```text
Save Draft
Complete Encounter
```

Completion should require confirmation if it locks routine editing.

---

# 69. Odontogram Design Direction

The odontogram is one of the system's signature UI components.

It should feel:

- modern;
- clean;
- clinically clear;
- interactive;
- not cartoonish;
- not photorealistic.

SVG is preferred.

---

# 70. Odontogram Layout

Recommended desktop:

```text
Patient Header
Dentition Toggle | Layer Filters | Legend

Upper Arch

Lower Arch

Selected Tooth Panel / Side Panel

Recent Chart History
```

The selected tooth must be easy to identify.

---

# 71. Tooth Graphics

Tooth graphics should:

- use simplified dental shapes;
- support surface selection;
- clearly show FDI number;
- allow state overlays;
- scale cleanly;
- work in print.

Avoid using photographic teeth.

---

# 72. Odontogram Surface Interaction

Surface-level charting should show interactive regions.

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

The user should clearly see which surfaces are selected.

---

# 73. Odontogram Layers

Recommended UI controls:

```text
Conditions
Existing / Completed
Planned
```

Layer toggles help prevent visual overload.

---

# 74. Odontogram Legend

The legend should remain close to the chart.

It should explain:

- active conditions;
- existing treatment;
- planned treatment;
- missing;
- extracted;
- crown;
- implant;
- root canal;
- restoration notation.

---

# 75. Selected Tooth Panel

Recommended fields:

```text
Tooth 16
Upper Right First Molar

Current Conditions
Existing Treatment
Planned Treatment
Recent History

Actions
[Add Condition]
[Add Existing Treatment]
[Add Planned Treatment]
[View Full History]
```

---

# 76. Odontogram Accessibility

Do not depend on colour alone.

Use:

- shape;
- pattern;
- border;
- abbreviation;
- text summary.

Provide a history/list representation beneath or beside the visual chart.

---

# 77. Treatment Plan UI

Treatment Plan detail should clearly distinguish clinical and financial information.

Recommended table:

| Tooth / Area | Procedure | Qty | Price | Acceptance | Treatment Status |
|---|---|---:|---:|---|---|

Summary:

```text
Estimated Total
Accepted Total
Completed Value
```

Do not make financial summary visually overpower the clinical context.

---

# 78. Treatment Acceptance UI

The UI should allow individual item status.

Examples:

- Accepted
- Declined
- Pending

Do not provide a workflow that accidentally marks every item accepted.

---

# 79. Procedure Catalogue UI

Admin page should use standard table CRUD pattern.

Columns:

- Code
- Service
- Category
- Default Price
- Duration
- Status
- Actions

---

# 80. Prescription UI

The prescription form should be simple and clinical.

Recommended item table:

| Medicine | Strength | Dose | Frequency | Duration | Instructions |
|---|---|---|---|---|---|

Allow multiple items.

Print preview should resemble a professional clinic prescription.

---

# 81. Documents & Images UI

Patient documents should use a clean media/document grid or list.

Categories:

- X-rays
- Clinical Photos
- Referrals
- Consent Forms
- Other

Each item may show:

- thumbnail/icon;
- title;
- type;
- date;
- uploader;
- view action.

---

# 82. Billing / Invoice List

Use standard table layout.

Columns:

- Invoice No.
- Patient
- Date
- Total
- Paid
- Balance
- Status
- Actions

Numeric values should align right.

---

# 83. Invoice Detail

Recommended:

```text
Clinic / Invoice Header
Patient Summary
Invoice Metadata

Invoice Items Table

Subtotal
Discount
Total
Paid
Balance

Payment History

Actions:
Record Payment
Print Invoice
Cancel (if permitted)
```

---

# 84. Payment Modal

Record Payment may use a modal.

Fields:

- outstanding balance;
- payment amount;
- method;
- external reference where relevant;
- notes.

The balance should remain visible while entering payment.

---

# 85. Receipt UI

Receipt screen should emphasize:

- clinic identity;
- patient;
- receipt number;
- amount paid;
- method;
- invoice;
- remaining balance;
- cashier.

Provide:

- Print
- Reprint

Avoid edit controls after issuance.

---

# 86. Outstanding Balances UI

Recommended columns:

- Patient
- Phone
- Total Invoiced
- Paid
- Outstanding
- Oldest Unpaid Date
- Action

Action:

```text
View Invoice / Record Payment
```

---

# 87. Recalls UI

Recommended tabs or filters:

```text
Upcoming
Due
Overdue
Contacted
Scheduled
Completed
```

Columns:

- Patient
- Recall Type
- Due Date
- Dentist
- Status
- Contact Outcome
- Next Action

---

# 88. Reports UI

Reports should use a consistent template.

```text
Report Title
Description
Filters
[Generate]

Summary KPIs
Chart/Table
Print / Export
```

Do not create a different visual language for every report.

---

# 89. Report Filters

Typical:

- date range;
- Dentist;
- status;
- payment method;
- branch in future.

The report should clearly display active filter context.

---

# 90. Charts

Use charts only when they improve understanding.

Suitable examples:

- revenue trend;
- appointment status distribution;
- Dentist workload;
- payment-method mix.

Avoid decorating dashboards with meaningless graphs.

---

# 91. Users & Roles UI

User table:

- Name
- Email
- Phone
- Role
- Job Title
- Status
- Last Login
- Actions

Add/Edit user should use a clean form.

Role cannot be changed by the user from Profile.

---

# 92. Settings UI

Settings can use:

- secondary left navigation;
- tabs;
- grouped cards.

Recommended sections:

```text
Clinic Profile
Working Hours
Appointment Settings
Services
Payment Methods
Numbering
Recall Types
Security
```

---

# 93. Profile Page

Sections:

```text
Personal Information
Contact Information
Profile Photo
Role / Account Info
Change Password
```

Account role should be readonly.

---

# 94. Responsive Strategy

The application should be:

> **Desktop-optimized, tablet-friendly, and mobile-capable for common operational tasks.**

---

# 95. Desktop Breakpoint Behavior

Desktop should provide:

- expanded sidebar;
- full table layouts;
- multi-column forms;
- large odontogram workspace;
- side-by-side clinical panels where useful.

---

# 96. Tablet Behavior

Tablet should provide:

- collapsible sidebar;
- responsive tables;
- stacked form sections;
- slide-over selected-tooth panel;
- usable appointment calendar;
- odontogram with practical touch targets.

---

# 97. Mobile Behavior

Mobile should prioritize:

- patient search;
- registration;
- appointment lookup;
- check-in;
- queue;
- invoice lookup;
- payment;
- receipt viewing.

Complex clinical editing may be limited or reorganized.

Do not force a tiny unusable odontogram.

---

# 98. Responsive Sidebar

Desktop:

```text
Expanded
```

Tablet:

```text
Collapsed / Overlay
```

Mobile:

```text
Off-canvas
```

The sidebar must close cleanly after navigation on small screens.

---

# 99. Responsive Header

On smaller screens:

- hide low-priority header text;
- retain patient search where relevant;
- keep user menu accessible;
- avoid horizontal overflow.

---

# 100. Print System

Print layouts must be treated as dedicated experiences.

Required print outputs:

- Invoice
- Receipt
- Prescription
- Treatment Plan
- Dental Chart Summary
- Selected Reports

---

# 101. Print Rules

Hide:

- sidebar;
- topbar;
- buttons;
- interactive controls;
- toast containers.

Show:

- clinic identity;
- document title/reference;
- patient identity;
- relevant content;
- date;
- authorized user/dentist where appropriate.

---

# 102. Print Typography

Use simple, professional typography.

Avoid tiny text.

Receipts should remain compact but readable.

---

# 103. Dark Mode

Dark mode is **not required** for the MVP.

The clinical system should initially use a polished light interface.

Dark mode may be considered later if user demand exists.

---

# 104. Animation

Use restrained motion.

Suitable:

- modal fade;
- drawer slide;
- toast slide-in;
- subtle hover state;
- collapsing sidebar.

Avoid:

- bouncing cards;
- excessive page transitions;
- flashy gradients moving across the UI.

---

# 105. Notification Sound

No notification sounds are required in MVP.

Future waiting-room alerts may consider optional sound.

---

# 106. Accessibility Requirements

The UI should support:

- semantic HTML;
- visible labels;
- sufficient contrast;
- focus states;
- keyboard navigation where practical;
- meaningful icon labels;
- non-colour status cues;
- accessible odontogram labels.

---

# 107. Keyboard Efficiency

Where useful, allow efficient keyboard interaction.

Examples:

- tab order in forms;
- Enter to search;
- Escape to close modal;
- keyboard focus for appointments/tooth controls where practical.

Avoid custom keyboard behavior that conflicts with browser norms.

---

# 108. Validation Feedback

Validation should clearly identify:

- field;
- issue;
- required correction.

Example:

```text
Appointment time conflicts with another booking for this Dentist.
```

Avoid generic:

```text
Something went wrong.
```

when the specific cause is known.

---

# 109. Data Integrity UX

The frontend should visibly support backend integrity.

Examples:

- disable Record Payment when balance is zero;
- hide Start Treatment when appointment is cancelled;
- prevent Complete Encounter if required context is unresolved;
- warn before reversing payment;
- hide Dentist-only chart actions from Receptionist.

---

# 110. Unsaved Changes

Long forms/workspaces should warn before leaving with unsaved changes.

Priority areas:

- clinical encounter;
- treatment plan;
- dental chart;
- settings.

---

# 111. Role-Aware Primary Actions

Examples:

Receptionist:

```text
Register Patient
Book Appointment
Check In
```

Dentist:

```text
Start Encounter
Add Finding
Create Treatment Plan
Complete Encounter
```

Cashier:

```text
Create Invoice
Record Payment
Print Receipt
```

Administrator:

```text
Add User
Add Service
Generate Report
```

---

# 112. Global Search Direction

If included, global search should initially prioritize patients.

Suggested search placeholder:

```text
Search patient by name, number or phone...
```

Later expansion may include:

- invoice;
- receipt;
- appointment.

---

# 113. Browser Support

The MVP should target current modern desktop browsers.

Priority:

- Chromium-based browsers
- Firefox
- Edge

Safari compatibility should be considered where practical.

Manual Chromium verification remains important before frontend freeze.

---

# 114. CSS Architecture

Recommended organization:

```text
styles/
    tokens.css
    base.css
    layout.css
    components.css
    utilities.css
    modules/
        dashboard.css
        patients.css
        appointments.css
        clinical.css
        odontogram.css
        billing.css
        reports.css
        print.css
```

Exact implementation may differ.

Avoid massive duplicated module-specific CSS files containing conflicting styles.

---

# 115. JavaScript Architecture

Frontend JavaScript should be modular.

Recommended conceptual areas:

```text
core/
components/
modules/
data/
utils/
```

Avoid one extremely large file controlling every screen.

---

# 116. Shared Component Inventory

At minimum, design reusable:

- Sidebar
- Header
- Page Header
- Breadcrumb
- Button
- Input
- Select
- Date Picker
- Search Bar
- Filter Bar
- Card
- KPI Card
- Table
- Pagination
- Badge
- Toast
- Modal
- Drawer
- Confirm Dialog
- Empty State
- Loading State
- Patient Context Header
- Print Header

---

# 117. Module-Specific Component Inventory

Examples:

- Appointment Calendar
- Appointment Card
- Queue Row
- Encounter Section
- Tooth SVG
- Tooth Surface Selector
- Odontogram Legend
- Treatment Plan Table
- Invoice Summary
- Payment Modal
- Receipt Layout
- Recall Status List

---

# 118. Sample Data Consistency

The UI must not invent unrelated data separately per module.

Examples:

- John Doe's appointment should use the same patient record shown in Patients.
- A treatment-plan item should match the same patient's dental chart.
- An invoice should use the same completed procedure.
- A receipt should match the same payment.

`10_SAMPLE_DATA_SPECIFICATION.md` will define these records.

---

# 119. UI Copy Style

Use clear concise wording.

Prefer:

```text
Book Appointment
Record Payment
Complete Encounter
Add Finding
Print Receipt
```

Avoid overly technical phrasing.

---

# 120. Clinical Terminology

Clinical labels must remain consistent with the approved dental-chart specification.

Do not rename terms casually during frontend generation.

---

# 121. Finance Terminology

Use consistently:

- Invoice
- Payment
- Receipt
- Balance
- Discount
- Paid
- Unpaid
- Partially Paid

Do not alternate between Invoice and Bill unless intentionally defined.

---

# 122. Date/Time Display

Use a consistent local display format.

Example:

```text
21 Sep 2026
10:30 AM
```

Exact date format may be finalized during implementation.

---

# 123. Currency Display

Use:

```text
UGX 150,000
```

Avoid:

```text
150000 UGX
$150,000
```

unless future localization changes.

---

# 124. Patient Number Display

Patient references should be visually distinct.

Example:

```text
PAT-000123
```

Use monospace only if visually appropriate; not required.

---

# 125. Toast Placement

Default:

```text
Top Right
```

On mobile:

```text
Top Center / Full Width with safe margins
```

Toasts must not cover critical mobile navigation.

---

# 126. Modal Sizing

Recommended:

- Small: confirmations
- Medium: standard forms
- Large: payment/appointment details
- Extra Large: only where unavoidable

Do not put entire pages inside full-screen modals by default.

---

# 127. Skeleton Loading

Suitable for:

- dashboard;
- patient profile;
- calendar;
- charts;
- report content.

Use sparingly.

---

# 128. Empty-State Illustrations

Optional.

If used:

- simple;
- lightweight;
- consistent;
- not childish.

Text and action are more important than illustration.

---

# 129. Landing/Login Experience

The login page should feel premium.

Recommended direction:

```text
Split Layout

Left / Right:
Dental-related background image or illustration
Short brand message

Opposite side:
Login card
Logo
Email
Password
Remember Me
Sign In
```

Keep the login panel uncluttered.

---

# 130. Login Copy

Example tone:

```text
Welcome back
Sign in to manage your dental practice.
```

Avoid marketing-heavy copy.

---

# 131. Login Error State

Clearly show:

- invalid credentials;
- inactive account;
- required fields.

Do not reveal unnecessary security information.

---

# 132. Branding

Use clinic logo where appropriate.

System product branding may appear subtly.

Receipt/invoice/prescription printouts should use the clinic's branding, not only BaCorn Tech branding.

---

# 133. BaCorn Tech Attribution

Recommended:

```text
Developed with love by BaCorn Tech
```

Use as a subtle footer attribution.

Do not place developer branding prominently on patient-facing printed clinical documents unless intentionally approved.

---

# 134. Odontogram Performance UX

Interaction should feel immediate.

Do not reload the entire page when:

- selecting a tooth;
- changing layer;
- opening tooth history.

Use client-side state where appropriate.

---

# 135. Appointment Calendar Performance UX

Calendar navigation should update smoothly.

Date movement:

```text
Previous
Today
Next
```

Filters should not force disruptive page resets in the frontend template.

---

# 136. Finance Integrity UX

Always show:

```text
Invoice Total
Paid
Balance
```

before payment submission.

When payment is recorded successfully, the updated balance should appear immediately.

---

# 137. Receipt Confirmation UX

After successful payment:

```text
Payment recorded successfully.

[View Receipt]
[Print Receipt]
```

Avoid forcing the user to manually find the receipt in another module.

---

# 138. Recall Workflow UX

From a clinical encounter:

```text
Add Follow-Up
```

From recall list:

```text
Mark Contacted
Book Appointment
Complete
```

This should feel like one connected loop.

---

# 139. Clinical Alert UX

Allergy alerts should use:

- icon;
- label;
- prominent but controlled emphasis.

Example:

```text
⚠ Allergy: Penicillin
```

Do not hide severe alerts in a collapsed section.

---

# 140. Sensitive Data UX

Do not display sensitive clinical information on screens where it is unnecessary.

Examples:

- Cashier patient search should not show diagnosis.
- Reception waiting room should not show detailed clinical notes.

---

# 141. UI Security Rules

The frontend should:

- hide unauthorized actions;
- avoid rendering sensitive content unnecessarily;
- use permission-aware navigation.

But backend authorization remains mandatory.

---

# 142. 403 Page

Design:

```text
Access Denied
You do not have permission to view this page.

[Return to Dashboard]
```

Use calm language.

---

# 143. 404 Page

Design:

```text
Page Not Found
The page you're looking for doesn't exist or may have moved.

[Return to Dashboard]
```

---

# 144. Session Expired UX

Show:

```text
Your session has expired.
Please sign in again.
```

Avoid silently losing unsaved work where technically preventable.

---

# 145. UI/UX Anti-Patterns

Do not:

- use a different sidebar design per module;
- change header height randomly;
- use inconsistent button styles;
- use overly dense tables;
- hide critical labels inside icons only;
- use several competing colour palettes;
- animate every interaction;
- use huge modals for complex workflows;
- repeat patient search unnecessarily;
- mix dozens of border-radius styles;
- use colour alone for status;
- render role-inappropriate data;
- force desktop tables into unreadable phone layouts;
- shrink odontogram controls below usable sizes.

---

# 146. Frontend Audit Checklist

Before freeze, verify:

- sidebar consistency;
- header consistency;
- role navigation;
- active states;
- page spacing;
- form alignment;
- table consistency;
- filters;
- pagination;
- modals;
- toasts;
- responsive behavior;
- print layouts;
- patient context;
- appointment states;
- odontogram interactions;
- treatment-plan workflow;
- billing reconciliation;
- receipt output;
- role restrictions;
- empty states;
- error states.

---

# 147. Responsive Audit Checklist

Test at minimum:

- wide desktop;
- standard laptop;
- tablet landscape;
- tablet portrait;
- common mobile width.

Focus particularly on:

- sidebar;
- patient profile tabs;
- calendar;
- waiting room;
- treatment plan;
- invoice detail;
- odontogram.

---

# 148. Print Audit Checklist

Verify:

- no sidebar;
- no header controls;
- no clipped content;
- no horizontal overflow;
- readable typography;
- clinic logo;
- patient identity;
- correct totals;
- proper page breaks;
- A4 portrait/landscape where appropriate.

---

# 149. Browser Audit Checklist

Manually verify current Chromium before freeze.

Also check:

- Edge
- Firefox

where practical.

Test:

- navigation;
- modals;
- forms;
- calendar;
- odontogram;
- print preview.

---

# 150. UI Freeze Conditions

The UI/UX may be considered ready to freeze when:

- all MVP modules exist;
- role-specific navigation is correct;
- global shell is consistent;
- patient journey is coherent;
- appointment calendar is usable;
- waiting-room workflow is usable;
- clinical encounter workspace is coherent;
- odontogram meets the dental-chart specification;
- treatment planning works visually;
- billing/payment workflow reconciles;
- receipts print correctly;
- responsive layouts are acceptable;
- print layouts pass review;
- major accessibility issues are addressed;
- clinical reviewer feedback is incorporated where required;
- no major placeholder sections remain;
- no inconsistent seeded data remains.

---

# 151. UI/UX Design Token Direction

The final frontend should centralize design tokens.

Example:

```css
:root {
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;

    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 20px;
    --space-6: 24px;
    --space-8: 32px;

    --sidebar-width: 260px;
    --header-height: 64px;
}
```

Exact values may be refined.

---

# 152. UI/UX System Summary

The system should present one coherent design language across four operational experiences:

```text
RECEPTION
Patients → Appointments → Check-In → Waiting

CLINICAL
Patient → Encounter → Dental Chart → Treatment Plan → Procedure

FINANCE
Invoice → Payment → Receipt → Balance

FOLLOW-UP
Recall → Contact → Appointment
```

The interface should remain:

- patient-centred;
- role-aware;
- workflow-driven;
- clinically clear;
- financially precise;
- visually consistent.

---

# UI/UX System Decision

**Recommended Status:** READY FOR REVIEW

**Design Direction:** Modern light clinical interface, premium but restrained.

**Frontend Priority:** Desktop-first clinical usability + tablet readiness + practical mobile support.

**Signature UI Areas:** Appointment Calendar, Patient Profile, Waiting Room, Clinical Encounter Workspace, Odontogram, Treatment Plan, Billing Flow.

**Next Document:** `10_SAMPLE_DATA_SPECIFICATION.md`

The next document should define the complete fictional Ugandan sample dataset used by the frontend template so all modules share the same patients, Dentists, appointments, chart entries, treatment plans, invoices, payments, receipts, recalls, and dashboard totals.
