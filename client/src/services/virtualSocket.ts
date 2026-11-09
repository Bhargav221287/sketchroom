import { ClientToServerEvents, ServerToClientEvents } from "@sketchroom/shared";
import { virtualServer } from "./virtualServer.js";

type EventCallback = (...args: any[]) => void;

export class VirtualSocket {
  public connected: boolean = true;
  public id: string = `v-sock-${Date.now()}`;
  public data: { playerId?: string; roomCode?: string; nickname?: string } = {};

  private eventHandlers: Map<string, Set<EventCallback>> = new Map();

  constructor() {
    this.connected = true;
    this.setupServerForwarding();
  }

  private setupServerForwarding() {
    // Intercept server events and forward to local handlers
    const knownEvents = [
      "room:state",
      "room:error",
      "player:joined",
      "player:left",
      "player:reconnected",
      "game:word_options",
      "game:drawer_choosing",
      "game:turn_start",
      "game:hint_reveal",
      "game:timer_tick",
      "game:turn_end",
      "game:game_over",
      "draw:op",
      "draw:history_replay",
      "draw:remote_cursor",
      "draw:undo",
      "draw:redo",
      "draw:clear",
      "chat:message",
      "chat:correct_guess",
      "chat:close_guess",
      "reaction:broadcast",
    ];

    knownEvents.forEach((evt) => {
      virtualServer.on(evt, (data: any) => {
        this.triggerLocal(evt, data);
      });
    });
  }

  private triggerLocal(event: string, ...args: any[]) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(...args);
        } catch (err) {
          console.error(`[VirtualSocket] Handler error for ${event}:`, err);
        }
      });
    }
  }

  public on(event: string, fn: EventCallback): this {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(fn);
    return this;
  }

  public off(event: string, fn?: EventCallback): this {
    if (!fn) {
      this.eventHandlers.delete(event);
    } else {
      this.eventHandlers.get(event)?.delete(fn);
    }
    return this;
  }

  public once(event: string, fn: EventCallback): this {
    const wrapper = (...args: any[]) => {
      this.off(event, wrapper);
      fn(...args);
    };
    return this.on(event, wrapper);
  }

  public emit(event: string, ...args: any[]): this {
    // Handle Client to Server events
    switch (event) {
      case "room:create": {
        const [payload, callback] = args;
        const res = virtualServer.createRoom(payload.nickname, payload.avatar, payload.settings);
        this.data.playerId = res.playerId;
        this.data.roomCode = res.roomCode;
        this.data.nickname = payload.nickname;
        if (typeof callback === "function") {
          callback({ success: true, ...res });
        }
        break;
      }

      case "room:join": {
        const [payload, callback] = args;
        const res = virtualServer.joinRoom(payload.roomCode, payload.nickname, payload.avatar);
        this.data.playerId = res.playerId;
        this.data.roomCode = res.roomCode;
        this.data.nickname = payload.nickname;
        if (typeof callback === "function") {
          callback(res);
        }
        break;
      }

      case "room:add_bot":
        virtualServer.addBotPlayer();
        break;

      case "room:remove_bot":
        virtualServer.removeBotPlayer();
        break;

      case "room:update_settings": {
        const [payload] = args;
        virtualServer.updateSettings(payload.settings);
        break;
      }

      case "room:set_ready": {
        const [payload] = args;
        if (this.data.playerId) {
          virtualServer.setReady(this.data.playerId, payload.ready);
        }
        break;
      }

      case "room:kick": {
        const [payload] = args;
        virtualServer.kickPlayer(payload.targetPlayerId);
        break;
      }

      case "room:leave":
        if (this.data.playerId) {
          virtualServer.kickPlayer(this.data.playerId);
        }
        break;

      case "game:start":
        virtualServer.startGame();
        break;

      case "game:choose_word": {
        const [payload] = args;
        virtualServer.chooseWord(payload.wordIndex);
        break;
      }

      case "game:play_again":
        virtualServer.playAgain();
        break;

      case "draw:op": {
        const [payload] = args;
        virtualServer.handleDrawOp(payload.op);
        break;
      }

      case "draw:undo":
        virtualServer.handleUndo();
        break;

      case "draw:redo":
        virtualServer.handleRedo();
        break;

      case "draw:clear":
        virtualServer.handleClear();
        break;

      case "draw:cursor_move": {
        const [payload] = args;
        virtualServer.handleCursorMove(payload.x, payload.y, this.data.playerId || "");
        break;
      }

      case "turn:snapshot":
      case "draw:turn_snapshot": {
        const [payload] = args;
        virtualServer.saveTurnSnapshot(payload.dataUrl);
        break;
      }

      case "chat:send": {
        const [payload] = args;
        virtualServer.handleChat(this.data.playerId || "", payload.text);
        break;
      }

      case "reaction:send": {
        const [payload] = args;
        virtualServer.handleReaction(
          payload.emoji,
          this.data.playerId || "",
          this.data.nickname || "Doodler"
        );
        break;
      }

      default:
        console.warn(`[VirtualSocket] Unhandled emit event: ${event}`);
    }

    return this;
  }

  public disconnect(): this {
    this.connected = false;
    this.triggerLocal("disconnect");
    return this;
  }
}
