"use client";

import { useState } from "react";

export type CanvasTool = "select" | "section" | "shape_rect" | "shape_diamond" | "shape_circle" | "connector" | "sticky" | "text";

interface CanvasToolbarProps {
  activeTool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  activeColor: string;
  onColorChange: (color: string) => void;
  snapToGrid: boolean;
  onSnapToggle: () => void;
  lockedTools?: CanvasTool[];
}

const TOOLS: Array<{ id: CanvasTool; icon: JSX.Element; label: string; group?: string }> = [
  {
    id: "select", label: "Select",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>,
  },
  {
    id: "section", label: "Section", group: "divider",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" strokeWidth={2} strokeDasharray="4 2" /></svg>,
  },
  {
    id: "shape_rect", label: "Rectangle",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" strokeWidth={2} /></svg>,
  },
  {
    id: "shape_diamond", label: "Diamond",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l9 9-9 9-9-9 9-9z" /></svg>,
  },
  {
    id: "shape_circle", label: "Circle",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={2} /></svg>,
  },
  {
    id: "connector", label: "Connector", group: "divider",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" /></svg>,
  },
  {
    id: "sticky", label: "Sticky Note",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  },
  {
    id: "text", label: "Text",
    icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7V4h16v3M9 20h6M12 4v16" /></svg>,
  },
];

const COLORS = [
  "#6366f1", // Indigo
  "#2E75B6", // Blue (Contact)
  "#27AE60", // Green (Deal)
  "#8E44AD", // Purple (Company)
  "#E67E22", // Orange (Ticket)
  "#EF4444", // Red
  "#FBBF24", // Yellow
  "#F472B6", // Pink
  "#6B7280", // Gray
  "#000000", // Black
];

export default function CanvasToolbar({ activeTool, onToolChange, activeColor, onColorChange, snapToGrid, onSnapToggle, lockedTools = [] }: CanvasToolbarProps) {
  const [showColors, setShowColors] = useState(false);
  const lockedSet = new Set(lockedTools);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2">
      {/* Main toolbar */}
      <div className="flex items-center bg-white rounded-2xl shadow-lg border border-gray-200 p-1.5 gap-0.5">
        {TOOLS.map((tool, i) => {
          const isLocked = lockedSet.has(tool.id);
          return (
          <div key={tool.id} className="flex items-center">
            {tool.group === "divider" && i > 0 && <div className="w-px h-7 bg-gray-200 mx-1" />}
            <button
              onClick={() => onToolChange(tool.id)}
              className={`relative p-2.5 rounded-xl transition-all group ${
                isLocked
                  ? "text-gray-300 cursor-not-allowed"
                  : activeTool === tool.id
                  ? "bg-blue-100 text-blue-700 shadow-sm"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
              title={isLocked ? `${tool.label} — Pro plan` : tool.label}
            >
              {tool.icon}
              {/* Tooltip */}
              <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {tool.label}{isLocked ? " ⚡ Pro" : ""}
              </span>
            </button>
          </div>
          );
        })}

        {/* Divider before snap */}
        <div className="w-px h-7 bg-gray-200 mx-1" />

        {/* Snap to grid toggle */}
        <button
          onClick={onSnapToggle}
          className={`relative p-2.5 rounded-xl transition-all group ${
            snapToGrid
              ? "bg-blue-100 text-blue-700 shadow-sm"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          }`}
          title={snapToGrid ? "Grid snap: ON" : "Grid snap: OFF"}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
          <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {snapToGrid ? "Grid snap: ON" : "Grid snap: OFF"}
          </span>
        </button>
      </div>

      {/* Color picker */}
      {activeTool !== "select" && activeTool !== "connector" && (
        <div className="relative">
          <button
            onClick={() => setShowColors(!showColors)}
            className="w-10 h-10 rounded-xl shadow-lg border-2 border-white hover:scale-110 transition-transform"
            style={{ backgroundColor: activeColor }}
            title="Color"
          />
          {showColors && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowColors(false)} />
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl border border-gray-200 p-2 grid grid-cols-5 gap-1.5 z-20">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => { onColorChange(c); setShowColors(false); }}
                    className={`w-7 h-7 rounded-lg hover:scale-110 transition-transform ${activeColor === c ? "ring-2 ring-offset-2 ring-blue-500" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
