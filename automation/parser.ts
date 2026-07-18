import type { ScrapedTable } from './scraper';
import { log } from './utils';

export interface ParsedPayload {
  route: string;
  scrapedAt: string;
  headers: string[];
  rows: Record<string, string>[];
  recordCount: number;
}

export class ExtractionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtractionValidationError';
  }
}

function normalizeRow(row: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key] = typeof value === 'string' ? value.trim() : String(value ?? '');
  }
  return normalized;
}

function isEffectivelyEmpty(row: Record<string, string>): boolean {
  return Object.values(row).every((value) => value === '');
}

/**
 * Validates and normalizes a scraped table before it's uploaded.
 *
 * Throws ExtractionValidationError - rather than silently uploading
 * something wrong - when the shape looks like the real page's layout
 * changed (e.g. zero headers found, which TableExtractor only produces
 * when it couldn't find any table matching the selector at all).
 */
export function parseAndValidate(route: string, scraped: ScrapedTable): ParsedPayload {
  if (!Array.isArray(scraped.rows)) {
    throw new ExtractionValidationError(`Expected rows to be an array for route "${route}", got: ${typeof scraped.rows}`);
  }

  if (scraped.headers.length === 0 && scraped.rows.length > 0) {
    // Rows without headers shouldn't be possible given how TableExtractor
    // builds row objects (keyed by header), but treat it as a hard
    // validation failure rather than silently uploading headerless data.
    throw new ExtractionValidationError(
      `Extraction produced ${scraped.rows.length} rows but zero headers for route "${route}" - likely a layout change.`
    );
  }

  const normalizedRows = scraped.rows.map(normalizeRow).filter((row) => !isEffectivelyEmpty(row));

  if (normalizedRows.length !== scraped.rows.length) {
    log.warn('parser.dropped_empty_rows', {
      route,
      before: scraped.rows.length,
      after: normalizedRows.length,
    });
  }

  const payload: ParsedPayload = {
    route,
    scrapedAt: new Date().toISOString(),
    headers: scraped.headers,
    rows: normalizedRows,
    recordCount: normalizedRows.length,
  };

  log.info('parser.complete', { route, recordCount: payload.recordCount });

  return payload;
}
