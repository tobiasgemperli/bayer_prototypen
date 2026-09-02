// Browser-side PDF loader: turns a PDF ArrayBuffer into a Doc using pdf.js.
// Kept separate from the parsers so the parsing logic stays environment-agnostic
// (the Node verification path builds a Doc with pdfjs-dist/legacy instead).
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Doc, Page, itemsToWords } from './core';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function loadDoc(data: ArrayBuffer): Promise<Doc> {
  const pdf = await pdfjs.getDocument({ data }).promise;
  let producer = '';
  try {
    const meta: any = await pdf.getMetadata();
    producer = `${meta?.info?.Producer ?? ''} ${meta?.info?.Creator ?? ''}`.trim();
  } catch { /* no metadata */ }

  const pages: Page[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const height = page.getViewport({ scale: 1 }).height;
    const tc = await page.getTextContent();
    pages.push(itemsToWords(tc.items as any[], height));
  }
  return { producer, pages };
}
