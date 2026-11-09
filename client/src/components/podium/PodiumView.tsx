import * as React from "react";
import { PodiumPlayer, TurnSnapshot } from "@sketchroom/shared";
import { Avatar } from "../../design/components/Avatar.js";
import { Button } from "../../design/components/Button.js";
import { Card, CardContent } from "../../design/components/Card.js";
import { Crown, Download, RotateCcw, Image as ImageIcon } from "lucide-react";
import JSZip from "jszip";

export interface PodiumViewProps {
  podium: PodiumPlayer[];
  snapshots: TurnSnapshot[];
  isHost: boolean;
  onPlayAgain: () => void;
}

export function PodiumView({ podium, snapshots, isHost, onPlayAgain }: PodiumViewProps) {
  const [downloadingZip, setDownloadingZip] = React.useState(false);

  // Top 3 players
  const first = podium.find((p) => p.rank === 1)?.player;
  const second = podium.find((p) => p.rank === 2)?.player;
  const third = podium.find((p) => p.rank === 3)?.player;

  // Download all canvas snapshots as a ZIP file
  const handleDownloadAllZip = async () => {
    if (snapshots.length === 0) return;
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      snapshots.forEach((snap, idx) => {
        const base64Data = snap.dataUrl.replace(/^data:image\/png;base64,/, "");
        zip.file(
          `sketchroom-round${snap.round}-turn${snap.turn}-${snap.word.replace(/\s+/g, "_")}.png`,
          base64Data,
          { base64: true }
        );
      });
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sketchroom-art-gallery-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to generate zip", e);
    } finally {
      setDownloadingZip(false);
    }
  };

  const downloadSingleImage = (snapshot: TurnSnapshot) => {
    const a = document.createElement("a");
    a.href = snapshot.dataUrl;
    a.download = `sketchroom-${snapshot.word}.png`;
    a.click();
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-10 py-6 animate-in fade-in-0 slide-in-from-bottom-4">
      {/* Victory Title */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-primary tracking-tight">
          🎉 Victory Podium! 🎉
        </h1>
        <p className="text-text-muted text-sm">What a game! Here are our champion doodlers.</p>
      </div>

      {/* 3D Animated Pedestals */}
      <div className="flex items-end justify-center gap-4 sm:gap-6 pt-12 pb-4">
        {/* 2nd Place */}
        {second && (
          <div className="flex flex-col items-center gap-2 flex-1 max-w-[160px] animate-in slide-in-from-bottom-8 duration-500">
            <span className="text-xl">🥈</span>
            <Avatar config={second.avatar} size="lg" state="idle" />
            <span className="font-display font-bold text-sm truncate max-w-[120px] text-center">
              {second.nickname}
            </span>
            <span className="text-xs font-semibold text-text-muted">{second.score} pts</span>
            <div className="w-full h-32 rounded-t-3xl bg-surface-3 border-2 border-border border-b-0 flex items-center justify-center font-display font-bold text-3xl text-text-muted shadow-md">
              2
            </div>
          </div>
        )}

        {/* 1st Place (Champion) */}
        {first && (
          <div className="flex flex-col items-center gap-2 flex-1 max-w-[180px] animate-in slide-in-from-bottom-12 duration-700">
            <Crown className="w-10 h-10 text-amber-400 fill-amber-400 animate-bounce" />
            <Avatar config={first.avatar} size="xl" state="correct" />
            <span className="font-display font-bold text-base text-primary truncate max-w-[140px] text-center">
              {first.nickname}
            </span>
            <span className="text-sm font-bold text-text-primary">{first.score} pts</span>
            <div className="w-full h-44 rounded-t-3xl bg-amber-400/20 border-2 border-amber-400 border-b-0 flex items-center justify-center font-display font-bold text-4xl text-amber-500 shadow-xl">
              1
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {third && (
          <div className="flex flex-col items-center gap-2 flex-1 max-w-[160px] animate-in slide-in-from-bottom-6 duration-300">
            <span className="text-xl">🥉</span>
            <Avatar config={third.avatar} size="lg" state="idle" />
            <span className="font-display font-bold text-sm truncate max-w-[120px] text-center">
              {third.nickname}
            </span>
            <span className="text-xs font-semibold text-text-muted">{third.score} pts</span>
            <div className="w-full h-24 rounded-t-3xl bg-surface-2 border-2 border-border border-b-0 flex items-center justify-center font-display font-bold text-2xl text-text-muted shadow-sm">
              3
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {isHost ? (
          <Button variant="primary" size="lg" onClick={onPlayAgain} className="gap-2 text-base">
            <RotateCcw className="w-5 h-5" />
            <span>Play Again</span>
          </Button>
        ) : (
          <p className="text-xs font-semibold text-text-muted">Waiting for host to start another game...</p>
        )}

        {snapshots.length > 0 && (
          <Button
            variant="secondary"
            size="lg"
            onClick={handleDownloadAllZip}
            isLoading={downloadingZip}
            className="gap-2 text-base"
          >
            <Download className="w-5 h-5 text-primary" />
            <span>Download All Art (.ZIP)</span>
          </Button>
        )}
      </div>

      {/* Drawing Gallery */}
      {snapshots.length > 0 && (
        <div className="space-y-4 pt-6 border-t-2 border-border">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-display font-bold">Game Art Gallery ({snapshots.length})</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {snapshots.map((snap, i) => (
              <Card key={i} className="p-3 overflow-hidden group">
                <div className="aspect-[4/3] bg-white rounded-2xl overflow-hidden border border-border/80 mb-2">
                  <img src={snap.dataUrl} alt={snap.word} className="w-full h-full object-contain" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-display font-bold text-sm capitalize">{snap.word}</h4>
                    <span className="text-[11px] text-text-muted">by {snap.drawerName}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadSingleImage(snap)}
                    title="Download this drawing"
                  >
                    <Download className="w-4 h-4 text-text-muted hover:text-primary" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <footer className="text-center text-xs text-text-muted mt-8 mb-4">
        Developed with ❤️ by{" "}
        <a
          href="https://github.com/Bhargav221287"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-primary hover:underline"
        >
          Bhargav
        </a>
      </footer>
    </div>
  );
}

