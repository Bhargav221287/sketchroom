import * as React from "react";
import { AvatarConfig, PlayerAnimationState } from "@sketchroom/shared";
import { cn } from "../utils.js";
import { Pencil, Moon } from "lucide-react";

export interface AvatarProps {
  config: AvatarConfig;
  size?: "sm" | "md" | "lg" | "xl";
  state?: PlayerAnimationState;
  className?: string;
}

export function Avatar({ config, size = "md", state = "idle", className }: AvatarProps) {
  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-20 h-20",
    xl: "w-32 h-32",
  };

  const renderFace = () => {
    switch (config.faceShape) {
      case "round":
        return <circle cx="50" cy="50" r="38" fill={config.faceColor} stroke="#1E293B" strokeWidth="3" />;
      case "square":
        return <rect x="14" y="14" width="72" height="72" rx="20" fill={config.faceColor} stroke="#1E293B" strokeWidth="3" />;
      case "oval":
        return <ellipse cx="50" cy="50" rx="34" ry="42" fill={config.faceColor} stroke="#1E293B" strokeWidth="3" />;
      case "blob":
      default:
        return (
          <path
            d="M50 12 C72 10 90 28 88 50 C86 72 72 88 50 88 C28 88 12 72 12 50 C12 28 28 14 50 12 Z"
            fill={config.faceColor}
            stroke="#1E293B"
            strokeWidth="3"
          />
        );
    }
  };

  const renderEyes = () => {
    switch (config.eyes) {
      case "happy":
        return (
          <g stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" fill="none">
            <path d="M34 46 Q40 40 46 46" />
            <path d="M54 46 Q60 40 66 46" />
          </g>
        );
      case "winking":
        return (
          <g>
            <circle cx="38" cy="46" r="4.5" fill="#1E293B" />
            <path d="M56 46 Q62 42 68 46" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          </g>
        );
      case "cool":
        return (
          <g fill="#1E293B">
            <rect x="28" y="42" width="18" height="10" rx="3" />
            <rect x="54" y="42" width="18" height="10" rx="3" />
            <line x1="46" y1="46" x2="54" y2="46" stroke="#1E293B" strokeWidth="3" />
          </g>
        );
      case "sleepy":
        return (
          <g stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round">
            <line x1="30" y1="46" x2="44" y2="46" />
            <line x1="56" y1="46" x2="70" y2="46" />
          </g>
        );
      case "star":
        return (
          <g fill="#F59E0B">
            <polygon points="38,38 41,45 48,45 42,49 44,56 38,51 32,56 34,49 28,45 35,45" />
            <polygon points="62,38 65,45 72,45 66,49 68,56 62,51 56,56 58,49 52,45 59,45" />
          </g>
        );
      case "dots":
      default:
        return (
          <g fill="#1E293B">
            <circle cx="38" cy="46" r="4.5" />
            <circle cx="62" cy="46" r="4.5" />
          </g>
        );
    }
  };

  const renderMouth = () => {
    switch (config.mouth) {
      case "grin":
        return (
          <path
            d="M34 60 Q50 78 66 60 Z"
            fill="#FFFFFF"
            stroke="#1E293B"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        );
      case "tongue":
        return (
          <g>
            <path d="M36 60 Q50 72 64 60" stroke="#1E293B" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M46 65 Q50 76 54 65 Z" fill="#EF4444" stroke="#1E293B" strokeWidth="2" />
          </g>
        );
      case "open":
        return (
          <ellipse cx="50" cy="64" rx="8" ry="10" fill="#1E293B" />
        );
      case "neutral":
        return (
          <line x1="38" y1="64" x2="62" y2="64" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
        );
      case "smile":
      default:
        return (
          <path
            d="M36 58 Q50 72 64 58"
            stroke="#1E293B"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
          />
        );
    }
  };

  const renderAccessory = () => {
    switch (config.accessory) {
      case "glasses":
        return (
          <g stroke="#1E293B" strokeWidth="2.5" fill="none">
            <circle cx="38" cy="46" r="10" />
            <circle cx="62" cy="46" r="10" />
            <line x1="48" y1="46" x2="52" y2="46" />
          </g>
        );
      case "sunglasses":
        return (
          <g fill="#0F172A">
            <path d="M26 40 L48 40 L44 54 L30 54 Z" />
            <path d="M52 40 L74 40 L70 54 L56 54 Z" />
            <line x1="48" y1="44" x2="52" y2="44" stroke="#0F172A" strokeWidth="3" />
          </g>
        );
      case "hat":
        return (
          <g fill="#EF4444" stroke="#1E293B" strokeWidth="2.5">
            <ellipse cx="50" cy="22" rx="26" ry="6" />
            <path d="M30 22 C30 8 70 8 70 22 Z" />
          </g>
        );
      case "crown":
        return (
          <polygon
            points="28,24 34,10 50,18 66,10 72,24"
            fill="#F59E0B"
            stroke="#1E293B"
            strokeWidth="2.5"
          />
        );
      case "headband":
        return (
          <path
            d="M16 34 Q50 28 84 34"
            stroke="#10B981"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
        );
      case "mustache":
        return (
          <path
            d="M36 60 Q44 56 50 62 Q56 56 64 60 Q58 68 50 64 Q42 68 36 60 Z"
            fill="#78350F"
          />
        );
      case "none":
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl p-1 shrink-0 transition-transform duration-200 select-none border-2 border-border/80 shadow-sm",
        sizeMap[size],
        state === "correct" && "animate-bounce",
        state === "disconnected" && "opacity-60 grayscale",
        className
      )}
      style={{ backgroundColor: config.bgColor }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        {renderFace()}
        {renderEyes()}
        {renderMouth()}
        {renderAccessory()}
      </svg>

      {/* State Badge Overlays */}
      {state === "drawing" && (
        <span className="absolute -bottom-1 -right-1 bg-primary text-white p-1 rounded-full shadow-md animate-bounce">
          <Pencil className="w-3 h-3" />
        </span>
      )}
      {state === "disconnected" && (
        <span className="absolute -top-1 -right-1 bg-surface-3 text-text-muted p-1 rounded-full shadow-sm">
          <Moon className="w-3 h-3" />
        </span>
      )}
    </div>
  );
}

