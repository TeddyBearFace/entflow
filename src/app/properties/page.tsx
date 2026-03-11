"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";

interface WorkflowRef { workflowId: string; name: string; status: string; hubspotFlowId: string; value?: string }
interface PropertyImpact {
  property: string; label: string; objectType: string; critical: boolean;
  readers: WorkflowRef[]; writers: WorkflowRef[]; totalWorkflows: number; hasConflict: boolean;
}

const OBJ_ICONS: Record<string, string> = { CONTACT: "👤", DEAL: "💰", COMPANY: "🏢", TICKET: "🎫" };
const OBJ_COLORS: Record<string, string> = { CONTACT: "#2E75B6", DEAL: "#27AE60", COMPANY: "#8E44AD", TICKET: "#E67E22" };

export default function PropertiesPage() {
  const searchParams = useSearchParams();
  const portalId = searchParams.get("portal") || "";
  const [properties, setProperties] = useState<PropertyImpact[]>([]);
  const [loading, setLoading] = useState(true);
  const [objectFilter, setObjectFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAllProps, setShowAllProps] = useState(false);

  useEffect(() => {
    if (!portalId) return;
    setLoading(true);
    const params = new URLSearchParams({ portalId });
    if (objectFilter) params.set("objectType", objectFilter);
    fetch(`/api/property-impact?${params}`).then(r => r.json()).then(data => {
      setProperties(data.properties || []);
      setLoading(false);
    });
  }, [portalId, objectFilter]);

  const objectTypes = [...new Set(properties.map(p => p.objectType))];
  const filtered = showAllProps ? properties : properties.filter(p => p.critical || p.totalWorkflows > 0);
  const grouped = new Map<string, PropertyImpact[]>();
  for (const p of filtered) {
    if (!grouped.has(p.objectType)) grouped.set(p.objectType, []);
    grouped.get(p.objectType)!.push(p);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar portalId={portalId} />
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Property Impact Map</h2>
            <p className="text-xs text-gray-500 mt-0.5">{filtered.length} properties tracked across your workflows</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={objectFilter} onChange={e => setObjectFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
              <option value="">All object types</option>
              {objectTypes.map(ot => <option key={ot} value={ot}>{OBJ_ICONS[ot]} {ot.toLowerCase()}</option>)}
            </select>
            <button onClick={() => setShowAllProps(!showAllProps)} className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${showAllProps ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-600"}`}>
              {showAllProps ? "Key only" : "Show all"}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div>
        ) : (
          <div className="space-y-8">
            {[...grouped.entries()].map(([objectType, props]) => (
              <div key={objectType}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{OBJ_ICONS[objectType]}</span>
                  <h2 className="text-lg font-bold text-gray-900">{objectType.charAt(0) + objectType.slice(1).toLowerCase()} Properties</h2>
                  <span className="text-sm text-gray-400">{props.length}</span>
                </div>
                <div className="grid gap-3">
                  {props.map(prop => {
                    const key = `${prop.objectType}:${prop.property}`;
                    const isExpanded = expanded.has(key);
                    const activeWriters = prop.writers.filter(w => w.status === "ACTIVE");
                    const color = OBJ_COLORS[prop.objectType] || "#95A5A6";

                    return (
                      <div key={key} className={`bg-white rounded-xl border overflow-hidden transition-shadow hover:shadow-sm ${prop.hasConflict ? "border-red-200" : "border-gray-200"}`}>
                        <button onClick={() => setExpanded(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; })}
                          className="w-full text-left px-4 py-3 flex items-center gap-3">
                          <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">{prop.label}</span>
                              {prop.critical && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">KEY</span>}
                              {prop.hasConflict && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 font-bold border border-red-200">⚠ CONFLICT</span>}
                            </div>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">{prop.property}</p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {prop.writers.length > 0 && (
                              <span className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium">
                                ✏️ {prop.writers.length} writer{prop.writers.length !== 1 ? "s" : ""}
                              </span>
                            )}
                            {prop.readers.length > 0 && (
                              <span className="text-xs px-2 py-1 rounded-lg bg-gray-50 text-gray-600 font-medium">
                                👁️ {prop.readers.length} reader{prop.readers.length !== 1 ? "s" : ""}
                              </span>
                            )}
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-3 border-t border-gray-100">
                            {activeWriters.length > 1 && (
                              <div className="mt-2 mb-3 p-2 rounded-lg bg-red-50 border border-red-100">
                                <p className="text-xs text-red-700 font-medium">⚠️ {activeWriters.length} active workflows write to this property — potential conflict!</p>
                              </div>
                            )}
                            {prop.writers.length > 0 && (
                              <div className="mt-2">
                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1.5">Writers</p>
                                <div className="space-y-1">{prop.writers.map(w => (
                                  <Link key={w.workflowId} href={`/map?portal=${portalId}`} className="flex items-center gap-2 text-xs p-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                                    <span className={`w-1.5 h-1.5 rounded-full ${w.status === "ACTIVE" ? "bg-emerald-400" : "bg-gray-300"}`}/>
                                    <span className="font-medium text-gray-700 flex-1">{w.name}</span>
                                    {w.value && <span className="text-gray-400 font-mono text-[10px] truncate max-w-[150px]">→ {w.value}</span>}
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${w.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{w.status.toLowerCase()}</span>
                                  </Link>
                                ))}</div>
                              </div>
                            )}
                            {prop.readers.length > 0 && (
                              <div className="mt-3">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Readers (enrollment triggers)</p>
                                <div className="space-y-1">{prop.readers.map(r => (
                                  <Link key={r.workflowId} href={`/map?portal=${portalId}`} className="flex items-center gap-2 text-xs p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                                    <span className={`w-1.5 h-1.5 rounded-full ${r.status === "ACTIVE" ? "bg-emerald-400" : "bg-gray-300"}`}/>
                                    <span className="font-medium text-gray-700 flex-1">{r.name}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${r.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{r.status.toLowerCase()}</span>
                                  </Link>
                                ))}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
