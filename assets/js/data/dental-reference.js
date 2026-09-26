const permanentQuadrants = [[1, 'upper', 'right'], [2, 'upper', 'left'], [3, 'lower', 'left'], [4, 'lower', 'right']];
const primaryQuadrants = [[5, 'upper', 'right'], [6, 'upper', 'left'], [7, 'lower', 'left'], [8, 'lower', 'right']];
const toothType = (position, dentition) => {
  if (position <= 2) return 'incisor';
  if (position === 3) return 'canine';
  return dentition === 'primary' || position >= 6 ? 'molar' : 'premolar';
};
const toothName = (position, dentition) => ({ 1: 'Central Incisor', 2: 'Lateral Incisor', 3: 'Canine', 4: dentition === 'primary' ? 'First Molar' : 'First Premolar', 5: dentition === 'primary' ? 'Second Molar' : 'Second Premolar', 6: 'First Molar', 7: 'Second Molar', 8: 'Third Molar' }[position]);
const buildTeeth = (quadrants, positions, dentition) => quadrants.flatMap(([quadrant, arch, patientSide]) => positions.map(position => ({
  id: `TOOTH-${quadrant}${position}`, code: `${quadrant}${position}`, dentition, quadrant, arch, patientSide,
  position, toothType: toothType(position, dentition), name: toothName(position, dentition), isAnterior: position <= 3, isPosterior: position >= 4
})));

export const toothDefinitions = [
  ...buildTeeth(permanentQuadrants, [1, 2, 3, 4, 5, 6, 7, 8], 'permanent'),
  ...buildTeeth(primaryQuadrants, [1, 2, 3, 4, 5], 'primary')
];

export const toothSurfaceDefinitions = {
  posterior: [{ code: 'M', name: 'Mesial' }, { code: 'D', name: 'Distal' }, { code: 'B', name: 'Buccal' }, { code: 'L', name: 'Lingual' }, { code: 'O', name: 'Occlusal' }],
  anterior: [{ code: 'M', name: 'Mesial' }, { code: 'D', name: 'Distal' }, { code: 'F', name: 'Facial' }, { code: 'L', name: 'Lingual' }, { code: 'I', name: 'Incisal' }]
};

// Phase 12 Odontogram audited and frozen. Dental findings describe clinical
// chart state; planned treatment and completed procedures remain domain records.
export const normalizeDentalSurfaces = (tooth, surfaces = [], definitions = toothSurfaceDefinitions) => {
  if (!tooth || !Array.isArray(surfaces)) return [];
  const permitted = definitions[tooth.isPosterior ? 'posterior' : 'anterior'].map(surface => surface.code);
  const unique = [...new Set(surfaces.map(code => String(code || '').trim().toUpperCase()).filter(Boolean))].filter(code => permitted.includes(code));
  const order = tooth.isPosterior && ['M', 'D', 'O'].every(code => unique.includes(code))
    ? ['M', 'O', 'D', 'B', 'L']
    : permitted;
  return unique.sort((left, right) => order.indexOf(left) - order.indexOf(right));
};

// Approved chart-entry behavior from the Dental Chart specification. The reference
// catalogue remains the source of labels/categories; this map centralizes input rules.
export const dentalFindingRules = Object.freeze({
  HEALTHY: { surfaceMode: 'whole_tooth', accessibilityLabel: 'Healthy observation' },
  CARIES: { surfaceMode: 'surface', accessibilityLabel: 'Caries' },
  MISSING: { surfaceMode: 'whole_tooth', accessibilityLabel: 'Missing tooth' },
  UNERUPTED: { surfaceMode: 'whole_tooth', accessibilityLabel: 'Unerupted tooth' },
  PARTIALLY_ERUPTED: { surfaceMode: 'whole_tooth', accessibilityLabel: 'Partially erupted tooth' },
  IMPACTED: { surfaceMode: 'whole_tooth', accessibilityLabel: 'Impacted tooth' },
  FRACTURED: { surfaceMode: 'either', accessibilityLabel: 'Fractured tooth or surface' },
  MOBILE: { surfaceMode: 'whole_tooth', accessibilityLabel: 'Mobile tooth' },
  RETAINED_ROOT: { surfaceMode: 'whole_tooth', accessibilityLabel: 'Retained root' },
  EXTRACTION_REQUIRED: { surfaceMode: 'whole_tooth', accessibilityLabel: 'Extraction required' },
  OTHER_CONDITION: { surfaceMode: 'either', accessibilityLabel: 'Other clinical condition' },
  RESTORATION: { surfaceMode: 'surface', accessibilityLabel: 'Existing restoration' },
  CROWN: { surfaceMode: 'whole_tooth', accessibilityLabel: 'Existing crown' },
  BRIDGE: { surfaceMode: 'whole_tooth', accessibilityLabel: 'Existing bridge' },
  IMPLANT: { surfaceMode: 'whole_tooth', accessibilityLabel: 'Existing implant' },
  ROOT_CANAL_TREATED: { surfaceMode: 'whole_tooth', accessibilityLabel: 'Root canal treated' },
  EXTRACTED: { surfaceMode: 'whole_tooth', accessibilityLabel: 'Known extracted tooth' },
  OTHER_TREATMENT: { surfaceMode: 'either', accessibilityLabel: 'Other existing treatment' }
});

const dentalReference = (code, name, entryType) => ({ id: `DENTAL-${code}`, code, name, entryType, status: 'active' });
export const dentalConditions = [
  dentalReference('HEALTHY', 'Healthy / No Recorded Abnormality', 'condition'), dentalReference('CARIES', 'Caries', 'condition'), dentalReference('MISSING', 'Missing', 'condition'), dentalReference('UNERUPTED', 'Unerupted', 'condition'), dentalReference('PARTIALLY_ERUPTED', 'Partially Erupted', 'condition'), dentalReference('IMPACTED', 'Impacted', 'condition'), dentalReference('FRACTURED', 'Fractured', 'condition'), dentalReference('MOBILE', 'Mobile', 'condition'), dentalReference('RETAINED_ROOT', 'Retained Root', 'condition'), dentalReference('EXTRACTION_REQUIRED', 'Extraction Required', 'condition'), dentalReference('OTHER_CONDITION', 'Other Condition', 'condition'),
  dentalReference('RESTORATION', 'Filling / Restoration', 'existing_treatment'), dentalReference('CROWN', 'Crown', 'existing_treatment'), dentalReference('BRIDGE', 'Bridge', 'existing_treatment'), dentalReference('IMPLANT', 'Implant', 'existing_treatment'), dentalReference('ROOT_CANAL_TREATED', 'Root Canal Treated', 'existing_treatment'), dentalReference('EXTRACTED', 'Extracted', 'existing_treatment'), dentalReference('OTHER_TREATMENT', 'Other Existing Treatment', 'existing_treatment')
];
