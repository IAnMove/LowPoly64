const PAINT_CANVAS_EVENTS = [
  ['mousedown', 'onStart'],
  ['mousemove', 'onMove'],
  ['mouseup', 'onEnd'],
  ['mouseleave', 'onEnd'],
];

export function bindPaintCanvasEvents(canvas, {
  onStart = () => {},
  onMove = () => {},
  onEnd = () => {},
} = {}) {
  const handlers = {
    onStart,
    onMove,
    onEnd,
  };
  PAINT_CANVAS_EVENTS.forEach(([eventName, handlerName]) => {
    canvas.addEventListener(eventName, handlers[handlerName]);
  });

  return () => {
    PAINT_CANVAS_EVENTS.forEach(([eventName, handlerName]) => {
      canvas.removeEventListener(eventName, handlers[handlerName]);
    });
  };
}
