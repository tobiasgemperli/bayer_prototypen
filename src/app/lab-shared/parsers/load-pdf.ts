// Browser-side PDF loader: turns a PDF ArrayBuffer into a Doc using pdf.js.
// Kept separate from the parsers so the parsing logic stays environment-agnostic
// (the Node verification path builds a Doc with pdfjs-dist/legacy instead).
import * as pdfjs from 'pdfjs-dist';
// Vite compiles the worker for both dev and prod via the ?worker import,
// avoiding the module-worker/MIME pitfalls of a raw ?url worker script.
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
import { Doc, Page, itemsToWords } from './core';

pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();

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

/** Render the first page of a PDF into a canvas, scaled to `targetWidth` (CSS px). */
export async function renderFirstPage(data: ArrayBuffer, canvas: HTMLCanvasElement, targetWidth: number): Promise<void> {
  const pdf = await pdfjs.getDocument({ data }).promise;
  const page = await pdf.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const scale = (targetWidth / base.width) * dpr;
  const viewport = page.getViewport({ scale });
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.width = `${targetWidth}px`;
  canvas.style.height = `${viewport.height / dpr}px`;
  await page.render({ canvasContext: ctx, viewport }).promise;
}
