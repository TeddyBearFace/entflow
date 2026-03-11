"use client";
import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, NodeResizer } from "reactflow";

const STICKY_COLORS: Record<string, { bg: string; text: string; shadow: string }> = {
  "#FBBF24": { bg: "#FEF3C7", text: "#92400E", shadow: "rgba(251,191,36,0.3)" },
  "#34D399": { bg: "#D1FAE5", text: "#065F46", shadow: "rgba(52,211,153,0.3)" },
  "#60A5FA": { bg: "#DBEAFE", text: "#1E40AF", shadow: "rgba(96,165,250,0.3)" },
  "#F472B6": { bg: "#FCE7F3", text: "#9D174D", shadow: "rgba(244,114,182,0.3)" },
  "#A78BFA": { bg: "#EDE9FE", text: "#5B21B6", shadow: "rgba(167,139,250,0.3)" },
  "#FB923C": { bg: "#FFEDD5", text: "#9A3412", shadow: "rgba(251,146,60,0.3)" },
};

interface StickyNodeData {
  label: string;
  color: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textContent?: string;
  autoEdit?: boolean;
  onTextChange?: (id: string, text: string) => void;
  nodeId: string;
}

function StickyNode({ data, selected }: { data: StickyNodeData; selected: boolean }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(data.textContent || data.label);
  const ref = useRef<HTMLTextAreaElement>(null);
  const scheme = STICKY_COLORS[data.color] || { bg: `${data.color}20`, text: data.color, shadow: `${data.color}30` };
  const fontSize = data.fontSize || 12;
  const fontWeight = data.fontWeight || "normal";
  const fontStyle = data.fontStyle || "normal";
  const autoEditDone = useRef(false);

  useEffect(() => { setText(data.textContent || data.label); }, [data.textContent, data.label]);
  useEffect(() => { if (editing && ref.current) { ref.current.focus(); ref.current.select(); } }, [editing]);

  // Auto-enter edit mode on creation
  useEffect(() => {
    if (data.autoEdit && !autoEditDone.current) {
      autoEditDone.current = true;
      setEditing(true);
      setText("");
    }
  }, [data.autoEdit]);

  const save = () => { setEditing(false); if (data.onTextChange) data.onTextChange(data.nodeId, text); };

  return (
    <div className="w-full h-full relative">
      <NodeResizer isVisible={selected} minWidth={120} minHeight={80}
        lineClassName="!border-transparent" handleClassName="!w-2.5 !h-2.5 !rounded-sm" handleStyle={{ backgroundColor: data.color, borderColor: "white" }} />
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !rounded-full !bg-white !border" style={{ borderColor: scheme.text }} />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !rounded-full !bg-white !border" style={{ borderColor: scheme.text }} />
      <Handle type="target" position={Position.Top} id="top" className="!w-2 !h-2 !rounded-full !bg-white !border" style={{ borderColor: scheme.text }} />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2 !h-2 !rounded-full !bg-white !border" style={{ borderColor: scheme.text }} />

      <div className="w-full h-full rounded-lg flex flex-col overflow-hidden"
        style={{ backgroundColor: scheme.bg, boxShadow: `3px 3px 8px ${scheme.shadow}`, border: `1px solid ${data.color}40` }}>
        <div className="h-1.5 flex-shrink-0" style={{ backgroundColor: data.color }} />
        <div className="flex-1 p-3 overflow-hidden">
          {editing ? (
            <textarea ref={ref} value={text} onChange={e => setText(e.target.value)} onBlur={save}
              className="w-full h-full bg-transparent outline-none resize-none leading-relaxed"
              style={{ color: scheme.text, fontSize: `${fontSize}px`, fontWeight, fontStyle }} placeholder="Type here..." />
          ) : (
            <p onDoubleClick={() => setEditing(true)} className="leading-relaxed cursor-text whitespace-pre-wrap"
              style={{ color: scheme.text, fontSize: `${fontSize}px`, fontWeight, fontStyle }}>
              {text || "Double-click to edit"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(StickyNode);
