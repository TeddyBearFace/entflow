"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type NodeChange,
  type Connection,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import ExpandedWorkflowNode from "./ExpandedWorkflowNode";
import CustomStageNode from "./CustomStageNode";
import SectionNode from "./SectionNode";
import ShapeNode from "./ShapeNode";
import StickyNode from "./StickyNode";
import TextNode from "./TextNode";
import FilterSidebar from "./FilterSidebar";
import WorkflowDetailPanel from "./WorkflowDetailPanel";
import ExportPanel from "./ExportPanel";
import CanvasToolbar, { type CanvasTool } from "./CanvasToolbar";
import { computeSnapAndGuides, SmartGuideLines } from "./SmartGuides";
import SyncBar from "@/components/SyncBar";
import ProGate, { ProBadge } from "@/components/ProGate";
import { usePlan } from "@/hooks/usePlan";
import type { MapFilters, WorkflowNodeData } from "@/types";
import type { StageGroup } from "@/lib/journey";

// Register custom node types
const nodeTypes = {
  expandedWorkflow: ExpandedWorkflowNode,
  customStage: CustomStageNode,
  section: SectionNode,
  shape_rect: ShapeNode,
  shape_diamond: ShapeNode,
  shape_circle: ShapeNode,
  sticky: StickyNode,
  text: TextNode,
};

interface WorkflowMapProps {
  portalId: string;
  portalName?: string;
}

export default function WorkflowMap({ portalId, portalName }: WorkflowMapProps) {
  return (
    <>
      {/* Mobile: show desktop prompt */}
      <div className="flex md:hidden items-center justify-center h-full px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Desktop recommended</h2>
          <p className="text-sm text-gray-500 mb-6">The workflow map is built for larger screens. Open Entflow on your computer for the full canvas experience.</p>
          <a href={`/dashboard?portal=${portalId}`} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            Go to Dashboard
          </a>
        </div>
      </div>
      {/* Desktop: full map */}
      <div className="hidden md:flex flex-1 h-full">
        <ReactFlowProvider>
          <WorkflowMapInner portalId={portalId} portalName={portalName} />
        </ReactFlowProvider>
      </div>
    </>
  );
}

function WorkflowMapInner({ portalId, portalName }: WorkflowMapProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [autoSync, setAutoSync] = useState<{ enabled: boolean; interval: number; lastSynced: string | null }>({ enabled: false, interval: 360, lastSynced: null });
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [stages, setStages] = useState<StageGroup[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [selectedCustomNode, setSelectedCustomNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [selectedPropertyKey, setSelectedPropertyKey] = useState<string | null>(null);
  const [highlightedWorkflows, setHighlightedWorkflows] = useState<Set<string>>(new Set());
  const [canvasTool, setCanvasTool] = useState<CanvasTool>("select");
  const [canvasColor, setCanvasColor] = useState("#6366f1");
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [smartGuides, setSmartGuides] = useState<{ guides: any[]; spacing: any[] }>({ guides: [], spacing: [] });
  const reactFlowInstance = useReactFlow();
  const { canUse, isFree, plan } = usePlan(portalId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filters, setFilters] = useState<MapFilters>({
    status: [],
    objectTypes: [],
    dependencyTypes: [],
    searchQuery: "",
    properties: [],
    tags: [],
  });

  // Track which nodes have been dragged for position saving
  const draggedNodesRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch everything
  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch graph data, custom nodes, and saved positions in parallel
      const params = new URLSearchParams({ portalId });
      if (filters.status.length > 0) params.set("status", filters.status.join(","));
      if (filters.objectTypes.length > 0) params.set("objectTypes", filters.objectTypes.join(","));
      if (filters.dependencyTypes.length > 0) params.set("dependencyTypes", filters.dependencyTypes.join(","));
      if (filters.searchQuery) params.set("search", filters.searchQuery);
      if (filters.properties.length > 0) params.set("properties", filters.properties.join(","));

      const [graphRes, customRes, posRes, edgeRes] = await Promise.all([
        fetch(`/api/graph?${params.toString()}`),
        fetch(`/api/custom-nodes?portalId=${portalId}`),
        fetch(`/api/positions?portalId=${portalId}`),
        fetch(`/api/custom-edges?portalId=${portalId}`),
      ]);

      if (!graphRes.ok) throw new Error("Failed to fetch graph data");

      const graphData = await graphRes.json();
      const customData = customRes.ok ? await customRes.json() : { nodes: [] };
      const posData = posRes.ok ? await posRes.json() : { positions: {} };
      const customEdgesData = edgeRes.ok ? await edgeRes.json() : [];
      const savedPositions = posData.positions || {};

      // Apply saved positions to workflow nodes; place new nodes in open spots
      // Track occupied rectangles (position + size) not just points
      const occupiedRects: Array<{x: number; y: number; w: number; h: number}> = [];
      
      // Pre-populate with custom node positions AND their actual sizes
      for (const cn of (customData.nodes || [])) {
        const saved = savedPositions[cn.id];
        const pos = saved ? { x: saved.x, y: saved.y } : { x: cn.positionX, y: cn.positionY };
        const w = cn.width || 280;
        const h = cn.height || 140;
        occupiedRects.push({ ...pos, w, h });
      }
      
      // First pass: collect all saved workflow positions
      const NODE_W = 280;
      const NODE_H = 140;
      const PAD = 40;

      const workflowNodesRaw = (graphData.nodes || []).map((node: Node) => {
        const saved = savedPositions[node.id];
        if (saved) {
          occupiedRects.push({ x: saved.x, y: saved.y, w: NODE_W, h: NODE_H });
          return { ...node, position: { x: saved.x, y: saved.y }, _hasSavedPos: true };
        }
        return { ...node, _hasSavedPos: false };
      });

      // Second pass: place unsaved nodes in non-overlapping positions
      const isOverlapping = (x: number, y: number) => {
        return occupiedRects.some(r => {
          // Check if a NODE_W x NODE_H box at (x,y) overlaps with the occupied rect
          const noOverlapX = x + NODE_W + PAD < r.x || x > r.x + r.w + PAD;
          const noOverlapY = y + NODE_H + PAD < r.y || y > r.y + r.h + PAD;
          return !(noOverlapX || noOverlapY);
        });
      };

      const findOpenSpot = (startX: number, startY: number) => {
        // Try the suggested position first
        if (!isOverlapping(startX, startY)) return { x: startX, y: startY };
        // Spiral outward to find open space
        for (let ring = 1; ring < 50; ring++) {
          for (let dx = -ring; dx <= ring; dx++) {
            for (let dy = -ring; dy <= ring; dy++) {
              if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;
              const x = startX + dx * (NODE_W + PAD);
              const y = startY + dy * (NODE_H + PAD);
              if (!isOverlapping(x, y)) return { x, y };
            }
          }
        }
        return { x: startX + 600, y: startY + 600 };
      };

      const newNodeIds = new Set<string>();
      const workflowNodes = workflowNodesRaw.map((node: any) => {
        if (node._hasSavedPos) {
          const { _hasSavedPos, ...clean } = node;
          return clean;
        }
        const openPos = findOpenSpot(node.position.x, node.position.y);
        occupiedRects.push({ ...openPos, w: NODE_W, h: NODE_H });
        newNodeIds.add(node.id);
        const { _hasSavedPos, ...clean } = node;
        return { ...clean, position: openPos };
      });

      // Canvas element types that use dedicated node components
      const CANVAS_TYPES = new Set(["section", "shape_rect", "shape_diamond", "shape_circle", "sticky", "text"]);

      // Convert custom nodes to React Flow nodes
      const customNodes = (customData.nodes || []).map((cn: any) => {
        const saved = savedPositions[cn.id];
        const pos = saved ? { x: saved.x, y: saved.y } : { x: cn.positionX, y: cn.positionY };
        const isCanvasType = CANVAS_TYPES.has(cn.nodeType);

        if (isCanvasType) {
          return {
            id: cn.id,
            type: cn.nodeType,
            position: pos,
            style: {
              width: cn.width || 200,
              height: cn.height || 100,
              zIndex: cn.zIndex || (cn.nodeType === "section" ? -1 : 0),
            },
            zIndex: cn.nodeType === "section" ? -1 : 0,
            data: {
              label: cn.label,
              color: cn.color,
              shapeType: cn.nodeType,
              textContent: cn.textContent || "",
              fontSize: cn.fontSize,
              fontWeight: cn.fontWeight,
              fontStyle: cn.fontStyle,
              textAlign: cn.textAlign,
              description: cn.description,
              nodeId: cn.id,
              onLabelChange: handleLabelChange,
              onTextChange: handleTextChange,
            },
          };
        }

        // Legacy custom stage nodes
        return {
          id: cn.id,
          type: "customStage",
          position: pos,
          data: {
            customNodeId: cn.id,
            label: cn.label,
            nodeType: cn.nodeType,
            color: cn.color,
            icon: cn.icon,
            description: cn.description,
          },
        };
      });

      // Build custom edges
      const customEdgeNodes = (Array.isArray(customEdgesData) ? customEdgesData : []).map((ce: any) => ({
        id: `custom-${ce.id}`,
        source: ce.sourceNodeId,
        target: ce.targetNodeId,
        style: { stroke: ce.color || "#6366f1", strokeWidth: 2, strokeDasharray: ce.edgeType === "dashed" ? "8 4" : ce.edgeType === "dotted" ? "2 2" : undefined },
        label: ce.label || undefined,
        type: "smoothstep",
        animated: ce.animated || false,
        data: { customEdgeId: ce.id },
      }));

      setNodes([...workflowNodes, ...customNodes]);
      setEdges([...(graphData.edges || []), ...customEdgeNodes]);
      setStages(graphData.stages || []);
      setStats(graphData.stats || null);

      // Auto-save positions for newly placed workflow nodes
      const newPositions = workflowNodes
        .filter((n: any) => newNodeIds.has(n.id))
        .map((n: any) => ({ nodeId: n.id, positionX: n.position.x, positionY: n.position.y }));
      if (newPositions.length > 0) {
        fetch("/api/positions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ portalId, positions: newPositions }),
        }).catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load map");
    } finally {
      setLoading(false);
    }
  }, [portalId, filters, setNodes, setEdges]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Save positions after dragging (debounced)
  const savePositions = useCallback(() => {
    if (draggedNodesRef.current.size === 0) return;

    const positions = Array.from(draggedNodesRef.current.entries()).map(
      ([nodeId, pos]) => ({
        nodeId,
        positionX: pos.x,
        positionY: pos.y,
      })
    );

    fetch("/api/positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portalId, positions }),
    }).catch(console.error);

    draggedNodesRef.current.clear();
  }, [portalId]);

  // Wrap onNodesChange to track dragged positions
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Snap to smart guides during drag
      const snappedChanges = changes.map(change => {
        if (change.type !== "position" || !change.position || !change.dragging) return change;

        const node = nodes.find(n => n.id === change.id);
        if (!node) return change;

        const w = (node.style as any)?.width || node.width || 200;
        const h = (node.style as any)?.height || node.height || 100;

        const allBoxes = nodes.map(n => ({
          id: n.id,
          x: n.id === change.id ? change.position!.x : n.position.x,
          y: n.id === change.id ? change.position!.y : n.position.y,
          w: (n.style as any)?.width || n.width || 200,
          h: (n.style as any)?.height || n.height || 100,
        }));

        const draggingBox = { id: change.id, x: change.position.x, y: change.position.y, w, h };
        const { snapX, snapY, guides, spacing } = computeSnapAndGuides(draggingBox, allBoxes);

        setSmartGuides({ guides, spacing });

        return {
          ...change,
          position: { x: snapX, y: snapY },
        };
      });

      // Clear guides when drag stops
      if (changes.some(c => c.type === "position" && !c.dragging)) {
        setSmartGuides({ guides: [], spacing: [] });
      }

      onNodesChange(snappedChanges);

      // Track position changes from dragging
      for (const change of snappedChanges) {
        if (change.type === "position" && change.position && change.dragging) {
          draggedNodesRef.current.set(change.id, change.position);
        }
      }

      // Debounced save when dragging stops
      if (changes.some((c) => c.type === "position" && !c.dragging && draggedNodesRef.current.size > 0)) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(savePositions, 500);
      }
    },
    [onNodesChange, savePositions, nodes]
  );

  // Handle node click
  const CANVAS_NODE_TYPES = new Set(["customStage", "section", "shape_rect", "shape_diamond", "shape_circle", "sticky", "text"]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (node.type === "expandedWorkflow") {
      setSelectedWorkflow(node.id);
      setSelectedCustomNode(null);
    } else if (CANVAS_NODE_TYPES.has(node.type || "")) {
      setSelectedCustomNode(node.id);
      setSelectedWorkflow(null);
    }
  }, []);

  // Delete custom node
  const deleteCustomNode = useCallback(
    async (nodeId: string) => {
      try {
        await fetch("/api/custom-nodes", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: nodeId }),
        });
        setSelectedCustomNode(null);
        fetchGraph();
      } catch (err) {
        console.error("Failed to delete node:", err);
      }
    },
    [fetchGraph]
  );

  // Search highlighting
  const highlightedNodes = useMemo(() => {
    if (!filters.searchQuery.trim()) return new Set<string>();
    const query = filters.searchQuery.toLowerCase();
    return new Set(
      nodes
        .filter((n) => {
          const name =
            n.type === "customStage"
              ? n.data?.label
              : (n.data as WorkflowNodeData)?.name;
          return name?.toLowerCase().includes(query);
        })
        .map((n) => n.id)
    );
  }, [nodes, filters.searchQuery]);

  const styledNodes = useMemo(() => {
    // Determine which IDs to highlight (search or property impact)
    const activeHighlight = highlightedNodes.size > 0 ? highlightedNodes
      : highlightedWorkflows.size > 0 ? highlightedWorkflows
      : null;

    // Tag filtering - dim nodes without matching tags
    const tagFilter = filters.tags.length > 0 ? new Set(filters.tags) : null;

    if (!activeHighlight && !tagFilter) return nodes;

    return nodes.map((n) => {
      let opacity = 1;

      // Tag filter
      if (tagFilter && n.type === "expandedWorkflow") {
        const nodeTags: Array<{id: string}> = (n.data as any)?.tags || [];
        const hasMatchingTag = nodeTags.some(t => tagFilter.has(t.id));
        if (!hasMatchingTag) opacity = 0.15;
      }

      // Highlight filter (overrides tag if active)
      if (activeHighlight) {
        opacity = activeHighlight.has(n.id) ? 1 : 0.15;
      }

      const isPropertyHighlight = highlightedWorkflows.size > 0 && highlightedWorkflows.has(n.id);
      return {
        ...n,
        style: {
          ...n.style,
          opacity,
          transition: "opacity 0.3s ease",
          ...(isPropertyHighlight ? {
            boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.5), 0 0 20px rgba(99, 102, 241, 0.15)",
            borderRadius: "12px",
          } : {}),
        },
      };
    });
  }, [nodes, highlightedNodes, highlightedWorkflows, filters.tags]);

  // Highlight selected edge
  const styledEdges = useMemo(() => {
    if (!selectedEdge) return edges;
    return edges.map(e => e.id === selectedEdge ? { ...e, style: { ...e.style, strokeWidth: 4 }, selected: true } : e);
  }, [edges, selectedEdge]);

  // Search handler
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?portalId=${portalId}&q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) { const data = await res.json(); setSearchResults(data.results || []); }
      } catch {}
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, portalId]);

  // Fetch auto-sync status
  useEffect(() => {
    fetch(`/api/auto-sync?portalId=${portalId}`).then(r => r.json()).then(data => {
      if (data.autoSyncEnabled !== undefined) setAutoSync({ enabled: data.autoSyncEnabled, interval: data.autoSyncInterval || 360, lastSynced: data.lastSyncedAt });
    }).catch(() => {});
  }, [portalId]);


  const toggleAutoSync = async () => {
    const res = await fetch("/api/auto-sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ portalId, action: "toggle" }) });
    if (res.ok) { const data = await res.json(); setAutoSync(prev => ({ ...prev, enabled: data.autoSyncEnabled })); }
  };

  const matchTypeIcons: Record<string, string> = { workflow_name: "📋", action: "⚡", property: "✏️", email: "📧", list: "📝", enrollment: "📥" };

  // Canvas click handler - create new elements based on active tool
  const onCanvasClick = useCallback(async (event: React.MouseEvent) => {
    if (canvasTool === "select" || canvasTool === "connector") return;

    const bounds = (event.target as HTMLElement).closest('.react-flow')?.getBoundingClientRect();
    if (!bounds) return;

    const position = reactFlowInstance.project({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });

    const defaults: Record<string, { label: string; width: number; height: number; fontSize?: number }> = {
      section: { label: "New Section", width: 600, height: 400 },
      shape_rect: { label: "Process", width: 160, height: 80 },
      shape_diamond: { label: "Decision", width: 140, height: 140 },
      shape_circle: { label: "Start", width: 100, height: 100 },
      sticky: { label: "Note", width: 200, height: 150 },
      text: { label: "Text", width: 200, height: 40, fontSize: 16 },
    };

    const def = defaults[canvasTool];
    if (!def) return;

    try {
      const res = await fetch("/api/custom-nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portalId,
          label: def.label,
          nodeType: canvasTool,
          color: canvasColor,
          positionX: position.x,
          positionY: position.y,
          width: def.width,
          height: def.height,
          fontSize: def.fontSize,
          zIndex: canvasTool === "section" ? -1 : 0,
        }),
      });
      if (res.ok) {
        const node = await res.json();
        const isTextType = canvasTool === "text" || canvasTool === "sticky" || canvasTool === "shape_rect" || canvasTool === "shape_diamond" || canvasTool === "shape_circle";
        const newNode: Node = {
          id: node.id,
          type: canvasTool,
          position: { x: node.positionX, y: node.positionY },
          selected: true,
          style: { width: node.width || def.width, height: node.height || def.height, zIndex: canvasTool === "section" ? -1 : undefined },
          data: {
            label: node.label,
            color: node.color,
            shapeType: canvasTool,
            textContent: node.textContent || "",
            fontSize: node.fontSize,
            description: node.description,
            nodeId: node.id,
            autoEdit: isTextType,
            onLabelChange: handleLabelChange,
            onTextChange: handleTextChange,
          },
        };
        setNodes(nds => nds.map(n => ({ ...n, selected: false })).concat(newNode));
        setSelectedCustomNode(node.id);
        setCanvasTool("select");
      }
    } catch (err) { console.error("Failed to create node:", err); }
  }, [canvasTool, canvasColor, portalId, reactFlowInstance, setNodes]);

  // Handle manual connector creation
  const onConnect = useCallback(async (connection: Connection) => {
    if (!connection.source || !connection.target) return;
    try {
      const res = await fetch("/api/custom-edges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portalId,
          sourceNodeId: connection.source,
          targetNodeId: connection.target,
          color: canvasColor,
        }),
      });
      if (res.ok) {
        const edge = await res.json();
        setEdges(eds => [...eds, {
          id: `custom-${edge.id}`,
          source: edge.sourceNodeId,
          target: edge.targetNodeId,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          style: { stroke: edge.color, strokeWidth: 2 },
          label: edge.label || undefined,
          type: "smoothstep",
          data: { customEdgeId: edge.id },
        }]);
      }
    } catch (err) { console.error("Failed to create edge:", err); }
  }, [portalId, canvasColor, setEdges]);

  // Label/text change handler for editable nodes
  const handleLabelChange = useCallback(async (nodeId: string, label: string) => {
    await fetch("/api/custom-nodes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId, label }),
    });
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, label } } : n));
  }, [setNodes]);

  const handleTextChange = useCallback(async (nodeId: string, text: string) => {
    await fetch("/api/custom-nodes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId, textContent: text }),
    });
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, textContent: text } } : n));
  }, [setNodes]);

  // Delete selected canvas element
  const deleteSelectedElement = useCallback(async () => {
    const selectedNode = nodes.find(n => n.selected && n.type !== "expandedWorkflow");
    if (selectedNode) {
      await fetch(`/api/custom-nodes?nodeId=${selectedNode.id}`, { method: "DELETE" });
      setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
      // Also delete edges connected to this node
      const connectedEdges = edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id);
      for (const edge of connectedEdges) {
        if (edge.data?.customEdgeId) {
          await fetch(`/api/custom-edges?edgeId=${edge.data.customEdgeId}`, { method: "DELETE" });
        }
      }
      setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedCustomNode(null);
    }
  }, [nodes, edges, setNodes, setEdges]);

  // Clipboard for copy/paste
  const clipboardRef = useRef<{ nodeType: string; data: any; width?: number; height?: number } | null>(null);

  // Duplicate selected element (Ctrl+D)
  const duplicateSelectedElement = useCallback(async () => {
    const sel = nodes.find(n => n.selected && n.type !== "expandedWorkflow");
    if (!sel) return;
    try {
      const res = await fetch("/api/custom-nodes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portalId, label: sel.data.label || "Copy", nodeType: sel.type,
          color: sel.data.color || "#6366f1", icon: sel.data.icon, description: sel.data.description,
          textContent: sel.data.textContent, fontSize: sel.data.fontSize,
          fontWeight: sel.data.fontWeight, fontStyle: sel.data.fontStyle, textAlign: sel.data.textAlign,
          zIndex: sel.type === "section" ? -1 : 0,
          positionX: sel.position.x + 30, positionY: sel.position.y + 30,
          width: (sel.style as any)?.width || 200, height: (sel.style as any)?.height || 100,
        }),
      });
      if (res.ok) {
        const n = await res.json();
        setNodes(nds => nds.map(nd => ({ ...nd, selected: false })).concat({
          id: n.id, type: sel.type!, position: { x: n.positionX, y: n.positionY }, selected: true,
          style: { width: n.width || 200, height: n.height || 100, zIndex: n.zIndex || 0 },
          data: { ...sel.data, nodeId: n.id, customNodeId: n.id, onLabelChange: handleLabelChange, onTextChange: handleTextChange },
        }));
        setSelectedCustomNode(n.id);
      }
    } catch (err) { console.error("Duplicate failed:", err); }
  }, [nodes, portalId, setNodes, handleLabelChange, handleTextChange]);

  // Copy (Ctrl+C)
  const copySelectedElement = useCallback(() => {
    const sel = nodes.find(n => n.selected && n.type !== "expandedWorkflow");
    if (!sel) return;
    clipboardRef.current = { nodeType: sel.type!, data: { ...sel.data }, width: (sel.style as any)?.width || 200, height: (sel.style as any)?.height || 100 };
  }, [nodes]);

  // Paste (Ctrl+V)
  const pasteElement = useCallback(async () => {
    if (!clipboardRef.current) return;
    const cb = clipboardRef.current;
    const { x, y, zoom } = reactFlowInstance.getViewport();
    const cx = (-x + window.innerWidth / 2) / zoom;
    const cy = (-y + window.innerHeight / 2) / zoom;
    try {
      const res = await fetch("/api/custom-nodes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portalId, label: cb.data.label || "Pasted", nodeType: cb.nodeType,
          color: cb.data.color || "#6366f1", icon: cb.data.icon, description: cb.data.description,
          textContent: cb.data.textContent, fontSize: cb.data.fontSize,
          fontWeight: cb.data.fontWeight, fontStyle: cb.data.fontStyle, textAlign: cb.data.textAlign,          zIndex: cb.nodeType === "section" ? -1 : 0, positionX: cx, positionY: cy,
          width: cb.width, height: cb.height,
        }),
      });
      if (res.ok) {
        const n = await res.json();
        setNodes(nds => nds.map(nd => ({ ...nd, selected: false })).concat({
          id: n.id, type: cb.nodeType, position: { x: n.positionX, y: n.positionY }, selected: true,
          style: { width: n.width || 200, height: n.height || 100, zIndex: n.zIndex || 0 },
          data: { ...cb.data, nodeId: n.id, customNodeId: n.id, onLabelChange: handleLabelChange, onTextChange: handleTextChange },
        }));
        setSelectedCustomNode(n.id);
      }
    } catch (err) { console.error("Paste failed:", err); }
  }, [portalId, reactFlowInstance, setNodes, handleLabelChange, handleTextChange]);

  // Edge click handler
  const onEdgeClick = useCallback((_: any, edge: any) => {
    setSelectedEdge(edge.id);
    setSelectedWorkflow(null);
    setSelectedCustomNode(null);
  }, []);

  // Delete selected edge
  const deleteSelectedEdge = useCallback(async () => {
    if (!selectedEdge) return;
    const edge = edges.find(e => e.id === selectedEdge);
    if (edge?.data?.customEdgeId) {
      await fetch(`/api/custom-edges?edgeId=${edge.data.customEdgeId}`, { method: "DELETE" });
    }
    setEdges(eds => eds.filter(e => e.id !== selectedEdge));
    setSelectedEdge(null);
  }, [selectedEdge, edges, setEdges]);

  // Change edge color
  const changeEdgeColor = useCallback(async (color: string) => {
    if (!selectedEdge) return;
    const edge = edges.find(e => e.id === selectedEdge);
    if (edge?.data?.customEdgeId) {
      await fetch("/api/custom-edges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edgeId: edge.data.customEdgeId, color }),
      });
    }
    setEdges(eds => eds.map(e => e.id === selectedEdge ? { ...e, style: { ...e.style, stroke: color } } : e));
  }, [selectedEdge, edges, setEdges]);

  // Change edge style (solid, dashed, dotted)
  const changeEdgeStyle = useCallback(async (style: string) => {
    if (!selectedEdge) return;
    const edge = edges.find(e => e.id === selectedEdge);
    const dasharray = style === "dashed" ? "8 4" : style === "dotted" ? "2 2" : undefined;
    if (edge?.data?.customEdgeId) {
      await fetch("/api/custom-edges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edgeId: edge.data.customEdgeId, edgeType: style }),
      });
    }
    setEdges(eds => eds.map(e => e.id === selectedEdge ? { ...e, style: { ...e.style, strokeDasharray: dasharray } } : e));
  }, [selectedEdge, edges, setEdges]);

  // Toggle edge animation
  const toggleEdgeAnimation = useCallback(async () => {
    if (!selectedEdge) return;
    const edge = edges.find(e => e.id === selectedEdge);
    const newAnimated = !edge?.animated;
    if (edge?.data?.customEdgeId) {
      await fetch("/api/custom-edges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edgeId: edge.data.customEdgeId, animated: newAnimated }),
      });
    }
    setEdges(eds => eds.map(e => e.id === selectedEdge ? { ...e, animated: newAnimated } : e));
  }, [selectedEdge, edges, setEdges]);

  // Text formatting for selected node
  const updateNodeField = useCallback(async (field: string, value: any) => {
    if (!selectedCustomNode) return;
    const node = nodes.find(n => n.id === selectedCustomNode);
    if (!node) return;
    await fetch("/api/custom-nodes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId: selectedCustomNode, [field]: value }),
    });
    setNodes(nds => nds.map(n => n.id === selectedCustomNode ? { ...n, data: { ...n.data, [field]: value } } : n));
  }, [selectedCustomNode, nodes, setNodes]);

  const EDGE_COLORS = ["#6366f1", "#2E75B6", "#27AE60", "#8E44AD", "#E67E22", "#EF4444", "#FBBF24", "#6B7280", "#000000"];

  // Pane click - create elements or deselect
  const onPaneClick = useCallback((event: React.MouseEvent) => {
    if (canvasTool !== "select" && canvasTool !== "connector") {
      onCanvasClick(event);
      return;
    }
    setSelectedWorkflow(null);
    setSelectedCustomNode(null);
    setSelectedEdge(null);
    setSelectedPropertyKey(null);
    setHighlightedWorkflows(new Set());
  }, [canvasTool, onCanvasClick]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const inInput = !!(e.target as HTMLElement)?.closest("input, textarea");
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
      if (e.key === "Escape") {
        setSearchOpen(false); setSearchQuery("");
        if (canvasTool !== "select") setCanvasTool("select");
        setSelectedPropertyKey(null); setHighlightedWorkflows(new Set());
      }
      // Copy/paste/duplicate (Ctrl/Cmd + key)
      if ((e.metaKey || e.ctrlKey) && !inInput) {
        if (e.key === "d") { e.preventDefault(); duplicateSelectedElement(); return; }
        if (e.key === "c") { copySelectedElement(); return; }
        if (e.key === "v") { e.preventDefault(); pasteElement(); return; }
      }
      if ((e.key === "Delete" || e.key === "Backspace") && !inInput) {
        if (selectedCustomNode) { e.preventDefault(); deleteSelectedElement(); }
        else if (selectedEdge) { e.preventDefault(); deleteSelectedEdge(); }
      }
      // Tool shortcuts (no modifier)
      if (!inInput && !e.metaKey && !e.ctrlKey) {
        if (e.key === "v" || e.key === "1") setCanvasTool("select");
        if (e.key === "s" || e.key === "2") setCanvasTool("section");
        if (e.key === "r" || e.key === "3") setCanvasTool("shape_rect");
        if (e.key === "d" || e.key === "4") setCanvasTool("shape_diamond");
        if (e.key === "o" || e.key === "5") setCanvasTool("shape_circle");
        if (e.key === "c" || e.key === "6") setCanvasTool("connector");
        if (e.key === "n" || e.key === "7") setCanvasTool("sticky");
        if (e.key === "t" || e.key === "8") setCanvasTool("text");
        if (e.key === "g") setSnapToGrid(s => !s);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canvasTool, selectedCustomNode, selectedEdge, deleteSelectedElement, deleteSelectedEdge, duplicateSelectedElement, copySelectedElement, pasteElement]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading workflow journey map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <p className="text-red-600 font-medium mb-2">Failed to load map</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchGraph}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Find selected custom node data for the edit bar
  const selectedCustomData = selectedCustomNode
    ? nodes.find((n) => n.id === selectedCustomNode)?.data
    : null;

  return (
    <div className="flex h-full">
      {/* Filter + Property Impact Sidebar */}
      <FilterSidebar
        filters={filters}
        onFiltersChange={setFilters}
        stats={stats}
        portalId={portalId}
        selectedProperty={selectedPropertyKey}
        onSelectProperty={(key, wfIds) => { setSelectedPropertyKey(key); setHighlightedWorkflows(new Set(wfIds)); }}
        onWorkflowClick={(wfId) => { setSelectedWorkflow(wfId); }}
        canUse={canUse}
      />

      {/* Map Canvas */}
      <div className="flex-1 relative flex flex-col">
        {/* Sync progress bar */}
        <div className="flex-shrink-0">
          <SyncBar
  portalId={portalId}
  planTier={plan?.id}
  onSyncComplete={fetchGraph}
  compact
/>
          
        </div>
        <div className="flex-1 relative">
        <ReactFlow
          nodes={styledNodes}
          edges={styledEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          connectionMode={canvasTool === "connector" ? "loose" as any : undefined}
          snapToGrid={snapToGrid}
          snapGrid={[20, 20]}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.1}
          maxZoom={1.5}
          attributionPosition="bottom-left"
          defaultEdgeOptions={{ type: "smoothstep" }}
          className={canvasTool !== "select" ? "cursor-crosshair" : ""}
        >
          <Background color={snapToGrid ? "#c7c7cc" : "#e5e7eb"} gap={20} size={snapToGrid ? 2 : 1} />
          <Controls position="bottom-left" />
          <MiniMap
            position="bottom-right"
            nodeStrokeWidth={3}
            zoomable
            pannable
            style={{ width: 200, height: 140 }}
          />

          {/* Top left: Stage legend */}
          <Panel position="top-left">
            <div className="flex flex-col gap-2">
              {stages.length > 0 && (
                <div className="flex gap-3 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 px-3 py-2">
                  {stages.map((stage) => (
                    <div key={stage.id} className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="text-[10px] font-medium text-gray-600">
                        {stage.label} ({stage.workflowCount})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>

          {/* Top right: Nav toolbar */}
          <Panel position="top-right">
            <div className="flex items-center gap-1.5">
              {/* Search - always visible */}
              <button onClick={() => setSearchOpen(true)} className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <span className="hidden sm:inline">Search</span>
              </button>
              {/* Stats - always visible */}
              <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 px-2.5 py-1.5 text-[10px] text-gray-500 tabular-nums">
                {nodes.filter((n) => n.type === "expandedWorkflow").length}W · {edges.length}D
              </div>
              {/* Hamburger menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(p => !p)}
                  className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 px-2 py-1.5 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                    <div className="absolute top-full right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-40">
                      <a href={`/changelog?portal=${portalId}`} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors">
                        📋 Changelog
                      </a>
                      <a href={`/analyst?portal=${portalId}`} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 flex items-center gap-2 transition-colors">
                        🔬 AI Analyst
                      </a>
                      <div className="border-t border-gray-100 my-1" />
                      <ProBadge allowed={canUse("autoSync")} portalId={portalId} feature="Auto-sync">
                        <button onClick={() => { toggleAutoSync(); setMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${autoSync.enabled ? "text-emerald-700" : "text-gray-700 hover:bg-gray-50"}`}>
                          {autoSync.enabled ? "🔄 Auto-sync on" : "⏸️ Auto-sync off"}
                        </button>
                      </ProBadge>
                      <div className="border-t border-gray-100 my-1" />
                      <div className="px-3 py-1.5">
                        <ProBadge allowed={canUse("export")} portalId={portalId} feature="Export">
                          <ExportPanel portalId={portalId} portalName={portalName} canUseAdvancedExport={canUse("exportAdvanced")} />
                        </ProBadge>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Panel>

          {/* Edge legend */}
          <Panel position="bottom-right" style={{ bottom: 160 }}>
            <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 px-3 py-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Connections
              </p>
              <div className="space-y-1">
                <LegendItem color="#E67E22" label="Cross-enrollment" />
                <LegendItem color="#2E75B6" label="Property dependency" />
                <LegendItem color="#8E44AD" label="Shared list" />
                <LegendItem color="#E74C3C" label="Email overlap" />
              </div>
            </div>
          </Panel>
        </ReactFlow>

        {/* Smart alignment guides overlay */}
        <SmartGuideLines guides={smartGuides.guides} spacing={smartGuides.spacing} />

        {/* Canvas Toolbar (FigJam-style) */}
        <ProGate allowed={canUse("canvas")} portalId={portalId} feature="Canvas tools">
          <CanvasToolbar
            activeTool={canvasTool}
            onToolChange={(tool) => {
              const advancedTools = new Set(["shape_rect", "shape_diamond", "shape_circle", "connector", "text"]);
              if (advancedTools.has(tool) && !canUse("canvasAdvanced")) return; // Block in ProGate popover
              setCanvasTool(tool);
            }}
            activeColor={canvasColor}
            onColorChange={setCanvasColor}
            snapToGrid={snapToGrid}
            onSnapToggle={() => setSnapToGrid(s => !s)}
            lockedTools={canUse("canvasAdvanced") ? [] : ["shape_rect", "shape_diamond", "shape_circle", "connector", "text"]}
          />
        </ProGate>

        {/* Selected element action bar */}
        {selectedCustomNode && selectedCustomData && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 bg-white rounded-xl shadow-lg border border-gray-200 px-3 py-2 flex items-center gap-2">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              {selectedCustomData.nodeType || selectedCustomData.shapeType || "Element"}
            </span>
            <span className="w-px h-5 bg-gray-200" />

            {/* Text formatting - show for text, sticky, and shape nodes */}
            {(selectedCustomData.nodeType === "text" || selectedCustomData.shapeType === "text" || selectedCustomData.nodeType === "sticky" || selectedCustomData.shapeType === "sticky" || selectedCustomData.shapeType === "shape_rect" || selectedCustomData.shapeType === "shape_diamond" || selectedCustomData.shapeType === "shape_circle" || selectedCustomData.nodeType === "section") && (
              <>
                {/* Font size */}
                <div className="flex items-center gap-1">
                  <button onClick={() => updateNodeField("fontSize", Math.max(10, (selectedCustomData.fontSize || 14) - 2))}
                    className="w-6 h-6 rounded text-xs text-gray-600 hover:bg-gray-100 flex items-center justify-center font-bold">A-</button>
                  <span className="text-[10px] text-gray-400 w-5 text-center">{selectedCustomData.fontSize || 14}</span>
                  <button onClick={() => updateNodeField("fontSize", Math.min(72, (selectedCustomData.fontSize || 14) + 2))}
                    className="w-6 h-6 rounded text-sm text-gray-600 hover:bg-gray-100 flex items-center justify-center font-bold">A+</button>
                </div>
                <span className="w-px h-5 bg-gray-200" />
                {/* Bold / Italic */}
                <button onClick={() => updateNodeField("fontWeight", selectedCustomData.fontWeight === "bold" ? "normal" : "bold")}
                  className={`w-7 h-7 rounded text-sm flex items-center justify-center transition-colors ${selectedCustomData.fontWeight === "bold" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`}
                  title="Bold"><strong>B</strong></button>
                <button onClick={() => updateNodeField("fontStyle", selectedCustomData.fontStyle === "italic" ? "normal" : "italic")}
                  className={`w-7 h-7 rounded text-sm flex items-center justify-center transition-colors ${selectedCustomData.fontStyle === "italic" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`}
                  title="Italic"><em>I</em></button>
                <span className="w-px h-5 bg-gray-200" />
                {/* Alignment */}
                <button onClick={() => updateNodeField("textAlign", "left")}
                  className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${(!selectedCustomData.textAlign || selectedCustomData.textAlign === "left") ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`}
                  title="Align left">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14"/></svg>
                </button>
                <button onClick={() => updateNodeField("textAlign", "center")}
                  className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${selectedCustomData.textAlign === "center" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`}
                  title="Center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth={2} d="M4 6h16M7 12h10M5 18h14"/></svg>
                </button>
                <button onClick={() => updateNodeField("textAlign", "right")}
                  className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${selectedCustomData.textAlign === "right" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`}
                  title="Align right">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth={2} d="M4 6h16M10 12h10M6 18h14"/></svg>
                </button>
                <span className="w-px h-5 bg-gray-200" />
                {/* Color swatches */}
                <div className="flex items-center gap-0.5">
                  {["#000000", "#2E75B6", "#27AE60", "#8E44AD", "#E67E22", "#EF4444", "#6B7280"].map(c => (
                    <button key={c} onClick={() => updateNodeField("color", c)}
                      className={`w-5 h-5 rounded-full hover:scale-110 transition-transform ${selectedCustomData.color === c ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <span className="w-px h-5 bg-gray-200" />
              </>
            )}

            {/* Standard actions */}
            <button onClick={duplicateSelectedElement}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors" title="Ctrl+D">
              Duplicate
            </button>
            <button onClick={() => copySelectedElement()}
              className="text-xs text-gray-600 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-50 transition-colors" title="Ctrl+C">
              Copy
            </button>
            <button onClick={deleteSelectedElement}
              className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors" title="Delete">
              Delete
            </button>
          </div>
        )}

        {/* Selected edge action bar */}
        {selectedEdge && (() => {
          const edge = edges.find(e => e.id === selectedEdge);
          if (!edge?.data?.customEdgeId) return null;
          return (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 bg-white rounded-xl shadow-lg border border-gray-200 px-3 py-2 flex items-center gap-2">
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Connector</span>
              <span className="w-px h-5 bg-gray-200" />
              {/* Color swatches */}
              <div className="flex items-center gap-0.5">
                {EDGE_COLORS.map(c => (
                  <button key={c} onClick={() => changeEdgeColor(c)}
                    className={`w-5 h-5 rounded-full hover:scale-110 transition-transform ${(edge.style as any)?.stroke === c ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <span className="w-px h-5 bg-gray-200" />
              {/* Line style */}
              <button onClick={() => changeEdgeStyle("default")}
                className={`px-2 py-1 rounded text-[10px] font-medium ${!(edge.style as any)?.strokeDasharray ? "bg-gray-200 text-gray-800" : "text-gray-500 hover:bg-gray-100"}`}>
                Solid
              </button>
              <button onClick={() => changeEdgeStyle("dashed")}
                className={`px-2 py-1 rounded text-[10px] font-medium ${(edge.style as any)?.strokeDasharray === "8 4" ? "bg-gray-200 text-gray-800" : "text-gray-500 hover:bg-gray-100"}`}>
                Dashed
              </button>
              <button onClick={() => changeEdgeStyle("dotted")}
                className={`px-2 py-1 rounded text-[10px] font-medium ${(edge.style as any)?.strokeDasharray === "2 2" ? "bg-gray-200 text-gray-800" : "text-gray-500 hover:bg-gray-100"}`}>
                Dotted
              </button>
              <span className="w-px h-5 bg-gray-200" />
              {/* Animated toggle */}
              <button onClick={toggleEdgeAnimation}
                className={`px-2 py-1 rounded text-[10px] font-medium ${edge.animated ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`}>
                {edge.animated ? "⚡ Animated" : "Animate"}
              </button>
              <span className="w-px h-5 bg-gray-200" />
              <button onClick={deleteSelectedEdge}
                className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors">
                Delete
              </button>
            </div>
          );
        })()}
      </div>
      </div>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]" onClick={() => setSearchOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"/>
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[70vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input
                autoFocus type="text" placeholder="Search workflows, properties, emails, lists..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400"
              />
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono">ESC</kbd>
            </div>
            <div className="flex-1 overflow-y-auto">
              {searching ? (
                <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"/></div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">{searchQuery.length < 2 ? "Type to search across all workflows..." : "No results found"}</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {searchResults.map((r: any, i: number) => (
                    <button key={i} onClick={() => { setSelectedWorkflow(r.workflowId); setSearchOpen(false); setSearchQuery(""); }}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-start gap-3">
                      <span className="text-base mt-0.5">{matchTypeIcons[r.matchType] || "📋"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{r.workflowName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{r.matchDetail}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${r.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{r.status.toLowerCase()}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{r.objectType.toLowerCase()}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Workflow Detail Panel */}
      {selectedWorkflow && (
        <WorkflowDetailPanel
          portalId={portalId}
          workflowId={selectedWorkflow}
          onClose={() => setSelectedWorkflow(null)}
        />
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-5 h-0.5" style={{ backgroundColor: color }} />
      <span className="text-[10px] text-gray-600">{label}</span>
    </div>
  );
}
