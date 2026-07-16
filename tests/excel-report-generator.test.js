const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ExcelJS = require('exceljs');

// getOutputPath() resolves relative to process.env.PAYEDPOS_OUTPUT_DIR (see
// src/config/env.js), so point it at a throwaway temp directory for the
// duration of this test rather than writing into the real output/ folder.
const tempOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'payedpos-excel-test-'));
process.env.PAYEDPOS_OUTPUT_DIR = tempOutputDir;

const ExcelReportGenerator = require('../src/reports/excel/report-generator');

test('generates a real, readable .xlsx file with title, summary, and data rows', async () => {
  const generator = new ExcelReportGenerator();
  const outputPath = await generator.generate({
    title: 'Test Report',
    summary: 'A functional test of the Excel generator',
    rows: [
      { Name: 'Alpha', Status: 'Active' },
      { Name: 'Beta', Status: 'Inactive' },
    ],
  });

  assert.ok(fs.existsSync(outputPath), 'output file should exist on disk');

  // Read the file back with exceljs to confirm it's genuinely valid, not
  // just present on disk.
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(outputPath);
  const sheet = workbook.getWorksheet('Report');

  assert.equal(sheet.getRow(1).getCell(1).value, 'Test Report');
  assert.deepEqual(sheet.getRow(7).values.slice(1), ['Name', 'Status']);
  assert.deepEqual(sheet.getRow(8).values.slice(1), ['Alpha', 'Active']);
  assert.deepEqual(sheet.getRow(9).values.slice(1), ['Beta', 'Inactive']);
});

test('writes a placeholder row when there is no data', async () => {
  const generator = new ExcelReportGenerator();
  const outputPath = await generator.generate({
    title: 'Empty Report',
    summary: 'No records extracted',
    rows: [],
  });

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(outputPath);
  const sheet = workbook.getWorksheet('Report');

  assert.equal(sheet.getRow(7).getCell(1).value, 'No data available');
});

test('appends observations when provided', async () => {
  const generator = new ExcelReportGenerator();
  const outputPath = await generator.generate({
    title: 'Report With Observations',
    summary: 'Includes notes',
    rows: [{ Name: 'Alpha' }],
    observations: ['Row count is lower than usual.'],
  });

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(outputPath);
  const sheet = workbook.getWorksheet('Report');

  const values = [];
  sheet.eachRow((row) => values.push(row.getCell(1).value));

  assert.ok(values.includes('Observations'));
  assert.ok(values.includes('Row count is lower than usual.'));
});

test.after(() => {
  fs.rmSync(tempOutputDir, { recursive: true, force: true });
});
