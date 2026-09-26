# Dental Practice Management System
## 08 — Database Design

**Document Version:** 1.0  
**Status:** Draft for Review / Relational Data Model Baseline  
**Prepared For:** Dental Practice Management System MVP  
**Target Market:** Ugandan Dental Clinics  
**Primary Technology Direction:** PHP / Laravel  
**Recommended Database:** MySQL 8+ / MariaDB-compatible relational design  
**Prepared By:** BaCorn Tech  
**Date:** 21 September 2026

---

# 1. Document Purpose

This document defines the relational database design for the Dental Practice Management System MVP.

It translates the approved requirements in:

- `01_PRODUCT_VISION.md`
- `02_MVP_SCOPE.md`
- `03_ROLE_PERMISSION_MATRIX.md`
- `04_INFORMATION_ARCHITECTURE.md`
- `05_DENTAL_WORKFLOW_SPECIFICATION.md`
- `06_DENTAL_CHART_SPECIFICATION.md`
- `07_SRS.md`

into a normalized, Laravel-friendly data model.

The design covers:

- organisations and branches;
- users and roles;
- patients;
- appointments and queue flow;
- medical history;
- clinical encounters;
- dental charting;
- treatment plans;
- procedures/services;
- prescriptions;
- patient documents;
- invoicing;
- payments and receipts;
- recalls/follow-ups;
- settings;
- audit history;
- reference data;
- indexes;
- deletion/retention rules;
- future multi-branch readiness.

This is a **database design document**, not the final Laravel migration code.

Laravel migrations should later be generated from this approved design.

---

# 2. Core Database Design Decision

The MVP will operate as:

```text
1 Dental Organisation
        ↓
1 Main Branch
        ↓
Multiple Users
        ↓
Multiple Patients
```

However, the database should include `organizations` and `branches` from Day 1.

This avoids a future rewrite when the product grows to:

```text
Dental Organisation
 ├── Branch A
 ├── Branch B
 └── Branch C
```

The MVP will therefore seed:

```text
Organization: Demo / Pilot Dental Clinic
Branch: Main Branch
```

but will not implement:

- SaaS subscription tables;
- tenant billing;
- platform administrator;
- self-service tenant onboarding;
- tenant plan limits.

---

# 3. Data Ownership Model

## 3.1 Organisation-Level Data

The following should generally belong to the dental organisation:

- users;
- patients;
- service catalogue;
- recall types;
- payment methods;
- organisation settings.

---

## 3.2 Branch-Level Data

The following should normally belong to a branch:

- appointments;
- queue visits;
- clinical encounters;
- performed procedures;
- invoices;
- payments;
- receipts;
- branch reporting context.

---

## 3.3 Patient Scope

Patients should be owned by the **organisation**, not permanently by one branch.

A patient may have:

- registration branch;
- appointments at different branches in future;
- clinical history across branches;
- financial activity across branches.

For MVP, all activity occurs at the seeded Main Branch.

---

# 4. Naming Conventions

Laravel-friendly conventions should be used.

Examples:

```text
organizations
branches
users
patients
appointments
clinical_encounters
treatment_plans
invoice_items
```

Primary keys:

```text
id BIGINT UNSIGNED
```

Foreign keys:

```text
organization_id
branch_id
patient_id
user_id
appointment_id
```

Timestamps:

```text
created_at
updated_at
```

Use `deleted_at` only where soft deletion is appropriate.

Clinical and financial history should generally use statuses/corrections rather than destructive deletion.

---

# 5. Identifier Strategy

Internal database identifiers should use:

```text
BIGINT UNSIGNED AUTO_INCREMENT
```

Human-readable business references should be stored separately.

Examples:

```text
Patient Number: PAT-000001
Appointment Ref: APT-000001
Encounter Ref: ENC-000001
Treatment Plan: TP-000001
Invoice: INV-000001
Payment: PAY-000001
Receipt: RCT-000001
```

Do not expose internal primary keys as business references.

---

# 6. Money Data Type

Monetary values should use:

```text
DECIMAL(14,2)
```

even though UGX is normally displayed without fractional units.

UI formatting should normally display:

```text
UGX 150,000
```

This design keeps calculations safe and allows future currency flexibility.

Never store money as `FLOAT` or `DOUBLE`.

---

# 7. Status Storage Strategy

Fixed workflow states should normally be stored as short strings controlled by application enums/constants.

Examples:

```text
appointments.status
clinical_encounters.status
treatment_plans.status
invoices.status
recalls.status
```

These values are closed workflow states and should not be freely editable by administrators.

Configurable business values should use reference tables.

Examples:

- appointment types;
- service categories;
- payment methods;
- recall types.

---

# 8. High-Level Entity Relationship Map

```text
organizations
 ├── branches
 ├── users
 │    ├── dentist_profiles
 │    └── user_branches
 ├── patients
 │    ├── patient_guardians
 │    ├── patient_medical_profiles
 │    ├── patient_allergies
 │    ├── patient_medications
 │    ├── patient_conditions
 │    ├── appointments
 │    │    ├── appointment_status_history
 │    │    └── queue_entries
 │    ├── clinical_encounters
 │    │    ├── encounter_findings
 │    │    ├── encounter_diagnoses
 │    │    ├── dental_chart_entries
 │    │    │    └── dental_chart_entry_surfaces
 │    │    ├── procedures_performed
 │    │    └── prescriptions
 │    │         └── prescription_items
 │    ├── treatment_plans
 │    │    └── treatment_plan_items
 │    ├── patient_documents
 │    ├── invoices
 │    │    └── invoice_items
 │    ├── payments
 │    │    └── payment_reversals
 │    ├── receipts
 │    └── recalls
 ├── services
 ├── payment_methods
 ├── recall_types
 ├── appointment_types
 ├── clinic_settings
 └── audit_logs
```

Reference data:

```text
tooth_definitions
dental_conditions
service_categories
```

---

# 9. Table Catalogue

The MVP database should contain the following main table groups.

## 9.1 Organisation & Administration

- organizations
- branches
- roles
- users
- user_branches
- dentist_profiles
- clinic_settings
- branch_working_hours
- numbering_sequences

## 9.2 Patient

- patients
- patient_guardians
- patient_medical_profiles
- patient_allergies
- patient_medications
- patient_conditions
- medical_history_reviews

## 9.3 Scheduling

- appointment_types
- appointments
- appointment_status_history
- appointment_contact_logs
- queue_entries

## 9.4 Clinical

- clinical_encounters
- encounter_findings
- encounter_diagnoses
- tooth_definitions
- dental_conditions
- dental_chart_entries
- dental_chart_entry_surfaces

## 9.5 Treatment

- service_categories
- services
- treatment_plans
- treatment_plan_items
- procedures_performed

## 9.6 Prescription & Documents

- prescriptions
- prescription_items
- patient_documents

## 9.7 Finance

- payment_methods
- invoices
- invoice_items
- payments
- payment_reversals
- receipts

## 9.8 Follow-Up

- recall_types
- recalls

## 9.9 Audit

- audit_logs

---

# 10. `organizations`

Represents one subscribing dental clinic/organisation.

For MVP, one row is seeded.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| name | VARCHAR(150) | No | Clinic/organisation name |
| legal_name | VARCHAR(180) | Yes | Optional legal entity |
| phone | VARCHAR(30) | Yes | Main contact |
| email | VARCHAR(150) | Yes | Main email |
| website | VARCHAR(180) | Yes | Optional |
| address | VARCHAR(255) | Yes | Main address |
| district | VARCHAR(100) | Yes | Uganda/local address |
| town_city | VARCHAR(100) | Yes | |
| logo_path | VARCHAR(255) | Yes | Stored file path |
| default_currency | CHAR(3) | No | Default `UGX` |
| timezone | VARCHAR(60) | No | Default `Africa/Kampala` |
| status | VARCHAR(30) | No | `active`, `inactive` |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Indexes

- `INDEX(status)`
- `INDEX(name)`

---

# 11. `branches`

Represents clinic locations.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| organization_id | BIGINT UNSIGNED | No | FK → organizations |
| code | VARCHAR(30) | No | e.g. `MAIN` |
| name | VARCHAR(120) | No | e.g. Main Branch |
| phone | VARCHAR(30) | Yes | |
| email | VARCHAR(150) | Yes | |
| address | VARCHAR(255) | Yes | |
| district | VARCHAR(100) | Yes | |
| town_city | VARCHAR(100) | Yes | |
| is_main | BOOLEAN | No | Default false |
| status | VARCHAR(30) | No | active/inactive |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Constraints

```text
UNIQUE(organization_id, code)
```

### Indexes

- `INDEX(organization_id, status)`
- `INDEX(organization_id, is_main)`

---

# 12. `roles`

Stores fixed MVP role definitions.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| code | VARCHAR(50) | No | Unique |
| name | VARCHAR(100) | No | |
| description | VARCHAR(255) | Yes | |
| is_system | BOOLEAN | No | True for built-in roles |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

Seeded roles:

```text
clinic_administrator
dentist
receptionist
cashier
```

### Constraint

```text
UNIQUE(code)
```

---

# 13. `users`

Stores authenticated clinic users.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| organization_id | BIGINT UNSIGNED | No | FK |
| role_id | BIGINT UNSIGNED | No | FK |
| first_name | VARCHAR(80) | No | |
| last_name | VARCHAR(80) | No | |
| other_name | VARCHAR(80) | Yes | |
| email | VARCHAR(150) | No | Login/email |
| phone | VARCHAR(30) | Yes | |
| password | VARCHAR(255) | No | Laravel hash |
| job_title | VARCHAR(100) | Yes | |
| profile_photo_path | VARCHAR(255) | Yes | |
| status | VARCHAR(30) | No | active/inactive |
| last_login_at | TIMESTAMP | Yes | |
| email_verified_at | TIMESTAMP | Yes | Optional |
| remember_token | VARCHAR(100) | Yes | Laravel |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Constraints

```text
UNIQUE(organization_id, email)
```

### Indexes

- `INDEX(organization_id, role_id)`
- `INDEX(organization_id, status)`
- `INDEX(last_name, first_name)`

### Rule

Users should be **deactivated**, not hard-deleted, once referenced in history.

---

# 14. `user_branches`

Allows future multi-branch user assignment.

For MVP, every user is assigned to the Main Branch.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| user_id | BIGINT UNSIGNED | No | FK |
| branch_id | BIGINT UNSIGNED | No | FK |
| is_primary | BOOLEAN | No | Default false |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Constraint

```text
UNIQUE(user_id, branch_id)
```

---

# 15. `dentist_profiles`

Stores professional information for users with Dentist role.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| user_id | BIGINT UNSIGNED | No | FK → users |
| professional_number | VARCHAR(100) | Yes | Registration/licence field |
| specialty | VARCHAR(120) | Yes | Optional |
| qualifications | VARCHAR(255) | Yes | Optional |
| signature_path | VARCHAR(255) | Yes | Future prescription/print use |
| bio | TEXT | Yes | Optional |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Constraint

```text
UNIQUE(user_id)
```

---

# 16. `clinic_settings`

One organisation-level configuration row.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| organization_id | BIGINT UNSIGNED | No | FK |
| patient_prefix | VARCHAR(20) | No | e.g. PAT |
| appointment_prefix | VARCHAR(20) | No | APT |
| encounter_prefix | VARCHAR(20) | No | ENC |
| treatment_plan_prefix | VARCHAR(20) | No | TP |
| invoice_prefix | VARCHAR(20) | No | INV |
| payment_prefix | VARCHAR(20) | No | PAY |
| receipt_prefix | VARCHAR(20) | No | RCT |
| default_appointment_minutes | INT UNSIGNED | No | |
| allow_authorized_discount | BOOLEAN | No | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Constraint

```text
UNIQUE(organization_id)
```

---

# 17. `branch_working_hours`

Stores branch opening hours.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| branch_id | BIGINT UNSIGNED | No | FK |
| day_of_week | TINYINT UNSIGNED | No | 1–7 |
| opens_at | TIME | Yes | Null if closed |
| closes_at | TIME | Yes | |
| is_closed | BOOLEAN | No | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Constraint

```text
UNIQUE(branch_id, day_of_week)
```

---

# 18. `numbering_sequences`

Provides safe business-reference generation.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| organization_id | BIGINT UNSIGNED | No | FK |
| branch_id | BIGINT UNSIGNED | Yes | Optional branch-specific sequence |
| sequence_type | VARCHAR(40) | No | patient/invoice/etc. |
| prefix | VARCHAR(20) | No | |
| next_number | BIGINT UNSIGNED | No | |
| padding_length | TINYINT UNSIGNED | No | e.g. 6 |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Constraint

```text
UNIQUE(organization_id, branch_id, sequence_type)
```

### Rule

Sequence allocation must be transaction-safe.

---

# 19. `patients`

Stores patient demographic identity.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| organization_id | BIGINT UNSIGNED | No | FK |
| registration_branch_id | BIGINT UNSIGNED | No | FK → branches |
| patient_number | VARCHAR(40) | No | Human reference |
| first_name | VARCHAR(80) | No | |
| last_name | VARCHAR(80) | No | |
| other_name | VARCHAR(80) | Yes | |
| date_of_birth | DATE | Yes | |
| sex | VARCHAR(20) | No | |
| phone | VARCHAR(30) | Yes | |
| alternate_phone | VARCHAR(30) | Yes | |
| email | VARCHAR(150) | Yes | |
| occupation | VARCHAR(120) | Yes | |
| district | VARCHAR(100) | Yes | |
| town_area | VARCHAR(120) | Yes | |
| address_landmark | VARCHAR(255) | Yes | |
| emergency_contact_name | VARCHAR(150) | Yes | |
| emergency_contact_phone | VARCHAR(30) | Yes | |
| emergency_contact_relationship | VARCHAR(80) | Yes | |
| status | VARCHAR(30) | No | active/inactive |
| registered_by | BIGINT UNSIGNED | No | FK → users |
| registered_at | TIMESTAMP | No | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Constraints

```text
UNIQUE(organization_id, patient_number)
```

### Indexes

- `INDEX(organization_id, status)`
- `INDEX(organization_id, last_name, first_name)`
- `INDEX(organization_id, phone)`
- `INDEX(registration_branch_id)`
- `INDEX(date_of_birth)`

### Rule

Do not hard-delete a patient with clinical/financial history.

---

# 20. `patient_guardians`

Supports minor patients and multiple guardian records.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| patient_id | BIGINT UNSIGNED | No | FK |
| full_name | VARCHAR(150) | No | |
| relationship | VARCHAR(80) | No | |
| phone | VARCHAR(30) | No | |
| alternate_phone | VARCHAR(30) | Yes | |
| email | VARCHAR(150) | Yes | |
| is_primary | BOOLEAN | No | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Index

- `INDEX(patient_id, is_primary)`

---

# 21. `patient_medical_profiles`

Stores current medical-summary information.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| patient_id | BIGINT UNSIGNED | No | FK |
| relevant_dental_history | TEXT | Yes | |
| pregnancy_status | VARCHAR(40) | Yes | Clinically applicable |
| other_notes | TEXT | Yes | |
| last_reviewed_at | TIMESTAMP | Yes | |
| last_reviewed_by | BIGINT UNSIGNED | Yes | FK → users |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Constraint

```text
UNIQUE(patient_id)
```

Detailed allergies/medications/conditions should use child tables.

---

# 22. `patient_allergies`

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| patient_id | BIGINT UNSIGNED | No | FK |
| allergen | VARCHAR(150) | No | |
| reaction | VARCHAR(255) | Yes | |
| severity | VARCHAR(30) | Yes | |
| status | VARCHAR(30) | No | active/inactive |
| recorded_by | BIGINT UNSIGNED | No | FK |
| recorded_at | TIMESTAMP | No | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Index

- `INDEX(patient_id, status)`

---

# 23. `patient_medications`

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| patient_id | BIGINT UNSIGNED | No | FK |
| medication_name | VARCHAR(180) | No | |
| dose_notes | VARCHAR(255) | Yes | |
| status | VARCHAR(30) | No | current/stopped |
| recorded_by | BIGINT UNSIGNED | No | FK |
| recorded_at | TIMESTAMP | No | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

---

# 24. `patient_conditions`

Stores relevant medical conditions.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| patient_id | BIGINT UNSIGNED | No | FK |
| condition_name | VARCHAR(180) | No | |
| notes | TEXT | Yes | |
| status | VARCHAR(30) | No | active/resolved/history |
| recorded_by | BIGINT UNSIGNED | No | FK |
| recorded_at | TIMESTAMP | No | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

---

# 25. `medical_history_reviews`

Tracks Dentist review of medical information.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| patient_id | BIGINT UNSIGNED | No | FK |
| encounter_id | BIGINT UNSIGNED | Yes | FK |
| reviewed_by | BIGINT UNSIGNED | No | FK → users |
| reviewed_at | TIMESTAMP | No | |
| change_summary | TEXT | Yes | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

---

# 26. `appointment_types`

Configurable appointment categories.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| organization_id | BIGINT UNSIGNED | No | FK |
| name | VARCHAR(120) | No | |
| default_duration_minutes | INT UNSIGNED | No | |
| description | VARCHAR(255) | Yes | |
| status | VARCHAR(30) | No | active/inactive |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Example seed data

- Consultation
- Review
- Cleaning / Scaling
- Extraction
- Root Canal
- Emergency
- Other

---

# 27. `appointments`

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| organization_id | BIGINT UNSIGNED | No | FK |
| branch_id | BIGINT UNSIGNED | No | FK |
| appointment_number | VARCHAR(40) | No | |
| patient_id | BIGINT UNSIGNED | No | FK |
| dentist_id | BIGINT UNSIGNED | No | FK → users |
| appointment_type_id | BIGINT UNSIGNED | Yes | FK |
| scheduled_start | DATETIME | No | |
| scheduled_end | DATETIME | No | |
| reason | VARCHAR(255) | Yes | |
| notes | TEXT | Yes | |
| status | VARCHAR(30) | No | |
| cancellation_reason | VARCHAR(255) | Yes | |
| rescheduled_from_id | BIGINT UNSIGNED | Yes | Self FK |
| created_by | BIGINT UNSIGNED | No | FK |
| confirmed_at | TIMESTAMP | Yes | |
| checked_in_at | TIMESTAMP | Yes | |
| completed_at | TIMESTAMP | Yes | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Constraints

```text
UNIQUE(organization_id, appointment_number)
```

### Indexes

- `INDEX(branch_id, scheduled_start)`
- `INDEX(dentist_id, scheduled_start)`
- `INDEX(patient_id, scheduled_start)`
- `INDEX(branch_id, status, scheduled_start)`
- `INDEX(rescheduled_from_id)`

---

# 28. Appointment Status Values

Allowed application values:

```text
scheduled
confirmed
checked_in
waiting
in_treatment
completed
cancelled
no_show
rescheduled
```

Transitions are enforced in backend business logic.

---

# 29. `appointment_status_history`

Preserves every important appointment state change.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| appointment_id | BIGINT UNSIGNED | No | FK |
| from_status | VARCHAR(30) | Yes | |
| to_status | VARCHAR(30) | No | |
| reason | VARCHAR(255) | Yes | |
| changed_by | BIGINT UNSIGNED | No | FK |
| changed_at | TIMESTAMP | No | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Index

- `INDEX(appointment_id, changed_at)`

---

# 30. `appointment_contact_logs`

Stores confirmation/contact outcomes.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| appointment_id | BIGINT UNSIGNED | No | FK |
| contact_method | VARCHAR(30) | No | phone/other |
| outcome | VARCHAR(40) | No | confirmed/no_answer/etc. |
| notes | VARCHAR(255) | Yes | |
| contacted_by | BIGINT UNSIGNED | No | FK |
| contacted_at | TIMESTAMP | No | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

---

# 31. `queue_entries`

Tracks the operational visit flow.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| branch_id | BIGINT UNSIGNED | No | FK |
| appointment_id | BIGINT UNSIGNED | No | FK |
| patient_id | BIGINT UNSIGNED | No | FK |
| dentist_id | BIGINT UNSIGNED | No | FK |
| status | VARCHAR(30) | No | |
| arrived_at | TIMESTAMP | No | |
| waiting_at | TIMESTAMP | Yes | |
| treatment_started_at | TIMESTAMP | Yes | |
| ready_for_checkout_at | TIMESTAMP | Yes | |
| completed_at | TIMESTAMP | Yes | |
| updated_by | BIGINT UNSIGNED | No | FK |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Constraint

```text
UNIQUE(appointment_id)
```

### Status values

```text
checked_in
waiting
in_treatment
ready_for_checkout
completed
```

### Indexes

- `INDEX(branch_id, status, arrived_at)`
- `INDEX(dentist_id, status)`

---

# 32. `clinical_encounters`

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| organization_id | BIGINT UNSIGNED | No | FK |
| branch_id | BIGINT UNSIGNED | No | FK |
| encounter_number | VARCHAR(40) | No | |
| patient_id | BIGINT UNSIGNED | No | FK |
| appointment_id | BIGINT UNSIGNED | Yes | FK |
| dentist_id | BIGINT UNSIGNED | No | FK → users |
| status | VARCHAR(30) | No | draft/in_progress/completed |
| chief_complaint | TEXT | Yes | |
| examination_notes | TEXT | Yes | |
| clinical_notes | TEXT | Yes | |
| treatment_discussion | TEXT | Yes | |
| follow_up_instructions | TEXT | Yes | |
| started_at | TIMESTAMP | Yes | |
| completed_at | TIMESTAMP | Yes | |
| reopened_at | TIMESTAMP | Yes | |
| reopened_by | BIGINT UNSIGNED | Yes | FK |
| reopen_reason | VARCHAR(255) | Yes | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Constraints

```text
UNIQUE(organization_id, encounter_number)
```

### Indexes

- `INDEX(patient_id, started_at)`
- `INDEX(dentist_id, started_at)`
- `INDEX(branch_id, status, started_at)`
- `INDEX(appointment_id)`

---

# 33. `encounter_findings`

Stores clinical findings that are not necessarily dental-chart entries.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| encounter_id | BIGINT UNSIGNED | No | FK |
| patient_id | BIGINT UNSIGNED | No | FK |
| tooth_fdi_code | CHAR(2) | Yes | Optional |
| finding | VARCHAR(255) | No | |
| notes | TEXT | Yes | |
| recorded_by | BIGINT UNSIGNED | No | FK |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Indexes

- `INDEX(encounter_id)`
- `INDEX(patient_id, tooth_fdi_code)`

---

# 34. `encounter_diagnoses`

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| encounter_id | BIGINT UNSIGNED | No | FK |
| patient_id | BIGINT UNSIGNED | No | FK |
| tooth_fdi_code | CHAR(2) | Yes | Optional |
| diagnosis | VARCHAR(255) | No | |
| notes | TEXT | Yes | |
| recorded_by | BIGINT UNSIGNED | No | FK |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

---

# 35. `tooth_definitions`

Reference table containing supported FDI teeth.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| fdi_code | CHAR(2) | No | e.g. `16` |
| dentition | VARCHAR(20) | No | permanent/primary |
| quadrant | TINYINT UNSIGNED | No | |
| arch | VARCHAR(20) | No | maxillary/mandibular |
| side | VARCHAR(10) | No | left/right |
| position | TINYINT UNSIGNED | No | |
| tooth_type | VARCHAR(60) | No | |
| is_anterior | BOOLEAN | No | |
| status | VARCHAR(30) | No | active |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Constraint

```text
UNIQUE(fdi_code)
```

Seed with all supported permanent and primary FDI codes.

---

# 36. `dental_conditions`

Reference table for chartable findings/treatment-state types.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| code | VARCHAR(50) | No | Stable code |
| name | VARCHAR(120) | No | |
| entry_category | VARCHAR(40) | No | condition/existing/etc. |
| surface_mode | VARCHAR(30) | No | whole_tooth/surface/either |
| description | VARCHAR(255) | Yes | |
| status | VARCHAR(30) | No | active/inactive |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Example values

```text
CARIES
MISSING
IMPACTED
FRACTURED
EXTRACTION_REQUIRED
RESTORATION
CROWN
IMPLANT
ROOT_CANAL_TREATED
EXTRACTED
```

### Constraint

```text
UNIQUE(code)
```

---

# 37. `dental_chart_entries`

Central longitudinal odontogram table.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| organization_id | BIGINT UNSIGNED | No | FK |
| patient_id | BIGINT UNSIGNED | No | FK |
| encounter_id | BIGINT UNSIGNED | Yes | FK |
| tooth_definition_id | BIGINT UNSIGNED | No | FK |
| dental_condition_id | BIGINT UNSIGNED | No | FK |
| entry_type | VARCHAR(40) | No | condition/existing/planned/completed/observation |
| status | VARCHAR(30) | No | active/superseded/corrected |
| notes | TEXT | Yes | |
| source_type | VARCHAR(30) | No | encounter/baseline/procedure/import |
| source_id | BIGINT UNSIGNED | Yes | Polymorphic logical link |
| recorded_by | BIGINT UNSIGNED | No | FK → users |
| recorded_at | TIMESTAMP | No | |
| corrected_entry_id | BIGINT UNSIGNED | Yes | Self FK |
| correction_reason | VARCHAR(255) | Yes | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Indexes

- `INDEX(patient_id, tooth_definition_id, status)`
- `INDEX(patient_id, recorded_at)`
- `INDEX(encounter_id)`
- `INDEX(entry_type, status)`
- `INDEX(source_type, source_id)`

### Rule

Do not hard-delete chart entries from completed encounters.

---

# 38. `dental_chart_entry_surfaces`

Stores structured surfaces for a chart entry.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| dental_chart_entry_id | BIGINT UNSIGNED | No | FK |
| surface_code | CHAR(1) | No | M/D/B/L/O/F/I |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Constraint

```text
UNIQUE(dental_chart_entry_id, surface_code)
```

### Rule

Backend validation must confirm the selected surface is valid for the tooth.

---

# 39. `service_categories`

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| organization_id | BIGINT UNSIGNED | No | FK |
| name | VARCHAR(120) | No | |
| description | VARCHAR(255) | Yes | |
| status | VARCHAR(30) | No | active/inactive |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

Example categories:

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

---

# 40. `services`

Procedure/service catalogue.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| organization_id | BIGINT UNSIGNED | No | FK |
| service_category_id | BIGINT UNSIGNED | Yes | FK |
| code | VARCHAR(40) | No | |
| name | VARCHAR(150) | No | |
| description | TEXT | Yes | |
| default_price | DECIMAL(14,2) | No | |
| default_duration_minutes | INT UNSIGNED | Yes | |
| requires_tooth | BOOLEAN | No | |
| supports_surfaces | BOOLEAN | No | |
| status | VARCHAR(30) | No | active/inactive |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Constraint

```text
UNIQUE(organization_id, code)
```

### Rule

Used services are deactivated, not deleted.

---

# 41. `treatment_plans`

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| organization_id | BIGINT UNSIGNED | No | FK |
| branch_id | BIGINT UNSIGNED | No | FK |
| treatment_plan_number | VARCHAR(40) | No | |
| patient_id | BIGINT UNSIGNED | No | FK |
| encounter_id | BIGINT UNSIGNED | Yes | FK |
| dentist_id | BIGINT UNSIGNED | No | FK |
| status | VARCHAR(30) | No | |
| notes | TEXT | Yes | |
| proposed_at | TIMESTAMP | Yes | |
| accepted_at | TIMESTAMP | Yes | |
| completed_at | TIMESTAMP | Yes | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Constraints

```text
UNIQUE(organization_id, treatment_plan_number)
```

### Indexes

- `INDEX(patient_id, created_at)`
- `INDEX(dentist_id, status)`
- `INDEX(branch_id, status)`

---

# 42. `treatment_plan_items`

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| treatment_plan_id | BIGINT UNSIGNED | No | FK |
| service_id | BIGINT UNSIGNED | No | FK |
| tooth_definition_id | BIGINT UNSIGNED | Yes | FK |
| quantity | DECIMAL(10,2) | No | Default 1 |
| unit_price | DECIMAL(14,2) | No | Snapshot of price |
| discount_amount | DECIMAL(14,2) | No | Default 0 |
| total_amount | DECIMAL(14,2) | No | |
| acceptance_status | VARCHAR(30) | No | |
| treatment_status | VARCHAR(30) | No | |
| clinical_priority | VARCHAR(30) | Yes | |
| notes | TEXT | Yes | |
| accepted_at | TIMESTAMP | Yes | |
| completed_at | TIMESTAMP | Yes | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Indexes

- `INDEX(treatment_plan_id, treatment_status)`
- `INDEX(service_id)`
- `INDEX(tooth_definition_id)`

### Surface storage

If treatment-plan items require surfaces, use an additional table:

```text
treatment_plan_item_surfaces
- id
- treatment_plan_item_id
- surface_code
```

This is recommended for consistency with odontogram surface-level treatment.

---

# 43. `treatment_plan_item_surfaces`

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| treatment_plan_item_id | BIGINT UNSIGNED | No | FK |
| surface_code | CHAR(1) | No | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Constraint

```text
UNIQUE(treatment_plan_item_id, surface_code)
```

---

# 44. Treatment Plan Status Values

Plan:

```text
draft
proposed
accepted
partially_accepted
in_progress
completed
cancelled
```

Item acceptance:

```text
proposed
accepted
declined
```

Item treatment:

```text
planned
in_progress
completed
cancelled
```

The UI may combine these concepts visually, but the database should keep acceptance and treatment progression separate.

---

# 45. `procedures_performed`

Represents actual clinical procedures performed.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| organization_id | BIGINT UNSIGNED | No | FK |
| branch_id | BIGINT UNSIGNED | No | FK |
| patient_id | BIGINT UNSIGNED | No | FK |
| encounter_id | BIGINT UNSIGNED | No | FK |
| treatment_plan_item_id | BIGINT UNSIGNED | Yes | FK |
| service_id | BIGINT UNSIGNED | No | FK |
| dentist_id | BIGINT UNSIGNED | No | FK |
| tooth_definition_id | BIGINT UNSIGNED | Yes | FK |
| quantity | DECIMAL(10,2) | No | |
| unit_price | DECIMAL(14,2) | No | Snapshot |
| total_amount | DECIMAL(14,2) | No | |
| clinical_note | TEXT | Yes | |
| status | VARCHAR(30) | No | completed/cancelled |
| performed_at | TIMESTAMP | No | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Indexes

- `INDEX(patient_id, performed_at)`
- `INDEX(encounter_id)`
- `INDEX(treatment_plan_item_id)`
- `INDEX(branch_id, performed_at)`
- `INDEX(dentist_id, performed_at)`

### Surfaces

Where needed, use:

```text
procedure_surfaces
- id
- procedure_performed_id
- surface_code
```

---

# 46. `procedure_surfaces`

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| procedure_performed_id | BIGINT UNSIGNED | No | FK |
| surface_code | CHAR(1) | No | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Constraint

```text
UNIQUE(procedure_performed_id, surface_code)
```

---

# 47. `prescriptions`

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| organization_id | BIGINT UNSIGNED | No | FK |
| branch_id | BIGINT UNSIGNED | No | FK |
| prescription_number | VARCHAR(40) | No | |
| patient_id | BIGINT UNSIGNED | No | FK |
| encounter_id | BIGINT UNSIGNED | No | FK |
| dentist_id | BIGINT UNSIGNED | No | FK |
| status | VARCHAR(30) | No | draft/issued/void |
| instructions | TEXT | Yes | General |
| issued_at | TIMESTAMP | Yes | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Constraint

```text
UNIQUE(organization_id, prescription_number)
```

---

# 48. `prescription_items`

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| prescription_id | BIGINT UNSIGNED | No | FK |
| medicine_name | VARCHAR(180) | No | |
| strength | VARCHAR(80) | Yes | |
| dose | VARCHAR(100) | Yes | |
| route | VARCHAR(80) | Yes | |
| frequency | VARCHAR(100) | Yes | |
| duration | VARCHAR(100) | Yes | |
| quantity | VARCHAR(80) | Yes | |
| instructions | VARCHAR(255) | Yes | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Note

MVP stores Dentist-entered medication information.

It does not attempt autonomous prescribing or drug-decision support.

---

# 49. `patient_documents`

Stores attachment metadata.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| organization_id | BIGINT UNSIGNED | No | FK |
| patient_id | BIGINT UNSIGNED | No | FK |
| encounter_id | BIGINT UNSIGNED | Yes | FK |
| document_type | VARCHAR(50) | No | xray/photo/referral/etc. |
| title | VARCHAR(180) | No | |
| description | TEXT | Yes | |
| storage_disk | VARCHAR(40) | No | |
| storage_path | VARCHAR(255) | No | |
| original_filename | VARCHAR(255) | No | |
| mime_type | VARCHAR(120) | No | |
| file_size_bytes | BIGINT UNSIGNED | No | |
| file_hash | VARCHAR(128) | Yes | Optional integrity |
| uploaded_by | BIGINT UNSIGNED | No | FK |
| document_date | DATE | Yes | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Indexes

- `INDEX(patient_id, document_type)`
- `INDEX(encounter_id)`

### Rule

Store files outside the public web root and authorize downloads.

---

# 50. `payment_methods`

Configurable organisation-level payment methods.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| organization_id | BIGINT UNSIGNED | No | FK |
| code | VARCHAR(40) | No | |
| name | VARCHAR(80) | No | |
| status | VARCHAR(30) | No | active/inactive |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

Seed:

- CASH
- MOBILE_MONEY
- BANK
- CARD
- OTHER

### Constraint

```text
UNIQUE(organization_id, code)
```

---

# 51. `invoices`

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| organization_id | BIGINT UNSIGNED | No | FK |
| branch_id | BIGINT UNSIGNED | No | FK |
| invoice_number | VARCHAR(40) | No | |
| patient_id | BIGINT UNSIGNED | No | FK |
| encounter_id | BIGINT UNSIGNED | Yes | FK |
| status | VARCHAR(30) | No | |
| invoice_date | DATE | No | |
| subtotal | DECIMAL(14,2) | No | |
| discount_amount | DECIMAL(14,2) | No | Default 0 |
| total_amount | DECIMAL(14,2) | No | |
| paid_amount | DECIMAL(14,2) | No | Default 0 |
| balance_amount | DECIMAL(14,2) | No | |
| notes | TEXT | Yes | |
| created_by | BIGINT UNSIGNED | No | FK |
| cancelled_by | BIGINT UNSIGNED | Yes | FK |
| cancelled_at | TIMESTAMP | Yes | |
| cancellation_reason | VARCHAR(255) | Yes | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Constraint

```text
UNIQUE(organization_id, invoice_number)
```

### Indexes

- `INDEX(patient_id, invoice_date)`
- `INDEX(branch_id, invoice_date)`
- `INDEX(branch_id, status, invoice_date)`

### Rule

`paid_amount` and `balance_amount` are maintained transactionally from valid payments.

---

# 52. `invoice_items`

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| invoice_id | BIGINT UNSIGNED | No | FK |
| procedure_performed_id | BIGINT UNSIGNED | Yes | FK |
| service_id | BIGINT UNSIGNED | Yes | FK |
| description | VARCHAR(255) | No | Snapshot |
| quantity | DECIMAL(10,2) | No | |
| unit_price | DECIMAL(14,2) | No | |
| discount_amount | DECIMAL(14,2) | No | Default 0 |
| line_total | DECIMAL(14,2) | No | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Rule

Store description and price snapshots so later catalogue changes do not rewrite historical invoices.

---

# 53. Invoice Status Values

```text
draft
unpaid
partially_paid
paid
cancelled
```

Status should be derived/validated using financial rules.

---

# 54. `payments`

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| organization_id | BIGINT UNSIGNED | No | FK |
| branch_id | BIGINT UNSIGNED | No | FK |
| payment_number | VARCHAR(40) | No | |
| patient_id | BIGINT UNSIGNED | No | FK |
| invoice_id | BIGINT UNSIGNED | No | FK |
| payment_method_id | BIGINT UNSIGNED | No | FK |
| amount | DECIMAL(14,2) | No | |
| external_reference | VARCHAR(120) | Yes | Mobile Money/bank/card ref |
| status | VARCHAR(30) | No | posted/reversed |
| notes | VARCHAR(255) | Yes | |
| received_by | BIGINT UNSIGNED | No | FK → users |
| paid_at | TIMESTAMP | No | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Constraint

```text
UNIQUE(organization_id, payment_number)
```

### Indexes

- `INDEX(invoice_id, status)`
- `INDEX(patient_id, paid_at)`
- `INDEX(branch_id, paid_at)`
- `INDEX(payment_method_id, paid_at)`

### Rule

Do not hard-delete posted payments.

---

# 55. `payment_reversals`

Stores controlled payment corrections.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| payment_id | BIGINT UNSIGNED | No | FK |
| reason | VARCHAR(255) | No | |
| reversed_by | BIGINT UNSIGNED | No | FK |
| reversed_at | TIMESTAMP | No | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Constraint

Normally one active reversal per payment:

```text
UNIQUE(payment_id)
```

### Transaction Rule

A payment reversal must update:

- payment status;
- invoice paid amount;
- invoice balance;
- invoice status;
- receipt state where applicable

within one database transaction.

---

# 56. `receipts`

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| organization_id | BIGINT UNSIGNED | No | FK |
| branch_id | BIGINT UNSIGNED | No | FK |
| receipt_number | VARCHAR(40) | No | |
| payment_id | BIGINT UNSIGNED | No | FK |
| patient_id | BIGINT UNSIGNED | No | FK |
| invoice_id | BIGINT UNSIGNED | No | FK |
| amount | DECIMAL(14,2) | No | Snapshot |
| status | VARCHAR(30) | No | issued/void |
| issued_by | BIGINT UNSIGNED | No | FK |
| issued_at | TIMESTAMP | No | |
| voided_by | BIGINT UNSIGNED | Yes | FK |
| voided_at | TIMESTAMP | Yes | |
| void_reason | VARCHAR(255) | Yes | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Constraints

```text
UNIQUE(organization_id, receipt_number)
UNIQUE(payment_id)
```

### Rule

Receipts are immutable snapshots after issuance.

---

# 57. `recall_types`

Configurable recall/follow-up categories.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| organization_id | BIGINT UNSIGNED | No | FK |
| name | VARCHAR(120) | No | |
| default_interval_days | INT UNSIGNED | Yes | Optional |
| description | VARCHAR(255) | Yes | |
| status | VARCHAR(30) | No | active/inactive |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

Seed examples:

- Routine Dental Review
- Scaling Review
- Post-Extraction Review
- Root Canal Follow-Up
- Denture Review
- Orthodontic Review
- Custom Follow-Up

---

# 58. `recalls`

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| organization_id | BIGINT UNSIGNED | No | FK |
| branch_id | BIGINT UNSIGNED | No | FK |
| patient_id | BIGINT UNSIGNED | No | FK |
| recall_type_id | BIGINT UNSIGNED | No | FK |
| encounter_id | BIGINT UNSIGNED | Yes | FK |
| dentist_id | BIGINT UNSIGNED | Yes | FK |
| due_date | DATE | No | |
| status | VARCHAR(30) | No | |
| contact_outcome | VARCHAR(80) | Yes | |
| notes | TEXT | Yes | |
| scheduled_appointment_id | BIGINT UNSIGNED | Yes | FK |
| created_by | BIGINT UNSIGNED | No | FK |
| contacted_at | TIMESTAMP | Yes | |
| completed_at | TIMESTAMP | Yes | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

### Indexes

- `INDEX(branch_id, status, due_date)`
- `INDEX(patient_id, due_date)`
- `INDEX(dentist_id, due_date)`

### Status values

```text
upcoming
due
contacted
scheduled
completed
overdue
cancelled
```

Some due/overdue state may be derived dynamically from `due_date`.

---

# 59. `audit_logs`

Records important security, clinical, finance, and administration actions.

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | No | PK |
| organization_id | BIGINT UNSIGNED | No | FK |
| branch_id | BIGINT UNSIGNED | Yes | FK |
| user_id | BIGINT UNSIGNED | Yes | FK |
| event_type | VARCHAR(80) | No | Stable event code |
| auditable_type | VARCHAR(120) | Yes | Entity type |
| auditable_id | BIGINT UNSIGNED | Yes | Entity id |
| patient_id | BIGINT UNSIGNED | Yes | Faster patient audit |
| description | VARCHAR(255) | Yes | |
| old_values | JSON | Yes | Sensitive; control access |
| new_values | JSON | Yes | Sensitive; control access |
| ip_address | VARCHAR(45) | Yes | |
| user_agent | VARCHAR(255) | Yes | |
| created_at | TIMESTAMP | No | |

### Indexes

- `INDEX(organization_id, created_at)`
- `INDEX(user_id, created_at)`
- `INDEX(patient_id, created_at)`
- `INDEX(event_type, created_at)`
- `INDEX(auditable_type, auditable_id)`

### Rule

Audit logs should not be editable through normal application CRUD.

---

# 60. Recommended Audit Event Codes

Examples:

```text
USER_LOGIN
USER_CREATED
USER_DEACTIVATED

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

DENTAL_CHART_ENTRY_CREATED
DENTAL_CHART_ENTRY_CORRECTED

TREATMENT_PLAN_CREATED
TREATMENT_PLAN_ACCEPTED
PROCEDURE_COMPLETED
PRESCRIPTION_ISSUED

INVOICE_CREATED
INVOICE_CANCELLED
PAYMENT_RECORDED
PAYMENT_REVERSED
RECEIPT_ISSUED

RECALL_CREATED
RECALL_CONTACTED
RECALL_COMPLETED

SETTING_UPDATED
```

---

# 61. Foreign-Key Deletion Strategy

Use foreign keys deliberately.

## 61.1 RESTRICT / NO ACTION

Recommended for important history:

- patients referenced by encounters;
- users referenced by clinical records;
- invoices with payments;
- payments with receipts;
- services used by treatment/procedure/invoice history;
- appointments referenced by encounters;
- chart entries linked to completed encounters.

---

## 61.2 CASCADE

Acceptable for true child records whose parent owns their lifecycle.

Examples:

- dental_chart_entry_surfaces → dental_chart_entries
- treatment_plan_item_surfaces → treatment_plan_items
- procedure_surfaces → procedures_performed
- prescription_items → prescriptions

Even here, application-level rules should prevent deleting finalized clinical parents.

---

## 61.3 SET NULL

Suitable for optional references where history must survive.

Examples may include:

- optional encounter links;
- optional scheduled appointment link in recall

only where nulling the relationship does not damage record meaning.

---

# 62. Soft Delete Strategy

Use `deleted_at` sparingly.

### Good Candidates

Possibly:

- unused draft/reference configuration records;
- patient documents before final clinical use;
- draft appointments if business rules explicitly permit.

### Avoid Soft Deleting as Main History Mechanism

Do not use simple soft delete as the primary mechanism for:

- completed encounters;
- dental-chart history;
- performed procedures;
- issued invoices;
- posted payments;
- receipts.

Use:

- status;
- cancellation;
- reversal;
- correction;
- supersession.

This produces clearer audit history.

---

# 63. Clinical Immutability Rules

After encounter completion:

- encounter content becomes controlled;
- chart entries cannot be silently rewritten;
- completed procedures cannot be hard-deleted;
- issued prescriptions should not be casually edited.

Corrections should preserve the original record.

---

# 64. Financial Immutability Rules

After posting:

- payments cannot be hard-deleted;
- receipts cannot be directly edited;
- invoice history must remain traceable.

Correction patterns:

```text
Payment → Reversal
Receipt → Void
Invoice → Cancel (when valid)
```

---

# 65. Index Strategy

Indexes should support the most common workflows.

## Patient Search

```text
patients(organization_id, patient_number)
patients(organization_id, phone)
patients(organization_id, last_name, first_name)
```

## Appointment Calendar

```text
appointments(branch_id, scheduled_start)
appointments(dentist_id, scheduled_start)
appointments(branch_id, status, scheduled_start)
```

## Queue

```text
queue_entries(branch_id, status, arrived_at)
```

## Clinical History

```text
clinical_encounters(patient_id, started_at)
dental_chart_entries(patient_id, recorded_at)
dental_chart_entries(patient_id, tooth_definition_id, status)
procedures_performed(patient_id, performed_at)
```

## Finance

```text
invoices(patient_id, invoice_date)
invoices(branch_id, status, invoice_date)
payments(invoice_id, status)
payments(branch_id, paid_at)
```

## Recalls

```text
recalls(branch_id, status, due_date)
recalls(patient_id, due_date)
```

---

# 66. Search Design

Database queries should support fast searching by:

## Patients

- patient number;
- name;
- phone.

## Appointments

- date;
- patient;
- Dentist;
- status.

## Invoices

- invoice number;
- patient;
- status;
- date.

## Receipts

- receipt number;
- patient;
- date.

Avoid adding a complex external search engine in MVP.

---

# 67. Financial Calculation Rules

Financial totals should be calculated server-side.

## Invoice Item

```text
line_total =
(quantity × unit_price) - discount_amount
```

## Invoice

```text
subtotal = SUM(item quantity × unit_price)

total_amount =
subtotal - invoice_level_discount_if_used

paid_amount =
SUM(valid posted payments)

balance_amount =
total_amount - paid_amount
```

The final implementation should avoid applying discount twice if both line-level and invoice-level discounts exist.

For simplicity, the MVP may standardize on line-item discounts or one invoice-level discount approach during backend implementation.

---

# 68. Transaction Boundaries

Use database transactions for operations that update several related records.

## Payment Posting

```text
Create payment
→ Update invoice paid/balance
→ Update invoice status
→ Create receipt
→ Create audit event
```

## Payment Reversal

```text
Create reversal
→ Mark payment reversed
→ Update invoice totals/status
→ Void linked receipt
→ Audit
```

## Appointment Reschedule

```text
Mark original Rescheduled
→ Create new appointment
→ Link rescheduled_from_id
→ Write status history
```

## Procedure Completion

```text
Create/complete procedure
→ Update treatment-plan item
→ Update treatment-plan status
→ Add resulting chart entry if confirmed
→ Make procedure billable
→ Audit
```

---

# 69. Reference Snapshot Strategy

Historical transactional records should store snapshots of important mutable reference values.

Examples:

Invoice item stores:

- description;
- unit price.

Treatment-plan item stores:

- agreed/proposed unit price.

Procedure performed stores:

- actual price at time of procedure.

This prevents later changes to `services.default_price` from rewriting history.

---

# 70. Dental Chart Current-State Strategy

Do not create one mutable column such as:

```text
patients.tooth_16_status
```

Instead:

```text
patient
  ↓
dental_chart_entries
  ↓
tooth_definition
  ↓
condition/treatment
  ↓
surface records
```

The current odontogram is rendered from persisted active/relevant entries.

History remains available.

---

# 71. Tooth Surface Validation

Allowed general codes:

```text
M D B L O F I
```

Backend rules must validate surfaces against tooth type.

Conceptually:

```text
Posterior:
M D B L O

Anterior:
M D F L I
```

Exact clinical surface conventions remain aligned with the approved odontogram specification.

---

# 72. Treatment Plan / Odontogram Link

A treatment-plan item should use:

- `tooth_definition_id`
- optional item surfaces

rather than duplicating tooth text.

Example:

```text
Treatment Plan Item
service_id = Composite Filling
tooth_definition_id = Tooth 16
surfaces = O
```

This allows the UI to reliably show planned treatment on the odontogram.

---

# 73. Procedure / Invoice Link

Preferred chain:

```text
Treatment Plan Item
      ↓
Procedure Performed
      ↓
Invoice Item
```

This provides traceability from:

> proposed care → performed care → charged care.

Simple consultation invoices may include service items even if there is no tooth-specific treatment-plan item.

---

# 74. Appointment / Encounter Relationship

Normal path:

```text
Appointment
   ↓
Queue Entry
   ↓
Clinical Encounter
```

However, `clinical_encounters.appointment_id` should be nullable to support exceptional authorized clinical encounters if required later.

---

# 75. Patient Billing Relationship

A patient can have many:

- invoices;
- payments;
- receipts.

An invoice can have many payments.

A payment generates one receipt in the MVP.

This supports partial payment:

```text
Invoice
 ├── Payment 1 → Receipt 1
 └── Payment 2 → Receipt 2
```

---

# 76. Recall / Appointment Relationship

A recall may lead to an appointment.

Use:

```text
recalls.scheduled_appointment_id
```

The appointment does not need to be deleted if the recall later changes.

---

# 77. Reports and Database Design

Most MVP reports should be query-based rather than stored report tables.

Examples:

- daily collections;
- revenue by Dentist;
- no-shows;
- procedures performed;
- outstanding balances.

Do not create duplicate summary tables prematurely.

Materialized/reporting tables may be introduced later if performance requires them.

---

# 78. Dashboard Data

Dashboard KPIs should also be calculated from source tables.

Examples:

```text
Today's Appointments → appointments
Waiting Patients → queue_entries
Today's Collections → payments
Outstanding Balance → invoices
Upcoming Recalls → recalls
```

Do not hard-code dashboard numbers.

---

# 79. Future Multi-Branch Readiness

The design already places `branch_id` on operational records.

Future branch features can therefore include:

- branch appointment calendar;
- branch collections;
- branch Dentist assignment;
- branch receipts;
- branch reports.

Patients remain organisation-level.

---

# 80. Future SaaS Readiness

The MVP includes `organization_id` on key records.

This supports future tenant isolation.

However, future SaaS work will still need additional tables such as:

```text
platform_users
subscriptions
subscription_plans
organization_subscriptions
tenant_usage
billing_events
```

These are deliberately excluded from MVP.

---

# 81. Security Requirements at Database Layer

The database alone is not the complete security boundary.

Laravel must enforce:

- authenticated user;
- organization scope;
- branch scope;
- role permission;
- record ownership/context.

Queries should never trust a user-supplied `organization_id` without authorization.

---

# 82. File Storage Rule

Do not store large X-ray/photo/document binaries directly in the relational database for the MVP.

Store:

- secure file path;
- metadata;
- MIME type;
- file size;
- hash where useful.

Actual files should reside in secure Laravel-managed storage or approved object storage.

---

# 83. Timestamp Strategy

Use application timezone handling consistently.

Recommended database approach:

- store timestamps consistently;
- application displays in `Africa/Kampala` for MVP;
- future multi-region SaaS may store UTC and convert per organisation.

The implementation plan should choose one convention and apply it everywhere.

---

# 84. Seed Data Requirements

The eventual Laravel seeders should include:

## Organisation

- one dental clinic

## Branch

- Main Branch

## Roles

- Clinic Administrator
- Dentist
- Receptionist
- Cashier

## Users

At least one user per role.

## Appointment Types

Useful realistic types.

## Payment Methods

- Cash
- Mobile Money
- Bank
- Card
- Other

## Recall Types

Core dental follow-up types.

## Service Categories and Services

Realistic Ugandan clinic procedures with sample UGX prices.

## Tooth Definitions

All supported permanent and primary FDI teeth.

## Dental Conditions

Approved odontogram conditions.

## Patients

Realistic fictional Ugandan sample records.

Detailed seeded-data design will be defined in:

`10_SAMPLE_DATA_SPECIFICATION.md`

---

# 85. Data Consistency Rules

## DBR-01
Every operational record must belong to one organisation.

## DBR-02
Branch-specific records must belong to a branch within that organisation.

## DBR-03
A patient's organisation must match related operational records.

## DBR-04
A Dentist assigned to an appointment/encounter must be an active authorized user.

## DBR-05
A tooth definition must be valid before creating a tooth-specific chart record.

## DBR-06
Treatment-plan surfaces must be valid for the selected tooth.

## DBR-07
A payment amount must be positive.

## DBR-08
A receipt cannot exist without a payment.

## DBR-09
A payment cannot belong to a cancelled invoice.

## DBR-10
A completed clinical record must not be silently deleted.

## DBR-11
Historical financial snapshots must not be recalculated from changed service catalogue prices.

## DBR-12
Patient deactivation must not remove history.

---

# 86. Recommended Laravel Model Map

Conceptual Eloquent models:

```text
Organization
Branch
Role
User
DentistProfile
ClinicSetting
Patient
PatientGuardian
PatientMedicalProfile
PatientAllergy
PatientMedication
PatientCondition
MedicalHistoryReview
AppointmentType
Appointment
AppointmentStatusHistory
AppointmentContactLog
QueueEntry
ClinicalEncounter
EncounterFinding
EncounterDiagnosis
ToothDefinition
DentalCondition
DentalChartEntry
DentalChartEntrySurface
ServiceCategory
Service
TreatmentPlan
TreatmentPlanItem
TreatmentPlanItemSurface
ProcedurePerformed
ProcedureSurface
Prescription
PrescriptionItem
PatientDocument
PaymentMethod
Invoice
InvoiceItem
Payment
PaymentReversal
Receipt
RecallType
Recall
AuditLog
NumberingSequence
```

---

# 87. Recommended Laravel Relationship Examples

```text
Organization hasMany Branches
Organization hasMany Users
Organization hasMany Patients

Patient hasMany Appointments
Patient hasMany ClinicalEncounters
Patient hasMany DentalChartEntries
Patient hasMany TreatmentPlans
Patient hasMany Invoices
Patient hasMany Payments
Patient hasMany Recalls

Appointment belongsTo Patient
Appointment belongsTo Dentist(User)
Appointment hasOne QueueEntry

ClinicalEncounter belongsTo Patient
ClinicalEncounter belongsTo Appointment
ClinicalEncounter belongsTo Dentist(User)
ClinicalEncounter hasMany DentalChartEntries
ClinicalEncounter hasMany ProceduresPerformed

TreatmentPlan belongsTo Patient
TreatmentPlan hasMany TreatmentPlanItems

TreatmentPlanItem belongsTo Service
TreatmentPlanItem belongsTo ToothDefinition
TreatmentPlanItem hasMany TreatmentPlanItemSurfaces

Invoice belongsTo Patient
Invoice hasMany InvoiceItems
Invoice hasMany Payments

Payment belongsTo Invoice
Payment hasOne Receipt

DentalChartEntry belongsTo ToothDefinition
DentalChartEntry belongsTo DentalCondition
DentalChartEntry hasMany DentalChartEntrySurfaces
```

---

# 88. Database Migration Order

Recommended migration sequence:

```text
1. organizations
2. branches
3. roles
4. users
5. user_branches
6. dentist_profiles
7. clinic_settings
8. branch_working_hours
9. numbering_sequences

10. patients
11. patient_guardians
12. patient_medical_profiles
13. patient_allergies
14. patient_medications
15. patient_conditions

16. appointment_types
17. appointments
18. appointment_status_history
19. appointment_contact_logs
20. queue_entries

21. clinical_encounters
22. medical_history_reviews
23. encounter_findings
24. encounter_diagnoses

25. tooth_definitions
26. dental_conditions
27. dental_chart_entries
28. dental_chart_entry_surfaces

29. service_categories
30. services

31. treatment_plans
32. treatment_plan_items
33. treatment_plan_item_surfaces

34. procedures_performed
35. procedure_surfaces

36. prescriptions
37. prescription_items
38. patient_documents

39. payment_methods
40. invoices
41. invoice_items
42. payments
43. payment_reversals
44. receipts

45. recall_types
46. recalls

47. audit_logs
```

Exact order may be adjusted for circular optional foreign keys.

---

# 89. Circular Dependency Handling

Where two tables optionally reference each other, avoid migration deadlocks.

Example:

```text
recalls.scheduled_appointment_id → appointments
```

Since `appointments` already exists before recalls, no issue.

For self/cross references added after table creation, use a later `Schema::table()` migration if necessary.

---

# 90. Database Validation vs Application Validation

Database constraints should protect structural integrity.

Laravel should enforce richer business rules.

Database examples:

- foreign keys;
- unique constraints;
- not-null constraints.

Laravel examples:

- valid appointment transition;
- valid tooth surface;
- payment not exceeding balance;
- clinical permission;
- rescheduling workflow.

Do not attempt to force every workflow rule into database CHECK constraints.

---

# 91. Data Export Readiness

The model should allow future export of:

- patient demographics;
- clinical history;
- dental chart history;
- treatment plans;
- invoices;
- payments;
- recalls.

This will matter for future data portability and offboarding.

---

# 92. Privacy by Design

The database should minimize unnecessary duplication of sensitive data.

Examples:

- store patient identity once;
- reference patient via FK;
- do not copy full medical history into appointments;
- do not copy diagnosis into finance tables;
- invoice items should contain billing descriptions, not unnecessary clinical notes.

---

# 93. Backup & Restore Direction

Production deployment should eventually include:

- scheduled database backups;
- secure file/document backups;
- encrypted backup storage where practical;
- restoration testing;
- retention policy.

Detailed infrastructure design is outside this MVP database document.

---

# 94. Database Acceptance Scenarios

## Scenario A — New Patient Visit

The database must persist linked records for:

```text
Patient
→ Appointment
→ Queue Entry
→ Encounter
→ Dental Chart Entry
→ Treatment Plan
→ Treatment Plan Item
→ Procedure Performed
→ Invoice
→ Payment
→ Receipt
→ Recall
```

All records must resolve back to the same patient.

---

## Scenario B — Partial Payment

```text
Invoice Total = UGX 500,000

Payment 1 = UGX 200,000
Receipt 1 = UGX 200,000
Balance = UGX 300,000

Payment 2 = UGX 300,000
Receipt 2 = UGX 300,000
Balance = UGX 0
Invoice Status = Paid
```

---

## Scenario C — Dental Chart History

```text
Tooth 16
Caries O
→ Treatment Planned
→ Filling Completed
```

The database must preserve:

- original caries entry;
- treatment-plan item;
- performed procedure;
- completed restoration chart state.

---

## Scenario D — Rescheduled Appointment

The database must preserve:

- original appointment;
- original status history;
- link to replacement appointment.

---

## Scenario E — User Deactivation

An inactive Dentist can no longer log in.

Previous:

- encounters;
- chart entries;
- procedures;
- prescriptions

must continue showing that Dentist as the historical actor.

---

# 95. Database Design Anti-Patterns

Do not implement:

- one column per tooth;
- comma-separated surface strings as the only source of truth;
- patient clinical history copied into appointment rows;
- deleting invoices when payments exist;
- deleting users referenced by history;
- storing money as floating-point;
- hard-coded dashboard totals;
- separate duplicate patient records per branch;
- status values editable by ordinary users;
- public file paths for sensitive clinical attachments;
- service-price changes rewriting old invoices;
- patient deletion as a routine workflow.

---

# 96. Database Freeze Conditions

This database design may be frozen when:

- organisation/branch strategy is accepted;
- patient ownership model is accepted;
- appointment/queue model is accepted;
- encounter model is accepted;
- odontogram tables are accepted;
- treatment-plan model is accepted;
- procedure model is accepted;
- finance model is accepted;
- recall model is accepted;
- deletion/retention rules are accepted;
- indexes are sufficient for expected MVP queries;
- clinical reviewer feedback does not require major structural changes.

Minor field refinements may still occur during Laravel migrations, but the entity relationships should remain stable.

---

# 97. Database Design Summary

The database is designed around a connected longitudinal patient record:

```text
ORGANISATION
    ↓
BRANCH
    ↓
PATIENT
    ├── APPOINTMENTS
    │      ↓
    │   QUEUE
    │      ↓
    ├── CLINICAL ENCOUNTERS
    │      ├── FINDINGS
    │      ├── DIAGNOSES
    │      ├── DENTAL CHART
    │      ├── PROCEDURES
    │      └── PRESCRIPTIONS
    │
    ├── TREATMENT PLANS
    │      └── TREATMENT ITEMS
    │
    ├── INVOICES
    │      └── PAYMENTS
    │             └── RECEIPTS
    │
    ├── DOCUMENTS
    └── RECALLS
```

The design intentionally preserves:

- patient continuity;
- clinical history;
- financial integrity;
- role accountability;
- branch readiness;
- future SaaS readiness.

---

# Database Design Decision

**Recommended Status:** READY FOR REVIEW

**MVP Structural Direction:** Organisation-aware, branch-ready, normalized relational model.

**Database Strategy:** One seeded organisation + one seeded branch for MVP, without SaaS subscription complexity.

**Dental Chart Strategy:** Longitudinal chart entries + normalized surface records + FDI tooth definitions.

**Financial Strategy:** Immutable transaction history using payments, reversals, receipts, and invoice snapshots.

**Next Document:** `09_UI_UX_SYSTEM.md`

The next document should define the visual design system, layouts, responsive behavior, typography, spacing, components, tables, forms, modals, toasts, status badges, dashboard cards, appointment calendar, patient profile, clinical workspace, odontogram styling, print behavior, and global UI consistency rules.
