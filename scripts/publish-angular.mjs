import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve('frontend/dist/turnos-atencion/browser');
const destination = resolve('public');
rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
cpSync(source, destination, { recursive: true });
console.log(`Angular assets published from ${source} to ${destination}`);
