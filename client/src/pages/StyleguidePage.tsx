import * as React from "react";
import { Button } from "../design/components/Button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../design/components/Card.js";
import { Input } from "../design/components/Input.js";
import { Badge } from "../design/components/Badge.js";
import { Slider } from "../design/components/Slider.js";
import { Toggle } from "../design/components/Toggle.js";
import { ProgressRing } from "../design/components/ProgressRing.js";
import { Avatar } from "../design/components/Avatar.js";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../design/components/Tooltip.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../design/components/Dialog.js";
import { toast } from "../design/components/Toast.js";
import { useThemeStore } from "../stores/useThemeStore.js";
import { ACCENT_THEMES } from "../design/themes.js";
import { generateRandomAvatar } from "@sketchroom/shared";
import { Moon, Sun, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export function StyleguidePage() {
  const { accent, isDark, setAccent, toggleDarkMode } = useThemeStore();
  const [sliderVal, setSliderVal] = React.useState([45]);
  const [timerVal, setTimerVal] = React.useState([25]);
  const [toggleState, setToggleState] = React.useState(true);
  const [sampleAvatar, setSampleAvatar] = React.useState(() => generateRandomAvatar());

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-surface-0 text-text-primary p-6 md:p-12 space-y-12 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b-2 border-border">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎨</span>
              <h1 className="text-4xl font-display font-bold tracking-tight">SketchRoom Design System</h1>
            </div>
            <p className="text-text-muted mt-1 text-sm">
              Component playground, design tokens, and accessibility verification on route <code className="bg-surface-2 px-2 py-0.5 rounded-lg border border-border">/styleguide</code>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="outline" size="sm">
                ← Back to Home
              </Button>
            </Link>
            <Button variant="secondary" size="icon" onClick={toggleDarkMode} title="Toggle Dark Mode">
              {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-500" />}
            </Button>
          </div>
        </div>

        {/* Theme Engine */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-bold">1. Accent Themes & Appearance</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {ACCENT_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setAccent(theme.id)}
                className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col justify-between h-28 ${
                  accent === theme.id
                    ? "border-primary bg-primary-light/40 shadow-tactile-primary"
                    : "border-border bg-surface-1 hover:bg-surface-2"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-display font-bold">{theme.name}</span>
                  {accent === theme.id && <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">Active</span>}
                </div>
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: theme.primaryColor }} />
                  <div className="w-6 h-6 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: theme.accentColor }} />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-bold">2. Tactile Buttons</h2>
          <Card>
            <CardHeader>
              <CardTitle>Variants & Interactive Depress</CardTitle>
              <CardDescription>Buttons have a 4px physical offset and depress on active click.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
              <Button variant="primary">Primary Action</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="accent">Accent Sparkle</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="primary" isLoading>
                Loading
              </Button>
              <Button variant="secondary" disabled>
                Disabled
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Avatars */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-bold">3. Composable SVG Avatars</h2>
            <Button variant="secondary" size="sm" onClick={() => setSampleAvatar(generateRandomAvatar())}>
              🎲 Randomize Preview
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-6 items-center justify-items-center">
              <div className="flex flex-col items-center gap-2">
                <Avatar config={sampleAvatar} size="xl" state="idle" />
                <span className="text-xs font-semibold text-text-muted">Idle State (XL)</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Avatar config={sampleAvatar} size="lg" state="drawing" />
                <span className="text-xs font-semibold text-text-muted">Drawing (Pencil badge)</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Avatar config={sampleAvatar} size="lg" state="correct" />
                <span className="text-xs font-semibold text-text-muted">Guessed! (Bounce)</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Avatar config={sampleAvatar} size="lg" state="disconnected" />
                <span className="text-xs font-semibold text-text-muted">Disconnected (Sleepy)</span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Inputs & Form Controls */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-bold">4. Inputs & Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Text Inputs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-text-muted mb-1 block">Nickname Input</label>
                  <Input placeholder="Enter your nickname..." defaultValue="DoodleChamp" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted mb-1 block">Error State</label>
                  <Input placeholder="Invalid room code..." error defaultValue="1234" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sliders & Toggles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-text-muted mb-2">
                    <span>Draw Time: {sliderVal[0]}s</span>
                  </div>
                  <Slider value={sliderVal} onValueChange={setSliderVal} min={30} max={120} step={5} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Sound Effects</span>
                  <Toggle checked={toggleState} onCheckedChange={setToggleState} />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ProgressRing & Feedback */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-bold">5. Animated Timer Ring & Badges</h2>
          <Card>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              <div className="flex flex-col items-center gap-3">
                <ProgressRing value={timerVal[0]} max={80} size={70} strokeWidth={6} />
                <span className="text-xs font-semibold text-text-muted">Interactive Timer: {timerVal[0]}s</span>
                <div className="w-48">
                  <Slider value={timerVal} onValueChange={setTimerVal} min={0} max={80} step={1} />
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="flex gap-4">
                  <ProgressRing value={65} max={80} size={54} strokeWidth={5} />
                  <ProgressRing value={35} max={80} size={54} strokeWidth={5} />
                  <ProgressRing value={8} max={80} size={54} strokeWidth={5} />
                </div>
                <span className="text-xs font-semibold text-text-muted">Shifts: Green → Amber → Red (pulse)</span>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="primary">Host 👑</Badge>
                <Badge variant="success">Guessed! ✓</Badge>
                <Badge variant="warning">Close! ⚠️</Badge>
                <Badge variant="danger">Disconnected</Badge>
                <Badge variant="default">Spectator</Badge>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Dialog, Tooltip & Toasts */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-bold">6. Modals, Tooltips & Toasts</h2>
          <Card>
            <CardContent className="pt-6 flex flex-wrap items-center gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary">Open Sample Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Game Settings</DialogTitle>
                    <DialogDescription>Custom room rules and time adjustments.</DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <p className="text-sm text-text-muted">
                      This modal demonstrates the rounded-3xl glass backdrop dialog with tactile button controls.
                    </p>
                  </div>
                  <Button variant="primary">Save Changes</Button>
                </DialogContent>
              </Dialog>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">Hover for Tooltip</Button>
                </TooltipTrigger>
                <TooltipContent>Shortcut: B for Brush</TooltipContent>
              </Tooltip>

              <Button
                variant="outline"
                onClick={() => toast.success("Correct guess! +380 points awarded.")}
              >
                Trigger Success Toast
              </Button>
              <Button
                variant="outline"
                onClick={() => toast.warning("You're close! Only 1 letter off.")}
              >
                Trigger Close Toast
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </TooltipProvider>
  );
}
