import { NextResponse } from "next/server";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

import { createKnowledgeGraphFromImages, createKnowledgeGraphFromText, normalizeKnowledgeGraph } from "@/lib/ai";
import { graphFromTextFallback, scannedPdfFallback } from "@/lib/mock-graph";
import { renderPdfPagesForVision } from "@/lib/pdf-pages";

export const runtime = "nodejs";

const MIN_TEXT_LENGTH_FOR_MAP = 120;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "缺少 PDF 文件" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await pdfParse(buffer);
    const text = parsed.text?.replace(/\s+/g, " ").trim() ?? "";

    if (text.length >= MIN_TEXT_LENGTH_FOR_MAP) {
      const fallback = graphFromTextFallback(text);
      const graph = await createKnowledgeGraphFromText(text, fallback);
      return NextResponse.json({
        ...graph,
        source: "text",
        pageCount: parsed.numpages,
        notice: "已从 PDF 文字层生成知识图谱。"
      });
    }

    const fallback = scannedPdfFallback(file.name);
    const pages = await renderPdfPagesForVision(buffer, 4);

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        ...normalizeKnowledgeGraph(fallback),
        source: "vision-fallback",
        pageCount: parsed.numpages,
        scannedPages: pages.length,
        notice:
          "检测到这是图片型 PDF，已完成页面扫描准备。当前没有配置 OPENAI_API_KEY，所以暂时显示扫描流程图；配置后会自动用视觉 OCR 生成真实知识地图。"
      });
    }

    const graph = await createKnowledgeGraphFromImages(pages, fallback);
    return NextResponse.json({
      ...graph,
      source: "vision",
      pageCount: parsed.numpages,
      scannedPages: pages.length,
      notice: `检测到图片型 PDF，已扫描前 ${pages.length} 页并用视觉 OCR 生成知识图谱。`
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "无法解析 PDF 或生成知识图谱" }, { status: 500 });
  }
}
