// Loads src/engine.js into this Node process and returns the SIM object.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const src = readFileSync(fileURLToPath(new URL('../src/engine.js', import.meta.url)), 'utf8');
const ctx = { globalThis: {} };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(src, ctx);
export const SIM = ctx.SIM;
