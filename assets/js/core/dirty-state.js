const sources = new Set();
const legacySource = 'legacy-form';
export const dirtyState = { hasUnsavedChanges: () => sources.size > 0, isDirty: source => sources.has(source), getSources: () => [...sources], setUnsavedChanges: (value, source = legacySource) => { if (value) sources.add(source); else sources.delete(source); }, markUnsavedChanges: source => sources.add(source), clearUnsavedChanges: source => sources.delete(source), clear: () => sources.clear() };
