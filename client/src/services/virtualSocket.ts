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

  public triggerLocal(event: string, ...args: any[]) {
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
        if (virtualServer.isHostInstance) {
          virtualServer.addBotPlayer();
        } else {
          virtualServer.forwardClientAction("room:add_bot", {});
        }
        break;

      case "room:remove_bot":
        if (virtualServer.isHostInstance) {
          virtualServer.removeBotPlayer();
        } else {
          virtualServer.forwardClientAction("room:remove_bot", {});
        }
        break;

      case "room:update_settings": {
        const [payload] = args;
        if (virtualServer.isHostInstance) {
          virtualServer.updateSettings(payload.settings);
        } else {
          virtualServer.forwardClientAction("room:update_settings", { settings: payload.settings });
        }
        break;
      }

      case "room:set_ready": {
        const [payload] = args;
        if (this.data.playerId) {
          if (virtualServer.isHostInstance) {
            virtualServer.setReady(this.data.playerId, payload.ready);
          } else {
            virtualServer.forwardClientAction("room:set_ready", {
              playerId: this.data.playerId,
              ready: payload.ready,
            });
          }
        }
        break;
      }

      case "room:kick": {
        const [payload] = args;
        if (virtualServer.isHostInstance) {
          virtualServer.kickPlayer(payload.targetPlayerId);
        } else {
          virtualServer.forwardClientAction("room:kick", { targetPlayerId: payload.targetPlayerId });
        }
        break;
      }

      case "room:leave":
        if (this.data.playerId) {
          if (virtualServer.isHostInstance) {
            virtualServer.kickPlayer(this.data.playerId);
          } else {
            virtualServer.forwardClientAction("room:kick", { targetPlayerId: this.data.playerId });
          }
        }
        break;

      case "game:start":
        if (virtualServer.isHostInstance) {
          virtualServer.startGame();
        } else {
          virtualServer.forwardClientAction("game:start", {});
        }
        break;

      case "game:choose_word": {
        const [payload] = args;
        if (virtualServer.isHostInstance) {
          virtualServer.chooseWord(payload.wordIndex);
        } else {
          virtualServer.forwardClientAction("game:choose_word", { wordIndex: payload.wordIndex });
        }
        break;
      }

      case "game:play_again":
        if (virtualServer.isHostInstance) {
          virtualServer.playAgain();
        } else {
          virtualServer.forwardClientAction("game:play_again", {});
        }
        break;

      case "draw:op": {
        const [payload] = args;
        if (virtualServer.isHostInstance) {
          virtualServer.handleDrawOp(payload.op);
        } else {
          // Immediately render locally for zero input lag
          this.triggerLocal("draw:op", { op: payload.op });
          virtualServer.forwardClientAction("draw:op", { op: payload.op });
        }
        break;
      }

      case "draw:undo":
        if (virtualServer.isHostInstance) {
          virtualServer.handleUndo();
        } else {
          this.triggerLocal("draw:undo");
          virtualServer.forwardClientAction("draw:undo", {});
        }
        break;

      case "draw:redo":
        if (virtualServer.isHostInstance) {
          virtualServer.handleRedo();
        } else {
          virtualServer.forwardClientAction("draw:redo", {});
        }
        break;

      case "draw:clear":
        if (virtualServer.isHostInstance) {
          virtualServer.handleClear();
        } else {
          this.triggerLocal("draw:clear");
          virtualServer.forwardClientAction("draw:clear", {});
        }
        break;

      case "draw:cursor_move": {
        const [payload] = args;
        if (virtualServer.isHostInstance) {
          virtualServer.handleCursorMove(payload.x, payload.y, this.data.playerId || "");
        } else {
          virtualServer.forwardClientAction("draw:cursor_move", {
            x: payload.x,
            y: payload.y,
            playerId: this.data.playerId || "",
          });
        }
        break;
      }

      case "turn:snapshot":
      case "draw:turn_snapshot": {
        const [payload] = args;
        if (virtualServer.isHostInstance) {
          virtualServer.saveTurnSnapshot(payload.dataUrl);
        } else {
          virtualServer.forwardClientAction("turn:snapshot", { dataUrl: payload.dataUrl });
        }
        break;
      }

      case "chat:send": {
        const [payload] = args;
        if (virtualServer.isHostInstance) {
          virtualServer.handleChat(this.data.playerId || "", payload.text);
        } else {
          virtualServer.forwardClientAction("chat:send", {
            playerId: this.data.playerId || "",
            text: payload.text,
          });
        }
        break;
      }

      case "reaction:send": {
        const [payload] = args;
        if (virtualServer.isHostInstance) {
          virtualServer.handleReaction(
            payload.emoji,
            this.data.playerId || "",
            this.data.nickname || "Doodler"
          );
        } else {
          virtualServer.forwardClientAction("reaction:send", {
            emoji: payload.emoji,
            playerId: this.data.playerId || "",
            playerName: this.data.nickname || "Doodler",
          });
        }
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
