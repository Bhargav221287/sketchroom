import React from "react";
import { Player } from "@sketchroom/shared";
import { Avatar } from "../../design/components/Avatar.js";
import { Badge } from "../../design/components/Badge.js";
import { Crown, Pencil, CheckCircle2, Moon } from "lucide-react";
import { cn } from "../../design/utils.js";

export interface ScoreboardProps {
  players: Player[];
  currentDrawerId: string | null;
  myPlayerId: string;
  className?: string;
}

export function Scoreboard({ players, currentDrawerId, myPlayerId, className }: ScoreboardProps) {
  // Sort players by total score descending
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-surface-1 rounded-3xl border-2 border-border shadow-card p-3 space-y-2 overflow-y-auto select-none",
        className
      )}
    >
      <div className="flex items-center justify-between px-2 py-1">
        <span className="font-display font-bold text-xs uppercase tracking-wider text-text-muted">
          Players ({players.length}/10)
        </span>
        <span className="text-[11px] font-semibold text-text-muted">Score</span>
      </div>

      <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
        {sorted.map((player, idx) => {
          const isDrawer = player.id === currentDrawerId;
          const isMe = player.id === myPlayerId;
          const hasGuessed = player.hasGuessed;

          return (
            <div
              key={player.id}
              className={cn(
                "relative flex items-center justify-between p-2.5 rounded-2xl border-2 transition-all duration-300",
                isDrawer
                  ? "border-primary bg-primary-light/40 shadow-sm"
                  : hasGuessed
                  ? "border-success/40 bg-success-light/30"
                  : isMe
                  ? "border-border bg-surface-2"
                  : "border-border/60 bg-surface-1 hover:bg-surface-2/60"
              )}
            >
              {/* Rank, Avatar, Name */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-display font-bold text-xs text-text-muted w-4 shrink-0 text-center">
                  #{idx + 1}
                </span>

                <Avatar
                  config={player.avatar}
                  size="sm"
                  state={
                    player.isDisconnected
                      ? "disconnected"
                      : isDrawer
                      ? "drawing"
                      : hasGuessed
                      ? "correct"
                      : "idle"
                  }
                />

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "font-display font-bold text-xs truncate max-w-[100px] sm:max-w-[120px]",
                        isMe ? "text-primary" : "text-text-primary"
                      )}
                      title={player.nickname}
                    >
                      {player.nickname}
                    </span>
                    {player.isHost && (
                      <span title="Room Host">
                        <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                      </span>
                    )}
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center gap-1 mt-0.5">
                    {isDrawer && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-primary">
                        <Pencil className="w-2.5 h-2.5" /> Drawing
                      </span>
                    )}
                    {hasGuessed && !isDrawer && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-success">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Guessed!
                      </span>
                    )}
                    {player.isDisconnected && (
                      <span className="flex items-center gap-0.5 text-[9px] font-semibold text-text-muted">
                        <Moon className="w-2.5 h-2.5" /> Away
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Score & Round Gain Popup */}
              <div className="flex flex-col items-end shrink-0 pl-2">
                <span className="font-display font-bold text-sm text-text-primary">
                  {player.score}
                </span>
                {player.roundScore > 0 && (
                  <span className="text-[10px] font-bold text-success animate-in fade-in-0 zoom-in-75">
                    +{player.roundScore}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
