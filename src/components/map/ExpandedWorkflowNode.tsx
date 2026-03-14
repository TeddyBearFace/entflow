"use client";

import { memo } from "react";
import { Handle, Position, NodeResizer } from "reactflow";
import type { WorkflowNodeData } from "@/types";
import { IconContact, IconDeal, IconCompany, IconTicket, IconWorkflow } from "@/components/icons";


// Object type config
const OBJ_ICON_MAP: Record<string, (p: { className?: string }) => JSX.Element> = {
  CONTACT: IconContact, DEAL: IconDeal, COMPANY: IconCompany, TICKET: IconTicket,
};
const OBJECT_CONFIG: Record<string, { label: string }> = {
  CONTACT: { label: "Contact" },
  DEAL: { label: "Deal" },
  COMPANY: { label: "Company" },
  TICKET: { label: "Ticket" },
  CUSTOM: { label: "Custom" },
  UNKNOWN: { label: "Other" },
};

const OBJECT_TYPE_COLORS: Record<string, string> = {
  CONTACT: "#2E75B6",
  COMPANY: "#8E44AD",
  DEAL: "#27AE60",
  TICKET: "#E67E22",
  CUSTOM: "#95A5A6",
  UNKNOWN: "#95A5A6",
};

// Action display config
const ACTION_DISPLAY: Record<string, { icon: string; label: string; bg: string; text: string; border: string }> = {
  SET_PROPERTY:           { icon: "→", label: "Set property",       bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  CLEAR_PROPERTY:         { icon: "×", label: "Clear property",     bg: "#F9FAFB", text: "#4B5563", border: "#E5E7EB" },
  COPY_PROPERTY:          { icon: "⊡", label: "Copy property",      bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  SEND_EMAIL:             { icon: "✉", label: "Send email",         bg: "#FAF5FF", text: "#7C3AED", border: "#DDD6FE" },
  ENROLL_IN_WORKFLOW:     { icon: "↗", label: "Enroll in workflow",  bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA" },
  UNENROLL_FROM_WORKFLOW: { icon: "↙", label: "Unenroll",           bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA" },
  ADD_TO_LIST:            { icon: "+", label: "Add to list",        bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" },
  REMOVE_FROM_LIST:       { icon: "−", label: "Remove from list",   bg: "#F9FAFB", text: "#4B5563", border: "#E5E7EB" },
  IF_BRANCH:              { icon: "⑂", label: "If/then",            bg: "#FFFBEB", text: "#B45309", border: "#FDE68A" },
  BRANCH:                 { icon: "⑂", label: "Branch",             bg: "#FFFBEB", text: "#B45309", border: "#FDE68A" },
  DELAY:                  { icon: "◷", label: "Delay",              bg: "#F9FAFB", text: "#4B5563", border: "#E5E7EB" },
  WEBHOOK:                { icon: "⟡", label: "Webhook",            bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE" },
  CUSTOM_CODE:            { icon: "⟨⟩", label: "Custom code",       bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE" },
  CREATE_TASK:            { icon: "☐", label: "Create task",        bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" },
  CREATE_DEAL:            { icon: "$", label: "Create deal",        bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" },
  CREATE_TICKET:          { icon: "▤", label: "Create ticket",      bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" },
  CREATE_COMPANY:         { icon: "◻", label: "Create company",     bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" },
  SEND_INTERNAL_EMAIL:    { icon: "◉", label: "Notify",             bg: "#FEFCE8", text: "#A16207", border: "#FEF08A" },
  SEND_IN_APP_NOTIFICATION: { icon: "◉", label: "Notify",           bg: "#FEFCE8", text: "#A16207", border: "#FEF08A" },
  ROTATE_OWNER:           { icon: "↻", label: "Rotate owner",      bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  FORMAT_DATA:            { icon: "≡", label: "Format data",       bg: "#F9FAFB", text: "#4B5563", border: "#E5E7EB" },
  DATA_ACTION:            { icon: "◎", label: "Fetch data",        bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE" },
  NOTIFICATION:           { icon: "◉", label: "Notification",      bg: "#FEFCE8", text: "#A16207", border: "#FEF08A" },
  ASSOCIATION:            { icon: "⟷", label: "Association",        bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  UNKNOWN:                { icon: "•", label: "Action",             bg: "#F9FAFB", text: "#4B5563", border: "#E5E7EB" },
};

function getActionStyle(actionType: string) {
  if (ACTION_DISPLAY[actionType]) return ACTION_DISPLAY[actionType];
  const upper = actionType.toUpperCase();
  for (const [key, val] of Object.entries(ACTION_DISPLAY)) {
    if (upper.includes(key) || upper.startsWith(key)) return val;
  }
  return ACTION_DISPLAY.UNKNOWN;
}

// Parse a dynamic reference like "Line Item's Name" into { obj: "Line Item", prop: "Name" }
function parseDynRef(text: string): { obj: string; prop: string } | null {
  if (!text) return null;
  const match = text.match(/^(Line Item|Contact|Company|Deal|Ticket|Product|Quote|Invoice|Order|Meeting|Call|Task|Note|Custom Object|Object|Record) (.+)$/i);
  if (match) return { obj: match[1], prop: match[2] };
  const recordMatch = text.match(/^Record (owner|ID)$/i);
  if (recordMatch) return { obj: "Record", prop: recordMatch[1] };
  return null;
}

function isDynamicRef(text: string): boolean {
  return parseDynRef(text) !== null || /^Dynamic:/i.test(text) || /^Associated /i.test(text);
}

const OBJ_TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Contact":       { bg: "#EFF6FF", text: "#2E75B6", border: "#BFDBFE" },
  "Company":       { bg: "#F5F3FF", text: "#8E44AD", border: "#DDD6FE" },
  "Deal":          { bg: "#ECFDF5", text: "#27AE60", border: "#A7F3D0" },
  "Ticket":        { bg: "#FFF7ED", text: "#E67E22", border: "#FED7AA" },
  "Line Item":     { bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" },
  "Product":       { bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" },
  "Quote":         { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
  "Invoice":       { bg: "#FFF1F2", text: "#E11D48", border: "#FECDD3" },
  "Order":         { bg: "#FFF1F2", text: "#E11D48", border: "#FECDD3" },
  "Meeting":       { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE" },
  "Call":          { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE" },
  "Task":          { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" },
  "Email Activity":{ bg: "#FAF5FF", text: "#7C3AED", border: "#DDD6FE" },
  "Record":        { bg: "#F9FAFB", text: "#4B5563", border: "#E5E7EB" },
  "Custom Object": { bg: "#F9FAFB", text: "#4B5563", border: "#E5E7EB" },
};
const DEFAULT_TAG = { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" };

function ObjTag({ name }: { name: string }) {
  const c = OBJ_TAG_COLORS[name] || DEFAULT_TAG;
  return (
    <span className="inline-flex items-center gap-0.5 px-1 py-px rounded text-[10px] font-medium"
      style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      <svg className="w-2.5 h-2.5 opacity-50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101"/></svg>
      {name}
    </span>
  );
}

// Render text with dynamic refs tagged
function DynText({ text }: { text: string }) {
  const parsed = parseDynRef(text);
  if (parsed) return <><ObjTag name={parsed.obj} /><span className="opacity-70"> {parsed.prop}</span></>;
  return <span>{text}</span>;
}

export interface ActionItem {
  type: string;
  propertyName?: string;
  propertyValue?: string;
  emailId?: string;
  flowId?: string;
  targetFlowName?: string;
  delayDescription?: string;
  description?: string;
}

export interface ExpandedWorkflowNodeData extends WorkflowNodeData {
  enrollmentTrigger?: string;
  actions: ActionItem[];
  healthScore?: number;
  healthGrade?: string;
  healthIssues?: string[];
  tags?: Array<{ id: string; name: string; color: string }>;
}

interface ExpandedWorkflowNodeProps {
  data: ExpandedWorkflowNodeData;
  selected: boolean;
}

function ExpandedWorkflowNode({ data, selected }: ExpandedWorkflowNodeProps) {
  const headerColor = OBJECT_TYPE_COLORS[data.objectType] || OBJECT_TYPE_COLORS.UNKNOWN;
  const objConfig = OBJECT_CONFIG[data.objectType] || OBJECT_CONFIG.UNKNOWN;

  const visibleActions = data.actions;

  return (
    <div
      className={`
        rounded-2xl bg-white overflow-hidden flex flex-col
        shadow-md hover:shadow-xl transition-all duration-200
        h-full w-full
        ${selected ? "ring-2 ring-blue-500 ring-offset-2" : ""}
        ${data.status === "INACTIVE" ? "opacity-50 grayscale-[30%]" : ""}
      `}
      style={{ border: `1.5px solid ${headerColor}30` }}
    >
      {/* Resize handle - only visible when selected */}
      <NodeResizer
        isVisible={selected}
        minWidth={220}
        minHeight={150}
        lineClassName="!border-blue-400"
        handleClassName="!w-2.5 !h-2.5 !bg-blue-500 !border-2 !border-white !rounded-sm"
      />
      {/* Connection handles */}
      <Handle type="target" position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-white !border-2 !rounded-full" style={{ borderColor: headerColor }} />
      <Handle type="source" position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-white !border-2 !rounded-full" style={{ borderColor: headerColor }} />
      <Handle type="target" position={Position.Top} id="top"
        className="!w-2.5 !h-2.5 !bg-white !border-2 !rounded-full" style={{ borderColor: headerColor }} />
      <Handle type="source" position={Position.Bottom} id="bottom"
        className="!w-2.5 !h-2.5 !bg-white !border-2 !rounded-full" style={{ borderColor: headerColor }} />

      {/* Header */}
      <div className="px-4 py-3 flex-shrink-0" style={{ background: `linear-gradient(135deg, ${headerColor}, ${headerColor}dd)` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            {OBJ_ICON_MAP[data.objectType] ? OBJ_ICON_MAP[data.objectType]({ className: "w-4 h-4 text-white" }) : <IconWorkflow className="w-4 h-4 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white leading-tight truncate" title={data.name}>
              {data.name}
            </p>
            <p className="text-[10px] text-white/70 mt-0.5">
              {objConfig.label} workflow
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {data.healthGrade && (
              <span
                className="text-[10px] w-5 h-5 rounded-md flex items-center justify-center font-black leading-none"
                style={{
                  background: data.healthGrade === "A" ? "#ECFDF5" : data.healthGrade === "B" ? "#EFF6FF" : data.healthGrade === "C" ? "#FFFBEB" : data.healthGrade === "D" ? "#FFF7ED" : "#FEF2F2",
                  color: data.healthGrade === "A" ? "#059669" : data.healthGrade === "B" ? "#2563EB" : data.healthGrade === "C" ? "#D97706" : data.healthGrade === "D" ? "#EA580C" : "#DC2626",
                  border: `1.5px solid ${data.healthGrade === "A" ? "#A7F3D0" : data.healthGrade === "B" ? "#BFDBFE" : data.healthGrade === "C" ? "#FDE68A" : data.healthGrade === "D" ? "#FED7AA" : "#FECACA"}`,
                }}
                title={`Health: ${data.healthGrade} (${data.healthScore}/100)${data.healthIssues?.length ? "\n" + data.healthIssues.join("\n") : ""}`}
              >
                {data.healthGrade}
              </span>
            )}
            {data.hasConflicts && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20 text-white font-semibold">
                ⚠ {data.conflictCount}
              </span>
            )}
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/40"
              style={{
                backgroundColor: data.status === "ACTIVE" ? "#4ade80" : data.status === "ERRORING" ? "#f87171" : "#9ca3af",
              }}
              title={data.status.toLowerCase()}
            />
          </div>
        </div>
      </div>

      {/* Health issues banner */}
      {data.healthIssues && data.healthIssues.length > 0 && data.healthGrade && "CDF".includes(data.healthGrade) && (
        <div className="px-3 py-1.5 flex-shrink-0 flex items-start gap-1.5"
          style={{ background: data.healthGrade === "F" ? "#FEF2F2" : data.healthGrade === "D" ? "#FFF7ED" : "#FFFBEB" }}>
          <span className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: data.healthGrade === "F" ? "#DC2626" : data.healthGrade === "D" ? "#EA580C" : "#D97706" }} />
          <p className="text-[9px] leading-snug"
            style={{ color: data.healthGrade === "F" ? "#991B1B" : data.healthGrade === "D" ? "#9A3412" : "#92400E" }}>
            {data.healthIssues.slice(0, 2).join(" · ")}
            {data.healthIssues.length > 2 && ` (+${data.healthIssues.length - 2} more)`}
          </p>
        </div>
      )}

      {/* Tags */}
      {data.tags && data.tags.length > 0 && (
        <div className="px-3 py-1.5 flex-shrink-0 flex flex-wrap gap-1 border-b" style={{ borderColor: `${headerColor}10` }}>
          {data.tags.map(tag => (
            <span key={tag.id}
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md leading-none"
              style={{
                backgroundColor: `${tag.color}18`,
                color: tag.color,
                border: `1px solid ${tag.color}30`,
              }}>
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Enrollment trigger */}
      {data.enrollmentTrigger && (
        <div className="px-4 py-2 border-b flex-shrink-0" style={{ borderColor: `${headerColor}15`, backgroundColor: `${headerColor}06` }}>
          <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: `${headerColor}99` }}>
            Trigger
          </p>
          <p className="text-[11px] text-gray-600 leading-snug line-clamp-2">
            {data.enrollmentTrigger}
          </p>
        </div>
      )}

      {/* Action steps - scrollable */}
      <div className="px-3 py-2.5 flex-1 overflow-y-auto custom-scrollbar min-h-0">
        {visibleActions.length > 0 ? (
          <div className="space-y-1.5">
            {visibleActions.map((action, i) => {
              const style = getActionStyle(action.type);
              return (
                <div
                  key={i}
                  className="flex items-start gap-2 px-2.5 py-[7px] rounded-lg text-[11px] font-medium transition-colors"
                  style={{
                    backgroundColor: style.bg,
                    color: style.text,
                    border: `1px solid ${style.border}`,
                  }}
                >
                  <span className="flex-shrink-0 text-xs mt-px">{style.icon}</span>
                  <div className="flex-1 flex flex-wrap items-center gap-x-0.5">
                    <span className="font-semibold">{style.label}</span>
                    {action.description && action.description !== style.label && (
                      action.description.includes(" → ") && isDynamicRef(action.description.split(" → ").pop() || "") ? (
                        <span className="font-normal flex items-center gap-0.5 flex-wrap">
                          <span className="opacity-70">: {action.description.split(" → ")[0]} →</span>
                          {" "}<DynText text={action.description.split(" → ").pop()!} />
                        </span>
                      ) : isDynamicRef(action.description) ? (
                        <span className="font-normal flex items-center gap-0.5">
                          <span className="opacity-70">: </span><DynText text={action.description} />
                        </span>
                      ) : (
                        <span className="opacity-70 font-normal truncate">: {action.description}</span>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] text-gray-400 text-center py-3 italic">No actions</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t flex items-center justify-between flex-shrink-0" style={{ borderColor: `${headerColor}10` }}>
        <span className="text-[10px] text-gray-400 font-medium">
          {data.actionCount} action{data.actionCount !== 1 ? "s" : ""}
        </span>
        <span className="text-[10px] text-gray-400 font-medium">
          {data.dependencyCount} dep{data.dependencyCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

export default memo(ExpandedWorkflowNode);
