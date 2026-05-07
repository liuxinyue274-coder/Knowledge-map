import type { KnowledgeGraph } from "@/lib/types";

export const starterGraph: KnowledgeGraph = {
  nodes: [
    {
      id: "core-functions",
      type: "default",
      position: { x: 120, y: 120 },
      data: {
        label: "函数与导数",
        summary: "函数性质、导数运算与应用题的核心入口。",
        level: 0,
        mistakeCount: 0
      }
    },
    {
      id: "monotonicity",
      position: { x: 430, y: 30 },
      data: {
        label: "单调性判断",
        summary: "通过导数符号分析区间变化。",
        level: 1,
        mistakeCount: 0
      }
    },
    {
      id: "extreme-values",
      position: { x: 430, y: 160 },
      data: {
        label: "极值与最值",
        summary: "临界点、端点与闭区间最值比较。",
        level: 1,
        mistakeCount: 0
      }
    },
    {
      id: "tangent-line",
      position: { x: 430, y: 290 },
      data: {
        label: "切线方程",
        summary: "点斜式、导数几何意义和隐含条件。",
        level: 1,
        mistakeCount: 0
      }
    },
    {
      id: "parameter-range",
      position: { x: 760, y: 160 },
      data: {
        label: "参数范围",
        summary: "把恒成立、存在性转化为函数最值问题。",
        level: 2,
        mistakeCount: 0
      }
    }
  ],
  edges: [
    { id: "e-core-mono", source: "core-functions", target: "monotonicity", animated: true },
    { id: "e-core-extreme", source: "core-functions", target: "extreme-values", animated: true },
    { id: "e-core-tangent", source: "core-functions", target: "tangent-line", animated: true },
    { id: "e-extreme-parameter", source: "extreme-values", target: "parameter-range", animated: true }
  ]
};

export function graphFromTextFallback(text: string): KnowledgeGraph {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s\d.、\-*•]+/, "").trim())
    .filter((line) => line.length > 2)
    .slice(0, 12);

  if (lines.length < 3) {
    return starterGraph;
  }

  const rootLabel = lines[0] ?? "课程知识地图";
  const childLines = lines.slice(1);
  const nodes = [
    {
      id: "node-0",
      position: { x: 120, y: 180 },
      data: { label: rootLabel, summary: "由 PDF 文本自动抽取的核心主题。", level: 0, mistakeCount: 0 }
    },
    ...childLines.map((line, index) => ({
      id: `node-${index + 1}`,
      position: {
        x: 460 + Math.floor(index / 4) * 300,
        y: 40 + (index % 4) * 120
      },
      data: {
        label: line.slice(0, 24),
        summary: line,
        level: index < 4 ? 1 : 2,
        mistakeCount: 0
      }
    }))
  ];

  const edges = childLines.map((_, index) => ({
    id: `edge-${index}`,
    source: index < 4 ? "node-0" : `node-${((index - 4) % 4) + 1}`,
    target: `node-${index + 1}`,
    animated: true
  }));

  return { nodes, edges };
}

export function scannedPdfFallback(fileName: string): KnowledgeGraph {
  return {
    nodes: [
      {
        id: "scan-root",
        type: "knowledge",
        position: { x: 120, y: 170 },
        data: {
          label: "图片型 PDF",
          summary: `${fileName} 没有可直接抽取的文字层，需要使用视觉 OCR 扫描页面。`,
          level: 0,
          mistakeCount: 0
        }
      },
      {
        id: "scan-render",
        type: "knowledge",
        position: { x: 450, y: 60 },
        data: {
          label: "页面转图片",
          summary: "系统会先把 PDF 页面渲染成图片，再交给视觉模型识别导图文字。",
          level: 1,
          mistakeCount: 0
        }
      },
      {
        id: "scan-ocr",
        type: "knowledge",
        position: { x: 450, y: 190 },
        data: {
          label: "视觉 OCR",
          summary: "配置 OPENAI_API_KEY 后，可读取扫描页中的中文标题、分支和层级。",
          level: 1,
          mistakeCount: 0
        }
      },
      {
        id: "scan-graph",
        type: "knowledge",
        position: { x: 780, y: 125 },
        data: {
          label: "生成知识图谱",
          summary: "识别结果会被转换为 React Flow 节点和连线。",
          level: 2,
          mistakeCount: 0
        }
      }
    ],
    edges: [
      { id: "scan-e-1", source: "scan-root", target: "scan-render", animated: true },
      { id: "scan-e-2", source: "scan-root", target: "scan-ocr", animated: true },
      { id: "scan-e-3", source: "scan-ocr", target: "scan-graph", animated: true }
    ]
  };
}
