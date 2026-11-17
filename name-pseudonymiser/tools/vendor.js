// Copies the ExcelJS browser build from node_modules into vendor/, so the
// page works offline without npm. Run after changing the exceljs version.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkgDir = path.dirname(require.resolve('exceljs/package.json'));
const { version } = require('exceljs/package.json');
const vendor = path.join(root, 'vendor');

fs.mkdirSync(vendor, { recursive: true });
fs.copyFileSync(path.join(pkgDir, 'dist', 'exceljs.min.js'), path.join(vendor, 'exceljs.min.js'));
fs.copyFileSync(path.join(pkgDir, 'LICENSE'), path.join(vendor, 'exceljs.LICENSE'));
console.log(`Copied ExcelJS ${version} to vendor/`);
