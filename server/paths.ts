import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(here, '..');
export const SRC_DIR = path.join(ROOT, 'src');
export const GENERATED_DIR = path.join(SRC_DIR, 'generated');
export const GENERATED_INDEX = path.join(GENERATED_DIR, 'index.ts');
export const PUBLIC_DIR = path.join(ROOT, 'public');
export const PUBLIC_ASSETS_DIR = path.join(PUBLIC_DIR, 'generated');
export const OUT_DIR = path.join(ROOT, 'out');
export const REMOTION_ENTRY = path.join(SRC_DIR, 'index.ts');
