# Dental Practice Management System
## 10 — Sample Data Specification

**Document Version:** 1.0  
**Status:** Draft for Review / Frontend Seed Data Baseline  
**Prepared For:** Dental Practice Management System MVP  
**Target Market:** Ugandan Dental Clinics  
**Primary Technology Direction:** HTML / CSS / JavaScript frontend template → Laravel seeders later  
**Prepared By:** BaCorn Tech  
**Date:** 21 September 2026

---

# 1. Document Purpose

This document defines the fictional sample dataset that should be used throughout the Dental Practice Management System MVP frontend.

Its purpose is to ensure that:

- the same patient appears consistently across modules;
- appointments reference real sample patients;
- waiting-room entries match today's appointments;
- dental-chart entries match encounters;
- treatment plans match clinical findings;
- performed procedures match treatment-plan items;
- invoices match completed procedures;
- payments reconcile with invoice balances;
- receipts match payments;
- recalls match completed encounters/treatments;
- dashboard KPIs are derived from the same sample records;
- reports reflect the same underlying data.

The frontend must not invent unrelated hard-coded records independently inside each page.

This document should later be translated into:

- shared frontend mock data;
- Laravel database seeders;
- demo/test fixtures.

---

# 2. Sample Data Principles

The sample dataset must be:

- fictional;
- internally consistent;
- Uganda-relevant;
- realistic enough for demonstrations;
- safe for public demos;
- varied enough to test different UI states;
- stable across modules.

The dataset must not use real patient information.

---

# 3. Sample Clinic Identity

Use the following fictional clinic for the MVP frontend:

```text
Clinic Name: Pearl Smile Dental Clinic
Organisation Code: PSDC
Main Branch: Kampala Main Branch
Currency: UGX
Timezone: Africa/Kampala
```

Clinic contact data:

```text
Phone: +256 700 555 010
Email: info@pearlsmiledental.test
Address: Kampala, Uganda
Website: www.pearlsmiledental.test
```

Important:

The `.test` domain is intentional and should remain non-production.

---

# 4. Main Branch

```text
Branch Code: MAIN
Branch Name: Kampala Main Branch
District: Kampala
Town/Area: Central Kampala
Status: Active
Is Main Branch: Yes
```

All MVP sample operational activity occurs at this branch.

---

# 5. Sample Roles

Use these four roles:

```text
CLINIC_ADMINISTRATOR
DENTIST
RECEPTIONIST
CASHIER
```

---

# 6. Sample Users

The frontend should include at least one user per MVP role.

## 6.1 Clinic Administrator

```text
User ID: U001
Name: Grace Namutebi
Email: grace.admin@pearlsmiledental.test
Phone: +256 700 555 101
Role: Clinic Administrator
Job Title: Practice Administrator
Status: Active
Branch: Kampala Main Branch
```

---

## 6.2 Dentist 1

```text
User ID: U002
Name: Dr. Daniel Mugisha
Email: daniel.mugisha@pearlsmiledental.test
Phone: +256 700 555 102
Role: Dentist
Job Title: Dental Surgeon
Professional Number: DEMO-DENT-001
Specialty: General Dentistry
Status: Active
Branch: Kampala Main Branch
```

---

## 6.3 Dentist 2

```text
User ID: U003
Name: Dr. Sarah Nakanwagi
Email: sarah.nakanwagi@pearlsmiledental.test
Phone: +256 700 555 103
Role: Dentist
Job Title: Dental Surgeon
Professional Number: DEMO-DENT-002
Specialty: General & Restorative Dentistry
Status: Active
Branch: Kampala Main Branch
```

---

## 6.4 Receptionist

```text
User ID: U004
Name: Lydia Akello
Email: lydia.reception@pearlsmiledental.test
Phone: +256 700 555 104
Role: Receptionist
Job Title: Front Desk Officer
Status: Active
Branch: Kampala Main Branch
```

---

## 6.5 Cashier

```text
User ID: U005
Name: Brian Ssemanda
Email: brian.cashier@pearlsmiledental.test
Phone: +256 700 555 105
Role: Cashier
Job Title: Cashier
Status: Active
Branch: Kampala Main Branch
```

---

## 6.6 Inactive User

Include one inactive user for UI testing.

```text
User ID: U006
Name: Miriam Achieng
Email: miriam.old@pearlsmiledental.test
Phone: +256 700 555 106
Role: Receptionist
Status: Inactive
```

This user should appear in User Management but should not be treated as an active operational user.

---

# 7. Sample Payment Methods

Seed:

```text
CASH
MOBILE_MONEY
BANK
CARD
OTHER
```

Display names:

- Cash
- Mobile Money
- Bank
- Card
- Other

---

# 8. Sample Appointment Types

Use:

- Consultation
- Review
- Scaling & Polishing
- Filling
- Extraction
- Root Canal
- Denture Review
- Emergency
- Other

---

# 9. Sample Recall Types

Use:

- Routine Dental Review
- Scaling Review
- Post-Extraction Review
- Root Canal Follow-Up
- Denture Review
- Orthodontic Review
- Custom Follow-Up

---

# 10. Sample Service Categories

Use:

```text
Consultation
Diagnostic
Preventive
Restorative
Extraction
Endodontic
Prosthodontic
Cosmetic
Other
```

---

# 11. Sample Services / Procedures

The following sample prices are for UI/demo purposes only.

They are not intended as authoritative market pricing.

| Code | Service | Category | Default Price | Duration |
|---|---|---|---:|---:|
| CON-001 | Dental Consultation | Consultation | UGX 50,000 | 30 min |
| DIA-001 | Dental X-Ray | Diagnostic | UGX 40,000 | 15 min |
| PRE-001 | Scaling & Polishing | Preventive | UGX 180,000 | 45 min |
| RES-001 | Composite Filling - Single Surface | Restorative | UGX 120,000 | 40 min |
| RES-002 | Composite Filling - Multi Surface | Restorative | UGX 180,000 | 50 min |
| EXT-001 | Simple Extraction | Extraction | UGX 150,000 | 40 min |
| EXT-002 | Surgical Extraction | Extraction | UGX 350,000 | 75 min |
| END-001 | Root Canal Treatment - Anterior | Endodontic | UGX 450,000 | 90 min |
| END-002 | Root Canal Treatment - Posterior | Endodontic | UGX 650,000 | 120 min |
| PRO-001 | Porcelain Crown | Prosthodontic | UGX 850,000 | 60 min |
| PRO-002 | Acrylic Partial Denture | Prosthodontic | UGX 600,000 | 60 min |
| COS-001 | Teeth Whitening | Cosmetic | UGX 500,000 | 75 min |

---

# 12. Sample Patient Dataset

Use at least twelve fictional patients to exercise multiple UI states.

---

## 12.1 Patient P001 — Amina Nakato

```text
Patient No: PAT-000001
Name: Amina Nakato
DOB: 1994-03-17
Sex: Female
Phone: +256 701 100 001
Alternate Phone: +256 752 100 001
Email: amina.nakato@example.test
District: Kampala
Town/Area: Ntinda
Occupation: Teacher
Status: Active
Registration Date: 2026-08-03
Registered By: Lydia Akello
```

Medical:

```text
Allergies: Penicillin
Current Medication: None
Conditions: None recorded
Dental History: Previous filling on upper right molar
```

Clinical significance:

- active caries;
- existing restoration;
- active treatment plan;
- partial payment;
- recall due later.

---

## 12.2 Patient P002 — Peter Okello

```text
Patient No: PAT-000002
Name: Peter Okello
DOB: 1988-11-02
Sex: Male
Phone: +256 702 100 002
District: Wakiso
Town/Area: Kira
Occupation: Accountant
Status: Active
Registration Date: 2026-07-18
```

Medical:

```text
Allergies: None known
Medication: Amlodipine
Condition: Hypertension
```

Clinical significance:

- root canal + crown history;
- completed treatment;
- fully paid invoice;
- follow-up recall scheduled.

---

## 12.3 Patient P003 — Joan Nambasa

```text
Patient No: PAT-000003
Name: Joan Nambasa
DOB: 2001-05-24
Sex: Female
Phone: +256 703 100 003
District: Kampala
Town/Area: Makindye
Occupation: University Student
Status: Active
Registration Date: 2026-09-02
```

Clinical significance:

- mostly healthy chart;
- scaling visit;
- fully paid;
- routine recall.

---

## 12.4 Patient P004 — Samuel Kato

```text
Patient No: PAT-000004
Name: Samuel Kato
DOB: 1979-08-13
Sex: Male
Phone: +256 704 100 004
District: Kampala
Town/Area: Rubaga
Occupation: Businessman
Status: Active
Registration Date: 2026-05-22
```

Medical:

```text
Condition: Diabetes
Medication: Metformin
Allergies: None known
```

Clinical significance:

- extraction history;
- outstanding balance;
- overdue recall.

---

## 12.5 Patient P005 — Esther Atim

```text
Patient No: PAT-000005
Name: Esther Atim
DOB: 1997-12-09
Sex: Female
Phone: +256 705 100 005
District: Kampala
Town/Area: Kisaasi
Occupation: Designer
Status: Active
Registration Date: 2026-08-27
```

Clinical significance:

- fractured anterior tooth;
- proposed crown;
- treatment not yet accepted.

---

## 12.6 Patient P006 — Isaac Ssenyonga

```text
Patient No: PAT-000006
Name: Isaac Ssenyonga
DOB: 1990-04-28
Sex: Male
Phone: +256 706 100 006
District: Wakiso
Town/Area: Entebbe
Occupation: Driver
Status: Active
Registration Date: 2026-06-11
```

Clinical significance:

- multiple fillings;
- no current active treatment;
- good test patient for chart density.

---

## 12.7 Patient P007 — Mariam Nabwire

```text
Patient No: PAT-000007
Name: Mariam Nabwire
DOB: 1985-01-16
Sex: Female
Phone: +256 707 100 007
District: Kampala
Town/Area: Najjanankumbi
Occupation: Retailer
Status: Active
Registration Date: 2026-09-10
```

Clinical significance:

- denture review;
- recall workflow.

---

## 12.8 Patient P008 — Charles Ouma

```text
Patient No: PAT-000008
Name: Charles Ouma
DOB: 1992-09-30
Sex: Male
Phone: +256 708 100 008
District: Kampala
Town/Area: Bugolobi
Occupation: Engineer
Status: Active
Registration Date: 2026-09-15
```

Clinical significance:

- emergency appointment;
- no-show example on an earlier booking;
- upcoming confirmed appointment.

---

## 12.9 Patient P009 — Brenda Namusoke

```text
Patient No: PAT-000009
Name: Brenda Namusoke
DOB: 1999-06-07
Sex: Female
Phone: +256 709 100 009
District: Mukono
Town/Area: Seeta
Occupation: Sales Representative
Status: Active
Registration Date: 2026-09-19
```

Clinical significance:

- newly registered;
- first consultation today;
- no previous clinical history.

---

## 12.10 Patient P010 — Joseph Walusimbi

```text
Patient No: PAT-000010
Name: Joseph Walusimbi
DOB: 1968-02-21
Sex: Male
Phone: +256 710 100 010
District: Kampala
Town/Area: Mengo
Occupation: Retired
Status: Active
Registration Date: 2026-04-07
```

Medical:

```text
Condition: Hypertension
Medication: Losartan
Allergy: None known
```

Clinical significance:

- partial denture;
- multiple missing teeth;
- outstanding balance.

---

## 12.11 Patient P011 — Sharon Apio

```text
Patient No: PAT-000011
Name: Sharon Apio
DOB: 1996-10-12
Sex: Female
Phone: +256 711 100 011
District: Kampala
Town/Area: Kawempe
Occupation: Nurse
Status: Active
Registration Date: 2026-09-01
```

Clinical significance:

- completed scaling;
- paid in full;
- useful for recent-payment report.

---

## 12.12 Patient P012 — Daniel Tumusiime

```text
Patient No: PAT-000012
Name: Daniel Tumusiime
DOB: 1983-07-05
Sex: Male
Phone: +256 712 100 012
District: Kampala
Town/Area: Muyenga
Occupation: Consultant
Status: Inactive
Registration Date: 2025-11-18
```

Clinical significance:

- inactive-patient state;
- historical records remain visible;
- no current appointment.

---

# 13. Primary-Dentition Demo Patient

Include one child patient specifically for primary dentition.

## Patient P013 — Mercy Ayaa

```text
Patient No: PAT-000013
Name: Mercy Ayaa
DOB: 2018-04-22
Sex: Female
Phone: Guardian Contact
District: Kampala
Town/Area: Nakawa
Status: Active
Registration Date: 2026-09-12
```

Guardian:

```text
Name: Rose Ayaa
Relationship: Mother
Phone: +256 713 100 013
Primary Guardian: Yes
```

Clinical significance:

- Primary dentition
- Tooth 75 caries O
- Tooth 84 existing restoration
- Tooth 64 healthy observation
- Planned filling for tooth 75

This patient should be used to test the Primary dentition toggle.

---

# 14. Dental Chart Sample Data

---

## 14.1 Amina Nakato — PAT-000001

Current odontogram:

```text
16 — Existing Restoration MO
26 — Caries O
36 — Root Canal Treated + Crown
46 — Missing
```

Planned treatment:

```text
26 — Composite Filling O
```

History example:

```text
2025-05-11 — Tooth 16 — Existing restoration MO
2026-09-20 — Tooth 26 — Caries O
2026-09-20 — Tooth 26 — Planned Composite Filling O
```

---

## 14.2 Peter Okello — PAT-000002

Current:

```text
36 — Root Canal Treated
36 — Crown
47 — Existing Restoration O
```

Completed history:

```text
2026-06-14 — Tooth 36 — Caries / pulpal involvement
2026-06-21 — Root Canal Treatment completed
2026-07-05 — Crown completed
```

---

## 14.3 Joan Nambasa — PAT-000003

Current:

```text
Mostly no abnormal findings recorded
14 — Healthy observation
24 — Healthy observation
34 — Healthy observation
44 — Healthy observation
```

Completed:

```text
Scaling & Polishing
```

---

## 14.4 Samuel Kato — PAT-000004

Current:

```text
46 — Extracted
47 — Caries O
16 — Existing Restoration O
```

History:

```text
2026-05-30 — 46 Extraction Required
2026-06-02 — Simple Extraction completed
2026-06-02 — Tooth 46 marked Extracted
```

---

## 14.5 Esther Atim — PAT-000005

Current:

```text
21 — Fractured
```

Planned:

```text
21 — Porcelain Crown
```

Plan status:

```text
Proposed
```

---

## 14.6 Isaac Ssenyonga — PAT-000006

Current:

```text
16 — Restoration MO
26 — Restoration DO
36 — Restoration O
45 — Restoration O
```

No active treatment.

---

## 14.7 Joseph Walusimbi — PAT-000010

Current:

```text
11 — Missing
12 — Missing
21 — Missing
22 — Missing
36 — Existing Restoration O
```

Existing prosthodontic context:

```text
Partial Denture
```

---

## 14.8 Mercy Ayaa — PAT-000013

Primary dentition:

```text
75 — Caries O
84 — Existing Restoration O
64 — Healthy observation
```

Planned:

```text
75 — Composite Filling O
```

---

# 15. Today's Appointment Dataset

Use **21 September 2026** as the sample "today" for the static frontend dataset.

All times are Africa/Kampala.

| Ref | Time | Patient | Dentist | Type | Status |
|---|---|---|---|---|---|
| APT-000101 | 08:00 | Joan Nambasa | Dr. Daniel Mugisha | Scaling & Polishing | Completed |
| APT-000102 | 09:00 | Brenda Namusoke | Dr. Sarah Nakanwagi | Consultation | Waiting |
| APT-000103 | 09:30 | Amina Nakato | Dr. Daniel Mugisha | Filling | In Treatment |
| APT-000104 | 10:30 | Peter Okello | Dr. Sarah Nakanwagi | Review | Confirmed |
| APT-000105 | 11:30 | Mariam Nabwire | Dr. Daniel Mugisha | Denture Review | Scheduled |
| APT-000106 | 13:00 | Charles Ouma | Dr. Sarah Nakanwagi | Emergency | Confirmed |
| APT-000107 | 14:00 | Mercy Ayaa | Dr. Daniel Mugisha | Filling | Scheduled |
| APT-000108 | 15:00 | Joseph Walusimbi | Dr. Sarah Nakanwagi | Consultation | Scheduled |
| APT-000109 | 16:00 | Sharon Apio | Dr. Daniel Mugisha | Review | Cancelled |

This gives the calendar several different states.

---

# 16. Additional Historical Appointment Data

Use examples such as:

```text
APT-000091 — Charles Ouma — 15 Sep 2026 — Emergency — No Show
APT-000092 — Samuel Kato — 18 Sep 2026 — Review — Completed
APT-000093 — Esther Atim — 19 Sep 2026 — Consultation — Completed
APT-000094 — Amina Nakato — 20 Sep 2026 — Consultation — Completed
```

Include at least one rescheduled appointment:

```text
APT-000095 — Mariam Nabwire — 20 Sep 2026 — Denture Review — Rescheduled
Replacement: APT-000105 — 21 Sep 2026
```

---

# 17. Appointment Contact Logs

Examples:

```text
APT-000104
Contact Method: Phone
Outcome: Confirmed
Contacted By: Lydia Akello
Date: 20 Sep 2026
```

```text
APT-000106
Contact Method: Phone
Outcome: Confirmed
Contacted By: Lydia Akello
Date: 21 Sep 2026
```

```text
APT-000109
Contact Method: Phone
Outcome: Cancelled
Contacted By: Lydia Akello
Date: 21 Sep 2026
```

---

# 18. Waiting Room Sample Data

Use these current queue entries:

## Brenda Namusoke

```text
Appointment: APT-000102
Arrival: 08:52
Status: Waiting
Dentist: Dr. Sarah Nakanwagi
Reason: First Consultation
```

## Amina Nakato

```text
Appointment: APT-000103
Arrival: 09:18
Waiting At: 09:21
Treatment Started: 09:32
Status: In Treatment
Dentist: Dr. Daniel Mugisha
Reason: Filling
```

Joan Nambasa should no longer appear in active waiting because her appointment is Completed.

---

# 19. Clinical Encounter Dataset

---

## 19.1 Encounter ENC-000201 — Amina Nakato

```text
Patient: PAT-000001
Appointment: APT-000094
Dentist: Dr. Daniel Mugisha
Date: 20 Sep 2026
Status: Completed
Chief Complaint: Food trapping and sensitivity on upper left molar.
Finding: Caries on tooth 26 occlusal surface.
Diagnosis: Dental caries affecting tooth 26.
Treatment Discussion: Composite restoration advised.
Follow-Up: Return for filling.
```

This encounter generated:

- chart entry: 26 Caries O;
- treatment plan TP-000301;
- recall/next appointment.

---

## 19.2 Encounter ENC-000202 — Joan Nambasa

```text
Patient: PAT-000003
Appointment: APT-000101
Dentist: Dr. Daniel Mugisha
Date: 21 Sep 2026
Status: Completed
Chief Complaint: Routine cleaning.
Finding: Mild plaque/calculus.
Diagnosis: Plaque/calculus accumulation.
Procedure: Scaling & Polishing.
Follow-Up: Routine review in 6 months.
```

---

## 19.3 Encounter ENC-000203 — Brenda Namusoke

```text
Patient: PAT-000009
Appointment: APT-000102
Dentist: Dr. Sarah Nakanwagi
Date: 21 Sep 2026
Status: Draft
```

This encounter should not yet have diagnosis/treatment.

Useful for testing a newly opened/in-progress patient flow.

---

## 19.4 Encounter ENC-000204 — Peter Okello

Historical:

```text
Date: 21 Jun 2026
Dentist: Dr. Sarah Nakanwagi
Status: Completed
Procedure: Root Canal Treatment tooth 36
```

---

# 20. Treatment Plan Dataset

---

## 20.1 TP-000301 — Amina Nakato

```text
Patient: Amina Nakato
Dentist: Dr. Daniel Mugisha
Created: 20 Sep 2026
Status: Accepted
Estimated Total: UGX 120,000
Accepted Total: UGX 120,000
```

Item:

```text
Tooth: 26
Surface: O
Service: Composite Filling - Single Surface
Price: UGX 120,000
Acceptance: Accepted
Treatment Status: Planned / In Progress depending current frontend moment
```

On 21 Sep 2026 appointment APT-000103, this item is actively being performed.

---

## 20.2 TP-000302 — Esther Atim

```text
Patient: Esther Atim
Dentist: Dr. Sarah Nakanwagi
Created: 19 Sep 2026
Status: Proposed
Estimated Total: UGX 850,000
Accepted Total: UGX 0
```

Item:

```text
Tooth: 21
Service: Porcelain Crown
Price: UGX 850,000
Acceptance: Proposed
Treatment Status: Planned
```

Useful for proposed/pending UI.

---

## 20.3 TP-000303 — Samuel Kato

```text
Status: Partially Accepted
```

Items:

```text
46 — Simple Extraction — UGX 150,000 — Accepted — Completed
47 — Composite Filling O — UGX 120,000 — Declined
Scaling & Polishing — UGX 180,000 — Accepted — Planned
```

This is the key sample for partial acceptance.

Plan totals:

```text
Total Proposed: UGX 450,000
Accepted Value: UGX 330,000
Completed Value: UGX 150,000
```

---

## 20.4 TP-000304 — Mercy Ayaa

```text
Patient: Mercy Ayaa
Status: Accepted
```

Item:

```text
Tooth: 75
Surface: O
Composite Filling - Single Surface
UGX 120,000
Status: Planned
```

---

# 21. Procedures Performed Dataset

---

## PROC-000401 — Joan Nambasa

```text
Service: Scaling & Polishing
Patient: PAT-000003
Encounter: ENC-000202
Dentist: Dr. Daniel Mugisha
Date: 21 Sep 2026
Amount: UGX 180,000
Status: Completed
```

---

## PROC-000402 — Samuel Kato

```text
Service: Simple Extraction
Tooth: 46
Patient: PAT-000004
Dentist: Dr. Daniel Mugisha
Date: 02 Jun 2026
Amount: UGX 150,000
Status: Completed
```

---

## PROC-000403 — Peter Okello

```text
Service: Root Canal Treatment - Posterior
Tooth: 36
Amount: UGX 650,000
Date: 21 Jun 2026
Status: Completed
```

---

## PROC-000404 — Peter Okello

```text
Service: Porcelain Crown
Tooth: 36
Amount: UGX 850,000
Date: 05 Jul 2026
Status: Completed
```

---

# 22. Prescription Dataset

Use a small number of sample prescriptions.

Important:

These are fictional UI records only and should not be interpreted as prescribing guidance.

## RX-000501

```text
Patient: Samuel Kato
Dentist: Dr. Daniel Mugisha
Related Encounter: extraction visit
Status: Issued
```

Prescription item text should remain generic/demo-friendly in the frontend if clinical review has not approved medication examples.

Recommended demo approach:

```text
Medicine: Example Medication A
Strength: Demo
Dose: As prescribed
Frequency: Demo
Duration: Demo
Instructions: Follow Dentist instructions
```

This prevents the sample dataset from presenting medication choices as clinical recommendations.

---

# 23. Patient Documents Dataset

Use sample metadata only.

## Amina Nakato

```text
DOC-001
Type: X-Ray
Title: Upper Left Posterior X-Ray
Date: 20 Sep 2026
Related Encounter: ENC-000201
```

## Peter Okello

```text
DOC-002
Type: X-Ray
Title: Tooth 36 Pre-RCT X-Ray
Date: 21 Jun 2026
```

```text
DOC-003
Type: X-Ray
Title: Tooth 36 Post-RCT X-Ray
Date: 21 Jun 2026
```

## Esther Atim

```text
DOC-004
Type: Clinical Photo
Title: Tooth 21 Fracture
Date: 19 Sep 2026
```

Use placeholder images/assets only.

---

# 24. Invoice Dataset

---

## INV-000601 — Joan Nambasa

```text
Date: 21 Sep 2026
Patient: PAT-000003
Items:
- Scaling & Polishing — UGX 180,000

Subtotal: UGX 180,000
Discount: UGX 0
Total: UGX 180,000
Paid: UGX 180,000
Balance: UGX 0
Status: Paid
```

---

## INV-000602 — Amina Nakato

For active/current-flow testing:

```text
Patient: PAT-000001
Items:
- Composite Filling — UGX 120,000

Total: UGX 120,000
Paid: UGX 50,000
Balance: UGX 70,000
Status: Partially Paid
```

This invoice may represent a simulated post-treatment/checkout state in finance screens even if the appointment is currently shown In Treatment in the static clinical demo. To avoid contradictory live state during implementation, the frontend should either:

1. treat this as a previous invoice related to prior care; or
2. switch the sample scenario consistently when entering the billing workflow.

Recommended final frontend implementation:

> Treat INV-000602 as a previous Amina invoice dated 20 Sep 2026 for another restoration/consultation item, not the currently active 21 Sep procedure.

---

## INV-000603 — Peter Okello

```text
Items:
- Root Canal Treatment - Posterior — UGX 650,000
- Porcelain Crown — UGX 850,000

Total: UGX 1,500,000
Paid: UGX 1,500,000
Balance: UGX 0
Status: Paid
```

---

## INV-000604 — Samuel Kato

```text
Items:
- Simple Extraction — UGX 150,000
- Dental Consultation — UGX 50,000

Total: UGX 200,000
Paid: UGX 150,000
Balance: UGX 50,000
Status: Partially Paid
```

---

## INV-000605 — Joseph Walusimbi

```text
Items:
- Acrylic Partial Denture — UGX 600,000

Total: UGX 600,000
Paid: UGX 300,000
Balance: UGX 300,000
Status: Partially Paid
```

---

## INV-000606 — Sharon Apio

```text
Items:
- Scaling & Polishing — UGX 180,000

Total: UGX 180,000
Paid: UGX 180,000
Balance: UGX 0
Status: Paid
```

---

# 25. Payment Dataset

---

## PAY-000701 — Joan Nambasa

```text
Invoice: INV-000601
Amount: UGX 180,000
Method: Mobile Money
Received By: Brian Ssemanda
Date: 21 Sep 2026
Status: Posted
```

---

## PAY-000702 — Amina Nakato

```text
Invoice: INV-000602
Amount: UGX 50,000
Method: Cash
Received By: Brian Ssemanda
Date: 20 Sep 2026
Status: Posted
```

---

## PAY-000703 — Peter Okello

```text
Invoice: INV-000603
Amount: UGX 1,000,000
Method: Bank
Status: Posted
```

## PAY-000704 — Peter Okello

```text
Invoice: INV-000603
Amount: UGX 500,000
Method: Mobile Money
Status: Posted
```

---

## PAY-000705 — Samuel Kato

```text
Invoice: INV-000604
Amount: UGX 150,000
Method: Cash
Status: Posted
```

---

## PAY-000706 — Joseph Walusimbi

```text
Invoice: INV-000605
Amount: UGX 300,000
Method: Mobile Money
Status: Posted
```

---

## PAY-000707 — Sharon Apio

```text
Invoice: INV-000606
Amount: UGX 180,000
Method: Card
Status: Posted
```

---

# 26. Receipt Dataset

Each posted payment should have one receipt.

| Receipt | Payment | Patient | Amount |
|---|---|---|---:|
| RCT-000801 | PAY-000701 | Joan Nambasa | UGX 180,000 |
| RCT-000802 | PAY-000702 | Amina Nakato | UGX 50,000 |
| RCT-000803 | PAY-000703 | Peter Okello | UGX 1,000,000 |
| RCT-000804 | PAY-000704 | Peter Okello | UGX 500,000 |
| RCT-000805 | PAY-000705 | Samuel Kato | UGX 150,000 |
| RCT-000806 | PAY-000706 | Joseph Walusimbi | UGX 300,000 |
| RCT-000807 | PAY-000707 | Sharon Apio | UGX 180,000 |

All should have:

```text
Status: Issued
Issued By: Brian Ssemanda
```

---

# 27. Outstanding Balance Dataset

Derived from invoices:

```text
Amina Nakato
Balance: UGX 70,000

Samuel Kato
Balance: UGX 50,000

Joseph Walusimbi
Balance: UGX 300,000
```

Total outstanding:

```text
UGX 420,000
```

This figure should be reused in relevant dashboard/report sample data.

---

# 28. Recall Dataset

---

## REC-000901 — Joan Nambasa

```text
Type: Routine Dental Review
Due Date: 21 Mar 2027
Status: Upcoming
Dentist: Dr. Daniel Mugisha
```

---

## REC-000902 — Samuel Kato

```text
Type: Post-Extraction Review
Due Date: 16 Jun 2026
Status: Overdue
Dentist: Dr. Daniel Mugisha
Contact Outcome: No Answer
```

Useful overdue-recall sample.

---

## REC-000903 — Peter Okello

```text
Type: Root Canal Follow-Up
Due Date: 21 Sep 2026
Status: Scheduled
Scheduled Appointment: APT-000104
Dentist: Dr. Sarah Nakanwagi
```

---

## REC-000904 — Mariam Nabwire

```text
Type: Denture Review
Due Date: 21 Sep 2026
Status: Scheduled
Scheduled Appointment: APT-000105
Dentist: Dr. Daniel Mugisha
```

---

## REC-000905 — Amina Nakato

```text
Type: Custom Follow-Up
Due Date: 21 Sep 2026
Status: Scheduled
Scheduled Appointment: APT-000103
```

---

# 29. User Dashboard Sample Totals

Dashboard totals must be derived from the defined dataset rather than invented.

---

# 30. Administrator Dashboard — Sample Values

For 21 Sep 2026:

```text
Today's Appointments: 9
Completed Visits: 1
Waiting Patients: 1
In Treatment: 1
Confirmed Appointments: 2
Cancelled Appointments: 1
New Patients Today: 0 or 1 depending seed timing
Today's Collections: UGX 360,000
Outstanding Balance: UGX 420,000
Upcoming / Due Recalls: 4
```

Important:

If the frontend later changes the underlying records, dashboard values must change accordingly.

Do not keep stale hard-coded KPI numbers.

---

# 31. Dentist Dashboard — Dr. Daniel Mugisha

Today's appointments:

```text
08:00 Joan Nambasa — Completed
09:30 Amina Nakato — In Treatment
11:30 Mariam Nabwire — Scheduled
14:00 Mercy Ayaa — Scheduled
16:00 Sharon Apio — Cancelled
```

Summary:

```text
Today's Appointments: 5
Waiting: 0
In Treatment: 1
Completed: 1
Upcoming Active: 2
Cancelled: 1
```

---

# 32. Dentist Dashboard — Dr. Sarah Nakanwagi

Today's appointments:

```text
09:00 Brenda Namusoke — Waiting
10:30 Peter Okello — Confirmed
13:00 Charles Ouma — Confirmed
15:00 Joseph Walusimbi — Scheduled
```

Summary:

```text
Today's Appointments: 4
Waiting: 1
Confirmed: 2
Scheduled: 1
```

---

# 33. Receptionist Dashboard Values

For 21 Sep 2026:

```text
Today's Appointments: 9
Confirmed: 2
Waiting: 1
In Treatment: 1
Completed: 1
Cancelled: 1
Scheduled: 3
Pending Confirmations: 3
```

Depending on final status derivation, `Pending Confirmations` should be calculated from `Scheduled`, not separately invented.

---

# 34. Cashier Dashboard Values

Suggested source:

Today's posted payments:

```text
Joan Nambasa — UGX 180,000 — Mobile Money
Sharon Apio — UGX 180,000 — Card
```

Therefore:

```text
Today's Collections: UGX 360,000
Today's Payment Count: 2
Outstanding Balance: UGX 420,000
```

If more payments are added to the static dataset, these totals must be updated everywhere.

---

# 35. Daily Collections Report

For 21 Sep 2026:

```text
Mobile Money: UGX 180,000
Card: UGX 180,000
Cash: UGX 0
Bank: UGX 0

Total: UGX 360,000
```

---

# 36. Payment Method Historical Summary

Across the whole seeded payment set:

```text
Cash:
PAY-000702 = 50,000
PAY-000705 = 150,000
Total Cash = 200,000

Mobile Money:
PAY-000701 = 180,000
PAY-000704 = 500,000
PAY-000706 = 300,000
Total Mobile Money = 980,000

Bank:
PAY-000703 = 1,000,000

Card:
PAY-000707 = 180,000
```

Grand seeded payment total:

```text
UGX 2,360,000
```

---

# 37. Financial Reconciliation Rules

Frontend mock data must satisfy:

```text
Invoice Total
=
Paid Amount + Balance
```

and:

```text
Receipt Amount
=
Linked Payment Amount
```

and:

```text
Invoice Paid Amount
=
Sum of Posted Payments
```

No seeded finance record should violate these rules.

---

# 38. Appointment Reconciliation Rules

Every appointment must reference:

- valid patient;
- valid Dentist;
- valid appointment type;
- valid status.

A waiting-room entry must reference an appointment with an appropriate active status.

---

# 39. Clinical Reconciliation Rules

Dental chart data must align with encounters.

Example:

Amina:

```text
ENC-000201
→ Tooth 26 Caries O
→ TP-000301
→ Composite Filling O
```

Do not show Tooth 26 as healthy in another module.

---

# 40. Treatment Plan Reconciliation Rules

If a treatment item is completed:

- a performed procedure should exist;
- the plan/item status should reflect completion;
- billing may reference the performed procedure.

If a treatment item is only proposed:

- no completed procedure should exist.

---

# 41. Recall Reconciliation Rules

If recall status is `Scheduled`:

- `scheduled_appointment_id` should exist.

Example:

```text
REC-000903
→ APT-000104
```

---

# 42. Sample Notifications / Alerts

Use realistic alerts such as:

```text
Amina Nakato — Penicillin allergy
Samuel Kato — Recall overdue
Brenda Namusoke — Waiting 18 minutes
INV-000605 — UGX 300,000 outstanding
Peter Okello — Follow-up scheduled today
```

Alerts shown must respect role permissions.

Cashier should not see clinical allergy detail unless operationally required.

---

# 43. Sample Audit Events

Use a small timeline for demonstration.

Examples:

```text
09:32 — ENCOUNTER_STARTED — Amina Nakato — Dr. Daniel Mugisha
09:21 — PATIENT_CHECKED_IN — Amina Nakato — Lydia Akello
09:05 — PATIENT_CHECKED_IN — Brenda Namusoke — Lydia Akello
08:52 — PAYMENT_RECORDED — Joan Nambasa — Brian Ssemanda
08:47 — RECEIPT_ISSUED — Joan Nambasa — Brian Ssemanda
```

Exact ordering should be internally coherent.

---

# 44. Report Sample Data

Reports should derive from the same records.

Examples:

## Appointment Status Report

For 21 Sep 2026:

```text
Completed: 1
Waiting: 1
In Treatment: 1
Confirmed: 2
Scheduled: 3
Cancelled: 1
```

Total:

```text
9
```

---

# 45. Procedure Report Sample

Example rows:

```text
21 Sep 2026 — Joan Nambasa — Scaling & Polishing — Dr. Daniel Mugisha — UGX 180,000
05 Jul 2026 — Peter Okello — Porcelain Crown 36 — Dr. Sarah Nakanwagi — UGX 850,000
21 Jun 2026 — Peter Okello — Root Canal Treatment 36 — Dr. Sarah Nakanwagi — UGX 650,000
02 Jun 2026 — Samuel Kato — Simple Extraction 46 — Dr. Daniel Mugisha — UGX 150,000
```

---

# 46. Treatment Plan Status Report

Use:

```text
TP-000301 — Accepted
TP-000302 — Proposed
TP-000303 — Partially Accepted
TP-000304 — Accepted
```

This ensures multiple states appear.

---

# 47. Patient Registration Report

Example monthly sample:

```text
Apr 2026 — 1
May 2026 — 1
Jun 2026 — 1
Jul 2026 — 1
Aug 2026 — 2
Sep 2026 — 7
```

This can be expanded with additional fictional records if a richer chart is required.

---

# 48. Sample Patient Search Cases

The frontend should allow successful searches such as:

```text
PAT-000001
Amina
Nakato
+256 701 100 001
```

All should resolve to Amina Nakato.

Test partial search:

```text
Peter
Okello
```

---

# 49. Pagination Dataset Requirement

Twelve or thirteen patients may not be enough to visually test pagination.

Therefore, the frontend mock-data layer may include additional **lightweight fictional patient records** P014–P030.

These additional records do not need full clinical history.

They exist to test:

- pagination;
- search;
- filtering;
- status distribution.

They must still use valid unique patient numbers.

---

# 50. Lightweight Additional Patient Records

Recommended names:

```text
PAT-000014 — Ruth Namaganda
PAT-000015 — Michael Ocen
PAT-000016 — Patricia Nakibuuka
PAT-000017 — Robert Byaruhanga
PAT-000018 — Irene Acayo
PAT-000019 — Moses Kiwanuka
PAT-000020 — Faith Ninsiima
PAT-000021 — Andrew Wekesa
PAT-000022 — Caroline Nantongo
PAT-000023 — Steven Opio
PAT-000024 — Rebecca Nanyonga
PAT-000025 — Paul Tumwesigye
PAT-000026 — Juliet Atuhaire
PAT-000027 — George Lubega
PAT-000028 — Agnes Auma
PAT-000029 — David Ssekabira
PAT-000030 — Florence Nabukenya
```

Use fictional phones and addresses.

These names must not be linked to real patient data.

---

# 51. Sample Data File Structure Direction

For the HTML/CSS/JS frontend, centralized data may conceptually be organized as:

```text
assets/js/data/
    clinic.js
    users.js
    patients.js
    appointments.js
    clinical.js
    dental-chart.js
    treatment-plans.js
    finance.js
    recalls.js
    reports.js
```

or a smaller consolidated structure.

The exact number of files is not important.

Consistency is.

---

# 52. Single Source of Truth Rule

Do not duplicate the same patient object independently in multiple files.

Preferred conceptual approach:

```text
patients[]
appointments[] → patientId
encounters[] → patientId
invoices[] → patientId
```

Rather than:

```text
appointment.patientName = "Amina Nakato"
invoice.patientName = "Amina N."
```

with no shared identity.

Display names should be derived from shared records where practical.

---

# 53. Referential Integrity in Mock Data

Even before Laravel backend integration, mock data should behave like a relational dataset.

Use stable references such as:

```text
patientId
dentistId
appointmentId
encounterId
treatmentPlanId
invoiceId
paymentId
```

This makes eventual backend conversion much easier.

---

# 54. No Random Data Mutation

The frontend should not generate random patient values on every reload.

Seeded demo data should remain stable.

If temporary UI actions mutate mock data:

- changes may remain session-scoped;
- page refresh behavior should be intentional;
- data should not become inconsistent.

---

# 55. Browser Storage Direction

If frontend persistence is needed before backend integration:

- use a controlled mock-data store;
- localStorage/sessionStorage may be used selectively;
- do not scatter independent storage keys through every module.

The implementation plan should define the chosen mock-state strategy.

---

# 56. Data Reset Function

Optional but useful for frontend development:

```text
Reset Demo Data
```

This should be a developer-only utility, not a normal clinic-facing action.

It can restore the canonical sample dataset after testing mutations.

---

# 57. Sample Login Accounts

The frontend template may provide sample role login credentials for demonstration.

Use explicitly fake values.

Example:

```text
Administrator
admin@pearlsmiledental.test

Dentist
dentist@pearlsmiledental.test

Receptionist
reception@pearlsmiledental.test

Cashier
cashier@pearlsmiledental.test
```

Passwords should be demo-only and replaced during backend integration.

Do not place real credentials in production code.

---

# 58. Image / Avatar Direction

For patient/staff photos:

- use generated avatars;
- use initials;
- use royalty-safe placeholder assets;
- avoid real identifiable patient photos.

For medical images/X-ray placeholders:

- use clearly demo-safe assets;
- do not imply they belong to real patients.

---

# 59. Ugandan Context Rules

Sample data should naturally include:

- UGX;
- Ugandan names;
- Ugandan districts/towns;
- local phone formatting;
- Mobile Money;
- local clinic terminology.

Avoid excessive stereotypes or unrealistic demographic patterns.

---

# 60. Date Strategy

For the static MVP dataset, use:

```text
Reference Date: 21 September 2026
Timezone: Africa/Kampala
```

This allows deterministic frontend testing.

Later Laravel seeders may either preserve these dates or use relative seeded dates depending on demo requirements.

---

# 61. Dashboard Calculation Direction

Dashboard KPIs should be functions of data.

Example:

```text
todayAppointments =
appointments where appointmentDate == referenceDate

todayCollections =
SUM(payments where paidDate == referenceDate and status == posted)

outstandingBalance =
SUM(active invoice balances)
```

Avoid writing:

```text
todayCollections = 360000
```

in isolation if the actual payments already exist.

---

# 62. Report Calculation Direction

Reports should use the same mock query logic.

Example:

```text
No Show Report
=
appointments.filter(status == "no_show")
```

This ensures filters and totals remain consistent.

---

# 63. Sample Data Edge Cases

The dataset should deliberately include:

- active patient;
- inactive patient;
- new patient;
- child patient;
- patient with allergy;
- patient with chronic condition;
- completed appointment;
- cancelled appointment;
- no-show;
- rescheduled appointment;
- waiting patient;
- in-treatment patient;
- fully paid invoice;
- partial payment;
- outstanding balance;
- proposed treatment plan;
- accepted plan;
- partially accepted plan;
- overdue recall;
- scheduled recall;
- permanent dentition;
- primary dentition;
- root canal + crown;
- extraction history;
- multiple restorations.

---

# 64. Sample Data Anti-Patterns

Do not:

- create different Amina records in different modules;
- show paid invoice with non-zero balance;
- show receipt amount different from payment;
- show treatment completed without procedure;
- show recall scheduled with no appointment;
- show cancelled appointment in active waiting queue;
- show Cashier access to clinical note mock data;
- randomly change Dentist names;
- use dollars instead of UGX;
- mix real patient details into demo records;
- show impossible dental surface combinations.

---

# 65. Frontend Data Freeze Conditions

The sample dataset may be frozen when:

- all core modules reference shared IDs;
- dashboard totals reconcile;
- financial totals reconcile;
- appointment statuses reconcile;
- waiting-room data is valid;
- treatment plans match chart findings;
- procedures match treatment states;
- receipts match payments;
- recalls match appointments where scheduled;
- primary dentition example works;
- search and pagination have sufficient records;
- all data is fictional.

---

# 66. Migration to Laravel Seeders

When backend integration begins, this specification should map into:

```text
OrganizationSeeder
BranchSeeder
RoleSeeder
UserSeeder
AppointmentTypeSeeder
PaymentMethodSeeder
RecallTypeSeeder
ServiceCategorySeeder
ServiceSeeder
ToothDefinitionSeeder
DentalConditionSeeder
PatientSeeder
AppointmentSeeder
ClinicalSeeder
TreatmentPlanSeeder
FinanceSeeder
RecallSeeder
```

The exact seeder structure may vary.

---

# 67. Sample Data Summary

The sample dataset should demonstrate one complete ecosystem:

```text
Pearl Smile Dental Clinic
        ↓
Kampala Main Branch
        ↓
4 Active MVP Roles
        ↓
30 Fictional Patients
        ↓
Appointments
        ↓
Queue
        ↓
Clinical Encounters
        ↓
Dental Chart
        ↓
Treatment Plans
        ↓
Procedures
        ↓
Invoices
        ↓
Payments
        ↓
Receipts
        ↓
Recalls
```

All modules must tell the same story.

---

# Sample Data Specification Decision

**Recommended Status:** READY FOR REVIEW

**Primary Demo Clinic:** Pearl Smile Dental Clinic

**Reference Date:** 21 September 2026

**Data Principle:** One fictional relational dataset shared by all frontend modules.

**Next Document:** `11_FRONTEND_IMPLEMENTATION_PLAN.md`

The next document should define the exact phased execution order for the frontend UI/UX build, including global rules, shell creation, role workspaces, patient workflows, appointment calendar, waiting room, clinical encounter, odontogram, treatment planning, billing, reports, responsive audits, print audits, cross-module consistency checks, and final frontend freeze.
