import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../design/components/Dialog.js";
import { Button } from "../../design/components/Button.js";
import { Pencil, Sparkles, Clock } from "lucide-react";

export interface WordChoiceModalProps {
  isOpen: boolean;
  isDrawer: boolean;
  drawerName?: string;
  wordOptions: [string, string, string] | null;
  onSelectWord: (index: number) => void;
  timeLeft: number;
}

export function WordChoiceModal({
  isOpen,
  isDrawer,
  drawerName = "Drawer",
  wordOptions,
  onSelectWord,
  timeLeft,
}: WordChoiceModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-md p-6 text-center">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center text-primary">
              {isDrawer ? <Sparkles className="w-6 h-6 animate-spin" /> : <Pencil className="w-6 h-6 animate-bounce" />}
            </div>
          </div>
          <DialogTitle className="text-2xl font-display font-bold">
            {isDrawer ? "Choose a Word to Draw!" : `${drawerName} is choosing a word...`}
          </DialogTitle>
        </DialogHeader>

        {/* 15s Countdown Bar */}
        <div className="w-full bg-surface-3 rounded-full h-2.5 overflow-hidden my-3">
          <div
            className="bg-primary h-full transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${Math.max(0, Math.min(100, (timeLeft / 15) * 100))}%` }}
          />
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-text-muted mb-4">
          <Clock className="w-3.5 h-3.5" />
          <span>{timeLeft}s remaining</span>
        </div>

        {isDrawer && wordOptions ? (
          <div className="grid grid-cols-1 gap-3">
            {wordOptions.map((word, idx) => (
              <Button
                key={word}
                variant="secondary"
                size="lg"
                onClick={() => onSelectWord(idx)}
                className="w-full text-lg capitalize font-display font-bold py-5 hover:border-primary hover:bg-primary-light/40 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                {word}
              </Button>
            ))}
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center gap-3">
            <div className="flex gap-2">
              <span className="w-3 h-3 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="w-3 h-3 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="w-3 h-3 rounded-full bg-primary animate-bounce" />
            </div>
            <p className="text-sm text-text-muted">Get your guessing fingers ready!</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

