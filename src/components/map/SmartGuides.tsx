"use client";

import { useViewport } from "reactflow";

interface GuideLine {
  type: "vertical" | "horizontal";
  pos: number;
  from: number;
  to: number;
}

interface SpacingIndicator {
  axis: "x" | "y";       // x = horizontal gap, y = vertical gap
  gap: number;            // the gap size in px
  segments: Array<{       // each segment to draw
    from: number;         // start of gap line
    to: number;           // end of gap line
    cross: number;        // perpendicular position (center of the gap arrow)
    crossFrom: number;    // extent of cross line
    crossTo: number;
  }>;
}

interface NodeBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const SNAP_THRESHOLD = 8;
const SPACING_THRESHOLD = 6;

export function computeSnapAndGuides(
  dragging: NodeBox,
  allNodes: NodeBox[],
): { snapX: number; snapY: number; guides: GuideLine[]; spacing: SpacingIndicator[] } {
  const dL = dragging.x;
  const dR = dL + dragging.w;
  const dCx = dL + dragging.w / 2;
  const dT = dragging.y;
  const dB = dT + dragging.h;
  const dCy = dT + dragging.h / 2;

  const others = allNodes.filter(n => n.id !== dragging.id);

  // Sort by distance, take closest 2 for alignment
  const closest = others
    .map(n => {
      const ncx = n.x + n.w / 2;
      const ncy = n.y + n.h / 2;
      const dist = Math.sqrt((dCx - ncx) ** 2 + (dCy - ncy) ** 2);
      return { node: n, dist };
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 2)
    .map(e => e.node);

  const guides: GuideLine[] = [];
  const spacing: SpacingIndicator[] = [];
  let bestSnapX: { offset: number; dist: number; pos: number; node: NodeBox } | null = null;
  let bestSnapY: { offset: number; dist: number; pos: number; node: NodeBox } | null = null;

  // --- Alignment snap (existing) ---
  for (const n of closest) {
    const nL = n.x; const nR = nL + n.w; const nCx = nL + n.w / 2;
    const nT = n.y; const nB = nT + n.h; const nCy = nT + n.h / 2;

    const vCandidates = [
      { d: dL, t: nL, offset: nL - dL },
      { d: dL, t: nR, offset: nR - dL },
      { d: dR, t: nL, offset: nL - dR },
      { d: dR, t: nR, offset: nR - dR },
      { d: dCx, t: nCx, offset: nCx - dCx },
    ];
    for (const { d, t, offset } of vCandidates) {
      const dist = Math.abs(d - t);
      if (dist < SNAP_THRESHOLD && (!bestSnapX || dist < bestSnapX.dist)) {
        bestSnapX = { offset, dist, pos: t, node: n };
      }
    }

    const hCandidates = [
      { d: dT, t: nT, offset: nT - dT },
      { d: dT, t: nB, offset: nB - dT },
      { d: dB, t: nT, offset: nT - dB },
      { d: dB, t: nB, offset: nB - dB },
      { d: dCy, t: nCy, offset: nCy - dCy },
    ];
    for (const { d, t, offset } of hCandidates) {
      const dist = Math.abs(d - t);
      if (dist < SNAP_THRESHOLD && (!bestSnapY || dist < bestSnapY.dist)) {
        bestSnapY = { offset, dist, pos: t, node: n };
      }
    }
  }

  let snapX = bestSnapX ? dragging.x + bestSnapX.offset : dragging.x;
  let snapY = bestSnapY ? dragging.y + bestSnapY.offset : dragging.y;

  // Alignment guide lines
  if (bestSnapX) {
    const n = bestSnapX.node;
    guides.push({ type: "vertical", pos: bestSnapX.pos, from: Math.min(snapY, n.y) - 30, to: Math.max(snapY + dragging.h, n.y + n.h) + 30 });
  }
  if (bestSnapY) {
    const n = bestSnapY.node;
    guides.push({ type: "horizontal", pos: bestSnapY.pos, from: Math.min(snapX, n.x) - 30, to: Math.max(snapX + dragging.w, n.x + n.w) + 30 });
  }

  // --- Equal spacing detection & snap ---
  // Use snapped position for spacing calcs
  const sL = snapX; const sR = snapX + dragging.w;
  const sT = snapY; const sB = snapY + dragging.h;
  const sCy = snapY + dragging.h / 2;
  const sCx = snapX + dragging.w / 2;

  // Horizontal spacing: find nodes to left and right
  const leftNodes = others.filter(n => n.x + n.w <= sL + SPACING_THRESHOLD).sort((a, b) => (b.x + b.w) - (a.x + a.w));
  const rightNodes = others.filter(n => n.x >= sR - SPACING_THRESHOLD).sort((a, b) => a.x - b.x);

  // Check equal gap: left neighbor gap == right neighbor gap
  if (leftNodes.length > 0 && rightNodes.length > 0) {
    const ln = leftNodes[0];
    const rn = rightNodes[0];
    const gapLeft = sL - (ln.x + ln.w);
    const gapRight = rn.x - sR;

    if (gapLeft > 5 && gapRight > 5 && Math.abs(gapLeft - gapRight) < SPACING_THRESHOLD) {
      // Snap to exact equal spacing
      const avgGap = ((ln.x + ln.w) + rn.x - dragging.w) / 2;
      const idealGap = (rn.x - (ln.x + ln.w) - dragging.w) / 2;
      if (!bestSnapX || Math.abs(sL - avgGap) < Math.abs(bestSnapX.dist)) {
        snapX = avgGap;
      }
      const finalGap = Math.round(idealGap);
      const crossMin = Math.min(ln.y + ln.h / 2, sCy, rn.y + rn.h / 2);
      const crossMax = Math.max(ln.y + ln.h / 2, sCy, rn.y + rn.h / 2);
      spacing.push({
        axis: "x",
        gap: finalGap,
        segments: [
          { from: ln.x + ln.w, to: snapX, cross: (ln.y + ln.h / 2 + sCy) / 2, crossFrom: crossMin - 5, crossTo: crossMax + 5 },
          { from: snapX + dragging.w, to: rn.x, cross: (sCy + rn.y + rn.h / 2) / 2, crossFrom: crossMin - 5, crossTo: crossMax + 5 },
        ],
      });
    }
  }

  // Also check: gap to one side matches an existing gap between two other adjacent nodes
  if (leftNodes.length >= 2 && !spacing.some(s => s.axis === "x")) {
    const ln0 = leftNodes[0];
    const ln1 = leftNodes[1];
    const gapToDrag = sL - (ln0.x + ln0.w);
    const existingGap = ln0.x - (ln1.x + ln1.w);
    if (gapToDrag > 5 && existingGap > 5 && Math.abs(gapToDrag - existingGap) < SPACING_THRESHOLD) {
      snapX = ln0.x + ln0.w + existingGap;
      const finalGap = Math.round(existingGap);
      const crossMin = Math.min(ln1.y + ln1.h / 2, ln0.y + ln0.h / 2, sCy);
      const crossMax = Math.max(ln1.y + ln1.h / 2, ln0.y + ln0.h / 2, sCy);
      spacing.push({
        axis: "x", gap: finalGap,
        segments: [
          { from: ln1.x + ln1.w, to: ln0.x, cross: (ln1.y + ln1.h / 2 + ln0.y + ln0.h / 2) / 2, crossFrom: crossMin - 5, crossTo: crossMax + 5 },
          { from: ln0.x + ln0.w, to: snapX, cross: (ln0.y + ln0.h / 2 + sCy) / 2, crossFrom: crossMin - 5, crossTo: crossMax + 5 },
        ],
      });
    }
  }
  if (rightNodes.length >= 2 && !spacing.some(s => s.axis === "x")) {
    const rn0 = rightNodes[0];
    const rn1 = rightNodes[1];
    const gapToDrag = rn0.x - sR;
    const existingGap = rn1.x - (rn0.x + rn0.w);
    if (gapToDrag > 5 && existingGap > 5 && Math.abs(gapToDrag - existingGap) < SPACING_THRESHOLD) {
      snapX = rn0.x - existingGap - dragging.w;
      const finalGap = Math.round(existingGap);
      const crossMin = Math.min(rn0.y + rn0.h / 2, rn1.y + rn1.h / 2, sCy);
      const crossMax = Math.max(rn0.y + rn0.h / 2, rn1.y + rn1.h / 2, sCy);
      spacing.push({
        axis: "x", gap: finalGap,
        segments: [
          { from: snapX + dragging.w, to: rn0.x, cross: (sCy + rn0.y + rn0.h / 2) / 2, crossFrom: crossMin - 5, crossTo: crossMax + 5 },
          { from: rn0.x + rn0.w, to: rn1.x, cross: (rn0.y + rn0.h / 2 + rn1.y + rn1.h / 2) / 2, crossFrom: crossMin - 5, crossTo: crossMax + 5 },
        ],
      });
    }
  }

  // Vertical spacing: nodes above and below
  const aboveNodes = others.filter(n => n.y + n.h <= sT + SPACING_THRESHOLD).sort((a, b) => (b.y + b.h) - (a.y + a.h));
  const belowNodes = others.filter(n => n.y >= sB - SPACING_THRESHOLD).sort((a, b) => a.y - b.y);

  if (aboveNodes.length > 0 && belowNodes.length > 0) {
    const an = aboveNodes[0];
    const bn = belowNodes[0];
    const gapAbove = sT - (an.y + an.h);
    const gapBelow = bn.y - sB;

    if (gapAbove > 5 && gapBelow > 5 && Math.abs(gapAbove - gapBelow) < SPACING_THRESHOLD) {
      const avgPos = ((an.y + an.h) + bn.y - dragging.h) / 2;
      const idealGap = (bn.y - (an.y + an.h) - dragging.h) / 2;
      if (!bestSnapY || Math.abs(sT - avgPos) < Math.abs(bestSnapY.dist)) {
        snapY = avgPos;
      }
      const finalGap = Math.round(idealGap);
      const crossMin = Math.min(an.x + an.w / 2, sCx, bn.x + bn.w / 2);
      const crossMax = Math.max(an.x + an.w / 2, sCx, bn.x + bn.w / 2);
      spacing.push({
        axis: "y", gap: finalGap,
        segments: [
          { from: an.y + an.h, to: snapY, cross: (an.x + an.w / 2 + sCx) / 2, crossFrom: crossMin - 5, crossTo: crossMax + 5 },
          { from: snapY + dragging.h, to: bn.y, cross: (sCx + bn.x + bn.w / 2) / 2, crossFrom: crossMin - 5, crossTo: crossMax + 5 },
        ],
      });
    }
  }

  if (aboveNodes.length >= 2 && !spacing.some(s => s.axis === "y")) {
    const an0 = aboveNodes[0]; const an1 = aboveNodes[1];
    const gapToDrag = sT - (an0.y + an0.h);
    const existingGap = an0.y - (an1.y + an1.h);
    if (gapToDrag > 5 && existingGap > 5 && Math.abs(gapToDrag - existingGap) < SPACING_THRESHOLD) {
      snapY = an0.y + an0.h + existingGap;
      const finalGap = Math.round(existingGap);
      const crossMin = Math.min(an1.x + an1.w / 2, an0.x + an0.w / 2, sCx);
      const crossMax = Math.max(an1.x + an1.w / 2, an0.x + an0.w / 2, sCx);
      spacing.push({
        axis: "y", gap: finalGap,
        segments: [
          { from: an1.y + an1.h, to: an0.y, cross: (an1.x + an1.w / 2 + an0.x + an0.w / 2) / 2, crossFrom: crossMin - 5, crossTo: crossMax + 5 },
          { from: an0.y + an0.h, to: snapY, cross: (an0.x + an0.w / 2 + sCx) / 2, crossFrom: crossMin - 5, crossTo: crossMax + 5 },
        ],
      });
    }
  }
  if (belowNodes.length >= 2 && !spacing.some(s => s.axis === "y")) {
    const bn0 = belowNodes[0]; const bn1 = belowNodes[1];
    const gapToDrag = bn0.y - sB;
    const existingGap = bn1.y - (bn0.y + bn0.h);
    if (gapToDrag > 5 && existingGap > 5 && Math.abs(gapToDrag - existingGap) < SPACING_THRESHOLD) {
      snapY = bn0.y - existingGap - dragging.h;
      const finalGap = Math.round(existingGap);
      const crossMin = Math.min(bn0.x + bn0.w / 2, bn1.x + bn1.w / 2, sCx);
      const crossMax = Math.max(bn0.x + bn0.w / 2, bn1.x + bn1.w / 2, sCx);
      spacing.push({
        axis: "y", gap: finalGap,
        segments: [
          { from: snapY + dragging.h, to: bn0.y, cross: (sCx + bn0.x + bn0.w / 2) / 2, crossFrom: crossMin - 5, crossTo: crossMax + 5 },
          { from: bn0.y + bn0.h, to: bn1.y, cross: (bn0.x + bn0.w / 2 + bn1.x + bn1.w / 2) / 2, crossFrom: crossMin - 5, crossTo: crossMax + 5 },
        ],
      });
    }
  }

  return { snapX, snapY, guides, spacing };
}

// --- Rendering ---

export function SmartGuideLines({ guides, spacing }: { guides: GuideLine[]; spacing?: SpacingIndicator[] }) {
  const { x, y, zoom } = useViewport();

  if (guides.length === 0 && (!spacing || spacing.length === 0)) return null;

  return (
    <svg
      style={{
        position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 5, overflow: "visible",
      }}
    >
      <g transform={`translate(${x}, ${y}) scale(${zoom})`}>
        {/* Alignment guides */}
        {guides.map((g, i) => (
          g.type === "vertical" ? (
            <line key={`v-${i}`} x1={g.pos} y1={g.from} x2={g.pos} y2={g.to}
              stroke="#6366f1" strokeWidth={1 / zoom} strokeDasharray={`${4 / zoom} ${3 / zoom}`} opacity={0.8} />
          ) : (
            <line key={`h-${i}`} x1={g.from} y1={g.pos} x2={g.to} y2={g.pos}
              stroke="#6366f1" strokeWidth={1 / zoom} strokeDasharray={`${4 / zoom} ${3 / zoom}`} opacity={0.8} />
          )
        ))}

        {/* Spacing indicators */}
        {spacing?.map((sp, si) => (
          sp.segments.map((seg, segi) => {
            const mid = (seg.from + seg.to) / 2;
            const sw = 1.2 / zoom;
            const arrowSize = 4 / zoom;
            const fontSize = 10 / zoom;

            if (sp.axis === "x") {
              // Horizontal gap: vertical arrow lines at seg.cross height
              return (
                <g key={`sp-${si}-${segi}`}>
                  {/* Gap line */}
                  <line x1={seg.from} y1={seg.cross} x2={seg.to} y2={seg.cross}
                    stroke="#F43F5E" strokeWidth={sw} />
                  {/* Left arrow */}
                  <line x1={seg.from} y1={seg.cross - arrowSize} x2={seg.from} y2={seg.cross + arrowSize}
                    stroke="#F43F5E" strokeWidth={sw} />
                  {/* Right arrow */}
                  <line x1={seg.to} y1={seg.cross - arrowSize} x2={seg.to} y2={seg.cross + arrowSize}
                    stroke="#F43F5E" strokeWidth={sw} />
                  {/* Label */}
                  <rect x={mid - 12 / zoom} y={seg.cross - 8 / zoom} width={24 / zoom} height={14 / zoom}
                    rx={3 / zoom} fill="#F43F5E" opacity={0.9} />
                  <text x={mid} y={seg.cross + 3 / zoom} textAnchor="middle"
                    fill="white" fontSize={fontSize} fontWeight="600" fontFamily="system-ui">
                    {sp.gap}
                  </text>
                </g>
              );
            } else {
              // Vertical gap: horizontal arrow lines at seg.cross x
              return (
                <g key={`sp-${si}-${segi}`}>
                  <line x1={seg.cross} y1={seg.from} x2={seg.cross} y2={seg.to}
                    stroke="#F43F5E" strokeWidth={sw} />
                  <line x1={seg.cross - arrowSize} y1={seg.from} x2={seg.cross + arrowSize} y2={seg.from}
                    stroke="#F43F5E" strokeWidth={sw} />
                  <line x1={seg.cross - arrowSize} y1={seg.to} x2={seg.cross + arrowSize} y2={seg.to}
                    stroke="#F43F5E" strokeWidth={sw} />
                  <rect x={seg.cross - 12 / zoom} y={mid - 8 / zoom} width={24 / zoom} height={14 / zoom}
                    rx={3 / zoom} fill="#F43F5E" opacity={0.9} />
                  <text x={seg.cross} y={mid + 3 / zoom} textAnchor="middle"
                    fill="white" fontSize={fontSize} fontWeight="600" fontFamily="system-ui">
                    {sp.gap}
                  </text>
                </g>
              );
            }
          })
        ))}
      </g>
    </svg>
  );
}
