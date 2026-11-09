import * as React from "react";
import { TurnSummaryData } from "@sketchroom/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../design/components/Dialog.js";
import { Badge } from "../../design/components/Badge.js";
import { Trophy } from "lucide-react";

export interface TurnSummaryModalProps {
  isOpen: boolean;
  summary: TurnSummaryData | null;
  timeLeft: number;
}

export function TurnSummaryModal({ isOpen, summary, timeLeft }: TurnSummaryModalProps) {
  if (!isOpen || !summary) return null;

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-md p-6 text-center">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-2xl bg-success-light flex items-center justify-center text-success">
              <Trophy className="w-6 h-6 animate-pulse" />
            </div>
          </div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">The secret word was</p>
          <DialogTitle className="text-3xl font-display font-bold text-primary tracking-wide uppercase mt-1">
            {summary.word}
          </DialogTitle>
        </DialogHeader>

        {/* Score Deltas List */}
        <div className="space-y-2 max-h-56 overflow-y-auto my-4 pr-1">
          {summary.scores.map(({ playerId, playerName, scoreGain, totalScore }) => (
            <div
              key={playerId}
              className="flex items-center justify-between p-3 rounded-2xl bg-surface-2 border border-border/60"
            >
              <div className="flex items-center gap-2">
                <span className="font-display font-semibold text-sm">{playerName}</span>
                {scoreGain > 0 && (
                  <Badge variant="success" className="text-[10px]">
                    +{scoreGain}
                  </Badge>
                )}
              </div>
              <span className="font-display font-bold text-sm text-text-muted">{totalScore} pts</span>
            </div>
          ))}
        </div>

        {/* 8s Countdown Progress Bar */}
        <div className="w-full bg-surface-3 rounded-full h-2 overflow-hidden mt-2">
          <div
            className="bg-primary h-full transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${Math.max(0, Math.min(100, (timeLeft / 8) * 100))}%` }}
          />
        </div>
        <p className="text-xs text-text-muted mt-2">Next turn in {timeLeft}s...</p>
      </DialogContent>
    </Dialog>
  );
}
