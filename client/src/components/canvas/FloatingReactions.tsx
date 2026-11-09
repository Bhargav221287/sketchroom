import React from "react";

export interface ActiveReaction {
  id: string;
  emoji: string;
  x: number;
  y: number;
  playerName: string;
}

export function FloatingReactions({ reactions }: { reactions: ActiveReaction[] }) {
  if (reactions.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute flex flex-col items-center animate-float"
          style={{
            left: `${r.x * 100}%`,
            top: `${r.y * 100}%`,
            animation: "reactionRise 2.5s ease-out forwards",
          }}
        >
          <span className="text-3xl filter drop-shadow-md select-none">{r.emoji}</span>
          <span className="text-[10px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded-full backdrop-blur-sm">
            {r.playerName}
          </span>
        </div>
      ))}
      <style>{`
        @keyframes reactionRise {
          0% {
            opacity: 1;
            transform: translate(-50%, 0) scale(0.8);
          }
          50% {
            transform: translate(-50%, -60px) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -130px) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
