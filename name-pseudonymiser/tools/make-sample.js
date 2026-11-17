// Writes sample/referrals-sample.xlsx: invented data for trying the tool.
// Every name in it is made up.
const path = require('path');
const ExcelJS = require('exceljs');

const OUT = path.join(__dirname, '..', 'sample', 'referrals-sample.xlsx');

const referrals = [
  ['R-101', 'Leo Fitzgerald', 9, 'Sarah Fitzgerald', 'Helen Bradshaw', '2026-09-08', 'Open'],
  ['R-102', 'Isla Morgan-Price', 7, 'Mr D Morgan-Price', 'Tom Ashworth', '2026-09-10', 'Closed'],
  ['R-103', "Noah O'Sullivan", 10, "Siobhan O'Sullivan", 'Priya Nair', '2026-09-15', 'Monitoring'],
  ['R-104', 'Zara Ahmed', 8, 'Farah Ahmed', 'Helen Bradshaw', '2026-09-17', 'Open'],
  ['R-105', 'Freya Lindqvist', 11, 'Anna Lindqvist', 'Gareth Lloyd-Evans', '2026-09-22', 'Closed'],
  ['R-106', 'Musa Okonkwo', 9, 'Grace Okonkwo', 'Tom Ashworth', '2026-09-29', 'Open'],
  ['R-107', 'Ruby Castellano', 7, 'Marco Castellano', 'Priya Nair', '2026-10-01', 'Monitoring'],
  ['R-108', 'Harry Whitfield', 10, 'Mrs Whitfield', 'Hannah Brooke', '2026-10-06', 'Open'],
  ['R-109', 'Aisha Siddiqui', 8, 'Imran Siddiqui', 'Gareth Lloyd-Evans', '2026-10-08', 'Closed'],
  ['R-110', 'Leo Fitzgerald', 9, 'Sarah Fitzgerald', 'Helen Bradshaw', '2026-10-13', 'Monitoring'],
  ['R-111', 'Ewan MacLeod', 11, 'N/A', 'Tom Ashworth', '2026-10-20', 'Open'],
  ['R-112', 'Maya Kowalczyk', 7, 'Piotr Kowalczyk', 'Priya Nair', '2026-10-22', 'Open'],
];

const staff = [
  ['Helen Bradshaw', 'Head of Year 9', 'S014'],
  ['Tom Ashworth', 'Pastoral Lead', 'S022'],
  ['Priya Nair', 'School Counsellor', 'S031'],
  ['Gareth Lloyd-Evans', 'Form Tutor', 'S045'],
  ['Hannah Brooke', 'Form Tutor', 'S052'],
];

const headerStyle = (row) => {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F4F7F' } };
};

async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sample generator';
  wb.created = new Date('2026-11-01T09:00:00Z');
  wb.modified = new Date('2026-11-01T09:00:00Z');

  const ws = wb.addWorksheet('Referrals', { views: [{ state: 'frozen', ySplit: 3 }] });
  ws.mergeCells('A1:H1');
  ws.getCell('A1').value = 'Pastoral referrals (sample data, all names invented)';
  ws.getCell('A1').font = { bold: true, size: 14 };
  const header = ws.getRow(3);
  header.values = ['Ref', 'Student Name', 'Year', 'Parent/Carer Name', 'Staff', 'Date', 'Status', 'Summary'];
  headerStyle(header);
  ws.columns = [
    { width: 9 }, { width: 22 }, { width: 7 }, { width: 22 }, { width: 22 }, { width: 12 }, { width: 13 }, { width: 44 },
  ];
  referrals.forEach((r, i) => {
    const n = i + 4;
    const row = ws.getRow(n);
    row.values = [r[0], r[1], r[2], r[3], r[4], new Date(`${r[5]}T00:00:00Z`), r[6]];
    row.getCell(6).numFmt = 'dd/mm/yyyy';
    // A formula that copies names into a column without "name" in its header.
    row.getCell(8).value = {
      formula: `B${n}&" (Year "&C${n}&"), seen by "&E${n}`,
      result: `${r[1]} (Year ${r[2]}), seen by ${r[4]}`,
    };
  });

  const ss = wb.addWorksheet('Staff');
  const sh = ss.getRow(1);
  sh.values = ['Staff Name', 'Role', 'Staff ID'];
  headerStyle(sh);
  ss.columns = [{ width: 22 }, { width: 20 }, { width: 10 }];
  staff.forEach((s) => ss.addRow(s));

  await wb.xlsx.writeFile(OUT);
  console.log(`Wrote ${path.relative(process.cwd(), OUT)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
