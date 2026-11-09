import * as React from "react";
import { ChatMessage, EMOJI_REACTIONS } from "@sketchroom/shared";
import { Input } from "../../design/components/Input.js";
import { Button } from "../../design/components/Button.js";
import { Send, ArrowDown, Sparkles } from "lucide-react";
import { cn } from "../../design/utils.js";

export interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onSendReaction: (emoji: string) => void;
  disabled?: boolean;
  hasGuessed?: boolean;
  isDrawer?: boolean;
  className?: string;
}

export function ChatPanel({
  messages,
  onSendMessage,
  onSendReaction,
  disabled = false,
  hasGuessed = false,
  isDrawer = false,
  className,
}: ChatPanelProps) {
  const [inputVal, setInputVal] = React.useState("");
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = React.useState(false);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
      setShowScrollBottom(false);
    } else {
      setShowScrollBottom(true);
    }
  }, [messages]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setShowScrollBottom(!isNearBottom);
  };

  const scrollToBottom = () => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      setShowScrollBottom(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || disabled) return;
    onSendMessage(inputVal);
    setInputVal("");
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-surface-1 rounded-3xl border-2 border-border shadow-card overflow-hidden",
        className
      )}
    >
      {/* Messages Header / Guesser status indicator */}
      <div className="px-4 py-2.5 border-b border-border bg-surface-2/60 flex items-center justify-between">
        <span className="font-display font-bold text-xs uppercase tracking-wider text-text-muted">
          Chat & Guesses
        </span>
        {hasGuessed && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-success bg-success-light px-2 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3" /> Guessed (Chatting with guessers)
          </span>
        )}
        {isDrawer && (
          <span className="text-[11px] font-bold text-primary bg-primary-light px-2 py-0.5 rounded-full">
            Drawer Mode
          </span>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 p-4 overflow-y-auto space-y-2 relative"
        aria-live="polite"
        role="log"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-text-muted text-xs p-4">
            <p>No messages yet.</p>
            <p className="mt-1">Type your guesses below!</p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.type === "correct") {
              return (
                <div
                  key={msg.id}
                  className="p-2 rounded-2xl bg-success-light border border-success/30 text-success text-xs font-bold flex items-center gap-2 animate-in fade-in-0 slide-in-from-bottom-1"
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>{msg.playerName}</strong> {msg.text}
                  </span>
                </div>
              );
            }

            if (msg.type === "system") {
              return (
                <div
                  key={msg.id}
                  className="p-2 rounded-xl bg-surface-3 text-text-muted text-xs text-center font-medium"
                >
                  {msg.text}
                </div>
              );
            }

            const isGuesserChat = msg.type === "guesser";

            return (
              <div
                key={msg.id}
                className={cn(
                  "p-2.5 rounded-2xl text-xs max-w-[85%] break-words",
                  isGuesserChat
                    ? "bg-primary-light/50 border border-primary/30 text-text-primary ml-auto"
                    : "bg-surface-2 text-text-primary mr-auto"
                )}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-display font-bold text-text-primary">{msg.playerName}</span>
                  {isGuesserChat && (
                    <span className="text-[9px] font-bold bg-primary text-white px-1 rounded">Guesser</span>
                  )}
                </div>
                <p className="leading-relaxed">{msg.text}</p>
              </div>
            );
          })
        )}

        {/* New Messages Floating Button */}
        {showScrollBottom && (
          <button
            onClick={scrollToBottom}
            className="sticky bottom-2 left-1/2 -translate-x-1/2 bg-primary text-white px-3 py-1 rounded-full shadow-lg text-xs font-bold flex items-center gap-1 hover:bg-primary-hover transition-all"
          >
            <span>New messages</span>
            <ArrowDown className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Quick Emoji Reaction Bar */}
      <div className="px-3 py-1.5 bg-surface-2 border-t border-border flex items-center justify-between gap-1">
        {EMOJI_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSendReaction(emoji)}
            className="p-1 hover:scale-125 transition-transform text-lg select-none"
            title={`React ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Field */}
      <form onSubmit={handleSubmit} className="p-3 bg-surface-1 border-t border-border flex gap-2">
        <Input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={
            isDrawer
              ? "You're drawing! Chat with guessers..."
              : hasGuessed
              ? "You guessed it! Chat with guessers..."
              : "Type your guess here..."
          }
          disabled={disabled}
          className="h-10 text-xs rounded-xl"
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!inputVal.trim() || disabled}
          className="h-10 px-3 rounded-xl shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
