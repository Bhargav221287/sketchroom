import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRoomStore } from "../stores/useRoomStore.js";
import { useSocketStore } from "../stores/useSocketStore.js";
import { useThemeStore } from "../stores/useThemeStore.js";
import { sound } from "../services/sound.js";
import { DrawingCanvas } from "../components/canvas/DrawingCanvas.js";
import { DrawerToolbar } from "../components/canvas/DrawerToolbar.js";
import { FloatingReactions } from "../components/canvas/FloatingReactions.js";
import { Scoreboard } from "../components/scoreboard/Scoreboard.js";
import { ChatPanel } from "../components/chat/ChatPanel.js";
import { WordChoiceModal } from "../components/overlays/WordChoiceModal.js";
import { TurnSummaryModal } from "../components/overlays/TurnSummaryModal.js";
import { PodiumView } from "../components/podium/PodiumView.js";
import { ServerSettingsModal } from "../components/modals/ServerSettingsModal.js";
import { LobbyPage } from "./LobbyPage.js";
import { ProgressRing } from "../design/components/ProgressRing.js";
import { Button } from "../design/components/Button.js";
import { Input } from "../design/components/Input.js";
import { AvatarBuilder } from "../components/avatar/AvatarBuilder.js";
import { generateRandomAvatar, DrawTool } from "@sketchroom/shared";
import {
  Volume2,
  VolumeX,
  Sun,
  Moon,
  LogOut,
  Radio,
  WifiOff,
  Sparkles,
} from "lucide-react";
import { toast } from "../design/components/Toast.js";

export function GamePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const { status, mode } = useSocketStore();
  const { isDark, toggleDarkMode } = useThemeStore();
  const [serverModalOpen, setServerModalOpen] = React.useState(false);

  const {
    roomState,
    myPlayerId,
    secretWord,
    wordOptions,
    drawerChoosingName,
    turnSummary,
    podiumData,
    canvasOps,
    remoteCursor,
    chatMessages,
    activeReactions,
    closeGuessAlert,
    joinRoom,
    leaveRoom,
    setReady,
    updateSettings,
    kickPlayer,
    addBot,
    removeBot,
    startGame,
    chooseWord,
    playAgain,
    sendOp,
    sendUndo,
    sendRedo,
    sendClear,
    sendCursorMove,
    sendChat,
    sendReaction,
    sendTurnSnapshot,
  } = useRoomStore();

  console.log("[GamePage] render:", { code, status, mode, myPlayerId, roomState: roomState ? { phase: roomState.phase, code: roomState.roomCode } : null });

  // Drawing tool state
  const [currentTool, setCurrentTool] = React.useState<DrawTool>("brush");
  const [currentColor, setCurrentColor] = React.useState("#000000");
  const [brushSize, setBrushSize] = React.useState(6);
  const [opacity, setOpacity] = React.useState(1);
  const [isMuted, setIsMuted] = React.useState(() => sound.isMuted());

  // Join prompt if joining from link with no session
  const [showJoinPrompt, setShowJoinPrompt] = React.useState(false);
  const [joinNickname, setJoinNickname] = React.useState(
    () => localStorage.getItem("sketchroom_nickname") || "Doodler"
  );
  const [joinAvatar, setJoinAvatar] = React.useState(() => generateRandomAvatar());
  const [isJoining, setIsJoining] = React.useState(false);
  const [isAutoJoining, setIsAutoJoining] = React.useState(false);
  const [joinFailed, setJoinFailed] = React.useState(false);

  // Active mobile tab: 'canvas' | 'chat' | 'scores'
  const [mobileTab, setMobileTab] = React.useState<"game" | "chat" | "scores">("game");

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Auto-join attempt if room code is in URL
  React.useEffect(() => {
    if (!code) return;
    const roomCode = code.toUpperCase();

    if (roomState && roomState.roomCode === roomCode) {
      setIsAutoJoining(false);
      setJoinFailed(false);
      return;
    }

    // If this tab already has a session token, attempt seamless reconnection
    const sessionToken = typeof window !== "undefined" ? sessionStorage.getItem("sketchroom_session_token") : null;
    if (sessionToken) {
      const storedNick = localStorage.getItem("sketchroom_nickname") || "Doodler";
      setIsAutoJoining(true);
      setJoinFailed(false);
      joinRoom(roomCode, storedNick, generateRandomAvatar())
        .then(() => {
          setJoinFailed(false);
        })
        .catch(() => {
          setJoinFailed(true);
          setShowJoinPrompt(true);
        })
        .finally(() => {
          setIsAutoJoining(false);
        });
    } else {
      // New player opening the link: prompt to pick their nickname and avatar
      setShowJoinPrompt(true);
    }
  }, [code]);

  // Capture canvas snapshot at turn end if current player is drawer
  React.useEffect(() => {
    if (
      roomState?.phase === "TURN_SUMMARY" &&
      roomState.currentDrawerId === myPlayerId &&
      canvasRef.current
    ) {
      try {
        const dataUrl = canvasRef.current.toDataURL("image/png");
        sendTurnSnapshot(dataUrl);
      } catch {}
    }
  }, [roomState?.phase, roomState?.currentDrawerId, myPlayerId, sendTurnSnapshot]);

  const handleMuteToggle = () => {
    const next = !isMuted;
    sound.setMuted(next);
    setIsMuted(next);
  };

  const handleLeave = () => {
    leaveRoom();
    navigate("/");
  };

  const handleJoinFromPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinNickname.trim() || !code) return;
    setIsJoining(true);
    try {
      await joinRoom(code.toUpperCase(), joinNickname.trim(), joinAvatar);
      setShowJoinPrompt(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to join room");
    } finally {
      setIsJoining(false);
    }
  };

  // Cold Start / Waking up server overlay
  if (status === "connecting" && !roomState && !showJoinPrompt) {
    return (
      <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-6 text-center space-y-4 select-none">
        <div className="w-16 h-16 rounded-3xl bg-primary-light flex items-center justify-center text-primary animate-bounce">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-display font-bold">Waking up SketchRoom...</h2>
        <p className="text-text-muted text-sm max-w-sm">
          Connecting to our realtime server. If the server was sleeping, this may take a few seconds!
        </p>
      </div>
    );
  }

  // Join prompt modal for direct links
  if (showJoinPrompt) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface-1 rounded-3xl border-2 border-border p-6 shadow-xl space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-display font-bold">Join Room {code?.toUpperCase()}</h2>
            <p className="text-xs text-text-muted">Choose your nickname and avatar to jump in!</p>
          </div>

          <form onSubmit={handleJoinFromPrompt} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-text-muted mb-1 block">Nickname</label>
              <Input
                value={joinNickname}
                onChange={(e) => setJoinNickname(e.target.value)}
                maxLength={20}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-muted mb-1 block">Avatar</label>
              <AvatarBuilder value={joinAvatar} onChange={setJoinAvatar} />
            </div>

            <Button type="submit" variant="primary" size="lg" isLoading={isJoining} className="w-full">
              Enter Game Room
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Actively auto-joining room from direct link or navigation
  if (isAutoJoining && !roomState) {
    return (
      <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-6 text-center space-y-4 select-none">
        <div className="w-16 h-16 rounded-3xl bg-primary-light flex items-center justify-center text-primary animate-pulse">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-display font-bold">Entering Room {code?.toUpperCase()}...</h2>
        <p className="text-text-muted text-sm max-w-sm">Connecting to game lobby...</p>
      </div>
    );
  }

  // If join failed and no room state exists
  if (!roomState && joinFailed) {
    return (
      <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <WifiOff className="w-12 h-12 text-text-muted" />
        <h2 className="text-xl font-display font-bold">Room Not Found</h2>
        <p className="text-text-muted text-sm max-w-sm">
          Could not find room "{code?.toUpperCase()}". Please verify the code or create a new room!
        </p>
        <Button variant="primary" onClick={() => navigate("/")}>
          Return Home
        </Button>
      </div>
    );
  }

  // Initial brief hydrating state before roomState renders
  if (!roomState) {
    return (
      <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-6 text-center space-y-4 select-none">
        <div className="w-16 h-16 rounded-3xl bg-primary-light flex items-center justify-center text-primary animate-spin">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-display font-bold">Connecting...</h2>
      </div>
    );
  }

  // Render Lobby screen if still in LOBBY phase
  if (roomState.phase === "LOBBY") {
    return (
      <div className="min-h-screen bg-surface-0 text-text-primary p-4 md:p-8">
        <header className="max-w-5xl mx-auto flex items-center justify-between pb-4 border-b border-border mb-6">
          <span className="font-display font-bold text-xl text-primary flex items-center gap-2">
            <span>🖌️</span> SketchRoom
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="icon" onClick={handleMuteToggle} title="Sound Mute">
              {isMuted ? <VolumeX className="w-4 h-4 text-danger" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Button variant="secondary" size="icon" onClick={toggleDarkMode}>
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleLeave}>
              <LogOut className="w-4 h-4 mr-1.5" /> Leave
            </Button>
          </div>
        </header>

        <LobbyPage
          roomCode={roomState.roomCode}
          players={roomState.players}
          hostId={roomState.hostId}
          myPlayerId={myPlayerId}
          settings={roomState.settings}
          onUpdateSettings={updateSettings}
          onSetReady={setReady}
          onKickPlayer={kickPlayer}
          onAddBot={addBot}
          onRemoveBot={removeBot}
          onStartGame={startGame}
        />
      </div>
    );
  }

  // Render Victory Podium if game ended
  if (roomState.phase === "GAME_END" && podiumData) {
    return (
      <div className="min-h-screen bg-surface-0 text-text-primary p-4 md:p-8">
        <header className="max-w-4xl mx-auto flex items-center justify-between pb-4 border-b border-border mb-6">
          <span className="font-display font-bold text-xl text-primary">SketchRoom</span>
          <Button variant="outline" size="sm" onClick={handleLeave}>
            <LogOut className="w-4 h-4 mr-1.5" /> Leave
          </Button>
        </header>
        <PodiumView
          podium={podiumData.podium}
          snapshots={podiumData.snapshots}
          isHost={roomState.hostId === myPlayerId}
          onPlayAgain={playAgain}
        />
      </div>
    );
  }

  // Active Drawing & Guessing Game Screen
  const isDrawer = roomState.currentDrawerId === myPlayerId;
  const activeDrawer = roomState.players.find((p) => p.id === roomState.currentDrawerId);
  const myPlayer = roomState.players.find((p) => p.id === myPlayerId);

  // Render Word Hint Tiles
  const renderWordHintTiles = () => {
    if (isDrawer && secretWord) {
      const words = secretWord.split(" ");
      return (
        <div className="flex items-center gap-3 select-none flex-wrap justify-center">
          {words.map((word, wIdx) => (
            <div key={wIdx} className="flex items-center gap-1.5">
              {word.split("").map((char, i) => (
                <span
                  key={i}
                  className="font-display font-bold text-lg md:text-xl uppercase px-2 py-1 rounded-xl border-2 border-primary bg-primary-light text-primary"
                >
                  {char}
                </span>
              ))}
            </div>
          ))}
        </div>
      );
    }

    // Masked letter tiles for guessers with word grouping
    const wordsInHint = (roomState.wordHint || "").split("   ");
    return (
      <div className="flex items-center gap-3 select-none flex-wrap justify-center">
        {wordsInHint.map((wordStr, wIdx) => {
          const hintTokens = wordStr.split(" ").filter((c) => c.length > 0);
          return (
            <div key={wIdx} className="flex items-center gap-1.5">
              {hintTokens.map((char, i) => {
                const isRevealed = char !== "_";
                return (
                  <span
                    key={i}
                    className={`font-display font-bold text-lg md:text-xl uppercase px-2 py-1 rounded-xl border-2 transition-transform duration-300 ${
                      isRevealed
                        ? "border-primary bg-primary-light text-primary animate-flip-in"
                        : "border-border bg-surface-2 text-text-muted min-w-[28px] text-center"
                    }`}
                  >
                    {char}
                  </span>
                );
              })}
            </div>
          );
        })}
        {roomState.wordLength && (
          <span className="text-xs font-display font-bold bg-surface-3 text-text-muted px-2 py-0.5 rounded-full ml-1 self-center">
            {roomState.wordLength}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      className={`min-h-screen bg-surface-0 text-text-primary flex flex-col p-2 sm:p-4 md:p-6 transition-colors duration-200 select-none ${
        closeGuessAlert ? "ring-8 ring-warning/40 ring-inset" : ""
      }`}
    >
      {/* Top Header Bar */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between p-3 rounded-2xl bg-surface-1 border-2 border-border shadow-sm mb-3 gap-2">
        {/* Round Counter & Room Code */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-display font-bold bg-surface-2 border border-border px-2.5 py-1 rounded-xl">
            Round {roomState.currentRound}/{roomState.settings.rounds}
          </span>
          <span className="text-xs font-semibold text-text-muted hidden sm:inline">
            Code: <strong className="text-primary">{roomState.roomCode}</strong>
          </span>
        </div>

        {/* Circular Animated Timer Ring */}
        <div className="flex items-center gap-3">
          <ProgressRing
            value={roomState.timeLeftSeconds || 0}
            max={roomState.totalTimeSeconds || 80}
            size={52}
            strokeWidth={5}
          />

          {/* Word Hint Tiles */}
          <div className="hidden sm:flex">{renderWordHintTiles()}</div>
        </div>

        {/* Quick Actions (Sound, Theme, Leave) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Connection status pill */}
          <button
            type="button"
            onClick={() => setServerModalOpen(true)}
            className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-colors cursor-pointer ${
              mode === "cloud"
                ? "bg-success-light text-success border-success/30 hover:bg-success/20"
                : "bg-primary-light text-primary border-primary/30 hover:bg-primary/20"
            }`}
            title="Click to configure realtime server"
          >
            <Radio className="w-3 h-3" />
            <span className="hidden md:inline">{mode === "cloud" ? "Cloud" : "Instant"}</span>
          </button>

          <Button variant="secondary" size="icon" onClick={handleMuteToggle} className="w-9 h-9 rounded-xl">
            {isMuted ? <VolumeX className="w-4 h-4 text-danger" /> : <Volume2 className="w-4 h-4" />}
          </Button>

          <Button variant="secondary" size="icon" onClick={toggleDarkMode} className="w-9 h-9 rounded-xl">
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </Button>

          <Button variant="outline" size="sm" onClick={handleLeave} className="h-9 px-2.5 rounded-xl text-xs">
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      {/* Word Hint for Mobile Screen (rendered under top bar) */}
      <div className="sm:hidden flex justify-center py-1 mb-2">{renderWordHintTiles()}</div>

      {/* Mobile Tab Selector */}
      <div className="md:hidden flex items-center justify-around bg-surface-1 border-2 border-border rounded-2xl p-1 mb-2">
        <button
          onClick={() => setMobileTab("game")}
          className={`flex-1 py-1.5 text-xs font-display font-bold rounded-xl transition-colors ${
            mobileTab === "game" ? "bg-primary text-white" : "text-text-muted"
          }`}
        >
          Canvas
        </button>
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex-1 py-1.5 text-xs font-display font-bold rounded-xl transition-colors ${
            mobileTab === "chat" ? "bg-primary text-white" : "text-text-muted"
          }`}
        >
          Chat & Guesses
        </button>
        <button
          onClick={() => setMobileTab("scores")}
          className={`flex-1 py-1.5 text-xs font-display font-bold rounded-xl transition-colors ${
            mobileTab === "scores" ? "bg-primary text-white" : "text-text-muted"
          }`}
        >
          Scoreboard
        </button>
      </div>

      {/* Main 3-Column Responsive Grid */}
      <div className="w-full max-w-7xl mx-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 min-h-0">
        {/* Left Column: Live Scoreboard (Desktop & Tablet) */}
        <div
          className={`md:col-span-3 lg:col-span-3 h-full ${
            mobileTab === "scores" ? "block h-[70vh]" : "hidden md:block"
          }`}
        >
          <Scoreboard
            players={roomState.players}
            currentDrawerId={roomState.currentDrawerId}
            myPlayerId={myPlayerId}
          />
        </div>

        {/* Center Column: Drawing Canvas + Floating Drawer Toolbar */}
        <div
          className={`md:col-span-6 lg:col-span-6 flex flex-col items-center justify-between gap-3 ${
            mobileTab === "game" ? "block" : "hidden md:flex"
          }`}
        >
          {/* Canvas Wrapper with Floating Reactions */}
          <div className="relative w-full flex-1 flex items-center justify-center">
            <DrawingCanvas
              ref={canvasRef}
              isDrawer={isDrawer}
              drawerNickname={activeDrawer?.nickname}
              ops={canvasOps}
              onEmitOp={sendOp}
              onEmitCursorMove={sendCursorMove}
              currentTool={currentTool}
              currentColor={currentColor}
              brushSize={brushSize}
              opacity={opacity}
              remoteCursor={remoteCursor}
            />
            {/* Floating Reactions overlay */}
            <FloatingReactions reactions={activeReactions} />
          </div>

          {/* Drawer Toolbar (Visible only to active drawer) */}
          {isDrawer && (
            <DrawerToolbar
              currentTool={currentTool}
              onSelectTool={setCurrentTool}
              currentColor={currentColor}
              onSelectColor={setCurrentColor}
              brushSize={brushSize}
              onChangeBrushSize={setBrushSize}
              opacity={opacity}
              onChangeOpacity={setOpacity}
              onUndo={sendUndo}
              onRedo={sendRedo}
              onClear={sendClear}
            />
          )}
        </div>

        {/* Right Column: Chat & Guesses */}
        <div
          className={`md:col-span-3 lg:col-span-3 h-full ${
            mobileTab === "chat" ? "block h-[70vh]" : "hidden md:block"
          }`}
        >
          <ChatPanel
            messages={chatMessages}
            onSendMessage={sendChat}
            onSendReaction={sendReaction}
            disabled={roomState.phase !== "DRAWING"}
            hasGuessed={myPlayer?.hasGuessed}
            isDrawer={isDrawer}
          />
        </div>
      </div>

      {/* Word Choice Modal Overlay */}
      <WordChoiceModal
        isOpen={roomState.phase === "WORD_CHOICE"}
        isDrawer={isDrawer}
        drawerName={activeDrawer?.nickname}
        wordOptions={wordOptions}
        onSelectWord={chooseWord}
        timeLeft={roomState.timeLeftSeconds || 15}
      />

      {/* Turn Summary Modal Overlay */}
      <TurnSummaryModal
        isOpen={roomState.phase === "TURN_SUMMARY"}
        summary={turnSummary}
        timeLeft={roomState.timeLeftSeconds || 8}
      />

      {/* Server Settings Modal */}
      <ServerSettingsModal open={serverModalOpen} onOpenChange={setServerModalOpen} />
    </div>
  );
}

