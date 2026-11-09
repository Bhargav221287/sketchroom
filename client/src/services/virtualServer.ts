import {
  AvatarConfig,
  CanvasOp,
  DEFAULT_DRAW_TIME_SECONDS,
  DEFAULT_ROUNDS,
  GamePhase,
  generateRandomAvatar,
  isCloseGuess,
  isExactGuess,
  MAX_PLAYERS_PER_ROOM,
  Player,
  PodiumPlayer,
  RoomSettings,
  RoomState,
  sanitizeChatMessage,
  serializeAvatar,
  StrokeOp,
  TurnSnapshot,
  TurnSummaryData,
  WORD_CHOICE_DURATION_SECONDS,
  TURN_SUMMARY_DURATION_SECONDS,
} from "@sketchroom/shared";
import wordsData from "@sketchroom/shared/words.json";

// In-Browser Virtual Server that runs entirely client-side when no remote WebSocket server is reachable.
export class VirtualServer {
  public roomCode: string = "";
  public hostId: string = "";
  public phase: GamePhase = "LOBBY";
  public settings: RoomSettings = {
    rounds: DEFAULT_ROUNDS,
    drawTimeSeconds: DEFAULT_DRAW_TIME_SECONDS,
    categories: ["animals", "food", "objects", "actions", "places"],
    customWords: [],
  };

  public players: Map<string, Player> = new Map();
  public currentRound: number = 0;
  public currentTurn: number = 0;
  public turnOrder: string[] = [];
  public currentDrawerId: string | null = null;
  public currentSecretWord: string = "";
  public currentWordOptions: [string, string, string] | null = null;
  public wordHint: string = "";
  public revealedIndices: number[] = [];

  public opLog: CanvasOp[] = [];
  public undoStack: CanvasOp[] = [];
  public snapshots: TurnSnapshot[] = [];

  public hasGuessedThisTurn: Set<string> = new Set();
  public guesserOrder: string[] = [];
  public turnScoreGains: Map<string, number> = new Map();

  public timeLeftSeconds: number = 0;
  public totalTimeSeconds: number = 0;
  private timerInterval: any = null;
  private botTimeouts: any[] = [];

  // Registered virtual socket callbacks
  private listeners: Map<string, Set<Function>> = new Map();

  // Multi-tab sync via BroadcastChannel
  private channel: BroadcastChannel | null = null;
  public isHostInstance: boolean = true;

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.channel = new BroadcastChannel("sketchroom_virtual_network");
        this.channel.onmessage = (event) => {
          this.handleNetworkMessage(event.data);
        };
      } catch {
        // BroadcastChannel unavailable
      }
    }
  }

  public on(event: string, fn: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(fn);
  }

  public off(event: string, fn: Function) {
    this.listeners.get(event)?.delete(fn);
  }

  public emit(event: string, data?: any) {
    const fns = this.listeners.get(event);
    if (fns) {
      fns.forEach((fn) => {
        try {
          fn(data);
        } catch (e) {
          console.error(`[VirtualServer] Listener error for ${event}:`, e);
        }
      });
    }

    // Broadcast state updates to other browser tabs
    if (this.channel && this.isHostInstance) {
      try {
        this.channel.postMessage({ type: "BROADCAST_EVENT", event, data });
      } catch {}
    }
  }

  private handleNetworkMessage(msg: any) {
    if (!msg) return;
    if (msg.type === "BROADCAST_EVENT" && !this.isHostInstance) {
      const fns = this.listeners.get(msg.event);
      if (fns) {
        fns.forEach((fn) => fn(msg.data));
      }
    } else if (msg.type === "CLIENT_ACTION" && this.isHostInstance) {
      this.handleClientAction(msg.action, msg.payload);
    }
  }

  private handleClientAction(action: string, payload: any) {
    switch (action) {
      case "chat:send":
        this.handleChat(payload.playerId, payload.text);
        break;
      case "draw:op":
        this.handleDrawOp(payload.op);
        break;
      case "draw:cursor_move":
        this.emit("draw:remote_cursor", { x: payload.x, y: payload.y, drawerId: payload.playerId });
        break;
      case "reaction:send":
        this.emit("reaction:broadcast", payload);
        break;
    }
  }

  public createRoom(
    nickname: string,
    avatar: AvatarConfig,
    settings?: Partial<RoomSettings>
  ): { roomCode: string; playerId: string; sessionToken: string; roomState: RoomState } {
    this.clearTimer();
    this.roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    const playerId = `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const sessionToken = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    this.hostId = playerId;
    this.isHostInstance = true;
    this.phase = "LOBBY";
    this.players.clear();
    this.opLog = [];
    this.undoStack = [];
    this.snapshots = [];

    if (settings) {
      this.settings = { ...this.settings, ...settings };
    }

    const hostPlayer: Player = {
      id: playerId,
      nickname,
      avatar,
      avatarString: serializeAvatar(avatar),
      score: 0,
      roundScore: 0,
      isHost: true,
      isReady: true,
      hasGuessed: false,
      isDisconnected: false,
    };

    this.players.set(playerId, hostPlayer);
    this.emitRoomState();
    return { roomCode: this.roomCode, playerId, sessionToken, roomState: this.getRoomState() };
  }

  public joinRoom(
    roomCode: string,
    nickname: string,
    avatar: AvatarConfig
  ): { success: boolean; roomCode: string; playerId: string; sessionToken: string; roomState: RoomState } {
    const code = roomCode.toUpperCase().trim();
    const playerId = `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const sessionToken = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const newPlayer: Player = {
      id: playerId,
      nickname,
      avatar,
      avatarString: serializeAvatar(avatar),
      score: 0,
      roundScore: 0,
      isHost: this.players.size === 0,
      isReady: false,
      hasGuessed: false,
      isDisconnected: false,
    };

    if (this.players.size === 0) {
      this.roomCode = code;
      this.hostId = playerId;
    }

    this.players.set(playerId, newPlayer);
    this.emit("player:joined", newPlayer);
    this.emitRoomState();
    return { success: true, roomCode: this.roomCode, playerId, sessionToken, roomState: this.getRoomState() };
  }

  public addBotPlayer(): Player | null {
    if (this.phase !== "LOBBY" || this.players.size >= MAX_PLAYERS_PER_ROOM) return null;

    const botNames = ["PicassoBot", "DoodleBot", "SketchyBot", "Artie", "Brushy", "PixelBot"];
    const existing = new Set(Array.from(this.players.values()).map((p) => p.nickname));
    const chosenName = botNames.find((n) => !existing.has(`🤖 ${n}`)) || `Bot-${Math.floor(Math.random() * 900 + 100)}`;

    const botId = `bot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const botAvatar = generateRandomAvatar();

    const botPlayer: Player = {
      id: botId,
      nickname: `🤖 ${chosenName}`,
      avatar: botAvatar,
      avatarString: serializeAvatar(botAvatar),
      score: 0,
      roundScore: 0,
      isHost: false,
      isReady: true,
      hasGuessed: false,
      isDisconnected: false,
    };

    this.players.set(botId, botPlayer);
    this.emit("player:joined", botPlayer);
    this.emitRoomState();
    return botPlayer;
  }

  public removeBotPlayer(): void {
    if (this.phase !== "LOBBY") return;
    const bot = Array.from(this.players.values()).find((p) => p.id.startsWith("bot-"));
    if (bot) {
      this.players.delete(bot.id);
      this.emit("player:left", { playerId: bot.id, newHostId: this.hostId });
      this.emitRoomState();
    }
  }

  public updateSettings(newSettings: Partial<RoomSettings>) {
    if (this.phase !== "LOBBY") return;
    this.settings = { ...this.settings, ...newSettings };
    this.emitRoomState();
  }

  public setReady(playerId: string, ready: boolean) {
    const p = this.players.get(playerId);
    if (p) {
      p.isReady = ready;
      this.emitRoomState();
    }
  }

  public kickPlayer(targetPlayerId: string) {
    this.players.delete(targetPlayerId);
    this.emit("player:left", { playerId: targetPlayerId, newHostId: this.hostId });
    this.emitRoomState();
  }

  public startGame() {
    const active = Array.from(this.players.values()).filter((p) => !p.isDisconnected);
    if (active.length < 1) return;

    for (const p of this.players.values()) {
      p.score = 0;
      p.roundScore = 0;
      p.hasGuessed = false;
    }

    this.snapshots = [];
    this.currentRound = 1;
    this.turnOrder = active.map((p) => p.id).sort(() => Math.random() - 0.5);
    this.currentTurn = 0;

    this.startTurn();
  }

  public playAgain() {
    this.clearTimer();
    this.phase = "LOBBY";
    this.currentRound = 0;
    this.currentTurn = 0;
    this.currentDrawerId = null;
    this.currentSecretWord = "";
    this.opLog = [];
    this.undoStack = [];
    this.snapshots = [];

    for (const p of this.players.values()) {
      p.score = 0;
      p.roundScore = 0;
      p.hasGuessed = false;
      p.isReady = false;
    }

    this.emitRoomState();
  }

  public startTurn() {
    this.clearTimer();

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
      this.currentTurn++;
      this.startTurn();
      return;
    }

    this.hasGuessedThisTurn.clear();
    this.guesserOrder = [];
    this.turnScoreGains.clear();
    for (const p of this.players.values()) {
      p.hasGuessed = false;
      p.roundScore = 0;
    }

    this.opLog = [];
    this.undoStack = [];
    this.phase = "WORD_CHOICE";
    this.currentWordOptions = this.getRandomWordOptions(3);

    this.timeLeftSeconds = WORD_CHOICE_DURATION_SECONDS;
    this.totalTimeSeconds = WORD_CHOICE_DURATION_SECONDS;

    // Emit word options
    this.emit("game:word_options", {
      words: this.currentWordOptions,
      durationSeconds: WORD_CHOICE_DURATION_SECONDS,
    });

    this.emitRoomState();

    // If drawer is bot, auto-choose word
    if (this.currentDrawerId.startsWith("bot-")) {
      const t = setTimeout(() => {
        if (this.phase === "WORD_CHOICE" && this.currentDrawerId?.startsWith("bot-")) {
          this.chooseWord(0);
        }
      }, 1500);
      this.botTimeouts.push(t);
    }

    // 15s Countdown
    this.timerInterval = setInterval(() => {
      this.timeLeftSeconds--;
      if (this.timeLeftSeconds <= 0) {
        this.clearTimer();
        this.chooseWord(0);
      }
    }, 1000);
  }

  public chooseWord(wordIndex: number) {
    this.clearTimer();
    if (!this.currentWordOptions) return;

    const idx = Math.max(0, Math.min(2, wordIndex));
    this.currentSecretWord = this.currentWordOptions[idx];
    this.currentWordOptions = null;

    this.phase = "DRAWING";
    this.timeLeftSeconds = this.settings.drawTimeSeconds;
    this.totalTimeSeconds = this.settings.drawTimeSeconds;

    // Mask initial word
    this.wordHint = this.currentSecretWord
      .split("")
      .map((c) => (c === " " ? " " : "_"))
      .join(" ");
    this.revealedIndices = [];

    this.emit("game:turn_start", {
      drawerId: this.currentDrawerId!,
      round: this.currentRound,
      maxRounds: this.settings.rounds,
      drawTimeSeconds: this.settings.drawTimeSeconds,
      wordLength: this.currentSecretWord.length,
      wordHint: this.wordHint,
      secretWord: this.currentSecretWord,
    });

    this.emitRoomState();

    // Bot automation: drawing or guessing
    if (this.currentDrawerId?.startsWith("bot-")) {
      this.scheduleBotDrawing();
    } else {
      this.scheduleBotGuesses();
    }

    // Drawing timer countdown
    this.timerInterval = setInterval(() => {
      this.timeLeftSeconds--;
      this.emit("game:timer_tick", { timeLeftSeconds: this.timeLeftSeconds });

      // Threshold hint reveals at 50% and 75%
      const fractionRemaining = this.timeLeftSeconds / this.totalTimeSeconds;
      if (fractionRemaining <= 0.5 && this.revealedIndices.length === 0) {
        this.revealHintLetter();
      } else if (fractionRemaining <= 0.25 && this.revealedIndices.length === 1) {
        this.revealHintLetter();
      }

      if (this.timeLeftSeconds <= 0) {
        this.clearTimer();
        this.endTurn();
      }
    }, 1000);
  }

  private revealHintLetter() {
    const letters = this.currentSecretWord.split("");
    const unmasked = letters
      .map((c, i) => ({ char: c, idx: i }))
      .filter((item) => item.char !== " " && !this.revealedIndices.includes(item.idx));

    if (unmasked.length === 0) return;
    const chosen = unmasked[Math.floor(Math.random() * unmasked.length)];
    this.revealedIndices.push(chosen.idx);

    this.wordHint = letters
      .map((c, i) => (c === " " ? " " : this.revealedIndices.includes(i) ? c : "_"))
      .join(" ");

    this.emit("game:hint_reveal", {
      wordHint: this.wordHint,
      revealedIndices: this.revealedIndices,
    });
  }

  public handleChat(playerId: string, rawText: string) {
    const player = this.players.get(playerId);
    if (!player) return;

    const text = sanitizeChatMessage(rawText);
    if (!text) return;

    // Drawer cannot guess
    if (playerId === this.currentDrawerId) {
      this.emit("chat:message", {
        id: `msg-${Date.now()}-${Math.random()}`,
        playerId,
        playerName: player.nickname,
        text,
        timestamp: Date.now(),
        type: "normal",
      });
      return;
    }

    // Already guessed
    if (this.hasGuessedThisTurn.has(playerId)) {
      this.emit("chat:message", {
        id: `gmsg-${Date.now()}-${Math.random()}`,
        playerId,
        playerName: player.nickname,
        text,
        timestamp: Date.now(),
        type: "guesser",
      });
      return;
    }

    // Check exact guess
    if (this.phase === "DRAWING" && this.currentSecretWord && isExactGuess(text, this.currentSecretWord)) {
      this.hasGuessedThisTurn.add(playerId);
      player.hasGuessed = true;
      const isFirst = this.guesserOrder.length === 0;
      this.guesserOrder.push(playerId);

      const fraction = Math.max(0, Math.min(1, this.timeLeftSeconds / this.totalTimeSeconds));
      let points = Math.round(100 + 400 * fraction);
      if (isFirst) points += 50;

      player.score += points;
      player.roundScore = points;
      this.turnScoreGains.set(playerId, points);

      this.emit("chat:correct_guess", {
        playerId,
        playerName: player.nickname,
        pointsAwarded: points,
      });

      this.emitRoomState();

      // Check if all non-drawers guessed
      const nonDrawers = Array.from(this.players.values()).filter(
        (p) => !p.isDisconnected && p.id !== this.currentDrawerId
      );
      if (nonDrawers.every((p) => this.hasGuessedThisTurn.has(p.id))) {
        if (this.timeLeftSeconds > 2) this.timeLeftSeconds = 2;
      }
      return;
    }

    // Check close guess
    if (this.phase === "DRAWING" && this.currentSecretWord && isCloseGuess(text, this.currentSecretWord)) {
      this.emit("chat:close_guess", { message: `"${text}" is super close!` });
      return;
    }

    // Normal message
    this.emit("chat:message", {
      id: `msg-${Date.now()}-${Math.random()}`,
      playerId,
      playerName: player.nickname,
      text,
      timestamp: Date.now(),
      type: "normal",
    });
  }

  public handleDrawOp(op: CanvasOp) {
    this.opLog.push(op);
    this.undoStack = [];
    this.emit("draw:op", { op });
  }

  public handleUndo() {
    if (this.opLog.length > 0) {
      const popped = this.opLog.pop();
      if (popped) this.undoStack.push(popped);
      this.emit("draw:undo");
    }
  }

  public handleRedo() {
    if (this.undoStack.length > 0) {
      const popped = this.undoStack.pop();
      if (popped) {
        this.opLog.push(popped);
        this.emit("draw:redo", { op: popped });
      }
    }
  }

  public handleClear() {
    const clearOp: CanvasOp = { type: "clear", id: `clear-${Date.now()}` };
    this.opLog.push(clearOp);
    this.emit("draw:clear");
  }

  public handleCursorMove(x: number, y: number, playerId: string) {
    this.emit("draw:remote_cursor", { x, y, drawerId: playerId });
  }

  public handleReaction(emoji: string, playerId: string, playerName: string) {
    this.emit("reaction:broadcast", {
      id: `react-${Date.now()}-${Math.random()}`,
      emoji,
      x: 0.15 + Math.random() * 0.7,
      y: 0.2 + Math.random() * 0.6,
      playerName,
    });
  }

  public saveTurnSnapshot(dataUrl: string) {
    if (!this.currentDrawerId) return;
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

  public endTurn() {
    this.clearTimer();
    this.phase = "TURN_SUMMARY";

    // Award drawer score
    if (this.currentDrawerId) {
      const drawer = this.players.get(this.currentDrawerId);
      if (drawer) {
        const nonDrawersCount = Array.from(this.players.values()).filter(
          (p) => !p.isDisconnected && p.id !== this.currentDrawerId
        ).length;
        let drawerPts = this.hasGuessedThisTurn.size * 75;
        if (nonDrawersCount > 0 && this.hasGuessedThisTurn.size === nonDrawersCount) {
          drawerPts += 100;
        }
        drawerPts = Math.min(500, drawerPts);
        drawer.score += drawerPts;
        drawer.roundScore = drawerPts;
        this.turnScoreGains.set(this.currentDrawerId, drawerPts);
      }
    }

    const summaryData: TurnSummaryData = {
      word: this.currentSecretWord,
      scores: Array.from(this.players.values()).map((p) => ({
        playerId: p.id,
        playerName: p.nickname,
        scoreGain: this.turnScoreGains.get(p.id) || 0,
        totalScore: p.score,
      })),
    };

    this.emit("game:turn_end", summaryData);
    this.emitRoomState();

    this.timeLeftSeconds = TURN_SUMMARY_DURATION_SECONDS;
    this.totalTimeSeconds = TURN_SUMMARY_DURATION_SECONDS;

    this.timerInterval = setInterval(() => {
      this.timeLeftSeconds--;
      this.emit("game:timer_tick", { timeLeftSeconds: this.timeLeftSeconds });
      if (this.timeLeftSeconds <= 0) {
        this.clearTimer();
        this.currentTurn++;
        this.startTurn();
      }
    }, 1000);
  }

  public endGame() {
    this.clearTimer();
    this.phase = "GAME_END";

    const ranked: PodiumPlayer[] = Array.from(this.players.values())
      .filter((p) => !p.isDisconnected)
      .sort((a, b) => b.score - a.score)
      .map((player, idx) => ({ rank: idx + 1, player }));

    this.emit("game:game_over", {
      podium: ranked,
      snapshots: this.snapshots,
    });
    this.emitRoomState();
  }

  private scheduleBotDrawing() {
    const strokes: Array<{ color: string; size: number; points: Array<{ x: number; y: number }> }> = [
      {
        color: "#3B82F6",
        size: 8,
        points: Array.from({ length: 17 }, (_, i) => {
          const angle = (i / 16) * Math.PI * 2;
          return { x: 0.5 + 0.25 * Math.cos(angle), y: 0.5 + 0.25 * Math.sin(angle) };
        }),
      },
      { color: "#1E293B", size: 10, points: [{ x: 0.42, y: 0.42 }, { x: 0.42, y: 0.43 }] },
      { color: "#1E293B", size: 10, points: [{ x: 0.58, y: 0.42 }, { x: 0.58, y: 0.43 }] },
      {
        color: "#EF4444",
        size: 6,
        points: [
          { x: 0.40, y: 0.55 },
          { x: 0.45, y: 0.62 },
          { x: 0.50, y: 0.64 },
          { x: 0.55, y: 0.62 },
          { x: 0.60, y: 0.55 },
        ],
      },
    ];

    strokes.forEach((s, idx) => {
      const t = setTimeout(() => {
        if (this.phase !== "DRAWING" || !this.currentDrawerId?.startsWith("bot-")) return;
        const op: StrokeOp = {
          type: "stroke",
          id: `bot-stroke-${Date.now()}-${idx}`,
          tool: "brush",
          color: s.color,
          size: s.size,
          opacity: 1,
          points: s.points,
        };
        this.handleDrawOp(op);
      }, (idx + 1) * 2000);
      this.botTimeouts.push(t);
    });
  }

  private scheduleBotGuesses() {
    const bots = Array.from(this.players.values()).filter(
      (p) => p.id.startsWith("bot-") && p.id !== this.currentDrawerId
    );
    if (bots.length === 0 || !this.currentSecretWord) return;

    bots.forEach((bot, idx) => {
      const t1 = setTimeout(() => {
        if (this.phase !== "DRAWING" || this.hasGuessedThisTurn.has(bot.id)) return;
        const phrases = ["Hmm, tricky one!", "Nice strokes!", "Wait, let me guess...", "Looking good!"];
        this.emit("chat:message", {
          id: `msg-${Date.now()}`,
          playerId: bot.id,
          playerName: bot.nickname,
          text: phrases[Math.floor(Math.random() * phrases.length)],
          timestamp: Date.now(),
          type: "normal",
        });
      }, 8000 + idx * 3000);
      this.botTimeouts.push(t1);

      const t2 = setTimeout(() => {
        if (this.phase !== "DRAWING" || this.hasGuessedThisTurn.has(bot.id) || !this.currentSecretWord) return;
        this.handleChat(bot.id, this.currentSecretWord);
      }, 15000 + idx * 4000);
      this.botTimeouts.push(t2);
    });
  }

  private getRandomWordOptions(count: number): [string, string, string] {
    const categories = this.settings.categories || ["animals", "food", "objects"];
    let pool: string[] = [];
    const allWords = (wordsData as any).categories || {};

    for (const cat of categories) {
      if (allWords[cat]) {
        pool.push(...allWords[cat]);
      }
    }

    if (this.settings.customWords && this.settings.customWords.length > 0) {
      pool.push(...this.settings.customWords);
    }

    if (pool.length === 0) {
      pool = ["apple", "guitar", "cat", "robot", "pizza", "mountain"];
    }

    const shuffled = pool.sort(() => Math.random() - 0.5);
    return [shuffled[0], shuffled[1], shuffled[2]];
  }

  public getRoomState(): RoomState {
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
      wordHint: this.wordHint,
      revealedIndices: this.revealedIndices,
      timeLeftSeconds: this.timeLeftSeconds,
      totalTimeSeconds: this.totalTimeSeconds,
    };
  }

  public emitRoomState() {
    const state = this.getRoomState();
    this.emit("room:state", state);
  }

  private clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    for (const t of this.botTimeouts) clearTimeout(t);
    this.botTimeouts = [];
  }
}

export const virtualServer = new VirtualServer();
