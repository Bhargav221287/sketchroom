import * as React from "react";
import { MIN_PLAYERS_TO_START, Player, RoomSettings } from "@sketchroom/shared";
import { Avatar } from "../design/components/Avatar.js";
import { Button } from "../design/components/Button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../design/components/Card.js";
import { Slider } from "../design/components/Slider.js";
import { Badge } from "../design/components/Badge.js";
import {
  Copy,
  Check,
  Crown,
  UserX,
  Play,
  QrCode,
  Settings2,
  Sparkles,
  Lightbulb,
  Bot,
} from "lucide-react";
import QRCode from "qrcode";
import { toast } from "../design/components/Toast.js";

export interface LobbyPageProps {
  roomCode: string;
  players: Player[];
  hostId: string;
  myPlayerId: string;
  settings: RoomSettings;
  onUpdateSettings: (settings: Partial<RoomSettings>) => void;
  onSetReady: (ready: boolean) => void;
  onKickPlayer: (playerId: string) => void;
  onAddBot?: () => void;
  onRemoveBot?: () => void;
  onStartGame: () => void;
}

const TIPS = [
  "💡 Drawers earn points for every player who guesses their drawing correctly!",
  "💡 Typing guesses that are only 1 letter off will trigger a 'You're close!' hint.",
  "💡 Revealed letter hints unlock automatically at 50% and 75% of the round timer.",
  "💡 Use keyboard shortcuts: B for Brush, E for Eraser, G for Fill, and [ ] to change size.",
  "💡 Tap the quick reaction emojis to float reactions live across the screen!",
];

export function LobbyPage({
  roomCode,
  players,
  hostId,
  myPlayerId,
  settings,
  onUpdateSettings,
  onSetReady,
  onKickPlayer,
  onAddBot,
  onRemoveBot,
  onStartGame,
}: LobbyPageProps) {
  const isHost = hostId === myPlayerId;
  const myPlayer = players.find((p) => p.id === myPlayerId);
  const [copied, setCopied] = React.useState(false);
  const [qrDataUrl, setQrDataUrl] = React.useState<string>("");
  const [showQr, setShowQr] = React.useState(false);
  const [tipIndex, setTipIndex] = React.useState(0);
  const [customWordsText, setCustomWordsText] = React.useState(
    settings.customWords?.join(", ") || ""
  );

  // Generate QR code for mobile joining
  React.useEffect(() => {
    const joinUrl = `${window.location.origin}/room/${roomCode}`;
    QRCode.toDataURL(joinUrl, { margin: 1, width: 180 }, (err, url) => {
      if (!err && url) {
        setQrDataUrl(url);
      }
    });
  }, [roomCode]);

  // Rotate tips carousel every 6 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyLink = () => {
    const joinUrl = `${window.location.origin}/room/${roomCode}`;
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    toast.success("Room invite link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCategoryToggle = (category: string) => {
    if (!isHost) return;
    const current = settings.categories || [];
    let updated: string[];
    if (current.includes(category)) {
      if (current.length === 1) {
        toast.warning("Keep at least one category selected!");
        return;
      }
      updated = current.filter((c) => c !== category);
    } else {
      updated = [...current, category];
    }
    onUpdateSettings({ categories: updated });
  };

  const handleCustomWordsBlur = () => {
    if (!isHost) return;
    const words = customWordsText
      .split(",")
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 0);
    onUpdateSettings({ customWords: words });
  };

  const canStart = players.length >= MIN_PLAYERS_TO_START;

  const ALL_CATEGORIES = ["animals", "food", "objects", "actions", "places"];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 py-4 animate-in fade-in-0">
      {/* Invite Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-6 rounded-3xl bg-surface-1 border-2 border-border shadow-card gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <span className="text-xs font-display font-bold uppercase tracking-wider text-text-muted">
            Room Code
          </span>
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-4xl sm:text-5xl text-primary tracking-widest">
              {roomCode}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyLink}
              className="gap-1.5 rounded-xl text-xs"
            >
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Copied!" : "Copy Link"}</span>
            </Button>
          </div>
        </div>

        {/* QR Code Toggle for Mobile Joining */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQr(!showQr)}
            className="gap-2 rounded-xl text-xs"
          >
            <QrCode className="w-4 h-4 text-primary" />
            <span>{showQr ? "Hide QR" : "Scan to Join"}</span>
          </Button>

          {showQr && qrDataUrl && (
            <div className="p-2 rounded-2xl bg-white border border-border shadow-md">
              <img src={qrDataUrl} alt="Room QR" className="w-24 h-24" />
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Players list on Left, Settings on Right */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Players Section (2 Columns) */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display font-bold text-xl flex items-center gap-2">
              <span>Players in Lobby</span>
              <Badge variant="primary">{players.length}/10</Badge>
            </h2>

            {/* Host Bot Controls */}
            {isHost && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAddBot}
                  disabled={players.length >= 10}
                  className="gap-1.5 rounded-xl text-xs hover:border-primary"
                >
                  <Bot className="w-4 h-4 text-primary" />
                  <span>Add Bot Player</span>
                </Button>
                {players.some((p) => p.id.startsWith("bot-")) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRemoveBot}
                    className="text-xs text-text-muted hover:text-danger"
                  >
                    Remove Bot
                  </Button>
                )}
              </div>
            )}

            {/* Ready Toggle for Non-Hosts */}
            {!isHost && myPlayer && (
              <Button
                variant={myPlayer.isReady ? "primary" : "secondary"}
                size="sm"
                onClick={() => onSetReady(!myPlayer.isReady)}
                className="rounded-xl"
              >
                {myPlayer.isReady ? "Ready! ✓" : "Mark as Ready"}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {players.map((player) => {
              const isRoomHost = player.id === hostId;
              const isMe = player.id === myPlayerId;
              const isBot = player.id.startsWith("bot-");

              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-1 border-2 border-border shadow-sm transition-all hover:border-primary/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar config={player.avatar} size="md" state="idle" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-display font-bold text-sm truncate max-w-[120px]">
                          {player.nickname}
                        </span>
                        {isMe && <span className="text-[10px] text-text-muted font-bold">(You)</span>}
                        {isBot && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary-light text-primary border border-primary/20">
                            BOT
                          </span>
                        )}
                        {isRoomHost && (
                          <span title="Host">
                            <Crown className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-text-muted">
                        {isRoomHost ? "Host" : isBot ? "AI Doodler" : player.isReady ? "Ready to draw" : "Waiting"}
                      </span>
                    </div>
                  </div>

                  {/* Kick Action (Host only, cannot kick self) */}
                  {isHost && !isMe && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onKickPlayer(player.id)}
                      title="Kick player"
                      className="text-text-muted hover:text-danger w-8 h-8 rounded-lg"
                    >
                      <UserX className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Rotating Tips Box */}
          <div className="p-4 rounded-2xl bg-surface-2 border border-border/80 flex items-center gap-3">
            <Lightbulb className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-xs text-text-muted font-medium">{TIPS[tipIndex]}</p>
          </div>
        </div>

        {/* Room Settings (Right Column) */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                <span>Game Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Rounds Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-text-muted">Total Rounds:</span>
                  <span className="text-primary font-bold">{settings.rounds}</span>
                </div>
                <Slider
                  value={[settings.rounds]}
                  onValueChange={([val]) => isHost && onUpdateSettings({ rounds: val })}
                  min={2}
                  max={5}
                  step={1}
                  disabled={!isHost}
                />
              </div>

              {/* Draw Time Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-text-muted">Draw Time per Turn:</span>
                  <span className="text-primary font-bold">{settings.drawTimeSeconds}s</span>
                </div>
                <Slider
                  value={[settings.drawTimeSeconds]}
                  onValueChange={([val]) => isHost && onUpdateSettings({ drawTimeSeconds: val })}
                  min={30}
                  max={120}
                  step={5}
                  disabled={!isHost}
                />
              </div>

              {/* Word Categories Multi-Select Chips */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-text-muted block">Word Categories:</span>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_CATEGORIES.map((cat) => {
                    const active = (settings.categories || []).includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategoryToggle(cat)}
                        disabled={!isHost}
                        className={`text-xs font-display font-semibold px-2.5 py-1 rounded-xl border transition-all capitalize ${
                          active
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-surface-2 text-text-muted border-border hover:bg-surface-3"
                        } ${!isHost && "cursor-default"}`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Words */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-text-muted block">
                  Custom Words (comma separated):
                </span>
                <textarea
                  value={customWordsText}
                  onChange={(e) => setCustomWordsText(e.target.value)}
                  onBlur={handleCustomWordsBlur}
                  disabled={!isHost}
                  rows={2}
                  placeholder="e.g. coffee cup, pokemon, skateboard..."
                  className="w-full text-xs rounded-xl border-2 border-border bg-surface-2 p-2 text-text-primary focus:border-primary focus:outline-none resize-none disabled:opacity-60"
                />
              </div>

              {/* Start Game Action */}
              {isHost ? (
                <div className="pt-2 space-y-2">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={onStartGame}
                    disabled={!canStart}
                    className="w-full gap-2 text-base font-bold shadow-tactile-primary"
                  >
                    <Play className="w-5 h-5 fill-white" />
                    <span>{players.length === 1 ? "Start Game (Practice / Solo)" : "Start Game"}</span>
                  </Button>
                  {players.length === 1 && (
                    <p className="text-[11px] text-center font-medium text-text-muted">
                      💡 Tip: You can practice drawing solo, or click <strong>Add Bot Player</strong> above to play with AI!
                    </p>
                  )}
                  {!canStart && (
                    <p className="text-[11px] text-center font-semibold text-warning">
                      ⚠️ Needs at least {MIN_PLAYERS_TO_START} players to start ({players.length}/{MIN_PLAYERS_TO_START})
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-surface-2 text-center text-xs font-medium text-text-muted">
                  Waiting for host to configure rules and start the game...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
