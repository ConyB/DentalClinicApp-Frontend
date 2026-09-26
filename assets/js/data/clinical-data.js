import { branches, organization } from './clinic.js';
import { services } from './reference-data.js';

const serviceId = code => services.find(service => service.code === code).id;
const encounter = (id, encounterNumber, patientId, appointmentId, dentistUserId, status, createdAt, fields = {}) => ({ id, encounterNumber, organizationId: organization.id, branchId: branches[0].id, patientId, appointmentId, dentistUserId, status, chiefComplaint: null, examinationNotes: null, clinicalNotes: null, treatmentDiscussion: null, followUpNotes: null, startedAt: createdAt, completedAt: null, createdAt, updatedAt: createdAt, ...fields });

export const clinicalEncounters = [
  encounter('ENC-000201', 'ENC-000201', 'P001', 'APT-000094', 'U002', 'COMPLETED', '2026-09-20T11:00:00+03:00', { chiefComplaint: 'Food trapping and sensitivity on upper left molar.', examinationNotes: 'Caries on tooth 26 occlusal surface.', clinicalNotes: 'Dental caries affecting tooth 26.', treatmentDiscussion: 'Composite restoration advised.', followUpNotes: 'Return for filling.', completedAt: '2026-09-20T11:35:00+03:00', updatedAt: '2026-09-20T11:35:00+03:00' }),
  encounter('ENC-000202', 'ENC-000202', 'P003', 'APT-000101', 'U002', 'COMPLETED', '2026-09-21T08:02:00+03:00', { chiefComplaint: 'Routine cleaning.', examinationNotes: 'Mild plaque/calculus.', clinicalNotes: 'Plaque/calculus accumulation.', treatmentDiscussion: null, followUpNotes: 'Routine review in 6 months.', completedAt: '2026-09-21T08:47:00+03:00', updatedAt: '2026-09-21T08:47:00+03:00' }),
  encounter('ENC-000203', 'ENC-000203', 'P009', 'APT-000102', 'U003', 'DRAFT', '2026-09-21T08:54:00+03:00'),
  encounter('ENC-000204', 'ENC-000204', 'P002', null, 'U003', 'COMPLETED', '2026-06-21T09:00:00+03:00', { chiefComplaint: null, examinationNotes: 'Tooth 36 required endodontic treatment.', clinicalNotes: 'Root Canal Treatment completed on tooth 36.', treatmentDiscussion: null, followUpNotes: 'Crown restoration planned.', completedAt: '2026-06-21T10:30:00+03:00', updatedAt: '2026-06-21T10:30:00+03:00' })
];

export const encounterFindings = [
  { id: 'FINDING-201-01', encounterId: 'ENC-000201', toothCode: '26', findingCode: 'CARIES', description: 'Caries on tooth 26 occlusal surface.', recordedAt: '2026-09-20T11:10:00+03:00', recordedByUserId: 'U002' },
  { id: 'FINDING-202-01', encounterId: 'ENC-000202', toothCode: null, findingCode: 'PLAQUE_CALCULUS', description: 'Mild plaque/calculus.', recordedAt: '2026-09-21T08:10:00+03:00', recordedByUserId: 'U002' }
];
export const encounterDiagnoses = [
  { id: 'DIAGNOSIS-201-01', encounterId: 'ENC-000201', diagnosisCode: 'DENTAL_CARIES', description: 'Dental caries affecting tooth 26.', recordedAt: '2026-09-20T11:15:00+03:00', recordedByUserId: 'U002' },
  { id: 'DIAGNOSIS-202-01', encounterId: 'ENC-000202', diagnosisCode: 'PLAQUE_CALCULUS', description: 'Plaque/calculus accumulation.', recordedAt: '2026-09-21T08:12:00+03:00', recordedByUserId: 'U002' }
];

const chart = (id, patientId, toothCode, entryType, label, recordedAt, recordedByUserId, fields = {}) => ({ id, organizationId: organization.id, patientId, toothCode, entryType, label, encounterId: null, treatmentPlanId: null, treatmentPlanItemId: null, procedureId: null, serviceId: null, recordedAt, recordedByUserId, status: 'active', correctedEntryId: null, correctionReason: null, ...fields });
export const dentalChartEntries = [
  chart('CHART-001', 'P001', '16', 'EXISTING_TREATMENT', 'Restoration / Filling', '2025-05-11T09:00:00+03:00', 'U002', { conceptCode: 'RESTORATION' }),
  chart('CHART-002', 'P001', '26', 'CONDITION', 'Caries', '2026-09-20T11:10:00+03:00', 'U002', { conceptCode: 'CARIES', encounterId: 'ENC-000201' }),
  chart('CHART-003', 'P001', '36', 'EXISTING_TREATMENT', 'Root Canal Treated', '2025-06-21T10:30:00+03:00', 'U002', { conceptCode: 'ROOT_CANAL_TREATED' }),
  chart('CHART-004', 'P001', '36', 'EXISTING_TREATMENT', 'Crown', '2025-07-05T10:00:00+03:00', 'U002', { conceptCode: 'CROWN' }),
  chart('CHART-005', 'P001', '46', 'CONDITION', 'Missing', '2025-01-01T09:00:00+03:00', 'U002', { conceptCode: 'MISSING' }),
  chart('CHART-006', 'P001', '26', 'PLANNED_TREATMENT', 'Composite Filling', '2026-09-20T11:20:00+03:00', 'U002', { serviceId: serviceId('RES-001'), treatmentPlanId: 'TP-000301', treatmentPlanItemId: 'TPI-301-01' }),
  chart('CHART-007', 'P002', '36', 'COMPLETED_TREATMENT', 'Root Canal Treated', '2026-06-21T10:30:00+03:00', 'U003', { conceptCode: 'ROOT_CANAL_TREATED', encounterId: 'ENC-000204', procedureId: 'PROC-000403' }),
  chart('CHART-008', 'P002', '36', 'COMPLETED_TREATMENT', 'Crown', '2026-07-05T10:00:00+03:00', 'U003', { conceptCode: 'CROWN', procedureId: 'PROC-000404' }),
  chart('CHART-009', 'P002', '47', 'EXISTING_TREATMENT', 'Restoration', '2025-08-18T09:00:00+03:00', 'U003', { conceptCode: 'RESTORATION' }),
  chart('CHART-010', 'P003', '14', 'OBSERVATION', 'Healthy / No Recorded Abnormality', '2026-09-21T08:10:00+03:00', 'U002', { conceptCode: 'HEALTHY', encounterId: 'ENC-000202' }),
  chart('CHART-011', 'P003', '24', 'OBSERVATION', 'Healthy / No Recorded Abnormality', '2026-09-21T08:10:00+03:00', 'U002', { conceptCode: 'HEALTHY', encounterId: 'ENC-000202' }),
  chart('CHART-012', 'P003', '34', 'OBSERVATION', 'Healthy / No Recorded Abnormality', '2026-09-21T08:10:00+03:00', 'U002', { conceptCode: 'HEALTHY', encounterId: 'ENC-000202' }),
  chart('CHART-013', 'P003', '44', 'OBSERVATION', 'Healthy / No Recorded Abnormality', '2026-09-21T08:10:00+03:00', 'U002', { conceptCode: 'HEALTHY', encounterId: 'ENC-000202' }),
  chart('CHART-014', 'P004', '46', 'COMPLETED_TREATMENT', 'Extracted', '2026-06-02T10:00:00+03:00', 'U002', { conceptCode: 'EXTRACTED', procedureId: 'PROC-000402' }),
  chart('CHART-015', 'P004', '47', 'CONDITION', 'Caries', '2026-09-01T09:00:00+03:00', 'U002', { conceptCode: 'CARIES' }),
  chart('CHART-016', 'P004', '16', 'EXISTING_TREATMENT', 'Restoration', '2025-08-01T09:00:00+03:00', 'U002', { conceptCode: 'RESTORATION' }),
  chart('CHART-017', 'P005', '21', 'CONDITION', 'Fractured', '2026-09-19T11:10:00+03:00', 'U003', { conceptCode: 'FRACTURED' }),
  chart('CHART-018', 'P005', '21', 'PLANNED_TREATMENT', 'Porcelain Crown', '2026-09-19T11:20:00+03:00', 'U003', { serviceId: serviceId('PRO-001'), treatmentPlanId: 'TP-000302', treatmentPlanItemId: 'TPI-302-01' }),
  chart('CHART-019', 'P006', '16', 'EXISTING_TREATMENT', 'Restoration', '2025-05-20T09:00:00+03:00', 'U002', { conceptCode: 'RESTORATION' }),
  chart('CHART-020', 'P006', '26', 'EXISTING_TREATMENT', 'Restoration', '2025-06-20T09:00:00+03:00', 'U002', { conceptCode: 'RESTORATION' }),
  chart('CHART-021', 'P006', '36', 'EXISTING_TREATMENT', 'Restoration', '2025-07-20T09:00:00+03:00', 'U002', { conceptCode: 'RESTORATION' }),
  chart('CHART-022', 'P006', '45', 'EXISTING_TREATMENT', 'Restoration', '2025-08-20T09:00:00+03:00', 'U002', { conceptCode: 'RESTORATION' }),
  chart('CHART-023', 'P010', '11', 'CONDITION', 'Missing', '2024-01-01T09:00:00+03:00', 'U003', { conceptCode: 'MISSING' }), chart('CHART-024', 'P010', '12', 'CONDITION', 'Missing', '2024-01-01T09:00:00+03:00', 'U003', { conceptCode: 'MISSING' }), chart('CHART-025', 'P010', '21', 'CONDITION', 'Missing', '2024-01-01T09:00:00+03:00', 'U003', { conceptCode: 'MISSING' }), chart('CHART-026', 'P010', '22', 'CONDITION', 'Missing', '2024-01-01T09:00:00+03:00', 'U003', { conceptCode: 'MISSING' }),
  chart('CHART-027', 'P010', '36', 'EXISTING_TREATMENT', 'Restoration', '2025-04-20T09:00:00+03:00', 'U003', { conceptCode: 'RESTORATION' }),
  chart('CHART-028', 'P013', '75', 'CONDITION', 'Caries', '2026-09-12T10:00:00+03:00', 'U002', { conceptCode: 'CARIES' }), chart('CHART-029', 'P013', '84', 'EXISTING_TREATMENT', 'Restoration', '2026-09-12T10:00:00+03:00', 'U002', { conceptCode: 'RESTORATION' }), chart('CHART-030', 'P013', '64', 'OBSERVATION', 'Healthy / No Recorded Abnormality', '2026-09-12T10:00:00+03:00', 'U002', { conceptCode: 'HEALTHY' }), chart('CHART-031', 'P013', '75', 'PLANNED_TREATMENT', 'Composite Filling', '2026-09-12T10:10:00+03:00', 'U002', { serviceId: serviceId('RES-001'), treatmentPlanId: 'TP-000304', treatmentPlanItemId: 'TPI-304-01' })
];

export const dentalChartEntrySurfaces = [
  ['CHART-001', 'M'], ['CHART-001', 'O'], ['CHART-002', 'O'], ['CHART-006', 'O'], ['CHART-009', 'O'], ['CHART-015', 'O'], ['CHART-016', 'O'], ['CHART-019', 'M'], ['CHART-019', 'O'], ['CHART-020', 'D'], ['CHART-020', 'O'], ['CHART-021', 'O'], ['CHART-022', 'O'], ['CHART-027', 'O'], ['CHART-028', 'O'], ['CHART-029', 'O'], ['CHART-031', 'O']
].map(([dentalChartEntryId, surfaceCode], index) => ({ id: `CHART-SURFACE-${String(index + 1).padStart(2, '0')}`, dentalChartEntryId, surfaceCode }));

const plan = (id, treatmentPlanNumber, patientId, dentistUserId, status, createdAt, proposedTotal, acceptedTotal, completedTotal) => ({ id, treatmentPlanNumber, organizationId: organization.id, branchId: branches[0].id, patientId, dentistUserId, status, createdAt, updatedAt: createdAt, proposedTotal, acceptedTotal, completedTotal });
export const treatmentPlans = [
  plan('TP-000301', 'TP-000301', 'P001', 'U002', 'ACCEPTED', '2026-09-20T11:20:00+03:00', 120000, 120000, 0), plan('TP-000302', 'TP-000302', 'P005', 'U003', 'PROPOSED', '2026-09-19T11:20:00+03:00', 850000, 0, 0), plan('TP-000303', 'TP-000303', 'P004', 'U002', 'PARTIALLY_ACCEPTED', '2026-05-30T09:00:00+03:00', 450000, 330000, 150000), plan('TP-000304', 'TP-000304', 'P013', 'U002', 'ACCEPTED', '2026-09-12T10:10:00+03:00', 120000, 120000, 0)
];
const item = (id, treatmentPlanId, serviceCode, toothCode, acceptanceStatus, progressStatus, unitPrice, fields = {}) => ({ id, treatmentPlanId, serviceId: serviceId(serviceCode), serviceCode, toothCode, acceptanceStatus, progressStatus, unitPrice, quantity: 1, lineTotal: unitPrice, ...fields });
export const treatmentPlanItems = [
  item('TPI-301-01', 'TP-000301', 'RES-001', '26', 'ACCEPTED', 'IN_PROGRESS', 120000), item('TPI-302-01', 'TP-000302', 'PRO-001', '21', 'PROPOSED', 'PLANNED', 850000), item('TPI-303-01', 'TP-000303', 'EXT-001', '46', 'ACCEPTED', 'COMPLETED', 150000), item('TPI-303-02', 'TP-000303', 'RES-001', '47', 'DECLINED', 'CANCELLED', 120000), item('TPI-303-03', 'TP-000303', 'PRE-001', null, 'ACCEPTED', 'PLANNED', 180000), item('TPI-304-01', 'TP-000304', 'RES-001', '75', 'ACCEPTED', 'PLANNED', 120000)
];
export const treatmentPlanItemSurfaces = [['TPI-301-01', 'O'], ['TPI-303-02', 'O'], ['TPI-304-01', 'O']].map(([treatmentPlanItemId, surfaceCode], index) => ({ id: `PLAN-SURFACE-${String(index + 1).padStart(2, '0')}`, treatmentPlanItemId, surfaceCode }));

const procedure = (id, procedureNumber, patientId, encounterId, dentistUserId, serviceCode, toothCode, performedAt, amountSnapshot, fields = {}) => ({ id, procedureNumber, organizationId: organization.id, branchId: branches[0].id, patientId, encounterId, dentistUserId, serviceId: serviceId(serviceCode), serviceCode, treatmentPlanItemId: null, toothCode, performedAt, amountSnapshot, status: 'COMPLETED', notes: null, ...fields });
export const proceduresPerformed = [
  procedure('PROC-000401', 'PROC-000401', 'P003', 'ENC-000202', 'U002', 'PRE-001', null, '2026-09-21T08:40:00+03:00', 180000), procedure('PROC-000402', 'PROC-000402', 'P004', null, 'U002', 'EXT-001', '46', '2026-06-02T10:00:00+03:00', 150000, { treatmentPlanItemId: 'TPI-303-01' }), procedure('PROC-000403', 'PROC-000403', 'P002', 'ENC-000204', 'U003', 'END-002', '36', '2026-06-21T10:00:00+03:00', 650000), procedure('PROC-000404', 'PROC-000404', 'P002', null, 'U003', 'PRO-001', '36', '2026-07-05T10:00:00+03:00', 850000)
];
export const procedureSurfaces = [];

export const prescriptions = [{ id: 'RX-000501', prescriptionNumber: 'RX-000501', organizationId: organization.id, patientId: 'P004', encounterId: null, dentistUserId: 'U002', status: 'ISSUED', issuedAt: '2026-06-02T10:10:00+03:00', notes: 'Demo prescription only.' }];
export const prescriptionItems = [{ id: 'RXI-000501-01', prescriptionId: 'RX-000501', medicineName: 'Example Medication A', strength: 'Demo', dose: 'As prescribed', frequency: 'Demo', duration: 'Demo', instructions: 'Follow Dentist instructions' }];
export const patientDocuments = [
  { id: 'DOC-001', patientId: 'P001', encounterId: 'ENC-000201', type: 'X_RAY', title: 'Upper Left Posterior X-Ray', fileName: 'upper-left-posterior-xray-demo.jpg', mimeType: 'image/jpeg', placeholderAssetPath: null, capturedAt: '2026-09-20T11:05:00+03:00', uploadedByUserId: 'U002', notes: null },
  { id: 'DOC-002', patientId: 'P002', encounterId: 'ENC-000204', type: 'X_RAY', title: 'Tooth 36 Pre-RCT X-Ray', fileName: 'tooth-36-pre-rct-demo.jpg', mimeType: 'image/jpeg', placeholderAssetPath: null, capturedAt: '2026-06-21T09:00:00+03:00', uploadedByUserId: 'U003', notes: null },
  { id: 'DOC-003', patientId: 'P002', encounterId: 'ENC-000204', type: 'X_RAY', title: 'Tooth 36 Post-RCT X-Ray', fileName: 'tooth-36-post-rct-demo.jpg', mimeType: 'image/jpeg', placeholderAssetPath: null, capturedAt: '2026-06-21T10:30:00+03:00', uploadedByUserId: 'U003', notes: null },
  { id: 'DOC-004', patientId: 'P005', encounterId: null, type: 'CLINICAL_PHOTO', title: 'Tooth 21 Fracture', fileName: 'tooth-21-fracture-demo.jpg', mimeType: 'image/jpeg', placeholderAssetPath: null, capturedAt: '2026-09-19T11:10:00+03:00', uploadedByUserId: 'U003', notes: null }
];
