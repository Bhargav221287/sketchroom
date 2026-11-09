import * as React from "react";
import { useNavigate } from "react-router-dom";
import { generateRandomAvatar } from "@sketchroom/shared";
import { useRoomStore } from "../stores/useRoomStore.js";
import { useThemeStore } from "../stores/useThemeStore.js";
import { AvatarBuilder } from "../components/avatar/AvatarBuilder.js";
import { HowToPlayModal } from "../components/overlays/HowToPlayModal.js";
import { Button } from "../design/components/Button.js";
import { Card, CardContent } from "../design/components/Card.js";
import { Input } from "../design/components/Input.js";
import { ACCENT_THEMES } from "../design/themes.js";
import { toast } from "../design/components/Toast.js";
import {
  Sparkles,
  HelpCircle,
  Sun,
  Moon,
  Palette,
  Users,
  Play,
  ArrowRight,
} from "lucide-react";

export function LandingPage() {
  const navigate = useNavigate();
  const { createRoom, joinRoom } = useRoomStore();
  const { accent, isDark, setAccent, toggleDarkMode } = useThemeStore();

  const [nickname, setNickname] = React.useState(
    () => localStorage.getItem("sketchroom_nickname") || "DoodleChamp"
  );
  const [avatar, setAvatar] = React.useState(() => generateRandomAvatar());
  const [codeDigits, setCodeDigits] = React.useState(["", "", "", "", ""]);
  const [isCreating, setIsCreating] = React.useState(false);
  const [isJoining, setIsJoining] = React.useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = React.useState(false);

  // Parallax mouse position
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    // Subtle parallax offset
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    setMousePos({ x, y });
  };

  const handleDigitChange = (index: number, val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const updated = [...codeDigits];

    if (clean.length > 1) {
      // Paste handling
      for (let i = 0; i < 5 && i < clean.length; i++) {
        updated[i] = clean[i];
      }
      setCodeDigits(updated);
      const nextInput = document.getElementById(`digit-${Math.min(4, clean.length)}`);
      nextInput?.focus();
      return;
    }

    updated[index] = clean;
    setCodeDigits(updated);

    if (clean && index < 4) {
      const nextInput = document.getElementById(`digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !codeDigits[index] && index > 0) {
      const prevInput = document.getElementById(`digit-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleCreate = async () => {
    if (!nickname.trim()) {
      toast.error("Please enter a nickname!");
      return;
    }
    setIsCreating(true);
    try {
      const code = await createRoom(nickname.trim(), avatar);
      navigate(`/room/${code}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create room");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async () => {
    const fullCode = codeDigits.join("").trim();
    if (!nickname.trim()) {
      toast.error("Please enter a nickname!");
      return;
    }
    if (fullCode.length !== 5) {
      toast.error("Please enter a valid 5-character room code!");
      return;
    }
    setIsJoining(true);
    try {
      await joinRoom(fullCode, nickname.trim(), avatar);
      navigate(`/room/${fullCode}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to join room");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative min-h-screen bg-surface-0 text-text-primary flex flex-col justify-between p-4 md:p-8 overflow-hidden select-none"
    >
      {/* Drifting Floating Doodles (Parallax) */}
      <div
        className="hidden md:block absolute inset-0 pointer-events-none opacity-20 dark:opacity-10 transition-transform duration-300 ease-out"
        style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}
      >
        <span className="absolute top-[12%] left-[10%] text-6xl">✏️</span>
        <span className="absolute top-[25%] right-[15%] text-6xl">🎨</span>
        <span className="absolute bottom-[20%] left-[15%] text-6xl">🍕</span>
        <span className="absolute bottom-[30%] right-[10%] text-6xl">⭐</span>
        <span className="absolute top-[48%] left-[4%] text-6xl">🚀</span>
        <span className="absolute top-[55%] right-[5%] text-6xl">🐱</span>
      </div>

      {/* Top Bar: Logo, Theme, How To Play */}
      <header className="relative z-10 w-full max-w-5xl mx-auto flex items-center justify-between pb-6">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🖌️</span>
          <span className="font-display font-bold text-2xl tracking-tight text-primary">SketchRoom</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Accent Picker */}
          <div className="flex items-center bg-surface-1 border-2 border-border rounded-2xl p-1 gap-1">
            {ACCENT_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setAccent(t.id)}
                aria-label={`${t.name} Theme`}
                className={`w-6 h-6 rounded-full border transition-transform ${
                  accent === t.id ? "scale-110 border-black/40 ring-2 ring-primary/40 shadow-sm" : "border-transparent"
                }`}
                style={{ backgroundColor: t.primaryColor }}
                title={`${t.name} Theme`}
              />
            ))}
          </div>

          <Button variant="secondary" size="icon" onClick={toggleDarkMode} title="Toggle Dark/Light Mode">
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-500" />}
          </Button>

          <Button variant="outline" size="sm" onClick={() => setHowToPlayOpen(true)} className="gap-1.5 hidden sm:inline-flex">
            <HelpCircle className="w-4 h-4 text-text-muted" />
            <span>How to Play</span>
          </Button>
        </div>
      </header>

      {/* Main Content Hero */}
      <main className="relative z-10 w-full max-w-3xl mx-auto flex-1 flex flex-col items-center justify-center space-y-8 my-4">
        {/* Animated Self-Drawing SVG Logo & Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center mb-1">
            <svg
              className="w-20 h-20 md:w-24 md:h-24 overflow-visible"
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M10,80 Q50,10 90,80"
                className="stroke-primary animate-[drawPath_2.5s_ease-out_forwards]"
                style={{ strokeDasharray: 200, strokeDashoffset: 0 }}
              />
              <path
                d="M20,60 L80,60"
                className="stroke-accent animate-[drawPath_2.5s_ease-out_forwards]"
                style={{ strokeDasharray: 100, strokeDashoffset: 0 }}
              />
              <circle cx="50" cy="35" r="8" className="fill-primary stroke-none" />
            </svg>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-tight text-text-primary">
            Draw, Guess & <span className="text-primary underline decoration-accent decoration-wavy">Laugh!</span>
          </h1>
          <p className="text-text-muted text-sm sm:text-base max-w-lg mx-auto">
            The realtime social multiplayer drawing party game. No accounts needed — just pick a nickname and start doodling!
          </p>
        </div>

        {/* Player Profile & Avatar Customizer */}
        <Card className="w-full">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-display font-bold uppercase tracking-wider text-text-muted block">
                Your Nickname
              </label>
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter a fun nickname..."
                maxLength={20}
                className="text-base font-display font-semibold"
              />
            </div>

            {/* Avatar Builder */}
            <div className="space-y-2">
              <label className="text-xs font-display font-bold uppercase tracking-wider text-text-muted block">
                Customize Your Avatar
              </label>
              <AvatarBuilder value={avatar} onChange={setAvatar} />
            </div>

            {/* Action Grid: Create or Join */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Create Room Box */}
              <div className="p-5 rounded-3xl bg-surface-2 border-2 border-border/80 flex flex-col justify-between space-y-4">
                <div>
                  <h2 className="font-display font-bold text-lg text-text-primary flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <span>Host a Game</span>
                  </h2>
                  <p className="text-xs text-text-muted mt-1">
                    Create a private room, customize rounds, draw time, and word categories.
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleCreate}
                  isLoading={isCreating}
                  className="w-full gap-2 text-base"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>Create Room</span>
                </Button>
              </div>

              {/* Join Room Box */}
              <div className="p-5 rounded-3xl bg-surface-2 border-2 border-border/80 flex flex-col justify-between space-y-4">
                <div>
                  <h2 className="font-display font-bold text-lg text-text-primary flex items-center gap-2">
                    <Users className="w-5 h-5 text-accent" />
                    <span>Join with Code</span>
                  </h2>
                  <p className="text-xs text-text-muted mt-1">
                    Enter the 5-letter code provided by your host.
                  </p>
                </div>

                {/* 5-character code boxes */}
                <div className="flex items-center justify-between gap-1.5">
                  {codeDigits.map((digit, i) => (
                    <input
                      key={i}
                      id={`digit-${i}`}
                      type="text"
                      maxLength={5}
                      value={digit}
                      aria-label={`Room code digit ${i + 1}`}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className="w-11 h-12 text-center text-lg font-display font-bold uppercase rounded-2xl border-2 border-border bg-surface-1 focus:border-primary focus:outline-none transition-colors"
                      placeholder="•"
                    />
                  ))}
                </div>

                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleJoin}
                  isLoading={isJoining}
                  className="w-full gap-2 text-base"
                >
                  <span>Enter Room</span>
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between pt-6 text-xs text-text-muted border-t border-border/60 gap-3">
        <span>© 2026 SketchRoom. Built with pure Canvas & WebSockets.</span>
        <div className="flex items-center gap-4">
          <button onClick={() => setHowToPlayOpen(true)} className="hover:text-primary transition-colors">
            Game Rules
          </button>
          <a href="/styleguide" className="hover:text-primary transition-colors">
            Design Styleguide
          </a>
        </div>
      </footer>

      {/* How To Play Walkthrough Modal */}
      <HowToPlayModal open={howToPlayOpen} onOpenChange={setHowToPlayOpen} />
    </div>
  );
}
