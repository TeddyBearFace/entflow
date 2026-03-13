"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MapFilters } from "@/types";
import ProGate from "@/components/ProGate";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active", color: "bg-emerald-400" },
  { value: "INACTIVE", label: "Inactive", color: "bg-gray-400" },
  { value: "ERRORING", label: "Erroring", color: "bg-red-400" },
] as const;

const DEPENDENCY_TYPE_OPTIONS = [
  { value: "PROPERTY_WRITE", label: "Property dependency", color: "#2E75B6" },
  { value: "CROSS_ENROLLMENT", label: "Cross-enrollment", color: "#E67E22" },
  { value: "LIST_REFERENCE", label: "List reference", color: "#8E44AD" },
  { value: "EMAIL_SEND", label: "Email overlap", color: "#E74C3C" },
] as const;

const OBJ_COLORS: Record<string, { bg: string; text: string }> = {
  CONTACT: { bg: "#EFF6FF", text: "#2E75B6" },
  DEAL: { bg: "#ECFDF5", text: "#27AE60" },
  COMPANY: { bg: "#F5F3FF", text: "#8E44AD" },
  TICKET: { bg: "#FFF7ED", text: "#E67E22" },
};
const OBJ_ICONS: Record<string, string> = { CONTACT: "👤", DEAL: "💰", COMPANY: "🏢", TICKET: "🎫" };

interface PropertyImpact {
  property: string;
  label: string;
  objectType: string;
  critical: boolean;
  readers: Array<{ workflowId: string; name: string; status: string }>;
  writers: Array<{ workflowId: string; name: string; status: string; value?: string }>;
  totalWorkflows: number;
  hasConflict: boolean;
}

interface FilterSidebarProps {
  filters: MapFilters;
  onFiltersChange: (filters: MapFilters) => void;
  stats: any;
  portalId: string;
  selectedProperty: string | null;
  onSelectProperty: (key: string | null, workflowIds: string[]) => void;
  onWorkflowClick: (workflowId: string) => void;
  canUse?: (feature: string) => boolean;
}

// Collapsible section wrapper
function Section({ title, icon, defaultOpen = true, count, children }: {
  title: string; icon?: React.ReactNode; defaultOpen?: boolean; count?: number; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100">
      <button onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-gray-50/50 transition-colors">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h4>
          {count !== undefined && count > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">{count}</span>
          )}
        </div>
        <svg className={`w-3 h-3 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

export default function FilterSidebar({
  filters, onFiltersChange, stats, portalId,
  selectedProperty, onSelectProperty, onWorkflowClick, canUse,
}: FilterSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(288); // 18rem = 288px
  const isResizing = useRef(false);

  // Drag to resize
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.min(500, Math.max(220, startWidth + (e.clientX - startX)));
      setSidebarWidth(newWidth);
    };
    const onMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [sidebarWidth]);
  const [impactExpanded, setImpactExpanded] = useState(true);
  const [properties, setProperties] = useState<PropertyImpact[]>([]);
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactObjectFilter, setImpactObjectFilter] = useState<string | null>(null);
  const [showKeyOnly, setShowKeyOnly] = useState(true);
  const [conflictsOnly, setConflictsOnly] = useState(false);

  // Tags
  const [tags, setTags] = useState<Array<{ id: string; name: string; color: string; _count: { workflowTags: number } }>>([]);
  const [newTagName, setNewTagName] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  const TAG_COLORS = ["#6366f1", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#EF4444", "#8B5CF6", "#14B8A6"];

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch(`/api/tags?portalId=${portalId}`);
      if (res.ok) { const data = await res.json(); setTags(data.tags || []); }
    } catch {}
  }, [portalId]);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  const createTag = async () => {
    if (!newTagName.trim()) return;
    const color = TAG_COLORS[tags.length % TAG_COLORS.length];
    try {
      await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalId, action: "create", name: newTagName.trim(), color }),
      });
      setNewTagName("");
      setShowTagInput(false);
      fetchTags();
    } catch {}
  };

  const deleteTag = async (tagId: string) => {
    try {
      await fetch(`/api/tags?tagId=${tagId}`, { method: "DELETE" });
      onFiltersChange({ ...filters, tags: filters.tags.filter(t => t !== tagId) });
      fetchTags();
    } catch {}
  };

  const toggleTag = (tagId: string) => {
    const updated = filters.tags.includes(tagId) ? filters.tags.filter(t => t !== tagId) : [...filters.tags, tagId];
    onFiltersChange({ ...filters, tags: updated });
  };

  const fetchPropertyImpact = useCallback(async () => {
    setImpactLoading(true);
    try {
      const params = new URLSearchParams({ portalId });
      if (impactObjectFilter) params.set("objectType", impactObjectFilter);
      const res = await fetch(`/api/property-impact?${params}`);
      if (res.ok) { const data = await res.json(); setProperties(data.properties || []); }
    } catch (err) { console.error("Property impact fetch failed:", err); }
    finally { setImpactLoading(false); }
  }, [portalId, impactObjectFilter]);

  useEffect(() => { if (impactExpanded) fetchPropertyImpact(); }, [impactExpanded, fetchPropertyImpact]);

  const toggleStatus = (status: string) => {
    const current = filters.status as string[];
    const updated = current.includes(status) ? current.filter(s => s !== status) : [...current, status];
    onFiltersChange({ ...filters, status: updated as MapFilters["status"] });
  };
  const toggleObjectType = (type: string) => {
    const updated = filters.objectTypes.includes(type) ? filters.objectTypes.filter(t => t !== type) : [...filters.objectTypes, type];
    onFiltersChange({ ...filters, objectTypes: updated });
  };
  const toggleDependencyType = (type: string) => {
    const updated = filters.dependencyTypes.includes(type) ? filters.dependencyTypes.filter(t => t !== type) : [...filters.dependencyTypes, type];
    onFiltersChange({ ...filters, dependencyTypes: updated });
  };
  const clearFilters = () => {
    onFiltersChange({ status: [], objectTypes: [], dependencyTypes: [], searchQuery: "", properties: [], tags: [] });
    onSelectProperty(null, []);
  };

  const hasActiveFilters = filters.status.length > 0 || filters.objectTypes.length > 0 ||
    filters.dependencyTypes.length > 0 || filters.searchQuery.trim() !== "" || selectedProperty !== null || filters.tags.length > 0;

  // Click a property row: highlight ALL workflows that touch it
  const handlePropertyClick = (p: PropertyImpact) => {
    const key = `${p.objectType}:${p.property}`;
    if (selectedProperty === key) {
      onSelectProperty(null, []);
    } else {
      const wfIds = [...new Set([...p.readers.map(r => r.workflowId), ...p.writers.map(w => w.workflowId)])];
      onSelectProperty(key, wfIds);
    }
  };

  // Click the conflict badge: highlight ONLY the active writers that conflict
  const handleConflictClick = (e: React.MouseEvent, p: PropertyImpact) => {
    e.stopPropagation();
    const key = `${p.objectType}:${p.property}:conflict`;
    if (selectedProperty === key) {
      onSelectProperty(null, []);
    } else {
      const activeWriterIds = p.writers.filter(w => w.status === "ACTIVE").map(w => w.workflowId);
      onSelectProperty(key, activeWriterIds);
    }
  };

  const conflictCount = properties.filter(p => p.hasConflict).length;

  let filteredProps = showKeyOnly ? properties.filter(p => p.critical) : properties;
  if (conflictsOnly) filteredProps = filteredProps.filter(p => p.hasConflict);

  const grouped = new Map<string, PropertyImpact[]>();
  for (const p of filteredProps) {
    if (!grouped.has(p.objectType)) grouped.set(p.objectType, []);
    grouped.get(p.objectType)!.push(p);
  }

  if (collapsed) {
    return (
      <div className="w-10 border-r border-gray-200 bg-white flex flex-col items-center pt-3">
        <button onClick={() => setCollapsed(false)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Show filters">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="border-r border-gray-200 bg-white flex flex-col custom-scrollbar overflow-y-auto relative flex-shrink-0"
      style={{ width: `${sidebarWidth}px` }}>
      {/* Resize handle */}
      <div onMouseDown={startResize}
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-20 group hover:bg-blue-400/30 transition-colors">
        <div className="absolute top-1/2 -translate-y-1/2 right-0 w-1 h-8 rounded-full bg-gray-300 group-hover:bg-blue-500 transition-colors" />
      </div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <h3 className="font-semibold text-sm text-gray-900">Filters & Properties</h3>
        <div className="flex items-center gap-1">
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Clear</button>
          )}
          <button onClick={() => setCollapsed(true)} className="p-1 rounded hover:bg-gray-100 text-gray-400 ml-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2.5 border-b border-gray-100">
        <input type="text" placeholder="Search workflows..."
          value={filters.searchQuery}
          onChange={e => onFiltersChange({ ...filters, searchQuery: e.target.value })}
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Status */}
      <Section title="Status" icon={<svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={2} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" /></svg>} defaultOpen={false}
        count={filters.status.length}>
        <div className="px-4 space-y-1">
          {STATUS_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 py-1 cursor-pointer group">
              <input type="checkbox" checked={filters.status.includes(opt.value as any)} onChange={() => toggleStatus(opt.value)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className={`w-2 h-2 rounded-full ${opt.color}`} />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">{opt.label}</span>
            </label>
          ))}
        </div>
      </Section>

      {/* Object Type */}
      {stats?.objectTypes && stats.objectTypes.length > 0 && (
        <Section title="Object Type" icon={<svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>} defaultOpen={false}
          count={filters.objectTypes.length}>
          <div className="px-4 space-y-1">
            {stats.objectTypes.map((type: string) => (
              <label key={type} className="flex items-center gap-2 py-1 cursor-pointer group">
                <input type="checkbox" checked={filters.objectTypes.includes(type)} onChange={() => toggleObjectType(type)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">{type.charAt(0) + type.slice(1).toLowerCase()}</span>
              </label>
            ))}
          </div>
        </Section>
      )}

      {/* Dependency Type */}
      <Section title="Dependencies" icon={<svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" /></svg>} defaultOpen={false}
        count={filters.dependencyTypes.length}>
        <div className="px-4 space-y-1">
          {DEPENDENCY_TYPE_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 py-1 cursor-pointer group">
              <input type="checkbox" checked={filters.dependencyTypes.includes(opt.value)} onChange={() => toggleDependencyType(opt.value)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">{opt.label}</span>
            </label>
          ))}
        </div>
      </Section>

      {/* ═══════ Tags ═══════ */}
      <Section title="Tags" defaultOpen={tags.length > 0}
        count={filters.tags.length}
        icon={<svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>}>
        <ProGate allowed={!canUse || canUse("tagging")} portalId={portalId} feature="Workflow tagging">
        <div className="px-4 space-y-2">
          {tags.length === 0 && !showTagInput && (
            <p className="text-[11px] text-gray-400 italic">No tags yet</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <button key={tag.id} onClick={() => toggleTag(tag.id)}
                className="group flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md transition-all"
                style={{
                  backgroundColor: filters.tags.includes(tag.id) ? tag.color : `${tag.color}15`,
                  color: filters.tags.includes(tag.id) ? "white" : tag.color,
                  border: `1.5px solid ${filters.tags.includes(tag.id) ? tag.color : `${tag.color}30`}`,
                }}>
                {tag.name}
                <span className="text-[9px] opacity-60">{tag._count.workflowTags}</span>
                <span onClick={(e) => { e.stopPropagation(); deleteTag(tag.id); }}
                  className="ml-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-[10px]">×</span>
              </button>
            ))}
          </div>
          {showTagInput ? (
            <div className="flex items-center gap-1.5">
              <input type="text" value={newTagName} onChange={e => setNewTagName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") createTag(); if (e.key === "Escape") { setShowTagInput(false); setNewTagName(""); } }}
                placeholder="Tag name..."
                autoFocus
                className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded-md focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200" />
              <button onClick={createTag} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 px-1.5">Add</button>
              <button onClick={() => { setShowTagInput(false); setNewTagName(""); }} className="text-[10px] text-gray-400 hover:text-gray-600">✕</button>
            </div>
          ) : (
            <button onClick={() => setShowTagInput(true)}
              className="text-[10px] font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:bg-indigo-50 px-1.5 py-0.5 rounded transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              New tag
            </button>
          )}
        </div>
        </ProGate>
      </Section>

      {/* ═══════ Property Impact ═══════ */}
      <div className="flex-1 flex flex-col min-h-0">
        <button onClick={() => setImpactExpanded(!impactExpanded)}
          className="flex items-center justify-between w-full px-4 py-2.5 border-b border-gray-100 hover:bg-gray-50/50 transition-colors flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Property Impact</h4>
            {canUse && !canUse("propertyImpact") && (
              <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1 py-px">⚡ Pro</span>
            )}
            {(!canUse || canUse("propertyImpact")) && conflictCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[9px] font-bold animate-pulse">{conflictCount} conflict{conflictCount > 1 ? "s" : ""}</span>
            )}
          </div>
          <svg className={`w-3 h-3 text-gray-400 transition-transform ${impactExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
          </svg>
        </button>

        {impactExpanded && canUse && !canUse("propertyImpact") && (
          <PropertyImpactLocked portalId={portalId} />
        )}

        {impactExpanded && (!canUse || canUse("propertyImpact")) && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Controls */}
            <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-1 flex-wrap">
                <button onClick={() => setImpactObjectFilter(null)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${!impactObjectFilter ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                  All
                </button>
                {["CONTACT", "DEAL", "COMPANY", "TICKET"].map(ot => (
                  <button key={ot} onClick={() => setImpactObjectFilter(impactObjectFilter === ot ? null : ot)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors"
                    style={impactObjectFilter === ot
                      ? { backgroundColor: OBJ_COLORS[ot].text, color: "white" }
                      : { backgroundColor: OBJ_COLORS[ot].bg, color: OBJ_COLORS[ot].text }}>
                    {OBJ_ICONS[ot]}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <button onClick={() => setShowKeyOnly(!showKeyOnly)}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${showKeyOnly ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                  {showKeyOnly ? "Key" : "All"}
                </button>
                {conflictCount > 0 && (
                  <button onClick={() => setConflictsOnly(!conflictsOnly)}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${conflictsOnly ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500 hover:bg-red-50"}`}>
                    ⚠ Conflicts
                  </button>
                )}
                <span className="text-[10px] text-gray-400 ml-auto">{filteredProps.length}</span>
              </div>
            </div>

            {/* Property list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {impactLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                </div>
              ) : filteredProps.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">No properties found</div>
              ) : (
                [...grouped.entries()].map(([objType, props]) => (
                  <div key={objType}>
                    <div className="px-3 py-1.5 bg-gray-50 sticky top-0 z-10">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: OBJ_COLORS[objType]?.text || "#666" }}>
                        {OBJ_ICONS[objType]} {objType}
                      </span>
                    </div>
                    {props.map(p => {
                      const key = `${p.objectType}:${p.property}`;
                      const conflictKey = `${key}:conflict`;
                      const isSelected = selectedProperty === key || selectedProperty === conflictKey;
                      const activeWriters = p.writers.filter(w => w.status === "ACTIVE");

                      const showConflicts = !canUse || canUse("propertyConflicts");

                      return (
                        <div key={key}>
                          {/* Property row */}
                          <button onClick={() => handlePropertyClick(p)}
                            className={`w-full text-left px-3 py-2 transition-colors border-b border-gray-50 ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                            style={p.hasConflict && showConflicts ? { borderLeft: "3px solid #EF4444" } : {}}>
                            <div className="flex flex-wrap items-start gap-1.5">
                              <span className="text-xs font-medium text-gray-800 flex-1 break-words min-w-0">{p.label}</span>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {p.writers.length > 0 && (
                                  <span className="text-[9px] px-1 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">{p.writers.length}W</span>
                                )}
                                {p.readers.length > 0 && (
                                  <span className="text-[9px] px-1 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">{p.readers.length}R</span>
                                )}
                              </div>
                            </div>

                            {/* Conflict warning - collapsible (Growth+ only) */}
                            {p.hasConflict && showConflicts && (
                              <details className="mt-1.5 rounded-md bg-red-50 border border-red-200 overflow-hidden group/conflict">
                                <summary className="px-2 py-1.5 cursor-pointer list-none flex items-center gap-1.5 hover:bg-red-100/50 transition-colors"
                                  onClick={(e) => e.stopPropagation()}>
                                  <svg className="w-3 h-3 text-red-500 flex-shrink-0 transition-transform group-open/conflict:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                                  </svg>
                                  <svg className="w-3 h-3 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                  </svg>
                                  <span className="text-[10px] font-bold text-red-700">
                                    {activeWriters.length} active workflows write to {p.label}
                                  </span>
                                </summary>
                                <div className="px-2 pb-1.5 border-t border-red-200/50" onClick={(e) => { e.stopPropagation(); handleConflictClick(e, p); }}>
                                  <div className="space-y-1 ml-4 mt-1">
                                    {activeWriters.map(w => (
                                      <div key={w.workflowId} className="flex flex-wrap items-start gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-1" />
                                        <span className="text-[10px] text-red-800 break-words flex-1 min-w-0">{w.name}</span>
                                        {w.value && (
                                          <span className="text-[8px] px-1 py-0.5 rounded bg-red-100 text-red-700 break-words">→ {w.value}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  <p className="text-[9px] text-red-500 mt-1 ml-4 italic cursor-pointer hover:text-red-700">Click to highlight conflicting workflows</p>
                                </div>
                              </details>
                            )}
                          </button>

                          {/* Expanded detail when selected */}
                          {isSelected && (
                            <div className="px-3 py-2 bg-blue-50/50 border-b border-blue-100">
                              {p.writers.length > 0 && (
                                <div className="mb-1.5">
                                  <span className="text-[9px] font-bold text-amber-700 uppercase">Writers</span>
                                  {p.writers.map(w => (
                                    <button key={w.workflowId} onClick={() => onWorkflowClick(w.workflowId)}
                                      className="w-full text-left flex flex-wrap items-start gap-1 py-0.5 hover:bg-blue-100/50 rounded px-1 -mx-1 transition-colors">
                                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${w.status === "ACTIVE" ? "bg-emerald-500" : "bg-gray-400"}`} />
                                      <span className="text-[10px] text-gray-700 break-words flex-1 min-w-0">{w.name}</span>
                                      {w.value && (
                                        <span className="text-[8px] px-1 py-0.5 rounded bg-amber-100 text-amber-800 break-words">→ {w.value}</span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}
                              {p.readers.length > 0 && (
                                <div>
                                  <span className="text-[9px] font-bold text-blue-700 uppercase">Readers</span>
                                  {p.readers.map(r => (
                                    <button key={r.workflowId} onClick={() => onWorkflowClick(r.workflowId)}
                                      className="w-full text-left flex items-start gap-1 py-0.5 hover:bg-blue-100/50 rounded px-1 -mx-1 transition-colors">
                                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${r.status === "ACTIVE" ? "bg-emerald-500" : "bg-gray-400"}`} />
                                      <span className="text-[10px] text-gray-700 break-words min-w-0">{r.name}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PropertyImpactLocked({ portalId }: { portalId: string }) {
  const handleUpgrade = () => {
    window.location.href = `/pricing?portal=${portalId}`;
  };

  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Blurred fake property rows */}
      <div className="px-3 py-2 border-b border-gray-100" style={{ filter: "blur(3px)", opacity: 0.4 }}>
        <div className="flex items-center gap-1 flex-wrap mb-2">
          {["All", "👤", "💰", "🏢", "🎫"].map((l, i) => (
            <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-400">{l}</span>
          ))}
        </div>
      </div>
      <div style={{ filter: "blur(3px)", opacity: 0.35 }}>
        {["👤 CONTACT", "💰 DEAL"].map(group => (
          <div key={group}>
            <div className="px-3 py-1.5 bg-gray-50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{group}</span>
            </div>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="px-3 py-2 border-b border-gray-50 flex items-center gap-2">
                <div className="h-3 rounded bg-gray-200" style={{ width: `${50 + i * 15}%` }} />
                <span className="text-[9px] px-1 py-0.5 rounded bg-gray-100 text-gray-400">{i}W</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[1px] px-6">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
            <span className="text-lg">🎯</span>
          </div>
          <p className="text-sm font-bold text-gray-900 mb-1">Property Impact Analysis</p>
          <p className="text-xs text-gray-500 leading-relaxed mb-4">
            See which workflows read and write to every property. Catch write collisions before they cause issues.
          </p>
          <button onClick={handleUpgrade}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:shadow-md"
            style={{ backgroundColor: "#FF7A59" }}>
            View Plans
          </button>
        </div>
      </div>
    </div>
  );
}
