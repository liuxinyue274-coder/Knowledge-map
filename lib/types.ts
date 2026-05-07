import type { Edge, Node } from "@xyflow/react";

export type KnowledgeNodeData = {
  [key: string]: unknown;
  label: string;
  summary?: string;
  level?: number;
  mistakeCount?: number;
  diagnosed?: boolean;
  manualStatus?: "important" | "review" | "mastered";
  userNote?: string;
  isUserCreated?: boolean;
};

export type KnowledgeGraph = {
  nodes: Node<KnowledgeNodeData>[];
  edges: Edge[];
};

export type MapResponse = KnowledgeGraph & {
  source?: "text" | "vision" | "vision-fallback";
  pageCount?: number;
  scannedPages?: number;
  notice?: string;
};

export type DiagnosisResult = {
  nodeId: string;
  concept: string;
  reason: string;
  advice: string;
  confidence: number;
  extractedQuestion?: string;
};

export type TutorResult = {
  brief: string;
};
