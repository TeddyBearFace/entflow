"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";

export interface CustomStageNodeData {
  customNodeId: string;
  label: string;
  nodeType: "stage" | "milestone" | "note" | "divider";
  color: string;
  icon?: string;
  description?: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

function CustomStageNode({ data, selected }: NodeProps<CustomStageNodeData>) {
  const { label, nodeType, color, icon, description } = data;

  if (nodeType === "divider") {
    return (
      <div
        className={`
          px-6 py-2 rounded-full border-2 border-dashed
          ${selected ? "ring-2 ring-blue-500 ring-offset-2" : ""}
        `}
        style={{ borderColor: color, backgroundColor: `${color}10` }}
      >
        <Handle type="target" position={Position.Left} className="!opacity-0 !w-1 !h-1" />
        <Handle type="source" position={Position.Right} className="!opacity-0 !w-1 !h-1" />
        <p className="text-xs font-bold uppercase tracking-widest text-center" style={{ color }}>
          {icon ? `${icon} ` : ""}{label}
        </p>
      </div>
    );
  }

  if (nodeType === "note") {
    return (
      <div
        className={`
          max-w-[220px] rounded-lg border shadow-sm p-3
          ${selected ? "ring-2 ring-blue-500 ring-offset-2" : ""}
        `}
        style={{ borderColor: `${color}40`, backgroundColor: `${color}08` }}
      >
        <Handle type="target" position={Position.Left} className="!opacity-0 !w-1 !h-1" />
        <Handle type="source" position={Position.Right} className="!opacity-0 !w-1 !h-1" />
        <Handle type="target" position={Position.Top} id="top" className="!opacity-0 !w-1 !h-1" />
        <Handle type="source" position={Position.Bottom} id="bottom" className="!opacity-0 !w-1 !h-1" />
        <div className="flex items-start gap-2">
          {icon && <span className="text-base flex-shrink-0">{icon}</span>}
          <div>
            <p className="text-xs font-semibold" style={{ color }}>{label}</p>
            {description && (
              <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{description}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Stage (default) and milestone
  const isMilestone = nodeType === "milestone";

  return (
    <div
      className={`
        rounded-xl border-2 shadow-sm
        ${isMilestone ? "px-5 py-3" : "px-4 py-3 min-w-[160px]"}
        ${selected ? "ring-2 ring-blue-500 ring-offset-2" : ""}
      `}
      style={{
        borderColor: color,
        backgroundColor: isMilestone ? color : `${color}12`,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-white !border-2"
        style={{ borderColor: color }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-white !border-2"
        style={{ borderColor: color }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-white !border-2"
        style={{ borderColor: color }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-white !border-2"
        style={{ borderColor: color }}
      />

      <div className="flex items-center gap-2">
        {icon && <span className={isMilestone ? "text-xl" : "text-lg"}>{icon}</span>}
        <div>
          <p
            className={`font-bold ${isMilestone ? "text-sm text-white" : "text-sm"}`}
            style={isMilestone ? {} : { color }}
          >
            {label}
          </p>
          {description && (
            <p
              className={`text-[10px] mt-0.5 ${isMilestone ? "text-white/70" : "text-gray-500"}`}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(CustomStageNode);
