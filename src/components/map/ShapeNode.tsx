"use client";
import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, NodeResizer } from "reactflow";

interface ShapeNodeData {
  label: string;
  color: string;
  shapeType: "shape_rect" | "shape_diamond" | "shape_circle";
  description?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  autoEdit?: boolean;
  onLabelChange?: (id: string, label: string) => void;
  nodeId: string;
}

function ShapeNode({ data, selected }: { data: ShapeNodeData; selected: boolean }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(data.label);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fontSize = data.fontSize || 12;
  const fontWeight = data.fontWeight || "600";
  const fontStyle = data.fontStyle || "normal";
  const autoEditDone = useRef(false);

  useEffect(() => { setText(data.label); }, [data.label]);
  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [editing]);

  useEffect(() => {
    if (data.autoEdit && !autoEditDone.current) {
      autoEditDone.current = true;
      setEditing(true);
    }
  }, [data.autoEdit]);

  const save = () => { setEditing(false); if (text.trim() && text !== data.label && data.onLabelChange) data.onLabelChange(data.nodeId, text.trim()); };

  const isDiamond = data.shapeType === "shape_diamond";
  const isCircle = data.shapeType === "shape_circle";

  const outerClass = isDiamond
    ? "w-full h-full flex items-center justify-center"
    : isCircle
    ? "w-full h-full rounded-full flex items-center justify-center overflow-hidden"
    : "w-full h-full rounded-xl flex items-center justify-center overflow-hidden";

  return (
    <div className="w-full h-full relative">
      <NodeResizer isVisible={selected} minWidth={80} minHeight={80}
        lineClassName="!border-transparent" handleClassName="!w-3 !h-3 !rounded-sm" handleStyle={{ backgroundColor: data.color, borderColor: "white" }} />

      {/* Handles */}
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-white !border-2 !rounded-full" style={{ borderColor: data.color }} />
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-white !border-2 !rounded-full" style={{ borderColor: data.color }} />
      <Handle type="target" position={Position.Top} id="top" className="!w-2.5 !h-2.5 !bg-white !border-2 !rounded-full" style={{ borderColor: data.color }} />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2.5 !h-2.5 !bg-white !border-2 !rounded-full" style={{ borderColor: data.color }} />

      {isDiamond ? (
        <div className={outerClass}>
          <div className="w-[70%] h-[70%] rotate-45 flex items-center justify-center shadow-sm"
            style={{ backgroundColor: `${data.color}15`, border: `2px solid ${data.color}` }}>
            <div className="-rotate-45 text-center px-2">
              {editing ? (
                <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)} onBlur={save} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); } }}
                  className="bg-transparent text-center outline-none resize-none w-full" style={{ color: data.color, fontSize: `${fontSize}px`, fontWeight, fontStyle }} rows={2} />
              ) : (
                <p onDoubleClick={() => setEditing(true)} className="cursor-text leading-tight" style={{ color: data.color, fontSize: `${fontSize}px`, fontWeight, fontStyle }}>{data.label}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={outerClass} style={{ backgroundColor: `${data.color}12`, border: `2px solid ${data.color}` }}>
          <div className="text-center px-3 py-2 max-w-full">
            {editing ? (
              <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)} onBlur={save} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); } }}
                className="bg-transparent text-center outline-none resize-none w-full" style={{ color: data.color, fontSize: `${fontSize}px`, fontWeight, fontStyle }} rows={2} />
            ) : (
              <p onDoubleClick={() => setEditing(true)} className="cursor-text leading-tight" style={{ color: data.color, fontSize: `${fontSize}px`, fontWeight, fontStyle }}>{data.label}</p>
            )}
            {data.description && <p className="text-[10px] mt-1 opacity-60" style={{ color: data.color }}>{data.description}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ShapeNode);
