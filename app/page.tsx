"use client"

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Keyboard } from "@/components/ui/keyboard"
import { TypingTest } from "@/components/typing-test"
import { SettingsPanel } from "@/components/settings-panel"
import { useSettings } from "@/components/settings-context"
import { IconSettings } from "@tabler/icons-react"
import { Button } from "@/components/ui/button";
import { GithubLogo } from "@phosphor-icons/react";

export default function Page() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [restartKey, setRestartKey] = useState(0)
  const { showKeyboard, soundEnabled } = useSettings()

  const handleKeyHighlight = useCallback((_key: string | null) => {}, [])

  const handleLogoClick = () => {
    setIsFinished(false)
    setRestartKey(k => k + 1)
  }

  const showFooter = !isFinished && showKeyboard  // controls layout split, not mounting

  return (
    <div className="flex min-h-dvh w-full flex-col bg-background">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <span
            onClick={handleLogoClick}
            className="cursor-pointer font-(family-name:--font-doto) text-4xl font-bold text-primary"
          >
            KeyZen
          </span>
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <IconSettings size={16} />
          </button>
        </div>
      <Button variant={"outline"}>
       <a href="https://github.com/shivabhattacharjee/KeyZen" target="_blank" rel="noopener noreferrer" className="flex gap-2 items-center"><GithubLogo/> Open Source</a>
      </Button>
      </header>

      {/* Body — two equal halves when keyboard is visible */}
      <div className="flex flex-1 flex-col">
        {/* Top half: typing test */}
        <main className={cn(
          "flex flex-col px-6",
          isFinished
            ? "flex-1 justify-center px-10 py-2"
            : showFooter
              ? "flex-1 items-center justify-center lg:justify-end lg:pb-8"
              : "flex-1 items-center justify-center"
        )}>
          <TypingTest
            key={restartKey}
            onKeyHighlight={handleKeyHighlight}
            onFinished={setIsFinished}
          />
        </main>

        {/* Bottom half: keyboard — desktop only */}
        {/* Always mounted on desktop when sound is on so audio context stays alive */}
        {!isFinished && (
          <footer className={cn(
            "hidden flex-1 flex-col items-center justify-center border-t border-border lg:flex",
            !showKeyboard && "invisible h-0 overflow-hidden border-0"
          )}>
            <div className="scale-[0.85]">
              <Keyboard theme="classic" enableHaptics enableSound={soundEnabled} />
            </div>
          </footer>
        )}
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
