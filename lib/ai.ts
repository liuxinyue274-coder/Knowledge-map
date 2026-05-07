import type { DiagnosisResult, KnowledgeGraph, KnowledgeNodeData, TutorResult } from "@/lib/types";
import type { RenderedPdfPage } from "@/lib/pdf-pages";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

type ChatMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "user";
      content: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } }
      >;
    };

function extractJson(content: string) {
  const trimmed = content.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match?.[0] ?? "{}";
}

async function requestJson<T>(messages: ChatMessage[], fallback: T): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback;

  const response = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Model request failed: ${detail}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(extractJson(content)) as T;
}

function normalizeGraph(graph: KnowledgeGraph): KnowledgeGraph {
  const nodes = (graph.nodes ?? []).slice(0, 40).map((node, index) => ({
    id: String(node.id || `node-${index}`),
    type: "knowledge",
    position: node.position ?? {
      x: 120 + (index % 4) * 280,
      y: 80 + Math.floor(index / 4) * 130
    },
    data: {
      label: String(node.data?.label ?? `知识点 ${index + 1}`),
      summary: typeof node.data?.summary === "string" ? node.data.summary : "",
      level: Number(node.data?.level ?? 1),
      mistakeCount: Number(node.data?.mistakeCount ?? 0),
      diagnosed: false
    }
  }));

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = (graph.edges ?? [])
    .filter((edge) => nodeIds.has(String(edge.source)) && nodeIds.has(String(edge.target)))
    .slice(0, 60)
    .map((edge, index) => ({
      id: String(edge.id || `edge-${index}`),
      source: String(edge.source),
      target: String(edge.target),
      animated: true
    }));

  return { nodes, edges };
}

export function normalizeKnowledgeGraph(graph: KnowledgeGraph): KnowledgeGraph {
  return normalizeGraph(graph);
}

export async function createKnowledgeGraphFromText(text: string, fallback: KnowledgeGraph) {
  const rawGraph = await requestJson<KnowledgeGraph>(
    [
      {
        role: "system",
        content:
          "你是课程知识图谱架构师。只输出 JSON，不要 Markdown。JSON 必须包含 nodes 和 edges，结构兼容 React Flow。nodes 每项包含 id、position{x,y}、data{label,summary,level,mistakeCount}；edges 每项包含 id、source、target、animated。父节点应是核心考点，子节点体现层级关系。"
      },
      {
        role: "user",
        content: `请分析下面这段课程导图文字，将其转化为 React Flow JSON。节点数量控制在 8 到 24 个，中文标签短而清晰。\n\n${text.slice(0, 22000)}`
      }
    ],
    fallback
  );

  return normalizeGraph(rawGraph);
}

export async function createKnowledgeGraphFromImages(pages: RenderedPdfPage[], fallback: KnowledgeGraph) {
  const rawGraph = await requestJson<KnowledgeGraph>(
    [
      {
        role: "system",
        content:
          "你是课程知识图谱架构师和 OCR 导图解析器。只输出 JSON，不要 Markdown。你会读取图片型 PDF 的页面截图，识别中文思维导图文字、层级、箭头和分组。JSON 必须包含 nodes 和 edges，结构兼容 React Flow。nodes 每项包含 id、position{x,y}、data{label,summary,level,mistakeCount}；edges 每项包含 id、source、target、animated。父节点应是核心考点，子节点体现层级关系。"
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "下面是图片型 PDF 的前几页截图。请先 OCR 识别其中的导图文字，再合并为一张课程知识图谱。节点数量控制在 10 到 32 个，标签用简短中文，层级关系要清楚。"
          },
          ...pages.map((page) => ({
            type: "image_url" as const,
            image_url: { url: page.dataUrl, detail: "high" as const }
          }))
        ]
      }
    ],
    fallback
  );

  return normalizeGraph(rawGraph);
}

export async function diagnoseMistakeImage({
  imageDataUrl,
  graph,
  fallback
}: {
  imageDataUrl: string;
  graph: KnowledgeGraph;
  fallback: DiagnosisResult;
}) {
  const compactGraph = {
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      label: node.data?.label,
      summary: node.data?.summary,
      level: node.data?.level
    })),
    edges: graph.edges.map((edge) => ({ source: edge.source, target: edge.target }))
  };

  return requestJson<DiagnosisResult>(
    [
      {
        role: "system",
        content:
          "你是错题诊断老师。只输出 JSON，不要 Markdown。你会根据当前知识图谱和错题图片，判断错题最可能考查哪一个 Node ID。输出格式：{nodeId, concept, reason, advice, confidence, extractedQuestion}。nodeId 必须来自给定图谱。reason 说明学生可能错在哪个环节；advice 给出简短复习建议。"
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `当前知识图谱数据：${JSON.stringify(compactGraph)}\n\n请分析这张错题图片，匹配最相关的 nodeId。`
          },
          {
            type: "image_url",
            image_url: { url: imageDataUrl, detail: "high" }
          }
        ]
      }
    ],
    fallback
  );
}

export async function createTutorBrief(node: { id: string; data: KnowledgeNodeData }) {
  const fallback: TutorResult = {
    brief: `${node.data.label} 的复习重点：先确认定义和适用条件，再整理常见题型中的触发词。做题时把题目目标转化为公式或图像关系，最后检查运算和边界情况。错题多时，优先复盘自己是概念混淆、步骤遗漏还是策略选择失误。`
  };

  return requestJson<TutorResult>(
    [
      {
        role: "system",
        content:
          "你是温和但高效的 AI 复习助手。只输出 JSON，不要 Markdown。输出 {brief}，brief 必须是中文，约 100 字，直接讲清该知识点的本质、常见错误和复习抓手。"
      },
      {
        role: "user",
        content: `请围绕这个知识点生成 100 字精华串讲：${JSON.stringify(node)}`
      }
    ],
    fallback
  );
}
