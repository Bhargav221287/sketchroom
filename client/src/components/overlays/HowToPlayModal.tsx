import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../design/components/Dialog.js";
import { Paintbrush, MessageSquare, Award, Clock } from "lucide-react";

export interface HowToPlayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HowToPlayModal({ open, onOpenChange }: HowToPlayModalProps) {
  const steps = [
    {
      icon: Paintbrush,
      title: "1. Take Turns Drawing",
      desc: "When it's your turn, pick 1 of 3 words. Use brushes, shapes, and the fill bucket to sketch it before time runs out!",
      color: "text-primary bg-primary-light",
    },
    {
      icon: MessageSquare,
      title: "2. Guess in Chat",
      desc: "When others draw, type your guesses in chat. Correct guesses are kept secret from others. If you're 1 letter off, you'll get a 'You're close!' hint!",
      color: "text-accent bg-pink-100 dark:bg-pink-950/40",
    },
    {
      icon: Clock,
      title: "3. Letter Hints",
      desc: "Stuck? Letter hints appear automatically at 50% and 75% of the round time to nudge you along.",
      color: "text-warning bg-warning-light",
    },
    {
      icon: Award,
      title: "4. Earn Points & Win",
      desc: "The faster you guess, the more points you earn (up to 500!). Drawers earn points for every player who guesses their drawing.",
      color: "text-success bg-success-light",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-bold">How to Play SketchRoom</DialogTitle>
          <DialogDescription>Quick guide to rules, drawing, and scoring</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {steps.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="flex items-start gap-3.5 p-3 rounded-2xl bg-surface-2 border border-border/60">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-bold text-sm text-text-primary">{title}</h4>
                <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

