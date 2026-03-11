"use client";
import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position } from "reactflow";

interface TextNodeData {
  label: string;
  color: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  textContent?: string;
  autoEdit?: boolean;
  onTextChange?: (id: string, text: string) => void;
  onStyleChange?: (id: string, updates: Record<string, any>) => void;
  nodeId: string;
}

function TextNode({ data, selected }: { data: TextNodeData; selected: boolean }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(data.textContent || data.label);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fontSize = data.fontSize || 16;
  const fontWeight = data.fontWeight || "normal";
  const fontStyle = data.fontStyle || "normal";
  const textAlign = (data.textAlign || "left") as any;
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
    <div className={`relative px-2 py-1 ${selected ? "ring-2 ring-blue-400 ring-offset-2 rounded" : ""}`}>
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !rounded-full !bg-transparent !border-transparent" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !rounded-full !bg-transparent !border-transparent" />
      <Handle type="target" position={Position.Top} id="top" className="!w-2 !h-2 !rounded-full !bg-transparent !border-transparent" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2 !h-2 !rounded-full !bg-transparent !border-transparent" />

      {editing ? (
        <textarea ref={ref} value={text} onChange={e => setText(e.target.value)} onBlur={save}
          className="bg-transparent outline-none resize-none min-w-[100px] w-full"
          style={{ color: data.color, fontSize: `${fontSize}px`, lineHeight: 1.4, fontWeight, fontStyle, textAlign }} rows={3} />
      ) : (
        <p onDoubleClick={() => setEditing(true)}
          className="cursor-text whitespace-pre-wrap min-w-[60px]"
          style={{ color: data.color, fontSize: `${fontSize}px`, lineHeight: 1.4, fontWeight, fontStyle, textAlign }}>
          {text || "Double-click to edit"}
        </p>
      )}
    </div>
  );
}

export default memo(TextNode);
