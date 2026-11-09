import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../design/components/Dialog.js";
import { Button } from "../../design/components/Button.js";
import { Input } from "../../design/components/Input.js";
import { Badge } from "../../design/components/Badge.js";
import { useSocketStore } from "../../stores/useSocketStore.js";
import { toast } from "../../design/components/Toast.js";
import { Server, Zap, Globe, RefreshCw, ExternalLink } from "lucide-react";

export interface ServerSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServerSettingsModal({ open, onOpenChange }: ServerSettingsModalProps) {
  const { mode, serverUrl, setServerUrl, useBrowserEngine } = useSocketStore();
  const [inputUrl, setInputUrl] = useState(serverUrl || "");

  const handleConnectCloud = () => {
    if (!inputUrl.trim()) {
      toast.error("Please enter a valid server URL");
      return;
    }
    setServerUrl(inputUrl.trim());
    toast.success("Connecting to cloud server...");
    onOpenChange(false);
  };

  const handleSwitchBrowser = () => {
    useBrowserEngine();
    toast.info("Switched to Instant In-Browser Engine mode");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-primary-light flex items-center justify-center text-primary">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-display font-bold">Server Connection</DialogTitle>
              <DialogDescription className="text-xs">
                Realtime backend settings for SketchRoom
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 my-3">
          {/* Current Mode Status Banner */}
          <div className="p-3.5 rounded-2xl bg-surface-2 border border-border flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                Active Engine
              </span>
              <div className="flex items-center gap-2">
                {mode === "cloud" ? (
                  <>
                    <Globe className="w-4 h-4 text-success" />
                    <span className="font-display font-bold text-sm text-text-primary">
                      Cloud WebSocket Server
                    </span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="font-display font-bold text-sm text-text-primary">
                      Instant In-Browser Engine
                    </span>
                  </>
                )}
              </div>
            </div>
            <Badge variant={mode === "cloud" ? "success" : "primary"}>
              {mode === "cloud" ? "Online" : "Instant"}
            </Badge>
          </div>

          {/* Explanation */}
          <p className="text-xs text-text-muted leading-relaxed">
            {mode === "browser"
              ? "Vercel hosts the web frontend. In In-Browser Engine mode, all game features, avatar builder, drawing tools, and AI bot doodlers run directly in your browser with zero latency!"
              : `Connected to cloud realtime server at: ${serverUrl}`}
          </p>

          {/* Custom Server URL Input */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-semibold text-text-muted block">
              Connect to Custom Server (Render / Railway / LAN)
            </label>
            <div className="flex gap-2">
              <Input
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://your-server.onrender.com"
                className="text-xs"
              />
              <Button variant="primary" size="sm" onClick={handleConnectCloud} className="shrink-0 text-xs">
                Connect
              </Button>
            </div>
          </div>

          {/* Action options */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSwitchBrowser}
              className="flex-1 gap-1.5 text-xs rounded-xl"
            >
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span>Use In-Browser Engine</span>
            </Button>
            <a
              href="https://github.com/Bhargav221287/sketchroom#1-backend-on-render"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs text-text-muted rounded-xl">
                <span>Deploy Server Free</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

