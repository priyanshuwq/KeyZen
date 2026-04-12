"use client";

import { useRef } from "react";
import { IconX } from "@tabler/icons-react";
import { motion, AnimatePresence } from "motion/react";
import { useSettings, ACCENT_COLORS, FONT_OPTIONS, type AccentColor, type TypingFont } from "@/components/settings-context";
import { NextThemeSwitcher } from "@/components/kibo-ui/theme-switcher";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { accent, setAccent, font, setFont, showKeyboard, setShowKeyboard, soundEnabled, setSoundEnabled, realtimeWpm, setRealtimeWpm } = useSettings();

  // Drag-to-scroll for color swatches
  const swatchRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ dragging: false, startX: 0, scrollLeft: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    const el = swatchRef.current;
    if (!el) return;
    dragState.current = { dragging: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
    el.style.cursor = "grabbing";
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragState.current.dragging || !swatchRef.current) return;
    e.preventDefault();
    const x = e.pageX - swatchRef.current.offsetLeft;
    const walk = x - dragState.current.startX;
    swatchRef.current.scrollLeft = dragState.current.scrollLeft - walk;
  };
  const onMouseUp = () => {
    dragState.current.dragging = false;
    if (swatchRef.current) swatchRef.current.style.cursor = "grab";
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.aside
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="fixed right-0 top-0 z-50 flex h-full w-72 flex-col border-l border-border bg-background shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Settings
              </span>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <IconX size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-7">

              {/* Theme */}
              <section className="flex items-center justify-between">
                <SectionLabel>Theme</SectionLabel>
                <NextThemeSwitcher />
              </section>

              {/* Accent color — draggable rectangle swatches */}
              <section>
                <SectionLabel>Accent</SectionLabel>
                <div
                  ref={swatchRef}
                  className="mt-3 flex gap-2 overflow-x-auto pb-1 select-none"
                  style={{ cursor: "grab", scrollbarWidth: "none" }}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                >
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setAccent(c.id)}
                      title={c.label}
                      className={cn(
                        "h-7 w-12 shrink-0 rounded-sm transition-all duration-150",
                        accent === c.id
                          ? "opacity-100"
                          : "opacity-40 hover:opacity-80",
                      )}
                      style={{ background: c.swatch }}
                    />
                  ))}
                </div>
              </section>

              {/* Keyboard + Sound toggles — keyboard only visible on lg+, so disable on mobile */}
              <section className="flex flex-col gap-3">
                <ToggleRow
                  label="Show keyboard"
                  enabled={showKeyboard}
                  onToggle={() => setShowKeyboard(!showKeyboard)}
                  disabledReason="keyboard not available on mobile"
                />
                <ToggleRow
                  label="Sound"
                  enabled={soundEnabled}
                  onToggle={() => setSoundEnabled(!soundEnabled)}
                  disabledReason="keyboard not available on mobile"
                />
                <ToggleRow
                  label="Realtime WPM"
                  enabled={realtimeWpm}
                  onToggle={() => setRealtimeWpm(!realtimeWpm)}
                />
              </section>

              {/* Font — Select dropdown */}
              <section>
                <SectionLabel>Font</SectionLabel>
                <Select value={font} onValueChange={(v) => setFont(v as TypingFont)}>
                  <SelectTrigger className="mt-3 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel className="text-[10px] uppercase tracking-widest">Mono</SelectLabel>
                      {FONT_OPTIONS.filter((f) => f.tag === "mono").map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          <span style={{ fontFamily: f.cssFamily }}>
                            {f.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="text-[10px] uppercase tracking-widest">Display</SelectLabel>
                      {FONT_OPTIONS.filter((f) => f.tag === "display").map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          <span style={{ fontFamily: f.cssFamily }}>
                            {f.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </section>

            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

function ToggleRow({
  label,
  enabled,
  onToggle,
  disabledReason,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  disabledReason?: string;
}) {
  // Use JS window check to detect mobile (lg = 1024px)
  const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
  const isDisabled = !!disabledReason && isMobile;

  return (
    <div
      className="flex items-center justify-between"
      title={isDisabled ? disabledReason : undefined}
    >
      <span className={cn(
        "text-[11px] font-semibold uppercase tracking-widest",
        isDisabled ? "text-muted-foreground/40" : "text-muted-foreground",
      )}>
        {label}
      </span>
      <button
        onClick={isDisabled ? undefined : onToggle}
        disabled={isDisabled}
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors duration-200",
          isDisabled
            ? "cursor-not-allowed bg-muted opacity-40"
            : enabled ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform duration-200",
            !isDisabled && enabled && "translate-x-4"
          )}
        />
      </button>
    </div>
  );
}
