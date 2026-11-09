import * as React from "react";
import {
  ACCESSORIES,
  AvatarAccessory,
  AvatarConfig,
  AvatarEyes,
  AvatarFaceShape,
  AvatarMouth,
  BG_COLORS,
  EYES,
  FACE_COLORS,
  FACE_SHAPES,
  generateRandomAvatar,
  MOUTHS,
} from "@sketchroom/shared";
import { Avatar } from "../../design/components/Avatar.js";
import { Button } from "../../design/components/Button.js";
import { Dices, ChevronLeft, ChevronRight } from "lucide-react";

export interface AvatarBuilderProps {
  value: AvatarConfig;
  onChange: (avatar: AvatarConfig) => void;
}

export function AvatarBuilder({ value, onChange }: AvatarBuilderProps) {
  const cycleOption = <T,>(list: T[], current: T, direction: 1 | -1): T => {
    const idx = list.indexOf(current);
    const nextIdx = (idx + direction + list.length) % list.length;
    return list[nextIdx];
  };

  const update = (partial: Partial<AvatarConfig>) => {
    onChange({ ...value, ...partial });
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-3xl bg-surface-2 border-2 border-border/80">
      {/* Live Preview & Randomize */}
      <div className="flex flex-col items-center gap-3">
        <Avatar config={value} size="xl" state="idle" />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange(generateRandomAvatar())}
          className="gap-2 text-xs"
        >
          <Dices className="w-4 h-4 text-primary" />
          <span>Randomize</span>
        </Button>
      </div>

      {/* Feature Selectors */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {/* Face Shape */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-text-muted">Shape</span>
          <div className="flex items-center justify-between bg-surface-1 border border-border rounded-xl px-2 py-1">
            <button
              type="button"
              onClick={() => update({ faceShape: cycleOption(FACE_SHAPES, value.faceShape, -1) })}
              className="p-1 hover:text-primary"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-display font-semibold capitalize">{value.faceShape}</span>
            <button
              type="button"
              onClick={() => update({ faceShape: cycleOption(FACE_SHAPES, value.faceShape, 1) })}
              className="p-1 hover:text-primary"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Eyes */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-text-muted">Eyes</span>
          <div className="flex items-center justify-between bg-surface-1 border border-border rounded-xl px-2 py-1">
            <button
              type="button"
              onClick={() => update({ eyes: cycleOption(EYES, value.eyes, -1) })}
              className="p-1 hover:text-primary"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-display font-semibold capitalize">{value.eyes}</span>
            <button
              type="button"
              onClick={() => update({ eyes: cycleOption(EYES, value.eyes, 1) })}
              className="p-1 hover:text-primary"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mouth */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-text-muted">Mouth</span>
          <div className="flex items-center justify-between bg-surface-1 border border-border rounded-xl px-2 py-1">
            <button
              type="button"
              onClick={() => update({ mouth: cycleOption(MOUTHS, value.mouth, -1) })}
              className="p-1 hover:text-primary"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-display font-semibold capitalize">{value.mouth}</span>
            <button
              type="button"
              onClick={() => update({ mouth: cycleOption(MOUTHS, value.mouth, 1) })}
              className="p-1 hover:text-primary"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Accessory */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-text-muted">Accessory</span>
          <div className="flex items-center justify-between bg-surface-1 border border-border rounded-xl px-2 py-1">
            <button
              type="button"
              onClick={() => update({ accessory: cycleOption(ACCESSORIES, value.accessory, -1) })}
              className="p-1 hover:text-primary"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-display font-semibold capitalize">{value.accessory}</span>
            <button
              type="button"
              onClick={() => update({ accessory: cycleOption(ACCESSORIES, value.accessory, 1) })}
              className="p-1 hover:text-primary"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Face Color Palette */}
        <div className="col-span-2 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-text-muted">Skin / Face Color</span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {FACE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => update({ faceColor: color })}
                style={{ backgroundColor: color }}
                className={`w-6 h-6 rounded-full border-2 shrink-0 transition-transform ${
                  value.faceColor === color ? "scale-110 border-primary ring-2 ring-primary/40" : "border-black/20"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Background Color Palette */}
        <div className="col-span-2 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-text-muted">Badge Background</span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {BG_COLORS.map((bg) => (
              <button
                key={bg}
                type="button"
                onClick={() => update({ bgColor: bg })}
                style={{ backgroundColor: bg }}
                className={`w-6 h-6 rounded-full border-2 shrink-0 transition-transform ${
                  value.bgColor === bg ? "scale-110 border-primary ring-2 ring-primary/40" : "border-black/20"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
