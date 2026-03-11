"use client";
import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, NodeResizer } from "reactflow";

interface SectionNodeData {
  label: string;
  color: string;
  description?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  onLabelChange?: (id: string, label: string) => void;
  nodeId: string;
}

function SectionNode({ data, selected }: { data: SectionNodeData; selected: boolean }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setText(data.label); }, [data.label]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const save = () => {
    setEditing(false);
    if (text.trim() && text !== data.label && data.onLabelChange) data.onLabelChange(data.nodeId, text.trim());
  };

  return (
    <div className="w-full h-full rounded-2xl relative" style={{ backgroundColor: `${data.color}08`, border: `2px dashed ${data.color}40` }}>
      <NodeResizer isVisible={selected} minWidth={200} minHeight={100}
        lineClassName="!border-transparent" handleClassName="!w-3 !h-3 !rounded-sm" handleStyle={{ backgroundColor: data.color, borderColor: "white" }} />
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-white !border-2 !rounded-full" style={{ borderColor: data.color }} />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-white !border-2 !rounded-full" style={{ borderColor: data.color }} />
      <Handle type="target" position={Position.Top} id="top" className="!w-3 !h-3 !bg-white !border-2 !rounded-full" style={{ borderColor: data.color }} />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-3 !h-3 !bg-white !border-2 !rounded-full" style={{ borderColor: data.color }} />

      {/* Section header */}
      <div className="absolute -top-4 left-4 flex items-center gap-2">
        <div className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm" style={{ backgroundColor: data.color, color: "white" }}>
          {editing ? (
            <input ref={inputRef} value={text} onChange={e => setText(e.target.value)} onBlur={save} onKeyDown={e => e.key === "Enter" && save()}
              className="bg-transparent text-white outline-none w-32 text-xs font-bold uppercase" />
          ) : (
            <span onDoubleClick={() => setEditing(true)} className="cursor-text">{data.label}</span>
          )}
        </div>
      </div>
      {data.description && (
        <div className="absolute top-4 left-4 text-xs text-gray-500 max-w-[80%]">{data.description}</div>
      )}
    </div>
  );
}

export default memo(SectionNode);
