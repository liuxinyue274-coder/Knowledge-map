import { createCanvas } from "@napi-rs/canvas";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export type RenderedPdfPage = {
  pageNumber: number;
  dataUrl: string;
};

type PdfPageProxy = {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (options: { canvas?: unknown; canvasContext: unknown; viewport: unknown }) => { promise: Promise<void> };
};

type PdfDocumentProxy = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxy>;
};

export async function renderPdfPagesForVision(buffer: Buffer, maxPages = 4): Promise<RenderedPdfPage[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs")
  ).href;
  const documentTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true
  });
  const document = (await documentTask.promise) as unknown as PdfDocumentProxy;
  const pageCount = Math.min(document.numPages, maxPages);
  const pages: RenderedPdfPage[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.65 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");

    await page.render({ canvas, canvasContext: context, viewport }).promise;

    const png = canvas.toBuffer("image/png");
    pages.push({
      pageNumber,
      dataUrl: `data:image/png;base64,${png.toString("base64")}`
    });
  }

  return pages;
}
