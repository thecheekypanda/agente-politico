import { PDFDocument, StandardFonts } from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';
import { extractPagesFromPdf } from '../src/pdf-extractor.js';

let samplePdf: Uint8Array;

beforeAll(async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const page1 = doc.addPage([300, 300]);
  page1.setFont(font);
  page1.drawText('First page with substantial program text about housing policy.', {
    x: 10,
    y: 250,
    size: 10,
  });

  const page2 = doc.addPage([300, 300]);
  page2.setFont(font);
  page2.drawText('Second page covering a different topic entirely, health policy.', {
    x: 10,
    y: 250,
    size: 10,
  });

  // A near-blank divider page — should be filtered out by MIN_CONTENT_LENGTH.
  const page3 = doc.addPage([300, 300]);
  page3.setFont(font);
  page3.drawText('X', { x: 10, y: 250, size: 10 });

  samplePdf = await doc.save();
});

describe('extractPagesFromPdf', () => {
  it('extracts text per page with correct 1-indexed page numbers', async () => {
    // unpdf/pdf.js transfers the underlying buffer internally, detaching it
    // — each call needs its own copy of the sample.
    const pages = await extractPagesFromPdf(samplePdf.slice());

    expect(pages.map((p) => p.pageNumber)).toEqual([1, 2]);
    expect(pages[0].content).toContain('housing policy');
    expect(pages[1].content).toContain('health policy');
  });

  it('filters out near-blank pages', async () => {
    // unpdf/pdf.js transfers the underlying buffer internally, detaching it
    // — each call needs its own copy of the sample.
    const pages = await extractPagesFromPdf(samplePdf.slice());

    // Only 2 of the 3 pages have enough content to pass MIN_CONTENT_LENGTH.
    expect(pages).toHaveLength(2);
    expect(pages.some((p) => p.content === 'X')).toBe(false);
  });
});
