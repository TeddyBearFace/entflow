"use client";

import { useState } from "react";

interface AddNodeToolbarProps {
  portalId: string;
  onNodeAdded: () => void;
}

const NODE_TYPES = [
  { value: "stage", label: "Stage", icon: "🏷️", description: "Deal stage, lifecycle stage, etc." },
  { value: "milestone", label: "Milestone", icon: "🎯", description: "Key moment in the journey" },
  { value: "note", label: "Note", icon: "📝", description: "Annotation or explanation" },
  { value: "divider", label: "Divider", icon: "➖", description: "Section separator" },
];

const PRESET_COLORS = [
  "#6366f1", // indigo
  "#2E75B6", // blue
  "#0891b2", // cyan
  "#059669", // emerald
  "#d97706", // amber
  "#dc2626", // red
  "#9333ea", // purple
  "#64748b", // slate
];

const PRESET_STAGES = [
  { label: "New Lead", icon: "🌱", color: "#2E75B6", type: "stage" },
  { label: "MQL", icon: "📊", color: "#6366f1", type: "stage" },
  { label: "SQL", icon: "🎯", color: "#9333ea", type: "stage" },
  { label: "Opportunity", icon: "💡", color: "#d97706", type: "stage" },
  { label: "Demo Booked", icon: "📅", color: "#0891b2", type: "milestone" },
  { label: "Proposal Sent", icon: "📨", color: "#059669", type: "stage" },
  { label: "Negotiation", icon: "🤝", color: "#d97706", type: "stage" },
  { label: "Closed Won", icon: "🏆", color: "#059669", type: "milestone" },
  { label: "Closed Lost", icon: "❌", color: "#dc2626", type: "milestone" },
  { label: "Onboarding", icon: "🚀", color: "#6366f1", type: "stage" },
];

export default function AddNodeToolbar({ portalId, onNodeAdded }: AddNodeToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [saving, setSaving] = useState(false);

  // Custom form state
  const [label, setLabel] = useState("");
  const [nodeType, setNodeType] = useState("stage");
  const [color, setColor] = useState("#6366f1");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");

  const addPreset = async (preset: typeof PRESET_STAGES[0]) => {
    setSaving(true);
    try {
      await fetch("/api/custom-nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portalId,
          label: preset.label,
          nodeType: preset.type,
          color: preset.color,
          icon: preset.icon,
          positionX: 400 + Math.random() * 200,
          positionY: 100 + Math.random() * 300,
        }),
      });
      onNodeAdded();
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to add node:", err);
    } finally {
      setSaving(false);
    }
  };

  const addCustom = async () => {
    if (!label.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/custom-nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portalId,
          label: label.trim(),
          nodeType,
          color,
          icon: icon || null,
          description: description || null,
          positionX: 400 + Math.random() * 200,
          positionY: 100 + Math.random() * 300,
        }),
      });
      onNodeAdded();
      setIsOpen(false);
      setShowCustom(false);
      setLabel("");
      setDescription("");
      setIcon("");
    } catch (err) {
      console.error("Failed to add node:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
      >
        <span className="text-lg">+</span>
        Add Node
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => { setIsOpen(false); setShowCustom(false); }} />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl border border-gray-200 shadow-lg w-[320px] overflow-hidden">
            {!showCustom ? (
              <>
                {/* Quick presets */}
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Quick Add
                  </p>
                </div>
                <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
                  {PRESET_STAGES.map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => addPreset(preset)}
                      disabled={saving}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className="text-lg">{preset.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{preset.label}</p>
                        <p className="text-[10px] text-gray-400">{preset.type}</p>
                      </div>
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: preset.color }}
                      />
                    </button>
                  ))}
                </div>
                <div className="px-3 py-2 border-t border-gray-100">
                  <button
                    onClick={() => setShowCustom(true)}
                    className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-1"
                  >
                    Create custom node...
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Custom form */}
                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700">Create Custom Node</p>
                  <button
                    onClick={() => setShowCustom(false)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    ← Back
                  </button>
                </div>
                <div className="p-3 space-y-3">
                  {/* Label */}
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      Label *
                    </label>
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="e.g. Demo Booked"
                      className="w-full mt-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      {NODE_TYPES.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setNodeType(t.value)}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-xs transition-colors ${
                            nodeType === t.value
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <span>{t.icon}</span>
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Icon */}
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      Icon (emoji)
                    </label>
                    <input
                      type="text"
                      value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                      placeholder="🎯"
                      className="w-full mt-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      maxLength={4}
                    />
                  </div>

                  {/* Color */}
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      Color
                    </label>
                    <div className="flex gap-1.5 mt-1">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setColor(c)}
                          className={`w-6 h-6 rounded-full border-2 transition-transform ${
                            color === c ? "border-gray-800 scale-110" : "border-transparent"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief note..."
                      className="w-full mt-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Submit */}
                  <button
                    onClick={addCustom}
                    disabled={!label.trim() || saving}
                    className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? "Adding..." : "Add to Map"}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
