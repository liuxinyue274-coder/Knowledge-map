import { NextResponse } from "next/server";

import { diagnoseMistakeImage } from "@/lib/ai";
import type { DiagnosisResult, KnowledgeGraph } from "@/lib/types";

export const runtime = "nodejs";

function fallbackDiagnosis(graph: KnowledgeGraph): DiagnosisResult {
  const candidate =
    graph.nodes.find((node) => !graph.edges.some((edge) => edge.source === node.id)) ?? graph.nodes[0];

  return {
    nodeId: candidate?.id ?? "",
    concept: String(candidate?.data?.label ?? "核心知识点"),
    reason: "当前未配置视觉模型 API Key，系统用图谱叶子节点做了演示性匹配。接入模型后会读取图片内容并判断真实考点。",
    advice: "建议先核对题目涉及的定义、公式触发条件和解题转化步骤，再将错因记录到该节点。",
    confidence: 0.38,
    extractedQuestion: "未启用视觉识别"
  };
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const graphValue = form.get("graph");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "缺少错题图片" }, { status: 400 });
    }

    const graph = JSON.parse(String(graphValue ?? "{}")) as KnowledgeGraph;
    const bytes = Buffer.from(await file.arrayBuffer());
    const imageDataUrl = `data:${file.type || "image/png"};base64,${bytes.toString("base64")}`;
    const result = await diagnoseMistakeImage({
      imageDataUrl,
      graph,
      fallback: fallbackDiagnosis(graph)
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "无法诊断错题图片" }, { status: 500 });
  }
}
