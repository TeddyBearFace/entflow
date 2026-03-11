"use client";

import { memo } from "react";
import { Handle, Position } from "reactflow";
import type { WorkflowNodeData } from "@/types";

// Object type icons (simple emoji for MVP, replace with proper icons later)
const OBJECT_ICONS: Record<string, string> = {
  CONTACT: "👤",
  DEAL: "💰",
  COMPANY: "🏢",
  TICKET: "🎫",
  CUSTOM: "⚙️",
  UNKNOWN: "❓",
};

// Status colors
const STATUS_STYLES: Record<string, { border: string; bg: string; badge: string; badgeBg: string }> = {
  ACTIVE: {
    border: "border-emerald-400",
    bg: "bg-white",
    badge: "text-emerald-700",
    badgeBg: "bg-emerald-50",
  },
  INACTIVE: {
    border: "border-gray-300",
    bg: "bg-gray-50",
    badge: "text-gray-500",
    badgeBg: "bg-gray-100",
  },
  ERRORING: {
    border: "border-red-400",
    bg: "bg-red-50",
    badge: "text-red-700",
    badgeBg: "bg-red-50",
  },
};

interface WorkflowNodeProps {
  data: WorkflowNodeData;
  selected: boolean;
}

function WorkflowNode({ data, selected }: WorkflowNodeProps) {
  const style = STATUS_STYLES[data.status] || STATUS_STYLES.INACTIVE;
  const icon = OBJECT_ICONS[data.objectType] || OBJECT_ICONS.UNKNOWN;

  return (
    <div
      className={`
        rounded-lg border-2 ${style.border} ${style.bg}
        shadow-sm hover:shadow-md transition-shadow
        px-4 py-3 min-w-[200px] max-w-[280px]
        ${selected ? "ring-2 ring-blue-500 ring-offset-2" : ""}
        ${data.status === "INACTIVE" ? "opacity-70" : ""}
      `}
    >
      {/* Handles for edges */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-gray-400 !border-gray-300"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-gray-400 !border-gray-300"
      />

      {/* Header row: icon + name + conflict badge */}
      <div className="flex items-start gap-2">
        <span className="text-lg flex-shrink-0" title={data.objectType}>
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate" title={data.name}>
            {data.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${style.badge} ${style.badgeBg}`}
            >
              {data.status.toLowerCase()}
            </span>
            {data.hasConflicts && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-medium text-amber-700 bg-amber-50"
                title={`${data.conflictCount} conflict(s) detected`}
              >
                ⚠ {data.conflictCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer row: action count + dependency count */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
        <span title="Number of actions in this workflow">
          {data.actionCount} action{data.actionCount !== 1 ? "s" : ""}
        </span>
        <span title="Number of dependencies">
          {data.dependencyCount} dep{data.dependencyCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

export default memo(WorkflowNode);
