import { extractText, getDocumentProxy } from 'unpdf';

export interface ExtractedPage {
  pageNumber: number;
  content: string;
}

// Below this, a page is essentially blank (a divider, a stray page number)
// and isn't useful search content — skipped rather than stored as noise.
const MIN_CONTENT_LENGTH = 10;

export async function extractPagesFromPdf(buffer: Uint8Array): Promise<ExtractedPage[]> {
  // verbosity: 0 suppresses pdf.js's internal font-substitution/metrics
  // warnings, which are harmless but otherwise flood CI logs on every run.
  const pdf = await getDocumentProxy(buffer, { verbosity: 0 });
  const { text } = await extractText(pdf, { mergePages: false });

  const pages: ExtractedPage[] = [];
  for (let i = 0; i < text.length; i++) {
    const content = text[i].trim();
    if (content.length >= MIN_CONTENT_LENGTH) {
      pages.push({ pageNumber: i + 1, content });
    }
  }
  return pages;
}
