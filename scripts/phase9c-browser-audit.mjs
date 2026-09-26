import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

await import('./phase9b-browser-audit.mjs');
const outputDir = join(resolve('.'), 'tests', 'audits', 'output', 'phase9c');
await mkdir(outputDir, { recursive: true });
const result = JSON.parse(await readFile(join(resolve('.'), 'tests', 'audits', 'output', 'phase9b', 'result.json'), 'utf8'));
await writeFile(join(outputDir, 'result.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
