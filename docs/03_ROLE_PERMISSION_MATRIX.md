# Dental Practice Management System
## 03 — Role & Permission Matrix

**Document Version:** 1.0  
**Status:** Draft for Review / Authorization Foundation  
**Prepared For:** Dental Practice Management System MVP  
**Target Market:** Ugandan Dental Clinics  
**Primary Technology Direction:** PHP / Laravel  
**Prepared By:** BaCorn Tech  
**Date:** 20 September 2026

---

## 1. Document Purpose

This document defines the role-based access-control model for the Dental Practice Management System MVP.

It establishes what each MVP role is allowed to:

- view;
- create;
- edit;
- update status;
- complete;
- cancel;
- print;
- export;
- configure;
- administer.

The purpose is to ensure that:

1. navigation is role-aware;
2. sensitive clinical information is protected;
3. financial information is restricted appropriately;
4. administrative functions are not exposed to operational users;
5. the frontend and backend enforce the same access rules;
6. later Laravel authorization policies can be derived from one agreed source.

This document must be used by:

- UI/UX design;
- information architecture;
- Laravel authorization;
- route protection;
- menu rendering;
- testing;
- audit design.

---

## 2. MVP Roles

The MVP contains four primary roles:

1. **Clinic Administrator**
2. **Dentist**
3. **Receptionist**
4. **Cashier**

These roles are intentionally broad enough for a small or medium dental clinic.

Additional roles may be introduced after the MVP.

---

## 3. Permission Legend

The following symbols are used throughout the matrix.

| Symbol | Meaning |
|---|---|
| ✅ | Full permission for the listed action |
| 👁️ | View-only permission |
| ✏️ | Limited edit/update permission |
| 🖨️ | Print permission |
| 📤 | Export permission |
| ⚠️ | Conditional or restricted permission |
| ❌ | No permission |

Where a role has conditional access, the restriction is explained in the corresponding notes section.

---

# 4. High-Level Module Access Matrix

| Module | Clinic Administrator | Dentist | Receptionist | Cashier |
|---|---:|---:|---:|---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Patients | ✅ | ✅ | ✅ Limited | 👁️ Limited |
| Appointments | ✅ | ✅ Limited | ✅ | 👁️ Limited |
| Waiting Room / Queue | ✅ | ✅ | ✅ | 👁️ |
| Medical History | ✅ | ✅ | ⚠️ Limited | ❌ |
| Dental Chart / Odontogram | 👁️ / ✅ Oversight | ✅ | ❌ | ❌ |
| Clinical Encounters | 👁️ / ✅ Oversight | ✅ | ❌ | ❌ |
| Diagnoses / Findings | 👁️ | ✅ | ❌ | ❌ |
| Treatment Plans | 👁️ / ✅ Oversight | ✅ | 👁️ Limited | 👁️ Limited |
| Procedures / Services Catalogue | ✅ | 👁️ | 👁️ | 👁️ |
| Procedures Performed | 👁️ | ✅ | ❌ | 👁️ Billing-related only |
| Prescriptions | 👁️ | ✅ | ❌ | ❌ |
| Imaging & Documents | ✅ Limited | ✅ | ⚠️ Limited | ❌ |
| Invoices | ✅ | 👁️ | 👁️ Limited | ✅ |
| Payments | ✅ | 👁️ | ❌ | ✅ |
| Receipts | ✅ | 👁️ | 👁️ Limited | ✅ |
| Recalls & Follow-Ups | ✅ | ✅ | ✅ | 👁️ |
| Reports | ✅ | ✅ Limited | ✅ Limited | ✅ Limited |
| Users & Roles | ✅ | ❌ | ❌ | ❌ |
| Clinic Settings | ✅ | 👁️ Limited | 👁️ Limited | 👁️ Limited |
| Profile | ✅ Own | ✅ Own | ✅ Own | ✅ Own |
| Audit Trail | ✅ | ❌ | ❌ | ❌ |

---

# 5. Dashboard Permissions

## 5.1 Clinic Administrator

May view:

- today's appointments;
- checked-in patients;
- completed visits;
- new patients;
- today's revenue;
- outstanding balances;
- appointment-status summary;
- recent payments;
- upcoming recalls;
- recent operational activity.

May access all dashboard-linked drill-down pages permitted to administrators.

---

## 5.2 Dentist

May view:

- own assigned appointments;
- waiting patients assigned to them;
- patients in treatment;
- recent clinical encounters;
- treatment plans requiring attention;
- follow-ups related to their patients.

Must not automatically see:

- full clinic revenue;
- cashier performance;
- user-management KPIs;
- unrestricted administrative finance summaries.

---

## 5.3 Receptionist

May view:

- today's appointments;
- confirmed appointments;
- pending confirmations;
- checked-in patients;
- waiting patients;
- no-shows;
- upcoming recalls.

Must not see:

- sensitive clinical notes;
- diagnosis details;
- full revenue dashboard;
- user-management metrics.

---

## 5.4 Cashier

May view:

- today's invoices;
- today's collections;
- unpaid invoices;
- partially paid invoices;
- outstanding balances;
- recent payments.

Must not see:

- detailed clinical records;
- dental-chart activity;
- diagnosis details;
- treatment notes.

---

# 6. Patient Permissions

| Action | Clinic Administrator | Dentist | Receptionist | Cashier |
|---|---:|---:|---:|---:|
| View patient list | ✅ | ✅ | ✅ | 👁️ Limited |
| Search patient | ✅ | ✅ | ✅ | ✅ |
| Register new patient | ✅ | ⚠️ | ✅ | ❌ |
| Edit demographics | ✅ | ⚠️ Limited | ✅ | ❌ |
| View contact details | ✅ | ✅ | ✅ | ✅ |
| View medical alerts | ✅ | ✅ | ⚠️ Summary only | ❌ |
| View clinical history | ✅ | ✅ | ❌ | ❌ |
| View billing summary | ✅ | ⚠️ Limited | ⚠️ Limited | ✅ |
| View appointments | ✅ | ✅ | ✅ | 👁️ |
| View recalls | ✅ | ✅ | ✅ | 👁️ |
| Deactivate patient | ✅ | ❌ | ❌ | ❌ |
| Merge duplicate patient | ⚠️ Future/admin-only | ❌ | ❌ | ❌ |
| Print patient summary | ✅ | ✅ | ⚠️ Limited | ❌ |

### Patient Access Rules

- Receptionists may edit demographic/contact information but not clinical findings.
- Dentists may update limited demographic information only when necessary during care.
- Cashiers may search and identify patients for billing, but should not access full clinical records.
- Patient deactivation is administrative and must not remove historical records.

---

# 7. Appointment Permissions

| Action | Clinic Administrator | Dentist | Receptionist | Cashier |
|---|---:|---:|---:|---:|
| View all appointments | ✅ | ⚠️ Assigned/related | ✅ | 👁️ Limited |
| Create appointment | ✅ | ⚠️ | ✅ | ❌ |
| Edit appointment | ✅ | ⚠️ Limited | ✅ | ❌ |
| Reschedule | ✅ | ⚠️ | ✅ | ❌ |
| Confirm appointment | ✅ | ⚠️ | ✅ | ❌ |
| Cancel appointment | ✅ | ⚠️ | ✅ | ❌ |
| Mark no-show | ✅ | ⚠️ | ✅ | ❌ |
| Check in patient | ✅ | ⚠️ | ✅ | ❌ |
| Mark in-treatment | ✅ | ✅ | ⚠️ | ❌ |
| Complete appointment | ✅ | ✅ | ⚠️ Checkout workflow only | ❌ |
| Print appointment list | ✅ | ✅ Own/assigned | ✅ | ❌ |
| Export appointment report | ✅ | ⚠️ | ⚠️ | ❌ |

### Appointment Rules

- Receptionists are the primary appointment operators.
- Dentists may manage their own appointments where clinic policy allows.
- Cashiers may see limited appointment context only when necessary for identifying the correct patient/visit.

---

# 8. Waiting Room / Queue Permissions

| Action | Clinic Administrator | Dentist | Receptionist | Cashier |
|---|---:|---:|---:|---:|
| View queue | ✅ | ✅ | ✅ | 👁️ |
| Check patient in | ✅ | ⚠️ | ✅ | ❌ |
| Move to waiting | ✅ | ✅ | ✅ | ❌ |
| Start treatment | ✅ | ✅ | ⚠️ | ❌ |
| Mark treatment complete | ✅ | ✅ | ❌ | ❌ |
| Send to checkout | ✅ | ✅ | ⚠️ | ❌ |
| View wait duration | ✅ | ✅ | ✅ | 👁️ |

### Queue Rules

The Receptionist controls reception flow.

The Dentist controls clinical transition into and out of treatment.

The Cashier may view queue/checkout context but should not manipulate clinical queue state.

---

# 9. Medical History Permissions

| Action | Clinic Administrator | Dentist | Receptionist | Cashier |
|---|---:|---:|---:|---:|
| View full medical history | ✅ | ✅ | ❌ | ❌ |
| View allergy alert summary | ✅ | ✅ | ⚠️ Limited | ❌ |
| Create medical-history entry | ❌ by default | ✅ | ❌ | ❌ |
| Edit current medical history | ❌ by default | ✅ | ❌ | ❌ |
| Mark reviewed | ❌ | ✅ | ❌ | ❌ |
| View previous versions | 👁️ | ✅ | ❌ | ❌ |

### Medical History Rules

- Clinical content should be primarily maintained by a Dentist.
- Administrator access is for authorized oversight/support, not routine clinical editing.
- Reception may see safety alerts only where operationally necessary.
- Cashier has no medical-history access.

---

# 10. Dental Chart / Odontogram Permissions

| Action | Clinic Administrator | Dentist | Receptionist | Cashier |
|---|---:|---:|---:|---:|
| View dental chart | 👁️ | ✅ | ❌ | ❌ |
| Add chart condition | ❌ by default | ✅ | ❌ | ❌ |
| Edit current encounter chart entry | ❌ | ✅ | ❌ | ❌ |
| Record completed dental procedure | ❌ | ✅ | ❌ | ❌ |
| View chart history | 👁️ | ✅ | ❌ | ❌ |
| Remove historical entry | ❌ | ❌ | ❌ | ❌ |
| Correct erroneous entry | ⚠️ Admin workflow | ⚠️ Controlled | ❌ | ❌ |
| Print chart summary | ⚠️ | ✅ | ❌ | ❌ |

### Dental Chart Rules

- Only qualified clinical users should create or modify dental-chart records.
- Completed historical chart entries must not be silently deleted.
- Corrections should preserve audit history.
- Administrator viewing should be restricted to properly authorized users.

---

# 11. Clinical Encounter Permissions

| Action | Clinic Administrator | Dentist | Receptionist | Cashier |
|---|---:|---:|---:|---:|
| View encounters | 👁️ | ✅ | ❌ | ❌ |
| Start encounter | ❌ | ✅ | ❌ | ❌ |
| Edit draft encounter | ❌ | ✅ | ❌ | ❌ |
| Record findings | ❌ | ✅ | ❌ | ❌ |
| Record diagnosis | ❌ | ✅ | ❌ | ❌ |
| Record clinical notes | ❌ | ✅ | ❌ | ❌ |
| Complete encounter | ❌ | ✅ | ❌ | ❌ |
| Re-open completed encounter | ⚠️ Controlled | ⚠️ Controlled | ❌ | ❌ |
| Delete completed encounter | ❌ | ❌ | ❌ | ❌ |
| Print encounter summary | ⚠️ | ✅ | ❌ | ❌ |

### Encounter Rules

Completed encounters must be treated as historical clinical records.

Any correction or reopening process should preserve:

- who changed the record;
- when the change occurred;
- why the change occurred.

---

# 12. Diagnosis / Clinical Findings Permissions

| Action | Clinic Administrator | Dentist | Receptionist | Cashier |
|---|---:|---:|---:|---:|
| View diagnosis | 👁️ Authorized only | ✅ | ❌ | ❌ |
| Add diagnosis | ❌ | ✅ | ❌ | ❌ |
| Edit diagnosis | ❌ | ✅ During permitted state | ❌ | ❌ |
| Delete diagnosis | ❌ | ⚠️ Controlled before completion | ❌ | ❌ |
| View findings | 👁️ | ✅ | ❌ | ❌ |

---

# 13. Treatment Plan Permissions

| Action | Clinic Administrator | Dentist | Receptionist | Cashier |
|---|---:|---:|---:|---:|
| View treatment plan | ✅ | ✅ | 👁️ Summary | 👁️ Billing summary |
| Create plan | ❌ | ✅ | ❌ | ❌ |
| Add treatment item | ❌ | ✅ | ❌ | ❌ |
| Edit clinical item | ❌ | ✅ | ❌ | ❌ |
| Set clinical priority | ❌ | ✅ | ❌ | ❌ |
| Update acceptance status | ⚠️ | ✅ | ⚠️ Patient response capture | ❌ |
| Update treatment status | ❌ | ✅ | ❌ | ❌ |
| View pricing | ✅ | ✅ | 👁️ | ✅ |
| Adjust price | ⚠️ | ⚠️ If permitted | ❌ | ⚠️ Authorized only |
| Apply discount | ✅ | ❌ by default | ❌ | ⚠️ Authorized only |
| Print treatment plan | ✅ | ✅ | 🖨️ | 🖨️ |
| Cancel plan | ⚠️ | ✅ | ❌ | ❌ |

### Treatment Plan Rules

- Clinical content belongs to the Dentist.
- Reception may record whether a patient accepted/declined only if clinic policy allows, but must not alter treatment details.
- Cashier may see the financial side of accepted/planned items needed for billing.
- Price adjustments and discounts should be permission-controlled.

---

# 14. Procedure / Service Catalogue Permissions

| Action | Clinic Administrator | Dentist | Receptionist | Cashier |
|---|---:|---:|---:|---:|
| View services | ✅ | ✅ | ✅ | ✅ |
| Create service | ✅ | ❌ | ❌ | ❌ |
| Edit service | ✅ | ❌ | ❌ | ❌ |
| Change default price | ✅ | ❌ | ❌ | ❌ |
| Change duration | ✅ | ❌ | ❌ | ❌ |
| Activate/deactivate | ✅ | ❌ | ❌ | ❌ |
| Delete used service | ❌ | ❌ | ❌ | ❌ |

### Catalogue Rules

A service that has already been used historically should normally be deactivated rather than deleted.

---

# 15. Procedures Performed Permissions

| Action | Clinic Administrator | Dentist | Receptionist | Cashier |
|---|---:|---:|---:|---:|
| View procedure history | 👁️ | ✅ | ❌ | 👁️ Billing-only |
| Record procedure performed | ❌ | ✅ | ❌ | ❌ |
| Edit draft/current procedure | ❌ | ✅ | ❌ | ❌ |
| Mark procedure completed | ❌ | ✅ | ❌ | ❌ |
| Alter clinical details | ❌ | ✅ Before completion | ❌ | ❌ |
| Alter billable amount | ⚠️ | ⚠️ If permitted | ❌ | ⚠️ Finance permission |
| Delete completed procedure | ❌ | ❌ | ❌ | ❌ |

---

# 16. Prescription Permissions

| Action | Clinic Administrator | Dentist | Receptionist | Cashier |
|---|---:|---:|---:|---:|
| View prescription | 👁️ Authorized | ✅ | ❌ | ❌ |
| Create prescription | ❌ | ✅ | ❌ | ❌ |
| Edit draft prescription | ❌ | ✅ | ❌ | ❌ |
| Issue/complete prescription | ❌ | ✅ | ❌ | ❌ |
| Reprint prescription | ⚠️ | ✅ | ❌ | ❌ |
| Delete issued prescription | ❌ | ❌ | ❌ | ❌ |

### Prescription Rules

Only authorized clinical users should prescribe.

The software must not automatically choose medicine or dosage.

---

# 17. Imaging & Document Permissions

| Action | Clinic Administrator | Dentist | Receptionist | Cashier |
|---|---:|---:|---:|---:|
| View clinical X-rays/images | ⚠️ Authorized | ✅ | ❌ | ❌ |
| Upload clinical X-ray/image | ⚠️ | ✅ | ⚠️ Intake upload only | ❌ |
| View referral letters | ✅ | ✅ | ⚠️ Limited | ❌ |
| Upload referral document | ✅ | ✅ | ✅ Limited | ❌ |
| View consent documents | ✅ | ✅ | ⚠️ | ❌ |
| Upload consent document | ✅ | ✅ | ✅ Limited | ❌ |
| Delete clinical attachment | ⚠️ Controlled | ⚠️ Controlled | ❌ | ❌ |

### Document Rules

- Reception may upload patient-provided documents but should not automatically gain access to all clinical attachments.
- Deletion of clinically significant attachments should be tightly controlled.

---

# 18. Invoice Permissions

| Action | Clinic Administrator | Dentist | Receptionist | Cashier |
|---|---:|---:|---:|---:|
| View invoices | ✅ | 👁️ Patient context | 👁️ Limited | ✅ |
| Create invoice | ✅ | ❌ by default | ❌ | ✅ |
| Edit draft invoice | ✅ | ❌ | ❌ | ✅ |
| Add/remove invoice items | ✅ | ❌ | ❌ | ✅ |
| Apply discount | ✅ | ❌ | ❌ | ⚠️ |
| Cancel invoice | ✅ | ❌ | ❌ | ⚠️ |
| Print invoice | ✅ | 🖨️ Limited | 🖨️ Limited | ✅ |
| Export invoices | 📤 | ❌ | ❌ | ⚠️ |

### Invoice Rules

- Clinical staff may see billing context without becoming finance operators.
- Cashier manages normal invoice operations.
- High-risk finance actions may require administrator permission.

---

# 19. Payment Permissions

| Action | Clinic Administrator | Dentist | Receptionist | Cashier |
|---|---:|---:|---:|---:|
| View payments | ✅ | 👁️ Limited | ❌ | ✅ |
| Record payment | ✅ | ❌ | ❌ | ✅ |
| Record partial payment | ✅ | ❌ | ❌ | ✅ |
| Change payment method | ⚠️ Before finalization | ❌ | ❌ | ⚠️ |
| Void/reverse payment | ✅ Controlled | ❌ | ❌ | ⚠️ Controlled |
| Delete finalized payment | ❌ | ❌ | ❌ | ❌ |
| Print receipt | ✅ | ❌ | ⚠️ Reprint only | ✅ |
| Export payment report | 📤 | ❌ | ❌ | ⚠️ |

### Payment Rules

Finalized payments should not simply be deleted.

Corrections should use controlled reversal/void mechanisms with audit history.

---

# 20. Receipt Permissions

| Action | Clinic Administrator | Dentist | Receptionist | Cashier |
|---|---:|---:|---:|---:|
| View receipt | ✅ | 👁️ Limited | 👁️ Limited | ✅ |
| Print original receipt | ✅ | ❌ | ⚠️ | ✅ |
| Reprint receipt | ✅ | ❌ | ⚠️ | ✅ |
| Alter issued receipt | ❌ | ❌ | ❌ | ❌ |
| Void receipt | ⚠️ Controlled | ❌ | ❌ | ⚠️ Controlled |

---

# 21. Recall & Follow-Up Permissions

| Action | Clinic Administrator | Dentist | Receptionist | Cashier |
|---|---:|---:|---:|---:|
| View recalls | ✅ | ✅ | ✅ | 👁️ |
| Create recall | ✅ | ✅ | ✅ | ❌ |
| Edit due date | ✅ | ✅ | ✅ | ❌ |
| Record contact outcome | ✅ | ⚠️ | ✅ | ❌ |
| Convert recall to appointment | ✅ | ⚠️ | ✅ | ❌ |
| Mark completed | ✅ | ✅ | ⚠️ | ❌ |
| Cancel recall | ✅ | ⚠️ | ✅ | ❌ |
| Print recall list | ✅ | ✅ | ✅ | ❌ |
| Export recall report | ✅ | ⚠️ | ⚠️ | ❌ |

### Recall Rules

The Dentist determines clinically appropriate follow-up timing where required.

Reception handles communication and scheduling workflow.

---

# 22. Reports Permissions

## 22.1 Clinic Administrator

May access:

- all MVP reports;
- patient reports;
- appointment reports;
- clinical summary reports;
- finance reports;
- recall reports;
- user/activity reports where available.

May print/export according to report capability.

---

## 22.2 Dentist

May access:

- own appointment reports;
- own procedure reports;
- own patient/clinical activity;
- treatment-plan summaries;
- relevant recall reports.

Should not have unrestricted access to:

- clinic-wide collections;
- cashier transaction reports;
- user-management reports.

---

## 22.3 Receptionist

May access:

- appointment reports;
- cancellation/no-show reports;
- patient registration reports;
- recall reports;
- scheduling-related summaries.

Should not access:

- detailed clinical reports;
- detailed revenue reports.

---

## 22.4 Cashier

May access:

- daily collections;
- payment-method summaries;
- invoice reports;
- outstanding balances;
- receipt reports.

Should not access:

- diagnosis reports;
- clinical notes;
- dental-chart reports.

---

# 23. Users & Roles Permissions

| Action | Clinic Administrator | Dentist | Receptionist | Cashier |
|---|---:|---:|---:|---:|
| View users | ✅ | ❌ | ❌ | ❌ |
| Create user | ✅ | ❌ | ❌ | ❌ |
| Edit user | ✅ | ❌ | ❌ | ❌ |
| Assign role | ✅ | ❌ | ❌ | ❌ |
| Activate/deactivate | ✅ | ❌ | ❌ | ❌ |
| Reset user password | ✅ | ❌ | ❌ | ❌ |
| View role definitions | ✅ | ❌ | ❌ | ❌ |
| Create custom roles | Deferred | Deferred | Deferred | Deferred |

### User Management Rules

An administrator should not be able to delete historical user references from clinical or financial records.

Deactivating a user must preserve their historical actions.

---

# 24. Clinic Settings Permissions

| Setting Area | Clinic Administrator | Dentist | Receptionist | Cashier |
|---|---:|---:|---:|---:|
| Clinic identity | ✅ | 👁️ | 👁️ | 👁️ |
| Logo | ✅ | 👁️ | 👁️ | 👁️ |
| Contact details | ✅ | 👁️ | 👁️ | 👁️ |
| Working hours | ✅ | 👁️ | 👁️ | 👁️ |
| Appointment defaults | ✅ | 👁️ | 👁️ | ❌ |
| Procedure catalogue | ✅ | 👁️ | 👁️ | 👁️ |
| Default prices | ✅ | 👁️ | 👁️ | 👁️ |
| Payment methods | ✅ | ❌ | ❌ | 👁️ |
| Invoice/receipt prefixes | ✅ | ❌ | ❌ | 👁️ |
| Patient-number prefix | ✅ | ❌ | 👁️ | ❌ |
| Recall types | ✅ | 👁️ | 👁️ | ❌ |
| Security settings | ✅ | ❌ | ❌ | ❌ |

---

# 25. Profile Permissions

Each authenticated user may:

- view own profile;
- update permitted personal information;
- update phone number where allowed;
- update profile photo where supported;
- change password;
- view own role;
- view own account status.

Users must not use the Profile page to:

- change their own role;
- activate themselves;
- grant themselves permissions;
- alter another user's profile.

---

# 26. Audit Trail Permissions

The MVP backend should record important actions even if a full audit viewer is introduced later.

Only the Clinic Administrator should have access to the audit interface in the MVP.

Audit events should eventually include:

- login;
- failed login where practical;
- patient edits;
- appointment changes;
- clinical record completion;
- dental-chart updates;
- treatment-plan changes;
- invoice creation;
- payment creation;
- payment reversal;
- receipt issuance;
- user activation/deactivation;
- settings changes.

---

# 27. Sensitive Data Classification

For authorization purposes, data should be treated in broad categories.

## 27.1 Clinical Sensitive Data

Includes:

- medical history;
- allergies;
- diagnosis;
- findings;
- dental chart;
- clinical encounters;
- prescriptions;
- clinical images;
- treatment notes.

Primary access:

- Dentist
- Authorized Administrator oversight

---

## 27.2 Financial Sensitive Data

Includes:

- invoices;
- payments;
- balances;
- discounts;
- revenue;
- payment reports.

Primary access:

- Cashier
- Clinic Administrator

Limited contextual access:

- Dentist
- Receptionist where operationally necessary

---

## 27.3 Administrative Sensitive Data

Includes:

- users;
- roles;
- security settings;
- audit logs;
- numbering rules;
- clinic configuration.

Primary access:

- Clinic Administrator

---

## 27.4 Operational Data

Includes:

- appointment time;
- queue status;
- patient contact details;
- recall schedule.

Primary access:

- Receptionist
- Dentist
- Clinic Administrator

Limited access:

- Cashier

---

# 28. Permission Enforcement Principles

## 28.1 Frontend Hiding Is Not Security

Hiding a menu item is only a UX measure.

The Laravel backend must still deny unauthorized access to:

- routes;
- controllers;
- actions;
- API endpoints;
- downloads;
- files.

---

## 28.2 Default Deny

If a permission is not explicitly granted, access should be denied.

---

## 28.3 Least Privilege

Users should receive only the access required to perform their role.

---

## 28.4 Historical Integrity

Permissions must not permit users to silently erase:

- clinical history;
- completed procedures;
- issued invoices;
- recorded payments;
- receipts.

---

## 28.5 Clinical Ownership

Only authorized clinical users should create or alter clinical content.

---

## 28.6 Financial Accountability

Payment and receipt actions must identify the user responsible.

---

## 28.7 Role-Aware Navigation

The sidebar and header actions must reflect role permissions.

Users should not be shown modules they cannot use.

---

# 29. Sidebar Expectations by Role

## 29.1 Clinic Administrator

Recommended conceptual navigation:

```text
Dashboard
Patients
Appointments
Waiting Room
Clinical Overview
Treatment Plans
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

Clinical overview should not imply routine editing rights.

---

## 29.2 Dentist

Recommended conceptual navigation:

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
Recalls / Follow-Ups
Reports
Profile
```

---

## 29.3 Receptionist

Recommended conceptual navigation:

```text
Dashboard
Patients
Appointments
Waiting Room
Recalls / Follow-Ups
Selected Reports
Profile
```

---

## 29.4 Cashier

Recommended conceptual navigation:

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

# 30. Cross-Role Workflow Example

A typical visit should demonstrate clear role separation.

```text
RECEPTIONIST
Registers Patient
      ↓
Books Appointment
      ↓
Checks Patient In
      ↓
Places Patient in Queue

DENTIST
Opens Patient Record
      ↓
Reviews Medical History
      ↓
Creates Clinical Encounter
      ↓
Updates Dental Chart
      ↓
Creates Treatment Plan
      ↓
Records Procedure
      ↓
Sends Patient to Checkout

CASHIER
Reviews Billable Items
      ↓
Creates / Confirms Invoice
      ↓
Records Payment
      ↓
Prints Receipt

RECEPTIONIST / DENTIST
Schedules Recall or Follow-Up
```

The Clinic Administrator has oversight across the process without replacing the operational responsibilities of each role.

---

# 31. Role Conflict Rules

The MVP should assume one primary role per user account.

Future versions may support multi-role users.

For MVP simplicity:

- a user should authenticate under one assigned role;
- role permissions should remain predictable;
- users who perform multiple real-world duties may receive the most appropriate approved role or separate workflow rules determined by the clinic.

If multi-role support is introduced later, the authorization system must combine permissions safely rather than relying on UI assumptions.

---

# 32. Permission Test Scenarios

The following scenarios must eventually pass.

## Scenario A — Receptionist Clinical Restriction

1. Receptionist logs in.
2. Receptionist can register/search patient.
3. Receptionist can book/check in patient.
4. Receptionist cannot open detailed dental-chart editing.
5. Receptionist cannot create diagnosis.
6. Receptionist cannot issue prescription.

**Expected Result:** PASS.

---

## Scenario B — Dentist Finance Restriction

1. Dentist logs in.
2. Dentist sees own patients and appointments.
3. Dentist creates encounter/treatment plan.
4. Dentist can see limited patient billing context where necessary.
5. Dentist cannot record payment.
6. Dentist cannot reverse payment.
7. Dentist cannot access full clinic revenue reports.

**Expected Result:** PASS.

---

## Scenario C — Cashier Clinical Restriction

1. Cashier logs in.
2. Cashier searches for a patient.
3. Cashier can view relevant invoice/treatment billing summary.
4. Cashier cannot open clinical notes.
5. Cashier cannot view medical history.
6. Cashier cannot edit dental chart.
7. Cashier records payment and prints receipt.

**Expected Result:** PASS.

---

## Scenario D — Administrator Oversight

1. Administrator logs in.
2. Administrator can view all operational modules.
3. Administrator can manage users and settings.
4. Administrator can view reports.
5. Administrator does not routinely create clinical diagnosis or prescriptions.
6. Historical records remain protected from destructive deletion.

**Expected Result:** PASS.

---

## Scenario E — Direct URL Access

1. Receptionist manually enters a restricted clinical URL.
2. Backend rejects access.
3. Cashier manually enters a user-management URL.
4. Backend rejects access.
5. Dentist manually enters an administrator security-settings URL.
6. Backend rejects access.

**Expected Result:** PASS.

---

# 33. Laravel Authorization Direction

Later backend integration should translate this document into:

- authentication middleware;
- role middleware where appropriate;
- Laravel Policies;
- Gates where appropriate;
- Form Request authorization where useful;
- controller authorization;
- route protection;
- secure file-access checks.

The frontend must never be treated as the only security boundary.

---

# 34. MVP Permission Freeze Conditions

This role/permission document may be considered ready to freeze when stakeholders agree that:

- the four MVP roles are sufficient;
- each role's navigation is clear;
- clinical boundaries are appropriate;
- finance boundaries are appropriate;
- administrative boundaries are appropriate;
- direct unauthorized access will be blocked;
- receptionist/cashier clinical restrictions are accepted;
- dentist finance restrictions are accepted;
- administrator oversight is defined;
- destructive record deletion is restricted.

---

# 35. Role & Permission Summary

The intended authorization philosophy is:

```text
CLINIC ADMINISTRATOR
Operations + Users + Settings + Reports + Oversight

DENTIST
Clinical Care + Dental Chart + Treatment + Prescriptions

RECEPTIONIST
Patients + Appointments + Check-In + Queue + Recalls

CASHIER
Invoices + Payments + Receipts + Balances
```

The roles collaborate around the same patient journey, but they do not receive identical access.

This distinction must remain visible in:

- sidebar navigation;
- page actions;
- buttons;
- forms;
- reports;
- backend authorization.

---

# Role & Permission Matrix Decision

**Recommended Status:** READY FOR REVIEW

**Authorization Philosophy:** Least privilege, role-aware UI, server-side enforcement, protected clinical and financial history.

**Next Document:** `04_INFORMATION_ARCHITECTURE.md`

The next document should define the complete page hierarchy, navigation structure, page relationships, patient-profile tabs, role-specific sidebars, routes/conceptual URLs, and how users move between modules throughout the dental workflow.
