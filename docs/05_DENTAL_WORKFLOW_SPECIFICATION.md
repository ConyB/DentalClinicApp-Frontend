# Dental Practice Management System
## 05 — Dental Workflow Specification

**Document Version:** 1.0  
**Status:** Draft for Review / Workflow Foundation  
**Prepared For:** Dental Practice Management System MVP  
**Target Market:** Ugandan Dental Clinics  
**Primary Technology Direction:** PHP / Laravel  
**Prepared By:** BaCorn Tech  
**Date:** 20 September 2026

---

## 1. Document Purpose

This document defines the operational and clinical workflows of the Dental Practice Management System MVP.

It translates the approved:

- `01_PRODUCT_VISION.md`
- `02_MVP_SCOPE.md`
- `03_ROLE_PERMISSION_MATRIX.md`
- `04_INFORMATION_ARCHITECTURE.md`

into detailed workflow rules.

The purpose is to define:

- how users move through each process;
- which role performs each action;
- valid workflow states;
- allowed state transitions;
- required validations;
- exception paths;
- cross-module handoffs;
- historical-record rules;
- workflow completion conditions.

This document should be treated as the behavioral source of truth for:

- frontend interactions;
- status badges;
- buttons;
- modal actions;
- page transitions;
- Laravel controllers/services;
- authorization;
- database constraints;
- audit logging;
- automated and manual testing.

The UI must never invent workflow rules that contradict this document.

---

# 2. Workflow Design Principles

All MVP workflows should follow these principles.

## 2.1 State-Driven Behavior

Every major workflow entity should have a clear state.

Examples:

- Appointment
- Clinical Encounter
- Treatment Plan
- Treatment Plan Item
- Invoice
- Payment
- Recall

The UI should show only actions that are valid for the current state.

---

## 2.2 Role Ownership

Each workflow should have a clear primary actor.

Examples:

- Receptionist owns booking/check-in flow.
- Dentist owns clinical care.
- Cashier owns payment/receipt flow.
- Administrator owns configuration and oversight.

---

## 2.3 Preserve History

Completed clinical and financial records must not silently disappear.

Corrections should preserve historical traceability.

---

## 2.4 Patient Context Must Persist

Once a user enters a patient workflow, the patient identity should remain obvious.

The system should not force repeated patient searches between related steps.

---

## 2.5 Clinical and Financial Boundaries

Clinical decisions must remain with authorized clinical users.

Financial actions must remain with authorized finance users.

---

## 2.6 No Hidden State Changes

A workflow state should change only because:

- an authorized user performs a valid action;
- the backend validates the transition;
- the change is persisted;
- the UI reflects the new state.

---

# 3. Primary End-to-End Patient Workflow

The complete MVP patient journey is:

```text
Patient Registration
        ↓
Appointment Booking
        ↓
Appointment Confirmation
        ↓
Patient Arrival
        ↓
Check-In
        ↓
Waiting Queue
        ↓
In Treatment
        ↓
Clinical Encounter
        ↓
Dental Chart / Findings
        ↓
Diagnosis / Clinical Notes
        ↓
Treatment Plan
        ↓
Procedure
        ↓
Checkout
        ↓
Invoice
        ↓
Payment
        ↓
Receipt
        ↓
Recall / Follow-Up
```

Not every visit requires every step.

Examples:

- A consultation may not result in treatment.
- A patient may receive a treatment plan but defer treatment.
- A returning patient may continue an existing treatment plan.
- A patient may leave with an unpaid balance.
- A recall may be created without immediate rebooking.

---

# 4. Workflow Actors

The MVP uses four operational actors.

## 4.1 Clinic Administrator

Primary workflow responsibilities:

- operational oversight;
- exception handling;
- finance oversight;
- user administration;
- settings;
- report access;
- controlled correction workflows.

---

## 4.2 Dentist

Primary workflow responsibilities:

- review patient;
- clinical encounter;
- medical review;
- dental chart;
- findings;
- diagnosis;
- treatment plan;
- procedures;
- prescriptions;
- clinical completion;
- follow-up recommendation.

---

## 4.3 Receptionist

Primary workflow responsibilities:

- patient registration;
- appointment management;
- confirmation;
- check-in;
- waiting queue;
- recall contact;
- rebooking.

---

## 4.4 Cashier

Primary workflow responsibilities:

- invoice review/creation;
- payment;
- partial payment;
- receipt;
- balance handling.

---

# 5. Patient Registration Workflow

## 5.1 Purpose

Create a valid patient record before operational or clinical activity begins.

## 5.2 Primary Actor

Receptionist

## 5.3 Secondary Actor

Clinic Administrator

## 5.4 Entry Points

- Dashboard → Register Patient
- Patients → Add Patient
- Appointment workflow → New Patient
- Global patient search → No match → Add Patient

---

## 5.5 Normal Flow

```text
Start
  ↓
Enter patient demographics
  ↓
Enter contact information
  ↓
Enter emergency/guardian details if applicable
  ↓
Capture basic medical alerts
  ↓
Validate required fields
  ↓
Check for likely duplicate patient
  ↓
Create patient number
  ↓
Save patient
  ↓
Open patient profile
```

---

## 5.6 Minimum Validation

Required:

- first name;
- last name;
- date of birth or age-related data according to final implementation;
- sex;
- primary phone where available;
- patient status.

Where applicable:

- guardian information for minors;
- emergency contact.

---

## 5.7 Duplicate Warning

Before creating a patient, the system should check for likely duplicates using combinations such as:

- full name + phone;
- full name + date of birth;
- phone number;
- patient number.

MVP behavior:

> Warn the user, do not silently block without review.

---

## 5.8 Completion Condition

A patient record exists with:

- unique internal identifier;
- patient number;
- registration timestamp;
- active status;
- creator reference.

---

# 6. Patient Search Workflow

## 6.1 Purpose

Find an existing patient quickly and safely.

## 6.2 Search Methods

At minimum:

- patient number;
- patient name;
- phone number.

## 6.3 Result Actions by Role

Receptionist:

- open profile;
- edit demographics;
- book appointment;
- check upcoming appointments.

Dentist:

- open clinical profile;
- review history;
- open chart;
- start encounter where permitted.

Cashier:

- open billing context;
- view invoice;
- record payment where valid.

Administrator:

- full permitted oversight.

---

# 7. Appointment Booking Workflow

## 7.1 Primary Actor

Receptionist

## 7.2 Secondary Actors

Dentist, Administrator

## 7.3 Initial State

`Scheduled`

---

## 7.4 Normal Flow

```text
Select patient
   ↓
Choose dentist
   ↓
Choose appointment date
   ↓
Choose start time
   ↓
Choose duration
   ↓
Select appointment type/reason
   ↓
Check scheduling conflicts
   ↓
Save appointment
   ↓
Status = Scheduled
```

---

## 7.5 Required Appointment Data

- patient;
- dentist;
- date;
- start time;
- estimated duration;
- appointment reason/type;
- status.

Optional:

- notes.

---

## 7.6 Appointment Conflict Validation

The system should detect:

- same dentist double-booking;
- invalid past date for new appointment;
- invalid/zero duration;
- appointment outside configured hours where rules are enabled.

MVP behavior may allow authorized override with warning if clinic policy permits.

---

# 8. Appointment State Model

Valid appointment states:

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

---

# 9. Appointment State Transitions

## 9.1 Normal Transitions

```text
Scheduled → Confirmed
Scheduled → Cancelled
Scheduled → Rescheduled
Scheduled → No Show

Confirmed → Checked In
Confirmed → Cancelled
Confirmed → Rescheduled
Confirmed → No Show

Checked In → Waiting

Waiting → In Treatment

In Treatment → Completed
```

---

## 9.2 Reschedule Behavior

When an appointment is rescheduled:

- original appointment should remain historically traceable;
- original status becomes `Rescheduled`;
- new appointment record should be created or a rescheduling history must be preserved;
- new date/time must be visible;
- user performing the action should be traceable.

Preferred MVP behavior:

> Preserve the original appointment and create a new scheduled appointment linked to it.

---

## 9.3 Cancel Behavior

Cancellation should capture:

- cancellation reason;
- cancelled by;
- cancellation timestamp.

The record remains in history.

---

## 9.4 No-Show Behavior

A no-show should:

- remain visible in patient history;
- contribute to no-show reporting;
- optionally allow immediate rebooking.

---

# 10. Appointment Confirmation Workflow

## 10.1 Primary Actor

Receptionist

## 10.2 Flow

```text
Scheduled Appointment
      ↓
Patient contacted
      ↓
Outcome recorded
      ↓
If confirmed → Confirmed
If rescheduled → Rescheduled + new appointment
If cancelled → Cancelled
If no response → remain Scheduled
```

---

## 10.3 MVP Contact Outcome Values

Recommended:

- Confirmed
- No Answer
- Call Back Later
- Rescheduled
- Cancelled

These may be recorded as appointment communication notes rather than a separate complex communication module.

---

# 11. Patient Arrival & Check-In Workflow

## 11.1 Primary Actor

Receptionist

## 11.2 Preconditions

- valid patient;
- valid appointment, or authorized walk-in flow;
- appointment not cancelled.

---

## 11.3 Normal Flow

```text
Patient arrives
   ↓
Receptionist locates appointment
   ↓
Verify patient identity/contact
   ↓
Mark Checked In
   ↓
Record arrival time
   ↓
Move to Waiting
   ↓
Patient appears in waiting room
```

---

## 11.4 Walk-In Patient

MVP should allow a simple walk-in path:

```text
Patient arrives without appointment
   ↓
Search/Register patient
   ↓
Create same-day appointment
   ↓
Check in
   ↓
Waiting queue
```

This avoids creating a separate complex walk-in entity.

---

# 12. Waiting Room Workflow

## 12.1 States

Operational queue states:

```text
Checked In
Waiting
In Treatment
Ready for Checkout
Completed
```

---

## 12.2 Required Queue Data

- patient;
- appointment;
- dentist;
- arrival time;
- current state;
- wait duration;
- treatment-start time where applicable.

---

## 12.3 Dentist Starts Treatment

```text
Waiting
   ↓
Dentist selects patient
   ↓
Open patient context
   ↓
Start clinical encounter
   ↓
Appointment/queue state = In Treatment
```

---

# 13. Clinical Encounter Workflow

## 13.1 Primary Actor

Dentist

## 13.2 Encounter States

```text
Draft
In Progress
Completed
```

---

## 13.3 Encounter Creation

An encounter may be created from:

- waiting room;
- appointment;
- patient profile.

Preferred normal path:

```text
Waiting Patient
   ↓
Start Treatment
   ↓
Create Encounter
   ↓
Encounter = In Progress
```

---

## 13.4 Encounter Workflow

```text
Open patient
   ↓
Review medical history
   ↓
Review allergy/medical alerts
   ↓
Record chief complaint
   ↓
Record examination findings
   ↓
Update dental chart
   ↓
Record diagnosis
   ↓
Create/update treatment plan
   ↓
Record procedures performed
   ↓
Create prescription if needed
   ↓
Record follow-up instructions
   ↓
Complete encounter
```

---

# 14. Encounter Completion Rules

An encounter may be completed when:

- patient identity is valid;
- dentist is assigned;
- encounter date/time exists;
- required clinical fields according to implementation are satisfied;
- any procedures recorded are valid;
- chart entries are saved;
- draft prescription/treatment items are resolved as required.

Completion should:

- set status to `Completed`;
- record completion timestamp;
- record completing user;
- lock routine editing.

---

# 15. Reopening a Completed Encounter

MVP rule:

> Completed encounters should not be casually editable.

If correction is necessary:

- authorized user initiates correction/reopen;
- reason must be captured;
- audit record must be created;
- original completion history must remain traceable.

---

# 16. Medical History Review Workflow

## 16.1 Primary Actor

Dentist

## 16.2 Flow

```text
Open patient
   ↓
Review allergies
   ↓
Review medications
   ↓
Review relevant conditions
   ↓
Update if necessary
   ↓
Mark reviewed
   ↓
Continue encounter
```

---

## 16.3 Safety Rule

Allergy/important medical alerts should remain visibly available during the encounter.

---

# 17. Dental Chart Workflow

The detailed dental chart model is defined in:

`06_DENTAL_CHART_SPECIFICATION.md`

This document defines workflow behavior only.

---

## 17.1 Primary Actor

Dentist

## 17.2 Flow

```text
Open patient dental chart
   ↓
Select tooth
   ↓
Review existing conditions/history
   ↓
Add finding/condition
   ↓
Associate with encounter
   ↓
Save chart entry
   ↓
Chart updates visually
```

---

## 17.3 Chart History Rule

New charting must not overwrite historical clinical meaning.

The system should preserve:

- previous state;
- new state;
- encounter;
- dentist;
- date/time.

---

## 17.4 Completed Procedure Interaction

When a relevant dental procedure is completed:

- chart may be updated to reflect the completed state;
- procedure remains separately stored as a procedure record;
- chart history remains traceable.

---

# 18. Findings & Diagnosis Workflow

## 18.1 Primary Actor

Dentist

## 18.2 Flow

```text
Clinical examination
   ↓
Record finding
   ↓
Associate with tooth/area if relevant
   ↓
Record diagnosis
   ↓
Save to encounter
   ↓
Use as basis for treatment planning
```

---

## 18.3 MVP Rule

Findings and diagnoses should remain linked to:

- patient;
- encounter;
- dentist;
- date.

---

# 19. Treatment Plan Workflow

## 19.1 Primary Actor

Dentist

## 19.2 Treatment Plan States

```text
Draft
Proposed
Accepted
Partially Accepted
In Progress
Completed
Cancelled
```

---

## 19.3 Treatment Item States

```text
Proposed
Accepted
Declined
Planned
In Progress
Completed
Cancelled
```

---

# 20. Treatment Plan Creation Flow

```text
Encounter / Patient
   ↓
Create treatment plan
   ↓
Add treatment item
   ↓
Select procedure
   ↓
Select tooth/area if applicable
   ↓
Set quantity
   ↓
Apply default price
   ↓
Add clinical notes
   ↓
Repeat for additional items
   ↓
Save Draft
   ↓
Present plan to patient
   ↓
Status = Proposed
```

---

# 21. Treatment Acceptance Workflow

The patient may:

- accept all items;
- accept some items;
- decline some items;
- defer decision.

---

## 21.1 Full Acceptance

If all applicable items are accepted:

```text
Plan = Accepted
```

---

## 21.2 Partial Acceptance

If some items are accepted and some declined/deferred:

```text
Plan = Partially Accepted
```

---

## 21.3 Important Rule

A patient must not be forced to accept the entire plan.

Each item progresses independently.

---

# 22. Treatment Plan Execution Workflow

For an accepted item:

```text
Accepted
   ↓
Planned
   ↓
In Progress
   ↓
Completed
```

When all active items are completed:

```text
Treatment Plan = Completed
```

If some remain active:

```text
Treatment Plan = In Progress
```

---

# 23. Procedure Recording Workflow

## 23.1 Primary Actor

Dentist

## 23.2 Flow

```text
Select accepted treatment item
   ↓
Start/perform procedure
   ↓
Record tooth/area
   ↓
Record procedure details
   ↓
Record clinical note
   ↓
Confirm completion
   ↓
Procedure = Completed
   ↓
Treatment item = Completed
   ↓
Eligible for billing
```

---

## 23.3 Standalone Procedure

The MVP may allow a procedure to be recorded without a pre-existing treatment plan for simple or urgent care.

Example:

- emergency extraction;
- consultation;
- simple same-day procedure.

However:

- patient;
- dentist;
- encounter;
- procedure;
- date;
- price/billable context

must still be valid.

---

# 24. Billing Handoff Workflow

Clinical and finance workflows should connect without giving the Cashier clinical edit access.

```text
Dentist completes procedure
      ↓
Procedure becomes billable
      ↓
Patient sent to checkout
      ↓
Cashier sees billable items
      ↓
Invoice created/reviewed
```

---

# 25. Checkout Workflow

## 25.1 Primary Actors

Dentist → Cashier

## 25.2 Flow

```text
Clinical work complete
   ↓
Dentist marks patient ready for checkout
   ↓
Cashier sees checkout context
   ↓
Review billable items
   ↓
Create/confirm invoice
   ↓
Collect payment if available
   ↓
Issue receipt
   ↓
Complete financial checkout
```

---

# 26. Invoice Workflow

## 26.1 Invoice States

```text
Draft
Unpaid
Partially Paid
Paid
Cancelled
```

---

## 26.2 Creation Flow

```text
Patient has billable items
   ↓
Create invoice
   ↓
Add invoice items
   ↓
Calculate subtotal
   ↓
Apply authorized discount if any
   ↓
Calculate total
   ↓
Finalize
   ↓
Status = Unpaid
```

---

# 27. Invoice Calculation Rules

At minimum:

```text
Line Total = Quantity × Unit Price
Subtotal = Sum(Line Totals)
Invoice Total = Subtotal - Valid Discount
Balance = Invoice Total - Valid Payments
```

---

## 27.1 Status Calculation

If:

```text
Paid Amount = 0
```

then:

`Unpaid`

If:

```text
0 < Paid Amount < Invoice Total
```

then:

`Partially Paid`

If:

```text
Paid Amount >= Invoice Total
```

then:

`Paid`

Overpayment should not occur silently.

---

# 28. Invoice Cancellation Workflow

An invoice may only be cancelled according to permissions and business rules.

If no valid payments exist:

- authorized user may cancel;
- reason should be captured.

If payments exist:

- payment correction/reversal must be resolved first;
- invoice should not silently disappear.

---

# 29. Payment Workflow

## 29.1 Primary Actor

Cashier

## 29.2 Flow

```text
Open invoice
   ↓
View outstanding balance
   ↓
Enter payment amount
   ↓
Select payment method
   ↓
Validate amount
   ↓
Record payment
   ↓
Recalculate balance
   ↓
Update invoice status
   ↓
Generate receipt
```

---

# 30. Payment Validation Rules

The system must validate:

- payment amount > 0;
- valid invoice;
- valid patient;
- valid payment method;
- payment amount does not exceed allowed balance unless an approved overpayment workflow exists;
- user has permission;
- invoice is not cancelled.

---

# 31. Partial Payment Workflow

Example:

```text
Invoice Total: UGX 500,000
Payment: UGX 200,000
Balance: UGX 300,000
Status: Partially Paid
```

The remaining balance must remain clearly visible.

---

# 32. Payment Reversal / Correction Workflow

Finalized payments should not be deleted.

Preferred workflow:

```text
Valid Payment
   ↓
Correction required
   ↓
Authorized user chooses Reverse/Void
   ↓
Reason required
   ↓
Original payment retained
   ↓
Reversal recorded
   ↓
Invoice balance recalculated
```

---

# 33. Receipt Workflow

## 33.1 Receipt Creation

A receipt should be generated from a valid payment.

```text
Payment recorded
   ↓
Receipt number created
   ↓
Receipt linked to payment
   ↓
Print / View
```

---

## 33.2 Receipt Rule

An issued receipt must not be directly edited.

If the underlying payment is reversed:

- original receipt remains historically traceable;
- receipt may be marked void/reversed according to future implementation.

---

# 34. Outstanding Balance Workflow

A patient may leave with an outstanding balance.

```text
Invoice
   ↓
Partial / No Payment
   ↓
Outstanding Balance
   ↓
Patient returns later
   ↓
Cashier finds patient/invoice
   ↓
Record additional payment
   ↓
Balance recalculated
```

---

# 35. Prescription Workflow

## 35.1 Primary Actor

Dentist

## 35.2 Flow

```text
Encounter
   ↓
Dentist chooses New Prescription
   ↓
Add medicine
   ↓
Add strength
   ↓
Add dose/frequency/duration
   ↓
Add instructions
   ↓
Review
   ↓
Issue prescription
   ↓
Print if required
```

---

## 35.3 Prescription Rule

The system must not autonomously determine:

- medication;
- dosage;
- diagnosis;
- suitability.

The Dentist makes the clinical decision.

---

# 36. Imaging & Document Upload Workflow

## 36.1 Entry Points

- Patient profile;
- encounter;
- documents tab.

## 36.2 Flow

```text
Select patient
   ↓
Choose document/image type
   ↓
Select file
   ↓
Add description
   ↓
Associate encounter if relevant
   ↓
Upload
   ↓
Store metadata
   ↓
Display in patient record
```

---

## 36.3 Validation

At minimum:

- allowed file type;
- allowed file size;
- valid patient;
- authorized user.

Backend implementation must use secure storage/access controls.

---

# 37. Recall / Follow-Up Workflow

## 37.1 Recall States

```text
Upcoming
Due
Contacted
Scheduled
Completed
Overdue
Cancelled
```

---

## 37.2 Recall Creation

A recall may be created from:

- encounter;
- completed procedure;
- patient profile.

Flow:

```text
Dentist recommends follow-up
   ↓
Select recall type
   ↓
Set due date
   ↓
Add notes
   ↓
Save
   ↓
Status = Upcoming
```

---

# 38. Recall Due-Date Behavior

When due date approaches:

`Upcoming`

On due date:

`Due`

If due date passes without completion/scheduling according to rules:

`Overdue`

This may be calculated dynamically rather than manually stored.

---

# 39. Recall Contact Workflow

Receptionist:

```text
Open Due / Overdue Recalls
   ↓
Contact patient
   ↓
Record outcome
   ↓
If appointment booked → Scheduled
If not booked → Contacted
If no longer required → Cancelled with reason
```

---

# 40. Recall Completion

A recall may be considered completed when:

- required follow-up visit has occurred;
- Dentist marks clinical follow-up complete;
- authorized user completes according to final workflow.

---

# 41. Report Generation Workflow

## 41.1 Flow

```text
Open Reports
   ↓
Choose report
   ↓
Set date range / filters
   ↓
Run report
   ↓
Display results
   ↓
Print / Export where permitted
```

---

## 41.2 Report Validation

Reports should:

- use consistent date filters;
- reconcile with source transactions;
- respect role permissions;
- avoid exposing clinical detail to unauthorized roles.

---

# 42. User Management Workflow

## 42.1 Primary Actor

Clinic Administrator

## 42.2 Add User

```text
Users
   ↓
Add User
   ↓
Enter identity/contact
   ↓
Assign role
   ↓
Set active status
   ↓
Save
```

---

## 42.3 Deactivate User

```text
Active User
   ↓
Administrator deactivates
   ↓
User cannot authenticate
   ↓
Historical records remain linked
```

---

## 42.4 Important Rule

A user referenced in historical clinical/financial records should not be hard-deleted.

---

# 43. Clinic Settings Workflow

## 43.1 Primary Actor

Administrator

Settings may include:

- clinic identity;
- logo;
- working hours;
- appointment defaults;
- procedure catalogue;
- payment methods;
- numbering prefixes;
- recall types.

Changes should be saved deliberately and audited where appropriate.

---

# 44. Procedure Catalogue Workflow

## 44.1 Add Procedure

```text
Settings
   ↓
Procedure Catalogue
   ↓
Add Procedure
   ↓
Code / Name / Category
   ↓
Default Price
   ↓
Default Duration
   ↓
Activate
```

---

## 44.2 Deactivate Procedure

Used procedures should be deactivated, not deleted.

Historical patient records must continue displaying the original procedure.

---

# 45. Patient Deactivation Workflow

Patient deactivation should be exceptional.

```text
Patient Profile
   ↓
Administrator chooses Deactivate
   ↓
Reason / confirmation
   ↓
Patient status = Inactive
```

Historical records remain.

Inactive patients should not disappear from reports/history.

---

# 46. Error & Exception Workflow

The system should respond predictably when workflows fail.

Examples:

- duplicate patient warning;
- appointment conflict;
- missing required field;
- invalid state transition;
- unauthorized action;
- payment exceeds balance;
- unsupported file;
- record changed by another user.

The UI should:

- explain the problem;
- preserve entered data where practical;
- avoid silent failure;
- avoid destructive resets.

---

# 47. Unauthorized Workflow

If a user attempts an unauthorized action:

```text
Action requested
   ↓
Frontend may hide action
   ↓
Backend authorization checks
   ↓
Access denied
   ↓
403 / permission message
```

No protected data should be returned.

---

# 48. Concurrency / Record Conflict Direction

The MVP should anticipate that multiple staff may work with the same patient.

Examples:

- Receptionist updates appointment while Dentist opens encounter.
- Cashier processes invoice after Dentist completes procedure.

The backend should avoid silent overwriting.

At minimum:

- use updated timestamps;
- validate current state before state-changing operations;
- reject invalid stale transitions.

---

# 49. Audit Event Expectations

Important workflow events should eventually be auditable.

Suggested events:

```text
PATIENT_CREATED
PATIENT_UPDATED
PATIENT_DEACTIVATED

APPOINTMENT_CREATED
APPOINTMENT_CONFIRMED
APPOINTMENT_RESCHEDULED
APPOINTMENT_CANCELLED
PATIENT_CHECKED_IN

ENCOUNTER_STARTED
ENCOUNTER_COMPLETED
ENCOUNTER_REOPENED

DENTAL_CHART_UPDATED
TREATMENT_PLAN_CREATED
TREATMENT_PLAN_UPDATED
PROCEDURE_COMPLETED
PRESCRIPTION_ISSUED

INVOICE_CREATED
INVOICE_CANCELLED
PAYMENT_RECORDED
PAYMENT_REVERSED
RECEIPT_ISSUED

RECALL_CREATED
RECALL_CONTACTED
RECALL_SCHEDULED
RECALL_COMPLETED

USER_CREATED
USER_DEACTIVATED
SETTING_UPDATED
```

---

# 50. Core State Transition Rules Summary

## Appointment

```text
Scheduled
 ├──→ Confirmed
 ├──→ Cancelled
 ├──→ Rescheduled
 └──→ No Show

Confirmed
 ├──→ Checked In
 ├──→ Cancelled
 ├──→ Rescheduled
 └──→ No Show

Checked In → Waiting → In Treatment → Completed
```

---

## Clinical Encounter

```text
Draft → In Progress → Completed
```

Controlled correction may temporarily reopen a completed encounter.

---

## Treatment Plan

```text
Draft → Proposed
Proposed → Accepted
Proposed → Partially Accepted
Proposed → Cancelled
Accepted / Partially Accepted → In Progress
In Progress → Completed
```

---

## Treatment Item

```text
Proposed
 ├──→ Accepted
 ├──→ Declined
 └──→ Cancelled

Accepted → Planned → In Progress → Completed
```

---

## Invoice

```text
Draft → Unpaid → Partially Paid → Paid
Draft / Unpaid → Cancelled
```

---

## Recall

```text
Upcoming → Due → Contacted → Scheduled → Completed

Due → Overdue
Overdue → Contacted
Overdue → Scheduled
Upcoming / Due / Contacted → Cancelled
```

---

# 51. Cross-Module Handoff Rules

## 51.1 Appointment → Queue

Appointment must be valid and patient checked in.

---

## 51.2 Queue → Encounter

Patient should be waiting/in appropriate state.

Dentist starts encounter.

---

## 51.3 Encounter → Dental Chart

Chart changes should relate to the current encounter when made during treatment.

---

## 51.4 Encounter → Treatment Plan

Plan should reference patient and responsible Dentist.

---

## 51.5 Treatment Plan → Procedure

Procedure should reference accepted/planned treatment item where applicable.

---

## 51.6 Procedure → Invoice

Completed procedure becomes eligible for billing.

---

## 51.7 Invoice → Payment

Payment requires valid outstanding balance.

---

## 51.8 Payment → Receipt

Receipt requires valid payment.

---

## 51.9 Encounter/Procedure → Recall

Dentist may create follow-up based on clinical need.

---

# 52. Workflow Anti-Patterns

The implementation must avoid:

- allowing Cashier to edit clinical treatment;
- allowing Receptionist to prescribe;
- completing appointment before clinical work begins without valid reason;
- deleting completed clinical history;
- deleting finalized payments;
- directly editing issued receipts;
- auto-accepting all treatment-plan items;
- creating payment without invoice/balance context;
- overwriting old dental-chart state;
- losing patient context during cross-module navigation;
- changing state only in the frontend without backend validation;
- allowing impossible state jumps.

---

# 53. MVP Workflow Test Scenarios

## Scenario A — New Patient, Same-Day Treatment

```text
Register Patient
→ Book Appointment
→ Check In
→ Waiting
→ Start Encounter
→ Dental Chart
→ Treatment Plan
→ Accept Item
→ Complete Procedure
→ Invoice
→ Full Payment
→ Receipt
→ Recall
```

Expected result:

- all records linked to same patient;
- finance reconciles;
- clinical history preserved.

---

## Scenario B — Partial Payment

```text
Completed Procedure
→ Invoice UGX 400,000
→ Payment UGX 150,000
→ Receipt UGX 150,000
→ Balance UGX 250,000
→ Later Payment UGX 250,000
→ Second Receipt
→ Invoice Paid
```

Expected result:

- both payments visible;
- both receipts visible;
- final balance zero.

---

## Scenario C — Rescheduled Appointment

```text
Scheduled Appointment
→ Reschedule
→ Original marked Rescheduled
→ New appointment created
→ New appointment appears on calendar
```

Expected result:

- original history preserved.

---

## Scenario D — No Show

```text
Confirmed Appointment
→ Patient does not arrive
→ Mark No Show
→ Patient history retains appointment
→ Report includes no-show
```

---

## Scenario E — Partially Accepted Treatment Plan

```text
Plan has 3 items
→ Patient accepts 2
→ Declines 1
→ Plan = Partially Accepted
→ Accepted items proceed independently
```

---

## Scenario F — Payment Correction

```text
Payment recorded incorrectly
→ Authorized reverse action
→ Reason captured
→ Original payment retained
→ Balance recalculated
```

---

# 54. Frontend Workflow Expectations

The UI should always make the next valid action obvious.

Examples:

Appointment:

- Scheduled → show Confirm / Reschedule / Cancel
- Checked In → show Move to Waiting
- Waiting → Dentist sees Start Treatment

Invoice:

- Unpaid → Record Payment
- Partially Paid → Record Payment
- Paid → View/Print Receipt
- Cancelled → no payment action

Treatment Plan:

- Draft → Propose
- Proposed → Record Acceptance
- Accepted → Start Treatment
- In Progress → Complete items

---

# 55. Backend Workflow Expectations

Laravel backend integration should enforce:

- state transition validity;
- role permission;
- required related records;
- financial calculations;
- historical integrity;
- audit events;
- transaction consistency where multiple records change together.

Important multi-record operations should use database transactions where appropriate.

Examples:

- payment + balance update + receipt;
- procedure completion + treatment item update;
- appointment reschedule + replacement appointment;
- invoice finalization + item totals.

---

# 56. Workflow Freeze Conditions

This workflow specification may be considered ready to freeze when:

- appointment states are accepted;
- queue flow is accepted;
- encounter lifecycle is accepted;
- treatment-plan lifecycle is accepted;
- procedure-to-billing handoff is accepted;
- invoice/payment/receipt lifecycle is accepted;
- recall lifecycle is accepted;
- cross-role handoffs are clear;
- historical-record rules are accepted;
- invalid transitions are defined;
- key exception paths are covered.

---

# 57. Workflow Summary

The MVP should behave as one coordinated system:

```text
RECEPTIONIST
Patient
  ↓
Appointment
  ↓
Check-In
  ↓
Waiting Room

DENTIST
Encounter
  ↓
Dental Chart
  ↓
Diagnosis
  ↓
Treatment Plan
  ↓
Procedure

CASHIER
Invoice
  ↓
Payment
  ↓
Receipt

RECEPTIONIST / DENTIST
Recall
  ↓
Future Appointment
```

The workflow is circular rather than terminal: patients can return repeatedly while their historical records remain intact.

---

# Dental Workflow Specification Decision

**Recommended Status:** READY FOR REVIEW

**Workflow Principle:** Valid state transitions, clear role ownership, preserved history, connected patient journey.

**Next Document:** `06_DENTAL_CHART_SPECIFICATION.md`

The next document should define the detailed odontogram model, tooth-numbering standard, dentition support, tooth surfaces, visual status system, chart-entry history, treatment integration, interaction rules, and UI behavior for dental charting.
