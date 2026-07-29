function formatNumber(value, digits = 2) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—';
}

export function formatPngModelAnalysis(payload) {
  const info = payload.analysis;
  const settings = payload.settings;
  const maximumDepth = Number(info.maximumDepth ?? (Number(info.maximumHalfDepth) * 2));
  const averageDepth = Number(info.averageHalfDepth) * 2;
  const configuredEdge = Number(settings.thickness) * Number(settings.edgeDepth ?? 0.03);
  const medianEdge = Number(info.medianBoundaryDepth ?? info.averageBoundaryDepth ?? configuredEdge);
  const p95Edge = Number(info.p95BoundaryDepth ?? info.maximumBoundaryDepth ?? configuredEdge);
  const edgePercent = maximumDepth > 0 ? (medianEdge / maximumDepth) * 100 : 0;
  return [
    'SOURCE',
    `  Image       ${info.sourceWidth} × ${info.sourceHeight}px`,
    `  Crop        ${info.bounds.width} × ${info.bounds.height}px`,
    '',
    'GEOMETRY',
    `  Grid        ${info.columns} × ${info.rows}`,
    `  Cells       ${info.opaqueCells.toLocaleString()} opaque`,
    `  Components  ${info.componentCount ?? 1} kept · ${info.discardedComponentCells ?? info.removedCells ?? 0} cells removed`,
    `  Vertices:   ${info.vertexCount.toLocaleString()}`,
    `  Triangles:  ${info.triangleCount.toLocaleString()}`,
    `  Size        ${formatNumber(info.width)} × ${formatNumber(info.height)} × ${formatNumber(maximumDepth)}`,
    '',
    `Depth:       ${formatNumber(maximumDepth)} maximum · ${formatNumber(Number(info.depthToHeightRatio) * 100, 1)}% of height`,
    `  Profile: ${String(settings.depthProfile).toUpperCase()}`,
    `  Average     ${formatNumber(averageDepth)}`,
    `  Edge        ${formatNumber(medianEdge)} median · ${formatNumber(p95Edge)} p95`,
    `  Edge ratio  ${formatNumber(edgePercent, 1)}% of maximum · ${Math.round(Number(settings.edgeFalloff ?? 0.18) * 100)}% falloff`,
  ].join('\n');
}
