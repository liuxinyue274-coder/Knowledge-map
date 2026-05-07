"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  useEdgesState,
  useNodesState
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  CheckCircle2,
  CirclePlus,
  BrainCircuit,
  Flag,
  ImageUp,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  RotateCcw,
  ScanText,
  Sparkles,
  Trash2,
  UploadCloud,
  Zap
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { starterGraph } from "@/lib/mock-graph";
import type { DiagnosisResult, KnowledgeGraph, KnowledgeNodeData, MapResponse, TutorResult } from "@/lib/types";
import { cn } from "@/lib/utils";

const nodeTypes = {
  knowledge: KnowledgeNode
};

const statusLabels: Record<NonNullable<KnowledgeNodeData["manualStatus"]>, string> = {
  important: "重点",
  review: "待复习",
  mastered: "已掌握"
};

function KnowledgeNode({ data, selected }: NodeProps<Node<KnowledgeNodeData>>) {
  const count = Number(data.mistakeCount ?? 0);
  const hotLevel = Math.min(count, 3);

  return (
    <div
      className={cn(
        "node-shell relative px-4 py-3",
        data.diagnosed && "diagnosed animate-soft-pulse",
        data.manualStatus === "important" && "mark-important",
        data.manualStatus === "review" && "mark-review",
        data.manualStatus === "mastered" && "mark-mastered",
        hotLevel > 0 && `hot-${hotLevel}`,
        selected && "ring-2 ring-cyan-200/60"
      )}
    >
      <Handle type="target" position={Position.Left} className="!border-cyan-100/60 !bg-cyan-300" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/54">
            Level {String(data.level ?? 0)}
          </div>
          <div className="mt-1 text-sm font-semibold leading-tight text-white">{data.label}</div>
        </div>
        {count > 0 ? (
          <div className="rounded-md bg-red-400/14 px-2 py-1 text-xs font-semibold text-red-100">{count}</div>
        ) : null}
      </div>
      {data.manualStatus ? (
        <div className="mt-2 inline-flex rounded-md bg-white/[0.075] px-2 py-1 text-[11px] font-semibold text-white/72">
          {statusLabels[data.manualStatus]}
        </div>
      ) : null}
      {data.summary ? <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/55">{data.summary}</p> : null}
      {data.userNote ? <p className="mt-2 line-clamp-1 text-[11px] text-cyan-100/58">备注：{data.userNote}</p> : null}
      <Handle type="source" position={Position.Right} className="!border-cyan-100/60 !bg-cyan-300" />
    </div>
  );
}

type UploadPanelProps = {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accept: string;
  disabled?: boolean;
  isLoading?: boolean;
  onFile: (file: File) => void;
};

function UploadPanel({ title, subtitle, icon, accept, disabled, isLoading, onFile }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={cn(
        "group relative w-full rounded-lg border border-white/12 bg-white/[0.045] p-4 text-left transition-all duration-300 hover:border-cyan-200/38 hover:bg-white/[0.07]",
        isDragging && "border-cyan-200/70 bg-cyan-200/10 shadow-glow",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.currentTarget.value = "";
        }}
      />
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-cyan-200/10 text-cyan-100 ring-1 ring-cyan-200/18 transition group-hover:bg-cyan-200/15">
          {isLoading ? <Loader2 className="size-5 animate-spin-slow" /> : icon}
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="mt-1 text-xs leading-relaxed text-white/50">{subtitle}</div>
        </div>
      </div>
    </button>
  );
}

export function KnowledgeMapApp() {
  const normalizedStarter = useMemo<KnowledgeGraph>(
    () => ({
      nodes: starterGraph.nodes.map((node) => ({ ...node, type: "knowledge" })),
      edges: starterGraph.edges
    }),
    []
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<KnowledgeNodeData>>(normalizedStarter.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(normalizedStarter.edges);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node<KnowledgeNodeData> | null>(null);
  const [tutorBrief, setTutorBrief] = useState("");
  const [isMapping, setIsMapping] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isTutoring, setIsTutoring] = useState(false);
  const [lastPdfName, setLastPdfName] = useState("示例知识地图");
  const [lastImageName, setLastImageName] = useState("");
  const [draftLabel, setDraftLabel] = useState("");
  const [draftSummary, setDraftSummary] = useState("");
  const [draftNote, setDraftNote] = useState("");

  const graph = useMemo<KnowledgeGraph>(() => ({ nodes, edges }), [nodes, edges]);
  const activeNode = selectedNode ? nodes.find((node) => node.id === selectedNode.id) ?? selectedNode : null;

  const resetGraph = useCallback(() => {
    setDiagnosis(null);
    setTutorBrief("");
    setSelectedNode(null);
    setDraftLabel("");
    setDraftSummary("");
    setDraftNote("");
    setNodes(normalizedStarter.nodes);
    setEdges(normalizedStarter.edges);
    setLastPdfName("示例知识地图");
    setLastImageName("");
  }, [normalizedStarter.edges, normalizedStarter.nodes, setEdges, setNodes]);

  const handleMapPdf = useCallback(
    async (file: File) => {
      setIsMapping(true);
      setDiagnosis(null);
      setLastPdfName(file.name);

      try {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/map", { method: "POST", body: form });
        if (!response.ok) throw new Error("PDF 解析失败");
        const result = (await response.json()) as MapResponse;
        setNodes(
          result.nodes.map((node) => ({
            ...node,
            type: "knowledge",
            data: { ...node.data, mistakeCount: Number(node.data?.mistakeCount ?? 0), diagnosed: false }
          }))
        );
        setEdges(result.edges.map((edge) => ({ ...edge, animated: edge.animated ?? true })));
        if (result.notice) {
          setDiagnosis({
            nodeId: "",
            concept: result.source === "vision" ? "扫描版 PDF 已识别" : "扫描版 PDF 待识别",
            reason: result.notice,
            advice:
              result.source === "vision-fallback"
                ? "在项目根目录添加 .env.local 并配置 OPENAI_API_KEY，然后重新上传这个 PDF。"
                : "你可以继续上传错题图片，AI 会基于这张知识图谱定位薄弱节点。",
            confidence: result.source === "vision" ? 0.86 : 0
          });
        }
      } catch (error) {
        console.error(error);
        setDiagnosis({
          nodeId: "",
          concept: "PDF 解析未完成",
          reason: "当前文件没有生成可用知识地图，请换一个文字层更清晰的 PDF，或配置模型 API Key 后重试。",
          advice: "先使用示例地图体验错题诊断流程。",
          confidence: 0
        });
      } finally {
        setIsMapping(false);
      }
    },
    [setEdges, setNodes]
  );

  const handleDiagnoseImage = useCallback(
    async (file: File) => {
      setIsDiagnosing(true);
      setLastImageName(file.name);

      try {
        const form = new FormData();
        form.append("file", file);
        form.append("graph", JSON.stringify(graph));
        const response = await fetch("/api/diagnose", { method: "POST", body: form });
        if (!response.ok) throw new Error("错题诊断失败");
        const result = (await response.json()) as DiagnosisResult;
        setDiagnosis(result);
        setTutorBrief("");
        setNodes((currentNodes) =>
          currentNodes.map((node) => {
            const isTarget = node.id === result.nodeId;
            const mistakeCount = Number(node.data?.mistakeCount ?? 0) + (isTarget ? 1 : 0);
            return {
              ...node,
              selected: isTarget,
              data: {
                ...node.data,
                mistakeCount,
                diagnosed: isTarget
              }
            };
          })
        );
      } catch (error) {
        console.error(error);
        setDiagnosis({
          nodeId: "",
          concept: "识别未完成",
          reason: "图片没有被成功诊断。请确认图片清晰，或配置支持视觉能力的模型 API Key。",
          advice: "建议上传只包含一道错题的截图，避免页面里混入太多无关文字。",
          confidence: 0
        });
      } finally {
        setIsDiagnosing(false);
      }
    },
    [graph, setNodes]
  );

  const requestTutorBrief = useCallback(
    async (node: Node<KnowledgeNodeData>) => {
      setSelectedNode(node);
      setDraftLabel(node.data.label);
      setDraftSummary(node.data.summary ?? "");
      setDraftNote(node.data.userNote ?? "");
      setIsTutoring(true);
      setTutorBrief("");
      try {
        const response = await fetch("/api/tutor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ node })
        });
        if (!response.ok) throw new Error("串讲生成失败");
        const result = (await response.json()) as TutorResult;
        setTutorBrief(result.brief);
      } catch (error) {
        console.error(error);
        setTutorBrief(`${node.data.label} 的复习重点：先回到定义和基本公式，再把常见题型按条件、目标、转化步骤拆开。做题时标出触发这个知识点的关键词，最后复盘自己错在概念、运算还是策略。`);
      } finally {
        setIsTutoring(false);
      }
    },
    []
  );

  const saveNodeDraft = useCallback(() => {
    if (!activeNode) return;

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === activeNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                label: draftLabel.trim() || node.data.label,
                summary: draftSummary.trim(),
                userNote: draftNote.trim()
              }
            }
          : node
      )
    );
    setSelectedNode((current) =>
      current && current.id === activeNode.id
        ? {
            ...current,
            data: {
              ...current.data,
              label: draftLabel.trim() || current.data.label,
              summary: draftSummary.trim(),
              userNote: draftNote.trim()
            }
          }
        : current
    );
  }, [activeNode, draftLabel, draftNote, draftSummary, setNodes]);

  const markSelectedNode = useCallback(
    (manualStatus: KnowledgeNodeData["manualStatus"]) => {
      if (!activeNode) return;
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === activeNode.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  manualStatus: node.data.manualStatus === manualStatus ? undefined : manualStatus
                }
              }
            : node
        )
      );
    },
    [activeNode, setNodes]
  );

  const addChildNode = useCallback(() => {
    const parent = activeNode ? nodes.find((node) => node.id === activeNode.id) : null;
    const siblingCount = parent ? edges.filter((edge) => edge.source === parent.id).length : nodes.length;
    const newNode: Node<KnowledgeNodeData> = {
      id: `user-node-${Date.now()}`,
      type: "knowledge",
      selected: true,
      position: {
        x: (parent?.position.x ?? 180) + 310,
        y: (parent?.position.y ?? 140) + (siblingCount % 4) * 96 - 120
      },
      data: {
        label: "新知识点",
        summary: "点击左侧编辑标题、说明和备注。",
        level: Number(parent?.data.level ?? 0) + 1,
        mistakeCount: 0,
        diagnosed: false,
        manualStatus: "important",
        isUserCreated: true
      }
    };

    setNodes((currentNodes) => [
      ...currentNodes.map<Node<KnowledgeNodeData>>((node) => ({ ...node, selected: false })),
      newNode
    ]);
    if (parent) {
      setEdges((currentEdges) =>
        currentEdges.concat({
          id: `user-edge-${parent.id}-${newNode.id}`,
          source: parent.id,
          target: newNode.id,
          animated: true
        })
      );
    }
    setSelectedNode(newNode);
    setDraftLabel(newNode.data.label);
    setDraftSummary(newNode.data.summary ?? "");
    setDraftNote("");
    setTutorBrief("");
  }, [activeNode, edges, nodes, setEdges, setNodes]);

  const deleteSelectedNode = useCallback(() => {
    if (!activeNode) return;

    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== activeNode.id));
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => edge.source !== activeNode.id && edge.target !== activeNode.id)
    );
    setSelectedNode(null);
    setDraftLabel("");
    setDraftSummary("");
    setDraftNote("");
    setTutorBrief("");
  }, [activeNode, setEdges, setNodes]);

  const handleConnect = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges) => addEdge({ ...connection, animated: true }, currentEdges));
    },
    [setEdges]
  );

  const hotCount = nodes.filter((node) => Number(node.data?.mistakeCount ?? 0) > 0).length;
  const diagnosedNode = diagnosis?.nodeId ? nodes.find((node) => node.id === diagnosis.nodeId) : null;

  return (
    <main className="subtle-noise relative flex h-screen w-screen overflow-hidden bg-[#050911]">
      <aside className="glass-panel z-10 flex w-[25vw] min-w-[320px] max-w-[420px] flex-col overflow-y-auto border-r border-white/10 p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-white/9 ring-1 ring-white/12">
            <BrainCircuit className="size-5 text-cyan-100" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-normal text-white">Knowledge Map</h1>
            <p className="mt-1 text-xs text-white/48">课程导图到错题定位工作台</p>
          </div>
        </div>

        <div className="mt-7 space-y-3">
          <UploadPanel
            title="上传课程思维导图"
            subtitle="支持文字层 PDF，也支持扫描版 PDF 的视觉 OCR"
            icon={<ScanText className="size-5" />}
            accept="application/pdf"
            isLoading={isMapping}
            onFile={handleMapPdf}
          />
          <UploadPanel
            title="上传错题图片"
            subtitle="诊断模式会识别考查知识点并高亮节点"
            icon={<ImageUp className="size-5" />}
            accept="image/*"
            isLoading={isDiagnosing}
            disabled={nodes.length === 0}
            onFile={handleDiagnoseImage}
          />
        </div>

        <Card className="mt-5 bg-white/[0.045]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="size-4 text-amber-200" />
              当前状态
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-white/58">
            <div className="flex items-center justify-between gap-3">
              <span>知识节点</span>
              <span className="font-semibold text-white">{nodes.length}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>错题重灾区</span>
              <span className="font-semibold text-red-100">{hotCount}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>导图来源</span>
              <span className="max-w-[170px] truncate text-white/78">{lastPdfName}</span>
            </div>
            {lastImageName ? (
              <div className="flex items-center justify-between gap-3">
                <span>最近错题</span>
                <span className="max-w-[170px] truncate text-white/78">{lastImageName}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="mt-4 bg-white/[0.045]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Pencil className="size-4 text-cyan-100" />
              编辑知识图谱
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-white/58">
            {activeNode ? (
              <>
                <div className="grid gap-2">
                  <label className="text-white/46">节点标题</label>
                  <input
                    value={draftLabel}
                    onChange={(event) => setDraftLabel(event.target.value)}
                    className="h-9 rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-200/45"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-white/46">节点说明</label>
                  <textarea
                    value={draftSummary}
                    onChange={(event) => setDraftSummary(event.target.value)}
                    rows={3}
                    className="resize-none rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm leading-relaxed text-white outline-none transition focus:border-cyan-200/45"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-white/46">我的备注</label>
                  <textarea
                    value={draftNote}
                    onChange={(event) => setDraftNote(event.target.value)}
                    rows={2}
                    className="resize-none rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm leading-relaxed text-white outline-none transition focus:border-cyan-200/45"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={activeNode.data.manualStatus === "important" ? "default" : "outline"}
                    size="sm"
                    onClick={() => markSelectedNode("important")}
                  >
                    <Flag className="size-3.5" />
                    重点
                  </Button>
                  <Button
                    variant={activeNode.data.manualStatus === "review" ? "default" : "outline"}
                    size="sm"
                    onClick={() => markSelectedNode("review")}
                  >
                    <Sparkles className="size-3.5" />
                    复习
                  </Button>
                  <Button
                    variant={activeNode.data.manualStatus === "mastered" ? "default" : "outline"}
                    size="sm"
                    onClick={() => markSelectedNode("mastered")}
                  >
                    <CheckCircle2 className="size-3.5" />
                    掌握
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={saveNodeDraft}>
                    <Pencil className="size-3.5" />
                    保存
                  </Button>
                  <Button variant="outline" size="sm" onClick={addChildNode}>
                    <Plus className="size-3.5" />
                    子节点
                  </Button>
                  <Button variant="danger" size="sm" onClick={deleteSelectedNode}>
                    <Trash2 className="size-3.5" />
                    删除
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="leading-relaxed text-white/56">点击画布上的节点后，可以修改标题、写备注、标记复习状态，或在它下面增加新的子节点。</p>
                <Button variant="outline" size="sm" onClick={addChildNode}>
                  <CirclePlus className="size-4" />
                  添加根节点
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {diagnosis ? (
          <Card className="mt-4 animate-trace-in border-red-200/16 bg-red-950/22">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm text-red-50">
                <Sparkles className="size-4 text-red-200" />
                诊断结果
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs leading-relaxed text-red-50/74">
              <div>
                <div className="text-red-100/50">定位知识点</div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {diagnosedNode?.data.label ?? diagnosis.concept}
                </div>
              </div>
              <p>{diagnosis.reason}</p>
              <p className="rounded-md bg-white/[0.055] p-3 text-white/72">{diagnosis.advice}</p>
            </CardContent>
          </Card>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <Button variant="outline" size="sm" onClick={resetGraph}>
            <RotateCcw className="size-4" />
            重置
          </Button>
          <div className="text-[11px] text-white/36">PDF + Vision AI pipeline</div>
        </div>
      </aside>

      <section className="relative flex-1">
        <div className="pointer-events-none absolute left-8 top-6 z-10">
          <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-xl">
            <div className="text-xs uppercase tracking-[0.2em] text-cyan-100/50">Live Knowledge Canvas</div>
            <div className="mt-1 text-sm text-white/76">缩放、拖拽节点，点击红色节点唤起复习助手</div>
          </div>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.22 }}
          minZoom={0.25}
          maxZoom={1.8}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onNodeClick={(_, node) => requestTutorBrief(node as Node<KnowledgeNodeData>)}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="rgba(180, 220, 230, 0.22)" />
          <Controls position="bottom-left" />
          <MiniMap
            position="top-right"
            className="!rounded-lg !border !border-white/10 !bg-black/30 !backdrop-blur-xl"
            nodeColor={(node) => {
              if (node.data?.diagnosed) return "#ef4444";
              if (node.data?.manualStatus === "important") return "#fbbf24";
              if (node.data?.manualStatus === "review") return "#60a5fa";
              if (node.data?.manualStatus === "mastered") return "#4ade80";
              return "#7dd3e8";
            }}
            maskColor="rgba(0,0,0,0.25)"
          />
        </ReactFlow>

        <Card className="absolute bottom-5 right-5 z-10 w-[360px] max-w-[calc(100vw-40px)] animate-trace-in bg-black/34 backdrop-blur-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageCircle className="size-4 text-cyan-100" />
              AI 复习助手
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-[112px] text-sm leading-relaxed text-white/68">
            {isTutoring ? (
              <div className="flex items-center gap-2 text-white/58">
                <Loader2 className="size-4 animate-spin-slow" />
                正在生成 100 字精华串讲
              </div>
            ) : tutorBrief ? (
              <p>{tutorBrief}</p>
            ) : selectedNode ? (
              <p>点击任意节点后，这里会生成围绕「{selectedNode.data.label}」的短讲和复习抓手。</p>
            ) : (
              <p>上传错题并点击高亮节点，助手会把该知识点压缩成一段可立即复习的串讲。</p>
            )}
          </CardContent>
        </Card>

        {(isMapping || isDiagnosing) && (
          <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-black/18 backdrop-blur-[2px]">
            <div className="rounded-lg border border-white/12 bg-black/42 px-5 py-4 text-sm text-white/78 shadow-glow backdrop-blur-2xl">
              <div className="flex items-center gap-3">
                <UploadCloud className="size-5 animate-bounce text-cyan-100" />
                {isMapping ? "正在扫描 PDF 并生成知识图谱" : "正在识别错题并匹配节点"}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
