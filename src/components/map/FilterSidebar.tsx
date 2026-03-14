"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MapFilters } from "@/types";
import ProGate from "@/components/ProGate";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active", color: "bg-emerald-500" },
  { value: "INACTIVE", label: "Inactive", color: "bg-gray-400" },
  { value: "ERRORING", label: "Erroring", color: "bg-red-500" },
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

// ── Consistent section component ──
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
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold leading-none">{count}</span>
          )}
        </div>
        <svg className={`w-3.5 h-3.5 text-gray-300 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

// ── Section icons ──
const IconStatus = <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={2} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" /></svg>;
const IconObject = <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
const IconDeps = <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" /></svg>;
const IconTag = <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>;
const IconProperty = <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;

// ── Checkbox row ──
function FilterRow({ checked, onChange, label, indicator }: {
  checked: boolean; onChange: () => void; label: string; indicator?: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2.5 py-1.5 cursor-pointer group">
      <input type="checkbox" checked={checked} onChange={onChange}
        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5" />
      {indicator}
      <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">{label}</span>
    </label>
  );
}

export default function FilterSidebar({
  filters, onFiltersChange, stats, portalId,
  selectedProperty, onSelectProperty, onWorkflowClick, canUse,
}: FilterSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const isResizing = useRef(false);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      setSidebarWidth(Math.min(480, Math.max(220, startWidth + (e.clientX - startX))));
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

  // Property impact
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
      await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ portalId, action: "create", name: newTagName.trim(), color }) });
      setNewTagName(""); setShowTagInput(false); fetchTags();
    } catch {}
  };

  const deleteTag = async (tagId: string) => {
    try { await fetch(`/api/tags?tagId=${tagId}`, { method: "DELETE" }); onFiltersChange({ ...filters, tags: filters.tags.filter(t => t !== tagId) }); fetchTags(); } catch {}
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
    } catch {}
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

  const handlePropertyClick = (p: PropertyImpact) => {
    const key = `${p.objectType}:${p.property}`;
    if (selectedProperty === key) { onSelectProperty(null, []); }
    else {
      const wfIds = [...new Set([...p.readers.map(r => r.workflowId), ...p.writers.map(w => w.workflowId)])];
      onSelectProperty(key, wfIds);
    }
  };

  const handleConflictClick = (e: React.MouseEvent, p: PropertyImpact) => {
    e.stopPropagation();
    const key = `${p.objectType}:${p.property}:conflict`;
    if (selectedProperty === key) { onSelectProperty(null, []); }
    else {
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

  // ── Collapsed state ──
  if (collapsed) {
    return (
      <div className="w-10 border-r border-gray-200 bg-white flex flex-col items-center pt-3 flex-shrink-0">
        <button onClick={() => setCollapsed(false)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 transition-colors" title="Show filters">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="border-r border-gray-200 bg-white flex flex-col overflow-hidden relative flex-shrink-0"
      style={{ width: `${sidebarWidth}px` }}>

      {/* Resize handle */}
      <div onMouseDown={startResize}
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-20 group hover:bg-blue-400/20 transition-colors">
        <div className="absolute top-1/2 -translate-y-1/2 right-0 w-1 h-8 rounded-full bg-gray-200 group-hover:bg-blue-500 transition-colors" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <span className="text-sm font-semibold text-gray-900">Filters</span>
        <div className="flex items-center gap-1.5">
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors">Clear</button>
          )}
          <button onClick={() => setCollapsed(true)} className="p-1 rounded-md hover:bg-gray-100 text-gray-400 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex-shrink-0">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input type="text" placeholder="Search workflows..."
            value={filters.searchQuery}
            onChange={e => onFiltersChange({ ...filters, searchQuery: e.target.value })}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Scrollable filter sections */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">

        {/* Status */}
        <Section title="Status" icon={IconStatus} defaultOpen={false} count={filters.status.length}>
          <div className="space-y-0.5">
            {STATUS_OPTIONS.map(opt => (
              <FilterRow key={opt.value}
                checked={filters.status.includes(opt.value as any)}
                onChange={() => toggleStatus(opt.value)}
                label={opt.label}
                indicator={<span className={`w-2 h-2 rounded-full ${opt.color} flex-shrink-0`} />}
              />
            ))}
          </div>
        </Section>

        {/* Object Type */}
        {stats?.objectTypes && stats.objectTypes.length > 0 && (
          <Section title="Object Type" icon={IconObject} defaultOpen={false} count={filters.objectTypes.length}>
            <div className="space-y-0.5">
              {stats.objectTypes.map((type: string) => (
                <FilterRow key={type}
                  checked={filters.objectTypes.includes(type)}
                  onChange={() => toggleObjectType(type)}
                  label={type.charAt(0) + type.slice(1).toLowerCase()}
                  indicator={<span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: OBJ_COLORS[type]?.text || "#666" }} />}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Dependencies */}
        <Section title="Dependencies" icon={IconDeps} defaultOpen={false} count={filters.dependencyTypes.length}>
          <div className="space-y-0.5">
            {DEPENDENCY_TYPE_OPTIONS.map(opt => (
              <FilterRow key={opt.value}
                checked={filters.dependencyTypes.includes(opt.value)}
                onChange={() => toggleDependencyType(opt.value)}
                label={opt.label}
                indicator={<span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />}
              />
            ))}
          </div>
        </Section>

        {/* Tags */}
        <Section title="Tags" icon={IconTag} defaultOpen={tags.length > 0} count={filters.tags.length}>
          <ProGate allowed={!canUse || canUse("tagging")} portalId={portalId} feature="Workflow tagging">
            <div className="space-y-2">
              {tags.length === 0 && !showTagInput && (
                <p className="text-xs text-gray-400">No tags yet</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => {
                  const active = filters.tags.includes(tag.id);
                  return (
                    <button key={tag.id} onClick={() => toggleTag(tag.id)}
                      className="group flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-all"
                      style={{
                        backgroundColor: active ? tag.color : `${tag.color}12`,
                        color: active ? "white" : tag.color,
                        border: `1.5px solid ${active ? tag.color : `${tag.color}25`}`,
                      }}>
                      {tag.name}
                      <span className="text-[10px] opacity-50">{tag._count.workflowTags}</span>
                      <span onClick={(e) => { e.stopPropagation(); deleteTag(tag.id); }}
                        className="ml-0.5 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity cursor-pointer">×</span>
                    </button>
                  );
                })}
              </div>
              {showTagInput ? (
                <div className="flex items-center gap-1.5">
                  <input type="text" value={newTagName} onChange={e => setNewTagName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") createTag(); if (e.key === "Escape") { setShowTagInput(false); setNewTagName(""); } }}
                    placeholder="Tag name..." autoFocus
                    className="flex-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                  <button onClick={createTag} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-2">Add</button>
                </div>
              ) : (
                <button onClick={() => setShowTagInput(true)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded-md transition-colors">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                  New tag
                </button>
              )}
            </div>
          </ProGate>
        </Section>

        {/* Property Impact */}
        <div className="border-b border-gray-100">
          <button onClick={() => setImpactExpanded(!impactExpanded)}
            className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-2">
              {IconProperty}
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Property Impact</span>
              {canUse && !canUse("propertyImpact") && (
                <span className="text-[9px] font-bold text-violet-600 bg-violet-50 border border-violet-200 rounded px-1.5 py-0.5 leading-none">Pro</span>
              )}
              {(!canUse || canUse("propertyImpact")) && conflictCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 font-bold leading-none">{conflictCount}</span>
              )}
            </div>
            <svg className={`w-3.5 h-3.5 text-gray-300 transition-transform ${impactExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
            </svg>
          </button>

          {impactExpanded && canUse && !canUse("propertyImpact") && (
            <PropertyImpactLocked portalId={portalId} />
          )}

          {impactExpanded && (!canUse || canUse("propertyImpact")) && (
            <div>
              {/* Controls */}
              <div className="px-4 py-2 border-t border-gray-50">
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { val: null, label: "All" },
                    { val: "CONTACT", label: "Contact" },
                    { val: "DEAL", label: "Deal" },
                    { val: "COMPANY", label: "Company" },
                    { val: "TICKET", label: "Ticket" },
                  ].map(opt => (
                    <button key={opt.label} onClick={() => setImpactObjectFilter(opt.val === impactObjectFilter ? null : opt.val)}
                      className="px-2 py-1 rounded-md text-[10px] font-semibold transition-colors"
                      style={impactObjectFilter === opt.val || (!opt.val && !impactObjectFilter)
                        ? { backgroundColor: opt.val ? OBJ_COLORS[opt.val]?.text || "#333" : "#1F2937", color: "white" }
                        : { backgroundColor: opt.val ? OBJ_COLORS[opt.val]?.bg || "#F3F4F6" : "#F3F4F6", color: opt.val ? OBJ_COLORS[opt.val]?.text || "#666" : "#6B7280" }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <button onClick={() => setShowKeyOnly(!showKeyOnly)}
                    className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-colors ${showKeyOnly ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                    {showKeyOnly ? "Key only" : "All props"}
                  </button>
                  {conflictCount > 0 && (
                    <button onClick={() => setConflictsOnly(!conflictsOnly)}
                      className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-colors ${conflictsOnly ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"}`}>
                      Conflicts
                    </button>
                  )}
                  <span className="text-[10px] text-gray-400 ml-auto tabular-nums">{filteredProps.length} props</span>
                </div>
              </div>

              {/* Property list */}
              <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
                {impactLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                  </div>
                ) : filteredProps.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs">No properties found</div>
                ) : (
                  [...grouped.entries()].map(([objType, props]) => (
                    <div key={objType}>
                      <div className="px-4 py-1.5 bg-gray-50/80 sticky top-0 z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: OBJ_COLORS[objType]?.text || "#666" }}>
                          {objType}
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
                            <button onClick={() => handlePropertyClick(p)}
                              className={`w-full text-left px-4 py-2 transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                              style={p.hasConflict && showConflicts ? { borderLeft: "3px solid #EF4444" } : {}}>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-800 flex-1 truncate">{p.label}</span>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {p.writers.length > 0 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-semibold leading-none">{p.writers.length}W</span>
                                  )}
                                  {p.readers.length > 0 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-semibold leading-none">{p.readers.length}R</span>
                                  )}
                                </div>
                              </div>

                              {p.hasConflict && showConflicts && (
                                <div className="mt-1.5 rounded-md bg-red-50 border border-red-100 p-2"
                                  onClick={(e) => { e.stopPropagation(); handleConflictClick(e, p); }}>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <svg className="w-3 h-3 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <span className="text-[10px] font-semibold text-red-700">{activeWriters.length} active writers</span>
                                  </div>
                                  <div className="space-y-0.5 ml-4">
                                    {activeWriters.slice(0, 3).map(w => (
                                      <div key={w.workflowId} className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                                        <span className="text-[10px] text-red-800 truncate">{w.name}</span>
                                      </div>
                                    ))}
                                    {activeWriters.length > 3 && (
                                      <span className="text-[10px] text-red-500">+{activeWriters.length - 3} more</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </button>

                            {isSelected && (
                              <div className="px-4 py-2 bg-blue-50/50 border-b border-blue-100">
                                {p.writers.length > 0 && (
                                  <div className="mb-2">
                                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Writers</span>
                                    <div className="mt-1 space-y-0.5">
                                      {p.writers.map(w => (
                                        <button key={w.workflowId} onClick={() => onWorkflowClick(w.workflowId)}
                                          className="w-full text-left flex items-center gap-1.5 py-1 hover:bg-blue-100/50 rounded px-1.5 -mx-1.5 transition-colors">
                                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${w.status === "ACTIVE" ? "bg-emerald-500" : "bg-gray-400"}`} />
                                          <span className="text-xs text-gray-700 truncate flex-1">{w.name}</span>
                                          {w.value && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 flex-shrink-0">→ {w.value}</span>}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {p.readers.length > 0 && (
                                  <div>
                                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Readers</span>
                                    <div className="mt-1 space-y-0.5">
                                      {p.readers.map(r => (
                                        <button key={r.workflowId} onClick={() => onWorkflowClick(r.workflowId)}
                                          className="w-full text-left flex items-center gap-1.5 py-1 hover:bg-blue-100/50 rounded px-1.5 -mx-1.5 transition-colors">
                                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.status === "ACTIVE" ? "bg-emerald-500" : "bg-gray-400"}`} />
                                          <span className="text-xs text-gray-700 truncate">{r.name}</span>
                                        </button>
                                      ))}
                                    </div>
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
    </div>
  );
}

function PropertyImpactLocked({ portalId }: { portalId: string }) {
  return (
    <div className="relative overflow-hidden" style={{ height: 280 }}>
      {/* Blurred placeholder */}
      <div style={{ filter: "blur(3px)", opacity: 0.3 }}>
        <div className="px-4 py-2 border-b border-gray-50">
          <div className="flex gap-1">{["All", "Contact", "Deal", "Company"].map(l => <span key={l} className="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-400">{l}</span>)}</div>
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="px-4 py-2 border-b border-gray-50 flex items-center gap-2">
            <div className="h-3 rounded bg-gray-200" style={{ width: `${40 + i * 12}%` }} />
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-300">{i}W</span>
          </div>
        ))}
      </div>

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-[1px] px-6">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
            {IconProperty}
          </div>
          <p className="text-sm font-semibold text-gray-900 mb-1">Property Impact</p>
          <p className="text-xs text-gray-500 leading-relaxed mb-4">See which workflows read and write to every property.</p>
          <a href={`/pricing?portal=${portalId}`}
            className="inline-block px-4 py-2 rounded-lg text-xs font-semibold text-white hover:shadow-md transition-all"
            style={{ backgroundColor: "#FF7A59" }}>
            View Plans
          </a>
        </div>
      </div>
    </div>
  );
}
