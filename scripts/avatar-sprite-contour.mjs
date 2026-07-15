const TAU = Math.PI * 2;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function interpolateMissingRadius(radii, index) {
  const count = radii.length;
  let previousDistance = 1;
  while (previousDistance < count && radii[(index - previousDistance + count) % count] == null) {
    previousDistance += 1;
  }
  let nextDistance = 1;
  while (nextDistance < count && radii[(index + nextDistance) % count] == null) {
    nextDistance += 1;
  }
  if (previousDistance >= count || nextDistance >= count) return 0.5;

  const previous = radii[(index - previousDistance + count) % count];
  const next = radii[(index + nextDistance) % count];
  return previous + ((next - previous) * (previousDistance / (previousDistance + nextDistance)));
}

export function buildStableRadialContour(boundary, crop, pointCount = 28) {
  const count = Math.max(3, Math.floor(pointCount));
  const radii = Array.from({ length: count }, () => null);

  boundary.forEach((point) => {
    const u = (point.x - crop.x) / crop.w;
    const v = (point.y - crop.y) / crop.h;
    const dx = u - 0.5;
    const dy = v - 0.5;
    const angle = Math.atan2(dy, dx);
    const normalizedAngle = (angle + Math.PI) / TAU;
    const bin = Math.min(count - 1, Math.max(0, Math.floor(normalizedAngle * count)));
    const radius = Math.hypot(dx, dy);
    radii[bin] = Math.max(radii[bin] || 0, radius);
  });

  return radii.map((radius, index) => {
    const resolvedRadius = radius == null ? interpolateMissingRadius(radii, index) : radius;
    const angle = -Math.PI + (((index + 0.5) / count) * TAU);
    return [
      Number(clamp01(0.5 + (Math.cos(angle) * resolvedRadius)).toFixed(4)),
      Number(clamp01(0.5 + (Math.sin(angle) * resolvedRadius)).toFixed(4)),
    ];
  });
}

function orientation(a, b, c) {
  return ((b[0] - a[0]) * (c[1] - a[1])) - ((b[1] - a[1]) * (c[0] - a[0]));
}

function segmentsCross(a, b, c, d) {
  const epsilon = 1e-9;
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);
  return ((abC > epsilon && abD < -epsilon) || (abC < -epsilon && abD > epsilon))
    && ((cdA > epsilon && cdB < -epsilon) || (cdA < -epsilon && cdB > epsilon));
}

export function polygonHasSelfIntersections(points) {
  if (!Array.isArray(points) || points.length < 4) return false;
  for (let first = 0; first < points.length; first += 1) {
    const firstNext = (first + 1) % points.length;
    for (let second = first + 1; second < points.length; second += 1) {
      const secondNext = (second + 1) % points.length;
      if (first === second || firstNext === second || secondNext === first) continue;
      if (segmentsCross(points[first], points[firstNext], points[second], points[secondNext])) return true;
    }
  }
  return false;
}
