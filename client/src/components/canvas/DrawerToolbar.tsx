import * as React from "react";
import { DrawTool, PALETTE_COLORS } from "@sketchroom/shared";
import { Button } from "../../design/components/Button.js";
import { Slider } from "../../design/components/Slider.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../design/components/Tooltip.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../design/components/Dialog.js";
import {
  Paintbrush,
  Eraser,
  PaintBucket,
  Minus,
  Square,
  Circle,
  Undo2,
  Redo2,
  Trash2,
  Palette,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface DrawerToolbarProps {
  currentTool: DrawTool;
  onSelectTool: (tool: DrawTool) => void;
  currentColor: string;
  onSelectColor: (color: string) => void;
  brushSize: number;
  onChangeBrushSize: (size: number) => void;
  opacity: number;
  onChangeOpacity: (opacity: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo?: boolean;
}

export function DrawerToolbar({
  currentTool,
  onSelectTool,
  currentColor,
  onSelectColor,
  brushSize,
  onChangeBrushSize,
  opacity,
  onChangeOpacity,
  onUndo,
  onRedo,
  onClear,
}: DrawerToolbarProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [clearDialogOpen, setClearDialogOpen] = React.useState(false);
  const colorInputRef = React.useRef<HTMLInputElement>(null);

  // Keyboard shortcuts listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in chat input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "b" || e.key === "B") onSelectTool("brush");
      if (e.key === "e" || e.key === "E") onSelectTool("eraser");
      if (e.key === "g" || e.key === "G") onSelectTool("fill");

      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) onRedo();
        else onUndo();
      }

      if (e.key === "[") {
        onChangeBrushSize(Math.max(2, brushSize - 3));
      }
      if (e.key === "]") {
        onChangeBrushSize(Math.min(40, brushSize + 3));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [brushSize, onChangeBrushSize, onSelectTool, onUndo, onRedo]);

  const tools: Array<{ id: DrawTool; icon: any; label: string; shortcut: string }> = [
    { id: "brush", icon: Paintbrush, label: "Brush", shortcut: "B" },
    { id: "eraser", icon: Eraser, label: "Eraser", shortcut: "E" },
    { id: "fill", icon: PaintBucket, label: "Fill Bucket", shortcut: "G" },
    { id: "line", icon: Minus, label: "Line", shortcut: "" },
    { id: "rectangle", icon: Square, label: "Rectangle", shortcut: "" },
    { id: "circle", icon: Circle, label: "Circle", shortcut: "" },
  ];

  return (
    <div className="w-full flex flex-col items-center">
      {/* Mobile Collapse Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="md:hidden flex items-center gap-1 text-xs font-semibold bg-surface-1 border-2 border-border px-3 py-1 rounded-t-xl text-text-muted hover:text-text-primary mb-[-2px] z-10"
      >
        <span>Drawing Tools</span>
        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>

      {isExpanded && (
        <div className="w-full max-w-3xl rounded-3xl bg-surface-1 border-2 border-border p-3 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3 select-none">
          {/* Tool Selector */}
          <div className="flex items-center gap-1 bg-surface-2 p-1.5 rounded-2xl border border-border/50">
            {tools.map(({ id, icon: Icon, label, shortcut }) => (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSelectTool(id)}
                    className={`p-2 rounded-xl transition-all duration-150 flex items-center justify-center ${
                      currentTool === id
                        ? "bg-primary text-white shadow-tactile-primary"
                        : "text-text-muted hover:text-text-primary hover:bg-surface-3"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {label} {shortcut && `(${shortcut})`}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Color Palette Chips */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-xs">
            {PALETTE_COLORS.map((hex) => (
              <button
                key={hex}
                onClick={() => onSelectColor(hex)}
                style={{ backgroundColor: hex }}
                className={`w-6 h-6 rounded-full border-2 transition-transform duration-100 ${
                  currentColor === hex
                    ? "scale-125 border-primary ring-2 ring-primary/40 shadow-sm"
                    : "border-black/20 hover:scale-110"
                }`}
                title={hex}
              />
            ))}

            {/* Custom Color Picker Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => colorInputRef.current?.click()}
                  className="w-6 h-6 rounded-full bg-gradient-to-tr from-pink-500 via-amber-400 to-cyan-400 border border-border flex items-center justify-center hover:scale-110 transition-transform"
                >
                  <Palette className="w-3 h-3 text-white drop-shadow-sm" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Custom Color</TooltipContent>
            </Tooltip>
            <input
              ref={colorInputRef}
              type="color"
              value={currentColor}
              onChange={(e) => onSelectColor(e.target.value)}
              className="sr-only"
            />
          </div>

          {/* Size & Opacity Controls */}
          <div className="flex items-center gap-4 px-2">
            {/* Live Size Preview */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-surface-2 border border-border flex items-center justify-center shrink-0">
                <div
                  className="rounded-full bg-primary transition-all duration-150"
                  style={{
                    width: Math.min(24, Math.max(3, brushSize * 0.7)),
                    height: Math.min(24, Math.max(3, brushSize * 0.7)),
                  }}
                />
              </div>
              <div className="w-20">
                <Slider
                  value={[brushSize]}
                  onValueChange={([val]) => onChangeBrushSize(val)}
                  min={2}
                  max={36}
                  step={1}
                />
              </div>
            </div>

            {/* Action Buttons: Undo, Redo, Clear */}
            <div className="flex items-center gap-1 border-l border-border pl-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onUndo}
                    className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
                  >
                    <Undo2 className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onRedo}
                    className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
                  >
                    <Redo2 className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
              </Tooltip>

              <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    className="p-2 rounded-xl text-danger hover:bg-danger-light transition-colors"
                    title="Clear Canvas"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Clear the Canvas?</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to clear your current drawing? This cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="secondary" onClick={() => setClearDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        onClear();
                        setClearDialogOpen(false);
                      }}
                    >
                      Yes, Clear Canvas
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
