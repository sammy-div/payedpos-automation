const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const TableExtractor = require('../src/browser/extractors/table-extractor');

/**
 * Minimal fake Playwright Locator/Page, backed by a real jsdom document.
 *
 * TableExtractor's actual DOM-querying logic runs inside `table.evaluate(fn)`
 * as plain DOM API code (querySelectorAll, closest, textContent, children) -
 * it has no Playwright-specific behavior. jsdom implements the same DOM APIs
 * a real Chromium page would, so this exercises the real extraction logic
 * without needing a real browser or network access to the actual PayedPOS
 * site (neither of which this environment can reach).
 */
class FakeLocator {
  constructor(elements) {
    this.elements = elements;
  }
  async count() {
    return this.elements.length;
  }
  nth(index) {
    return new FakeLocator([this.elements[index]]);
  }
  locator(selector) {
    return new FakeLocator(this.elements.flatMap((el) => Array.from(el.querySelectorAll(selector))));
  }
  async evaluate(fn) {
    assert.equal(this.elements.length, 1, 'evaluate() expects exactly 1 matched element');
    return fn(this.elements[0]);
  }
}

function fakePage(html) {
  const document = new JSDOM(html).window.document;
  return {
    locator: (selector) => new FakeLocator(Array.from(document.querySelectorAll(selector))),
  };
}

test('extracts headers and rows from a standard thead/tbody table', async () => {
  const page = fakePage(`
    <table>
      <thead><tr><th>Name</th><th>Status</th></tr></thead>
      <tbody>
        <tr><td>Alpha</td><td>Active</td></tr>
        <tr><td>Beta</td><td>Inactive</td></tr>
      </tbody>
    </table>`);

  const result = await new TableExtractor().extract(page, 'table');

  assert.deepEqual(result.headers, ['Name', 'Status']);
  assert.deepEqual(result.rows, [
    { Name: 'Alpha', Status: 'Active' },
    { Name: 'Beta', Status: 'Inactive' },
  ]);
  assert.equal(result.tableCount, 1);
});

test('treats the first row as headers when there is no thead, without double-counting it as data', async () => {
  const page = fakePage(`
    <table>
      <tr><td>Name</td><td>Status</td></tr>
      <tr><td>Alpha</td><td>Active</td></tr>
      <tr><td>Beta</td><td>Inactive</td></tr>
    </table>`);

  const result = await new TableExtractor().extract(page, 'table');

  assert.deepEqual(result.headers, ['Name', 'Status']);
  assert.equal(result.rows.length, 2);
  assert.deepEqual(result.rows, [
    { Name: 'Alpha', Status: 'Active' },
    { Name: 'Beta', Status: 'Inactive' },
  ]);
});

test('picks the table with the most rows when a selector matches several', async () => {
  const page = fakePage(`
    <table id="filters">
      <thead><tr><th>Filter</th></tr></thead>
      <tbody><tr><td>Active</td></tr></tbody>
    </table>
    <table id="data">
      <thead><tr><th>ID</th><th>Name</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>Alpha</td></tr>
        <tr><td>2</td><td>Beta</td></tr>
        <tr><td>3</td><td>Gamma</td></tr>
        <tr><td>4</td><td>Delta</td></tr>
      </tbody>
    </table>`);

  const result = await new TableExtractor().extract(page, 'table');

  assert.equal(result.tableCount, 2);
  assert.equal(result.selectedTableIndex, 1);
  assert.deepEqual(result.headers, ['ID', 'Name']);
  assert.equal(result.rows.length, 4);
});

test('an explicit tableIndex overrides the row-count heuristic', async () => {
  const page = fakePage(`
    <table><thead><tr><th>Filter</th></tr></thead><tbody><tr><td>Active</td></tr></tbody></table>
    <table><thead><tr><th>ID</th></tr></thead><tbody><tr><td>1</td></tr><tr><td>2</td></tr></tbody></table>`);

  const result = await new TableExtractor().extract(page, 'table', { tableIndex: 0 });

  assert.equal(result.selectedTableIndex, 0);
  assert.deepEqual(result.headers, ['Filter']);
});

test('drops fully empty rows', async () => {
  const page = fakePage(`
    <table>
      <thead><tr><th>Name</th><th>Status</th></tr></thead>
      <tbody>
        <tr><td>Alpha</td><td>Active</td></tr>
        <tr><td></td><td></td></tr>
        <tr><td>Beta</td><td>Inactive</td></tr>
      </tbody>
    </table>`);

  const result = await new TableExtractor().extract(page, 'table');

  assert.equal(result.rows.length, 2);
});

test('returns an empty result shape when no table matches', async () => {
  const page = fakePage('<div>no tables here</div>');

  const result = await new TableExtractor().extract(page, 'table');

  assert.deepEqual(result, { headers: [], rows: [], tableCount: 0, selectedTableIndex: -1 });
});
