const { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, BorderStyle, UnderlineType } = require('docx');
const fs = require('fs');
const { getOutputPath, getTimestampedFileName } = require('../../utils/file');
const logger = require('../../utils/logger');
const { AutomationError } = require('../../utils/errors');

class WordReportGenerator {
  async generate({
    title = 'PayedPOS Report',
    summary = '',
    rows = [],
    observations = [],
    filters = [],
    includeStatistics = true
  } = {}) {
    try {
      logger.info('report.word.start', { title, rowCount: rows.length });

      const children = [];

      // Title
      children.push(
        new Paragraph({
          children: [new TextRun({ text: title, bold: true, size: 32, color: '1F4E78' })],
          spacing: { after: 200 }
        })
      );

      // Metadata section
      const generatedAt = new Date().toISOString();
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Generated: ', bold: true }),
            new TextRun({ text: generatedAt })
          ],
          spacing: { after: 100 }
        })
      );

      // Summary
      if (summary) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Summary: ', bold: true }),
              new TextRun({ text: summary })
            ],
            spacing: { after: 100 }
          })
        );
      }

      // Record count
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Total Records: ', bold: true }),
            new TextRun({ text: String(rows.length) })
          ],
          spacing: { after: 200 }
        })
      );

      // Filters applied
      if (filters && filters.length > 0) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: 'Filters Applied:', bold: true, underline: { type: UnderlineType.SINGLE } })],
            spacing: { after: 100 }
          })
        );

        filters.forEach(filter => {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `• ${filter}` })],
              spacing: { after: 50 }
            })
          );
        });

        children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      }

      // Statistics
      if (includeStatistics && rows.length > 0) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: 'Statistics:', bold: true, underline: { type: UnderlineType.SINGLE } })],
            spacing: { after: 100 }
          })
        );

        const stats = this.calculateStatistics(rows);
        for (const [key, value] of Object.entries(stats)) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${key}: `, bold: true }),
                new TextRun({ text: String(value) })
              ],
              spacing: { after: 50 }
            })
          );
        }

        children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      }

      // Observations
      if (observations && observations.length > 0) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: 'Observations:', bold: true, underline: { type: UnderlineType.SINGLE } })],
            spacing: { after: 100 }
          })
        );

        observations.forEach(observation => {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `• ${observation}` })],
              spacing: { after: 100 }
            })
          );
        });

        children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      }

      // Data table
      if (rows.length > 0) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: 'Data Table:', bold: true, underline: { type: UnderlineType.SINGLE } })],
            spacing: { after: 100 }
          })
        );

        const tableRows = this.generateTableRows(rows);
        const table = new Table({
          rows: tableRows,
          width: { size: 100, type: 'pct' }
        });

        children.push(table);
      } else {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: 'No data available for export.' })]
          })
        );
      }

      const doc = new Document({ sections: [{ properties: {}, children }] });
      const outputPath = getOutputPath(getTimestampedFileName('report', 'docx'));
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(outputPath, buffer);

      logger.info('report.word.complete', { outputPath, totalRows: rows.length });
      return outputPath;
    } catch (error) {
      logger.error('report.word.error', { message: error.message });
      throw new AutomationError('Word export failed', { cause: error.message });
    }
  }

  /**
   * Calculate statistics from data
   * @private
   */
  calculateStatistics(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return {};
    }

    const stats = {
      'Total Records': rows.length,
      'Fields': Object.keys(rows[0]).length
    };

    // Count non-empty fields
    const firstRecord = rows[0];
    for (const field of Object.keys(firstRecord)) {
      const nonEmpty = rows.filter(r => r[field] && String(r[field]).trim()).length;
      stats[`Populated (${field})`] = `${nonEmpty}/${rows.length}`;
    }

    return stats;
  }

  /**
   * Generate table rows for Word document
   * @private
   */
  generateTableRows(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return [];
    }

    const result = [];
    const headers = Object.keys(rows[0]);

    // Header row
    const headerCells = headers.map(header =>
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: header, bold: true })],
          spacing: { after: 0 }
        })],
        shading: { fill: 'E7E6E6' }
      })
    );

    result.push(new TableRow({ children: headerCells }));

    // Data rows (limit to 100 for performance)
    const maxRows = Math.min(rows.length, 100);
    for (let i = 0; i < maxRows; i++) {
      const row = rows[i];
      const cells = headers.map(header => {
        const value = row[header] !== null && row[header] !== undefined ? String(row[header]) : '';
        return new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: value })],
            spacing: { after: 0 }
          })],
          shading: i % 2 === 0 ? { fill: 'F8F8F8' } : { fill: 'FFFFFF' }
        });
      });
      result.push(new TableRow({ children: cells }));
    }

    // Add note if more rows exist
    if (rows.length > 100) {
      const noteCells = [new TableCell({
        children: [new Paragraph({
          children: [new TextRun({
            text: `... and ${rows.length - 100} more records (see full snapshot for complete data)`,
            italics: true
          })]
        })],
        columnSpan: headers.length
      })];
      result.push(new TableRow({ children: noteCells }));
    }

    return result;
  }
}

module.exports = WordReportGenerator;
