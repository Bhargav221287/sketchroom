import * as React from "react";
import { CanvasOp, DrawTool, NormalizedPoint, ShapeOp, StrokeOp } from "@sketchroom/shared";
import { floodFill } from "./floodFill.js";
import { cn } from "../../design/utils.js";

export interface DrawingCanvasProps {
  isDrawer: boolean;
  drawerNickname?: string;
  ops: CanvasOp[];
  onEmitOp: (op: CanvasOp) => void;
  onEmitCursorMove: (x: number, y: number) => void;
  currentTool: DrawTool;
  currentColor: string;
  brushSize: number;
  opacity: number;
  remoteCursor?: { x: number; y: number; drawerId: string } | null;
  onSnapshotReady?: (dataUrl: string) => void;
  className?: string;
}

export const DrawingCanvas = React.forwardRef<HTMLCanvasElement, DrawingCanvasProps>(
  (
    {
      isDrawer,
      drawerNickname,
      ops,
      onEmitOp,
      onEmitCursorMove,
      currentTool,
      currentColor,
      brushSize,
      opacity,
      remoteCursor,
      onSnapshotReady,
      className,
    },
    forwardedRef
  ) => {
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const containerRef = React.useRef<HTMLDivElement | null>(null);

    // Active stroke state
    const isDrawingRef = React.useRef(false);
    const strokePointsRef = React.useRef<NormalizedPoint[]>([]);
    const lastBroadcastTimeRef = React.useRef(0);
    const shapeStartRef = React.useRef<NormalizedPoint | null>(null);
    const previewShapeRef = React.useRef<ShapeOp | null>(null);

    // Synchronize forwardedRef
    React.useImperativeHandle(forwardedRef, () => canvasRef.current!);

    // Replay full op log onto canvas context
    const redrawAll = React.useCallback(
      (ctx: CanvasRenderingContext2D, operations: CanvasOp[]) => {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        // Clear canvas to white background
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);

        for (const op of operations) {
          if (op.type === "clear") {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, width, height);
          } else if (op.type === "fill") {
            floodFill(ctx, Math.floor(op.x * width), Math.floor(op.y * height), op.color);
          } else if (op.type === "stroke") {
            drawStroke(ctx, op, width, height);
          } else if (op.type === "shape") {
            drawShape(ctx, op, width, height);
          }
        }
      },
      []
    );

    // Draw smoothed stroke with quadratic Bézier curves
    const drawStroke = (
      ctx: CanvasRenderingContext2D,
      op: StrokeOp,
      width: number,
      height: number
    ) => {
      const pts = op.points;
      if (!pts || pts.length === 0) return;

      ctx.save();
      ctx.globalAlpha = op.opacity ?? 1;
      ctx.lineWidth = Math.max(1, (op.size / 800) * width);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (op.tool === "eraser") {
        ctx.strokeStyle = "#FFFFFF";
      } else {
        ctx.strokeStyle = op.color;
      }

      ctx.beginPath();
      if (pts.length === 1) {
        ctx.arc(pts[0].x * width, pts[0].y * height, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
        ctx.restore();
        return;
      }

      ctx.moveTo(pts[0].x * width, pts[0].y * height);

      for (let i = 1; i < pts.length - 1; i++) {
        const xc = ((pts[i].x + pts[i + 1].x) / 2) * width;
        const yc = ((pts[i].y + pts[i + 1].y) / 2) * height;
        ctx.quadraticCurveTo(pts[i].x * width, pts[i].y * height, xc, yc);
      }

      const last = pts[pts.length - 1];
      ctx.lineTo(last.x * width, last.y * height);
      ctx.stroke();
      ctx.restore();
    };

    // Draw geometric shape (line, rectangle, circle)
    const drawShape = (
      ctx: CanvasRenderingContext2D,
      op: ShapeOp,
      width: number,
      height: number
    ) => {
      ctx.save();
      ctx.globalAlpha = op.opacity ?? 1;
      ctx.lineWidth = Math.max(1, (op.size / 800) * width);
      ctx.strokeStyle = op.color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const x1 = op.start.x * width;
      const y1 = op.start.y * height;
      const x2 = op.end.x * width;
      const y2 = op.end.y * height;

      ctx.beginPath();
      if (op.shape === "line") {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      } else if (op.shape === "rectangle") {
        ctx.strokeRect(
          Math.min(x1, x2),
          Math.min(y1, y2),
          Math.abs(x2 - x1),
          Math.abs(y2 - y1)
        );
      } else if (op.shape === "circle") {
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 2;
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    };

    // Redraw on op log changes
    React.useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      redrawAll(ctx, ops);

      if (previewShapeRef.current) {
        drawShape(ctx, previewShapeRef.current, canvas.width, canvas.height);
      }
    }, [ops, redrawAll]);

    // Handle high-DPI resize
    React.useEffect(() => {
      const handleResize = () => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const rect = container.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);

        const width = Math.floor(rect.width * dpr);
        const height = Math.floor(rect.height * dpr);

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            redrawAll(ctx, ops);
          }
        }
      };

      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, [ops, redrawAll]);

    // Export snapshot helper
    React.useEffect(() => {
      if (onSnapshotReady && canvasRef.current) {
        const dataUrl = canvasRef.current.toDataURL("image/png");
        onSnapshotReady(dataUrl);
      }
    }, [onSnapshotReady]);

    // Convert mouse/touch event to normalized [0, 1] coordinates
    const getNormalizedPos = (e: React.PointerEvent<HTMLCanvasElement>): NormalizedPoint | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      return { x, y, pressure: e.pressure || 0.5 };
    };

    // Pointer handlers
    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawer) return;
      const pos = getNormalizedPos(e);
      if (!pos) return;

      canvasRef.current?.setPointerCapture(e.pointerId);
      isDrawingRef.current = true;

      if (currentTool === "fill") {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        floodFill(ctx, Math.floor(pos.x * canvas.width), Math.floor(pos.y * canvas.height), currentColor);
        onEmitOp({
          type: "fill",
          id: `fill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          x: pos.x,
          y: pos.y,
          color: currentColor,
        });
        isDrawingRef.current = false;
        return;
      }

      if (currentTool === "line" || currentTool === "rectangle" || currentTool === "circle") {
        shapeStartRef.current = pos;
        return;
      }

      // Stroke tool (brush or eraser)
      strokePointsRef.current = [pos];
      lastBroadcastTimeRef.current = Date.now();
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const pos = getNormalizedPos(e);
      if (!pos) return;

      if (isDrawer) {
        // Emit live cursor pointer to spectators
        onEmitCursorMove(pos.x, pos.y);
      }

      if (!isDrawer || !isDrawingRef.current) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      // Shape preview mode
      if (shapeStartRef.current && (currentTool === "line" || currentTool === "rectangle" || currentTool === "circle")) {
        previewShapeRef.current = {
          type: "shape",
          id: "preview",
          shape: currentTool,
          color: currentColor,
          size: brushSize,
          opacity,
          start: shapeStartRef.current,
          end: pos,
        };
        redrawAll(ctx, ops);
        drawShape(ctx, previewShapeRef.current, canvas.width, canvas.height);
        return;
      }

      // Continuous stroke smoothing
      strokePointsRef.current.push(pos);
      const tempOp: StrokeOp = {
        type: "stroke",
        id: "temp",
        tool: currentTool === "eraser" ? "eraser" : "brush",
        color: currentColor,
        size: brushSize,
        opacity,
        points: strokePointsRef.current,
      };

      redrawAll(ctx, ops);
      drawStroke(ctx, tempOp, canvas.width, canvas.height);

      // Batch emission every 30-50ms
      const now = Date.now();
      if (now - lastBroadcastTimeRef.current >= 35) {
        lastBroadcastTimeRef.current = now;
      }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawer || !isDrawingRef.current) return;
      isDrawingRef.current = false;

      const pos = getNormalizedPos(e);
      if (!pos) return;

      // Finish shape placement
      if (shapeStartRef.current && (currentTool === "line" || currentTool === "rectangle" || currentTool === "circle")) {
        const shapeOp: ShapeOp = {
          type: "shape",
          id: `shape-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          shape: currentTool,
          color: currentColor,
          size: brushSize,
          opacity,
          start: shapeStartRef.current,
          end: pos,
        };
        shapeStartRef.current = null;
        previewShapeRef.current = null;
        onEmitOp(shapeOp);
        return;
      }

      // Finish stroke op
      if (strokePointsRef.current.length > 0) {
        strokePointsRef.current.push(pos);
        const finalOp: StrokeOp = {
          type: "stroke",
          id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          tool: currentTool === "eraser" ? "eraser" : "brush",
          color: currentColor,
          size: brushSize,
          opacity,
          points: [...strokePointsRef.current],
        };
        strokePointsRef.current = [];
        onEmitOp(finalOp);
      }
    };

    return (
      <div
        ref={containerRef}
        className={cn(
          "relative w-full aspect-[4/3] rounded-3xl overflow-hidden border-2 border-border shadow-xl bg-white select-none touch-none",
          className
        )}
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--canvas-grid-color) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={cn(
            "w-full h-full block touch-none",
            isDrawer
              ? currentTool === "fill"
                ? "cursor-crosshair"
                : "cursor-crosshair"
              : "cursor-default"
          )}
        />

        {/* Remote Drawer Cursor Pointer (for Spectators) */}
        {!isDrawer && remoteCursor && (
          <div
            className="absolute pointer-events-none transition-all duration-75 ease-out z-20 flex items-center gap-1.5"
            style={{
              left: `${remoteCursor.x * 100}%`,
              top: `${remoteCursor.y * 100}%`,
              transform: "translate(-2px, -2px)",
            }}
          >
            <div className="w-3.5 h-3.5 rounded-full border-2 border-white bg-primary shadow-md animate-pulse" />
            <span className="text-[10px] font-display font-bold bg-primary text-white px-1.5 py-0.5 rounded-md shadow-sm whitespace-nowrap">
              {drawerNickname || "Drawing..."}
            </span>
          </div>
        )}
      </div>
    );
  }
);

DrawingCanvas.displayName = "DrawingCanvas";

