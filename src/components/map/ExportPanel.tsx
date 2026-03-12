"use client";

import { useState, useCallback } from "react";
import { useReactFlow, getRectOfNodes } from "reactflow";

interface ExportPanelProps {
  portalId: string;
  portalName?: string;
  canUseAdvancedExport?: boolean;
}

export default function ExportPanel({ portalId, portalName, canUseAdvancedExport = true }: ExportPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const reactFlow = useReactFlow();

  const getCanvasElement = (): HTMLElement | null => {
    return document.querySelector(".react-flow__viewport") as HTMLElement;
  };

  // --- PNG Export (for Miro) ---
  const exportPNG = useCallback(async () => {
    setExporting("png");
    try {
      const { toBlob } = await import("html-to-image");
      const viewport = getCanvasElement();
      if (!viewport) throw new Error("Canvas not found");

      // Get the bounding box of all nodes for proper sizing
      const nodes = reactFlow.getNodes();
      if (nodes.length === 0) throw new Error("No nodes to export");
      const nodesBounds = getRectOfNodes(nodes);

      const padding = 80;
      const width = nodesBounds.width + padding * 2;
      const height = nodesBounds.height + padding * 2;

      const blob = await toBlob(viewport, {
        backgroundColor: "#f9fafb",
        width,
        height,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${-nodesBounds.x + padding}px, ${-nodesBounds.y + padding}px)`,
        },
        pixelRatio: 2,
      });

      if (!blob) throw new Error("Failed to generate image");
      downloadBlob(blob, `workflow-map-${formatDate()}.png`);
    } catch (err) {
      console.error("PNG export failed:", err);
      alert("Export failed. Try zooming to fit all nodes first.");
    } finally {
      setExporting(null);
    }
  }, [reactFlow]);

  // --- SVG Export (for Figma) ---
  const exportSVG = useCallback(async () => {
    setExporting("svg");
    try {
      const { toSvg } = await import("html-to-image");
      const viewport = getCanvasElement();
      if (!viewport) throw new Error("Canvas not found");

      const nodes = reactFlow.getNodes();
      if (nodes.length === 0) throw new Error("No nodes to export");
      const nodesBounds = getRectOfNodes(nodes);

      const padding = 80;
      const width = nodesBounds.width + padding * 2;
      const height = nodesBounds.height + padding * 2;

      const svgDataUrl = await toSvg(viewport, {
        backgroundColor: "#f9fafb",
        width,
        height,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${-nodesBounds.x + padding}px, ${-nodesBounds.y + padding}px)`,
        },
      });

      // Convert data URL to SVG string
      const svgString = decodeURIComponent(svgDataUrl.split(",")[1]);
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      downloadBlob(blob, `workflow-map-${formatDate()}.svg`);
    } catch (err) {
      console.error("SVG export failed:", err);
      alert("Export failed. Try zooming to fit all nodes first.");
    } finally {
      setExporting(null);
    }
  }, [reactFlow]);

  // --- PDF Export ---
  const exportPDF = useCallback(async () => {
    setExporting("pdf");
    try {
      const { toBlob } = await import("html-to-image");
      const { default: jsPDF } = await import("jspdf");
      const viewport = getCanvasElement();
      if (!viewport) throw new Error("Canvas not found");

      const nodes = reactFlow.getNodes();
      if (nodes.length === 0) throw new Error("No nodes to export");
      const nodesBounds = getRectOfNodes(nodes);

      const padding = 80;
      const width = nodesBounds.width + padding * 2;
      const height = nodesBounds.height + padding * 2;

      // Generate high-res image
      const blob = await toBlob(viewport, {
        backgroundColor: "#ffffff",
        width,
        height,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${-nodesBounds.x + padding}px, ${-nodesBounds.y + padding}px)`,
        },
        pixelRatio: 2,
      });

      if (!blob) throw new Error("Failed to generate image");

      // Convert blob to data URL for jsPDF
      const imageUrl = await blobToDataUrl(blob);

      // Create PDF - landscape, sized to content
      const pdfWidth = Math.max(width * 0.75, 842); // min A4 landscape width in points
      const pdfHeight = (pdfWidth / width) * height;

      const orientation = width > height ? "landscape" : "portrait";
      const pdf = new jsPDF({
        orientation,
        unit: "pt",
        format: [pdfWidth, pdfHeight + 80],
      });

      // Title
      pdf.setFontSize(18);
      pdf.setTextColor(27, 42, 74); // navy
      pdf.text(`Workflow Map${portalName ? ` — ${portalName}` : ""}`, 40, 40);

      // Subtitle
      pdf.setFontSize(10);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Exported ${new Date().toLocaleDateString()} · ${nodes.length} nodes`, 40, 58);

      // Map image
      pdf.addImage(imageUrl, "PNG", 0, 70, pdfWidth, pdfHeight);

      pdf.save(`workflow-map-${formatDate()}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Export failed. Try zooming to fit all nodes first.");
    } finally {
      setExporting(null);
    }
  }, [reactFlow, portalName]);

  // --- CSV Export ---
  const exportCSV = useCallback(async () => {
    setExporting("csv");
    try {
      const res = await fetch(`/api/workflows?portalId=${portalId}`);
      if (!res.ok) throw new Error("Failed to fetch workflow data");
      const { workflows } = await res.json();

      const headers = ["Name", "Status", "Object Type", "Actions", "Dependencies", "Conflicts"];
      const rows = workflows.map((wf: any) => [
        `"${wf.name.replace(/"/g, '""')}"`,
        wf.status,
        wf.objectType,
        wf.actionCount,
        (wf._count?.sourceDependencies || 0) + (wf._count?.targetDependencies || 0),
        wf._count?.conflictWorkflows || 0,
      ]);

      const csv = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      downloadBlob(blob, `workflow-data-${formatDate()}.csv`);
    } catch (err) {
      console.error("CSV export failed:", err);
      alert("CSV export failed.");
    } finally {
      setExporting(null);
    }
  }, [portalId]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-2 z-50 bg-white rounded-xl border border-gray-200 shadow-lg w-[280px] overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Export Map</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Choose a format for your workflow map
              </p>
            </div>

            <div className="p-2">
              {/* PDF */}
              <ExportOption
                icon="📄"
                title="PDF Document"
                description={canUseAdvancedExport ? "High-quality PDF for presentations and reports" : "Pro plan — upgrade to unlock"}
                onClick={exportPDF}
                loading={exporting === "pdf"}
                disabled={!!exporting || !canUseAdvancedExport}
                locked={!canUseAdvancedExport}
              />

              {/* SVG for Figma */}
              <ExportOption
                icon={
                  <svg viewBox="0 0 38 57" className="w-4 h-5" fill="currentColor">
                    <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" fill="#1ABCFE" />
                    <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z" fill="#0ACF83" />
                    <path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" fill="#FF7262" />
                    <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" fill="#F24E1E" />
                    <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" fill="#A259FF" />
                  </svg>
                }
                title="SVG for Figma"
                description={canUseAdvancedExport ? "Import directly into Figma via File → Place Image" : "Pro plan — upgrade to unlock"}
                onClick={exportSVG}
                loading={exporting === "svg"}
                disabled={!!exporting || !canUseAdvancedExport}
                locked={!canUseAdvancedExport}
              />

              {/* PNG for Miro */}
              <ExportOption
                icon="🟡"
                title="PNG for Miro"
                description="High-res image — drag onto any Miro board"
                onClick={exportPNG}
                loading={exporting === "png"}
                disabled={!!exporting}
              />

              <div className="my-1 border-t border-gray-100" />

              {/* CSV */}
              <ExportOption
                icon="📊"
                title="CSV Data Export"
                description="Workflow data as a spreadsheet"
                onClick={exportCSV}
                loading={exporting === "csv"}
                disabled={!!exporting}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// --- Subcomponents ---

function ExportOption({
  icon,
  title,
  description,
  onClick,
  loading,
  disabled,
  locked,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  locked?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 ${locked ? "opacity-40" : ""}`}
    >
      <span className="text-lg flex-shrink-0 mt-0.5">
        {typeof icon === "string" ? icon : icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
          {title}
          {locked && <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1 py-px">⚡ Pro</span>}
        </p>
        <p className="text-[10px] text-gray-400 leading-relaxed">{description}</p>
      </div>
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 flex-shrink-0 mt-1" />
      )}
    </button>
  );
}

// --- Helpers ---

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function formatDate(): string {
  return new Date().toISOString().split("T")[0];
}
