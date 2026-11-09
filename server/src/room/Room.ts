import { Server, Socket } from "socket.io";
import {
  CanvasOp,
  ChatMessage,
  ClientToServerEvents,
  DEFAULT_DRAW_TIME_SECONDS,
  DEFAULT_ROUNDS,
  GamePhase,
  InterServerEvents,
  isCloseGuess,
  isExactGuess,
  MIN_PLAYERS_TO_START,
  Player,
  PodiumPlayer,
  RECONNECT_WINDOW_SECONDS,
  RoomSettings,
  RoomState,
  sanitizeChatMessage,
  ServerToClientEvents,
  SocketData,
  TURN_SUMMARY_DURATION_SECONDS,
  TurnSnapshot,
  WORD_CHOICE_DURATION_SECONDS,
} from "@sketchroom/shared";
import { OpLog } from "../canvas/OpLog.js";
import { HintEngine } from "../game/HintEngine.js";
import { calculateDrawerScore, calculateGuesserScore } from "../game/Scoring.js";
import { wordBank } from "../game/WordBank.js";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export class Room {
  public readonly roomCode: string;
  public hostId: string;
  public phase: GamePhase = "LOBBY";
  public settings: RoomSettings;

  private io: TypedServer;
  private players: Map<string, Player> = new Map();
  private sockets: Map<string, TypedSocket> = new Map();
  private playerSessions: Map<string, string> = new Map(); // sessionToken -> playerId
  private sessionToPlayer: Map<string, Player> = new Map();
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  // Turn and game cycle
  public currentRound: number = 0;
  public currentTurn: number = 0;
  public turnOrder: string[] = [];
  public currentDrawerId: string | null = null;
  public currentSecretWord: string = "";
  public currentWordOptions: [string, string, string] | null = null;
  public hasGuessedThisTurn: Set<string> = new Set();
  public guesserOrder: string[] = [];

  // Canvas and scoring
  public opLog: OpLog = new OpLog();
  public hintEngine: HintEngine = new HintEngine();
  public snapshots: TurnSnapshot[] = [];
  public turnScoreGains: Map<string, number> = new Map();

  // Phase Timers
  private activeTimerInterval: NodeJS.Timeout | null = null;
  public timeLeftSeconds: number = 0;
  public totalTimeSeconds: number = 0;

  // Inactivity tracking
  public lastActiveAt: number = Date.now();

  constructor(roomCode: string, hostPlayer: Player, hostSocket: TypedSocket, sessionToken: string, io: TypedServer) {
    this.roomCode = roomCode;
    this.hostId = hostPlayer.id;
    this.io = io;
    this.settings = {
      rounds: DEFAULT_ROUNDS,
      drawTimeSeconds: DEFAULT_DRAW_TIME_SECONDS,
      categories: wordBank.getCategories(),
      customWords: [],
    };

    this.addPlayer(hostPlayer, hostSocket, sessionToken);
  }

  public touch(): void {
    this.lastActiveAt = Date.now();
  }

  public getPlayerCount(): number {
    return Array.from(this.players.values()).filter((p) => !p.isDisconnected).length;
  }

  public getTotalSlots(): number {
    return this.players.size;
  }

  public getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  public addPlayer(player: Player, socket: TypedSocket, sessionToken: string): void {
    this.touch();
    this.players.set(player.id, player);
    this.sockets.set(player.id, socket);
    this.playerSessions.set(sessionToken, player.id);
    this.sessionToPlayer.set(sessionToken, player);

    socket.join(this.roomCode);
    socket.data = {
      playerId: player.id,
      roomCode: this.roomCode,
      nickname: player.nickname,
      sessionToken,
    };

    // If game in progress, send current canvas op log replay
    if (this.phase === "DRAWING" || this.phase === "TURN_SUMMARY") {
      socket.emit("draw:history_replay", { ops: this.opLog.getOps() });
    }

    this.broadcast("player:joined", player);
    this.emitRoomState();
  }

  public handleDisconnect(playerId: string): void {
    this.touch();
    const player = this.players.get(playerId);
    if (!player) return;

    this.sockets.delete(playerId);

    // In lobby: player can be dropped if not rejoining quickly
    if (this.phase === "LOBBY") {
      this.players.delete(playerId);
      this.migrateHostIfNeeded();
      this.broadcast("player:left", { playerId, newHostId: this.hostId });
      this.emitRoomState();
      return;
    }

    // During active game: hold slot for RECONNECT_WINDOW_SECONDS
    player.isDisconnected = true;
    player.disconnectedAt = Date.now();
    this.emitRoomState();

    const timer = setTimeout(() => {
      this.disconnectTimers.delete(playerId);
      const lingering = this.players.get(playerId);
      if (lingering && lingering.isDisconnected) {
        this.players.delete(playerId);
        this.migrateHostIfNeeded();
        this.broadcast("player:left", { playerId, newHostId: this.hostId });
        this.emitRoomState();

        // If disconnected player was current drawer, advance turn
        if (this.currentDrawerId === playerId && (this.phase === "DRAWING" || this.phase === "WORD_CHOICE")) {
          this.endTurn();
        }
      }
    }, RECONNECT_WINDOW_SECONDS * 1000);

    this.disconnectTimers.set(playerId, timer);
  }

  public reconnectPlayer(sessionToken: string, newSocket: TypedSocket): boolean {
    this.touch();
    const playerId = this.playerSessions.get(sessionToken);
    if (!playerId) return false;

    const player = this.players.get(playerId);
    if (!player) return false;

    // Clear pending removal timer
    const existingTimer = this.disconnectTimers.get(playerId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.disconnectTimers.delete(playerId);
    }

    player.isDisconnected = false;
    player.disconnectedAt = undefined;
    this.sockets.set(playerId, newSocket);

    newSocket.join(this.roomCode);
    newSocket.data = {
      playerId,
      roomCode: this.roomCode,
      nickname: player.nickname,
      sessionToken,
    };

    // Replay canvas history
    if (this.phase === "DRAWING" || this.phase === "TURN_SUMMARY") {
      newSocket.emit("draw:history_replay", { ops: this.opLog.getOps() });
    }

    this.broadcast("player:reconnected", { playerId });
    this.emitRoomState();
    return true;
  }

  public removePlayer(playerId: string): void {
    this.touch();
    const socket = this.sockets.get(playerId);
    if (socket) {
      socket.leave(this.roomCode);
      this.sockets.delete(playerId);
    }
    this.players.delete(playerId);

    const timer = this.disconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(playerId);
    }

    this.migrateHostIfNeeded();
    this.broadcast("player:left", { playerId, newHostId: this.hostId });
    this.emitRoomState();

    if (this.currentDrawerId === playerId && (this.phase === "DRAWING" || this.phase === "WORD_CHOICE")) {
      this.endTurn();
    }
  }

  public migrateHostIfNeeded(): void {
    if (this.players.size === 0) return;
    const currentHost = this.players.get(this.hostId);
    if (!currentHost || currentHost.isDisconnected) {
      // Find oldest active player
      for (const [id, player] of this.players) {
        if (!player.isDisconnected) {
          this.hostId = id;
          player.isHost = true;
          break;
        }
      }
    }
  }

  public setReady(playerId: string, ready: boolean): void {
    this.touch();
    const p = this.players.get(playerId);
    if (p) {
      p.isReady = ready;
      this.emitRoomState();
    }
  }

  public updateSettings(newSettings: Partial<RoomSettings>): void {
    this.touch();
    if (this.phase !== "LOBBY") return;
    this.settings = { ...this.settings, ...newSettings };
    this.emitRoomState();
  }

  public startGame(): boolean {
    this.touch();
    const activePlayers = Array.from(this.players.values()).filter((p) => !p.isDisconnected);
    if (activePlayers.length < MIN_PLAYERS_TO_START) return false;

    // Reset game counters
    for (const p of this.players.values()) {
      p.score = 0;
      p.roundScore = 0;
      p.hasGuessed = false;
    }

    this.snapshots = [];
    this.currentRound = 1;
    this.turnOrder = activePlayers.map((p) => p.id).sort(() => Math.random() - 0.5);
    this.currentTurn = 0;

    this.startTurn();
    return true;
  }

  public playAgain(): void {
    this.touch();
    this.clearActiveTimer();
    this.phase = "LOBBY";
    this.currentRound = 0;
    this.currentTurn = 0;
    this.currentDrawerId = null;
    this.currentSecretWord = "";
    this.opLog.reset();
    this.snapshots = [];

    for (const p of this.players.values()) {
      p.score = 0;
      p.roundScore = 0;
      p.hasGuessed = false;
      p.isReady = false;
    }

    this.emitRoomState();
  }

  public startTurn(): void {
    this.touch();
    this.clearActiveTimer();

    // Verify active players exist in turn order
    if (this.currentTurn >= this.turnOrder.length) {
      this.currentRound++;
      this.currentTurn = 0;
      if (this.currentRound > this.settings.rounds) {
        this.endGame();
        return;
      }
    }

    this.currentDrawerId = this.turnOrder[this.currentTurn];
    const drawer = this.players.get(this.currentDrawerId);
    if (!drawer || drawer.isDisconnected) {
      // Skip disconnected drawer
      this.currentTurn++;
      this.startTurn();
      return;
    }

    // Reset turn flags
    this.hasGuessedThisTurn.clear();
    this.guesserOrder = [];
    this.turnScoreGains.clear();
    for (const p of this.players.values()) {
      p.hasGuessed = false;
      p.roundScore = 0;
    }

    this.opLog.reset();
    this.phase = "WORD_CHOICE";
    this.currentWordOptions = wordBank.getRandomWords(this.settings.categories, this.settings.customWords, 3);

    this.timeLeftSeconds = WORD_CHOICE_DURATION_SECONDS;
    this.totalTimeSeconds = WORD_CHOICE_DURATION_SECONDS;

    // Drawer gets word options; others get announcement
    const drawerSocket = this.sockets.get(this.currentDrawerId);
    if (drawerSocket) {
      drawerSocket.emit("game:word_options", {
        words: this.currentWordOptions,
        durationSeconds: WORD_CHOICE_DURATION_SECONDS,
      });
    }

    for (const [id, socket] of this.sockets) {
      if (id !== this.currentDrawerId) {
        socket.emit("game:drawer_choosing", {
          drawerId: this.currentDrawerId,
          drawerName: drawer.nickname,
          durationSeconds: WORD_CHOICE_DURATION_SECONDS,
        });
      }
    }

    this.emitRoomState();

    // 15-second countdown to pick a word
    this.activeTimerInterval = setInterval(() => {
      this.timeLeftSeconds--;
      if (this.timeLeftSeconds <= 0) {
        this.clearActiveTimer();
        // Fallback: choose first word automatically
        this.chooseWord(0);
      }
    }, 1000);
  }

  public chooseWord(wordIndex: number): void {
    this.touch();
    this.clearActiveTimer();

    if (!this.currentWordOptions) return;
    const selectedIndex = Math.max(0, Math.min(2, wordIndex));
    this.currentSecretWord = this.currentWordOptions[selectedIndex];
    this.currentWordOptions = null;

    this.phase = "DRAWING";
    this.timeLeftSeconds = this.settings.drawTimeSeconds;
    this.totalTimeSeconds = this.settings.drawTimeSeconds;

    const initialHint = this.hintEngine.initialize(this.currentSecretWord);

    // Notify all players of turn start
    for (const [id, socket] of this.sockets) {
      const isDrawer = id === this.currentDrawerId;
      socket.emit("game:turn_start", {
        drawerId: this.currentDrawerId!,
        round: this.currentRound,
        maxRounds: this.settings.rounds,
        drawTimeSeconds: this.settings.drawTimeSeconds,
        wordLength: this.currentSecretWord.length,
        wordHint: initialHint,
        secretWord: isDrawer ? this.currentSecretWord : undefined,
      });
    }

    this.emitRoomState();

    // Start drawing timer
    this.activeTimerInterval = setInterval(() => {
      this.timeLeftSeconds--;
      this.broadcast("game:timer_tick", { timeLeftSeconds: this.timeLeftSeconds });

      // Check hint threshold reveals at 50% and 75%
      const hintUpdate = this.hintEngine.checkThreshold(this.timeLeftSeconds, this.totalTimeSeconds);
      if (hintUpdate && hintUpdate.shouldEmit) {
        this.broadcast("game:hint_reveal", {
          wordHint: hintUpdate.hint,
          revealedIndices: hintUpdate.revealedIndices,
        });
      }

      if (this.timeLeftSeconds <= 0) {
        this.clearActiveTimer();
        this.endTurn();
      }
    }, 1000);
  }

  public handleGuess(playerId: string, rawText: string): void {
    this.touch();
    const player = this.players.get(playerId);
    const socket = this.sockets.get(playerId);
    if (!player || !socket) return;

    const text = sanitizeChatMessage(rawText);
    if (!text) return;

    // Drawer cannot guess
    if (playerId === this.currentDrawerId) {
      this.broadcastChatMessage(player, text, "normal");
      return;
    }

    // Player already guessed: send to guessers sub-channel
    if (this.hasGuessedThisTurn.has(playerId)) {
      this.broadcastToGuesserSubChannel(player, text);
      return;
    }

    // Check exact guess during drawing phase
    if (this.phase === "DRAWING" && this.currentSecretWord && isExactGuess(text, this.currentSecretWord)) {
      this.hasGuessedThisTurn.add(playerId);
      player.hasGuessed = true;
      const isFirst = this.guesserOrder.length === 0;
      this.guesserOrder.push(playerId);

      const points = calculateGuesserScore(this.timeLeftSeconds, this.totalTimeSeconds, isFirst);
      player.score += points;
      player.roundScore = points;
      this.turnScoreGains.set(playerId, points);

      this.broadcast("chat:correct_guess", {
        playerId,
        playerName: player.nickname,
        pointsAwarded: points,
      });

      this.emitRoomState();

      // Check if all active non-drawers have guessed!
      const activeNonDrawers = Array.from(this.players.values()).filter(
        (p) => !p.isDisconnected && p.id !== this.currentDrawerId
      );
      const allGuessed = activeNonDrawers.every((p) => this.hasGuessedThisTurn.has(p.id));

      if (allGuessed) {
        // Accelerate timer to 2 seconds for a celebratory finish
        if (this.timeLeftSeconds > 2) {
          this.timeLeftSeconds = 2;
        }
      }
      return;
    }

    // Check close guess (edit distance = 1)
    if (this.phase === "DRAWING" && this.currentSecretWord && isCloseGuess(text, this.currentSecretWord)) {
      socket.emit("chat:close_guess", { message: `"${text}" is super close!` });
      // Do not broadcast close guess to others so word pattern is not leaked
      return;
    }

    // Normal chat message
    this.broadcastChatMessage(player, text, "normal");
  }

  public endTurn(): void {
    this.touch();
    this.clearActiveTimer();
    this.phase = "TURN_SUMMARY";

    // Award drawer points based on correct guessers count
    if (this.currentDrawerId) {
      const drawer = this.players.get(this.currentDrawerId);
      if (drawer) {
        const activeNonDrawersCount = Array.from(this.players.values()).filter(
          (p) => !p.isDisconnected && p.id !== this.currentDrawerId
        ).length;
        const drawerPoints = calculateDrawerScore(this.hasGuessedThisTurn.size, activeNonDrawersCount);
        drawer.score += drawerPoints;
        drawer.roundScore = drawerPoints;
        this.turnScoreGains.set(this.currentDrawerId, drawerPoints);
      }
    }

    const scoreDeltas = Array.from(this.players.values()).map((p) => ({
      playerId: p.id,
      playerName: p.nickname,
      scoreGain: this.turnScoreGains.get(p.id) || 0,
      totalScore: p.score,
    }));

    this.broadcast("game:turn_end", {
      word: this.currentSecretWord,
      scores: scoreDeltas,
    });

    this.emitRoomState();

    // Summary screen countdown
    this.timeLeftSeconds = TURN_SUMMARY_DURATION_SECONDS;
    this.activeTimerInterval = setInterval(() => {
      this.timeLeftSeconds--;
      if (this.timeLeftSeconds <= 0) {
        this.clearActiveTimer();
        this.currentTurn++;
        this.startTurn();
      }
    }, 1000);
  }

  public saveTurnSnapshot(dataUrl: string): void {
    this.touch();
    if (this.currentDrawerId) {
      const drawer = this.players.get(this.currentDrawerId);
      this.snapshots.push({
        round: this.currentRound,
        turn: this.currentTurn + 1,
        word: this.currentSecretWord,
        drawerId: this.currentDrawerId,
        drawerName: drawer?.nickname || "Drawer",
        dataUrl,
      });
    }
  }

  public endGame(): void {
    this.touch();
    this.clearActiveTimer();
    this.phase = "GAME_END";

    const rankedPlayers = Array.from(this.players.values())
      .sort((a, b) => b.score - a.score)
      .map((player, index): PodiumPlayer => ({
        rank: index + 1,
        player,
      }));

    this.broadcast("game:game_over", {
      podium: rankedPlayers.slice(0, 3),
      snapshots: this.snapshots,
    });

    this.emitRoomState();
  }

  private broadcastChatMessage(sender: Player, text: string, type: ChatMessage["type"]): void {
    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      playerId: sender.id,
      playerName: sender.nickname,
      text,
      timestamp: Date.now(),
      type,
    };
    this.broadcast("chat:message", message);
  }

  private broadcastToGuesserSubChannel(sender: Player, text: string): void {
    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      playerId: sender.id,
      playerName: sender.nickname,
      text,
      timestamp: Date.now(),
      type: "guesser",
    };

    // Send only to players who already guessed or current drawer
    for (const [id, socket] of this.sockets) {
      if (this.hasGuessedThisTurn.has(id) || id === this.currentDrawerId) {
        socket.emit("chat:message", message);
      }
    }
  }

  public getState(): RoomState {
    return {
      roomCode: this.roomCode,
      hostId: this.hostId,
      phase: this.phase,
      settings: this.settings,
      players: Array.from(this.players.values()),
      currentRound: this.currentRound,
      currentTurn: this.currentTurn,
      currentDrawerId: this.currentDrawerId,
      wordLength: this.currentSecretWord ? this.currentSecretWord.length : undefined,
      wordHint: this.hintEngine.getHint(),
      timeLeftSeconds: this.timeLeftSeconds,
      totalTimeSeconds: this.totalTimeSeconds,
    };
  }

  public emitRoomState(): void {
    this.broadcast("room:state", this.getState());
  }

  public broadcast<Ev extends keyof ServerToClientEvents>(
    event: Ev,
    ...args: Parameters<ServerToClientEvents[Ev]>
  ): void {
    this.io.to(this.roomCode).emit(event as any, ...(args as any));
  }

  public clearActiveTimer(): void {
    if (this.activeTimerInterval) {
      clearInterval(this.activeTimerInterval);
      this.activeTimerInterval = null;
    }
  }

  public cleanup(): void {
    this.clearActiveTimer();
    for (const timer of this.disconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.disconnectTimers.clear();
  }
}
