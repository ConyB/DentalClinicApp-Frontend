import { organization } from './clinic.js';
const reference = (id, code, name) => ({ id, organizationId: organization.id, code, name, status: 'active' });
const refCode = name => name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');

export const paymentMethods = ['CASH', 'MOBILE_MONEY', 'BANK', 'CARD', 'OTHER'].map(code => reference(`PAYMENT-METHOD-${code}`, code, code === 'MOBILE_MONEY' ? 'Mobile Money' : code[0] + code.slice(1).toLowerCase()));
export const appointmentTypes = [
  ['Consultation', 30], ['Review', 30], ['Scaling & Polishing', 45], ['Filling', 40], ['Extraction', 40],
  ['Root Canal', 90], ['Denture Review', 30], ['Emergency', 30], ['Other', 30]
].map(([name, defaultDurationMinutes]) => ({ ...reference(`APPOINTMENT-TYPE-${refCode(name)}`, refCode(name), name), defaultDurationMinutes }));
export const recallTypes = ['Routine Dental Review', 'Scaling Review', 'Post-Extraction Review', 'Root Canal Follow-Up', 'Denture Review', 'Orthodontic Review', 'Custom Follow-Up'].map(name => reference(`RECALL-TYPE-${refCode(name)}`, refCode(name), name));
export const serviceCategories = ['Consultation', 'Diagnostic', 'Preventive', 'Restorative', 'Extraction', 'Endodontic', 'Prosthodontic', 'Cosmetic', 'Other'].map(name => reference(`SERVICE-CATEGORY-${refCode(name)}`, refCode(name), name));
const categoryId = code => serviceCategories.find(category => category.code === code).id;
export const services = [
  ['CON-001', 'Dental Consultation', 'CONSULTATION', 50000, 30, false, 'none'], ['DIA-001', 'Dental X-Ray', 'DIAGNOSTIC', 40000, 15, false, 'none'], ['PRE-001', 'Scaling & Polishing', 'PREVENTIVE', 180000, 45, false, 'none'], ['RES-001', 'Composite Filling - Single Surface', 'RESTORATIVE', 120000, 40, true, 'single'], ['RES-002', 'Composite Filling - Multi Surface', 'RESTORATIVE', 180000, 50, true, 'multiple'], ['EXT-001', 'Simple Extraction', 'EXTRACTION', 150000, 40, true, 'none'], ['EXT-002', 'Surgical Extraction', 'EXTRACTION', 350000, 75, true, 'none'], ['END-001', 'Root Canal Treatment - Anterior', 'ENDODONTIC', 450000, 90, true, 'none'], ['END-002', 'Root Canal Treatment - Posterior', 'ENDODONTIC', 650000, 120, true, 'none'], ['PRO-001', 'Porcelain Crown', 'PROSTHODONTIC', 850000, 60, true, 'none'], ['PRO-002', 'Acrylic Partial Denture', 'PROSTHODONTIC', 600000, 60, false, 'none'], ['COS-001', 'Teeth Whitening', 'COSMETIC', 500000, 75, false, 'none']
].map(([code, name, categoryCode, defaultPrice, defaultDurationMinutes, requiresTooth, surfaceRequirement]) => ({ id: `SERVICE-${code}`, organizationId: organization.id, code, name, serviceCategoryId: categoryId(categoryCode), categoryCode, defaultPrice, defaultDurationMinutes, requiresTooth, supportsSurfaces: surfaceRequirement !== 'none', surfaceRequirement, status: 'active' }));
