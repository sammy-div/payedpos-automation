/**
 * Data extraction - orchestrates the existing TableExtractor and
 * PaginationEngine (both already generic: no hardcoded table structure
 * or column assumptions, and TableExtractor specifically has 6 passing
 * tests against real DOM semantics - see tests/table-extractor.test.js).
 * This file adds nothing to the extraction logic itself, just wires the
 * two together and gives the result a typed shape.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const TableExtractor = require('../src/browser/extractors/table-extractor');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PaginationEngine = require('../src/browser/pagination/pagination-engine');

import type { Page } from 'playwright';
import { log } from './utils';

export interface ScrapedTable {
  headers: string[];
  rows: Record<string, string>[];
}

export interface ScrapeOptions {
  /** CSS selector matching one or more tables. Defaults to 'table'. */
  selector?: string;
  /** Follow pagination (Next/numbered) to collect every page. Defaults to true. */
  paginate?: boolean;
}

export async function scrapeRoute(page: Page, options: ScrapeOptions = {}): Promise<ScrapedTable> {
  const selector = options.selector ?? 'table';
  const shouldPaginate = options.paginate ?? true;

  const tableExtractor = new TableExtractor();
  let headers: string[] = [];

  const extractPageData = async (): Promise<{ rows: Record<string, string>[] }> => {
    const result = await tableExtractor.extract(page, selector);
    if (!headers.length) {
      headers = result.headers;
    }
    return { rows: result.rows };
  };

  log.info('scraper.start', { selector, paginate: shouldPaginate });

  let rows: Record<string, string>[];
  if (shouldPaginate) {
    const paginationEngine = new PaginationEngine();
    rows = await paginationEngine.paginate(page, extractPageData);
  } else {
    ({ rows } = await extractPageData());
  }

  log.info('scraper.complete', { rowCount: rows.length, columnCount: headers.length });

  return { headers, rows };
}
