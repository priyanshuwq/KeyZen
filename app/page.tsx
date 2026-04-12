"use client"

import { useState, useCallback, useRef } from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import { Keyboard } from "@/components/ui/keyboard"
import { TypingTest } from "@/components/typing-test"
import { SettingsPanel } from "@/components/settings-panel"
import { useSettings } from "@/components/settings-context"
import { IconSettings } from "@tabler/icons-react"
import { CornerBrackets } from "@/components/corner-brackets"
import { Button } from "@/components/ui/button"
import { GithubLogo } from "@phosphor-icons/react"

export default function Page() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [isTypingActive, setIsTypingActive] = useState(false)
  const [restartKey, setRestartKey] = useState(0)
  const { showKeyboard, soundEnabled } = useSettings()

  // Header fades while typing; mouse movement restores it briefly
  const [headerVisible, setHeaderVisible] = useState(true)
  const headerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTypingActiveChange = useCallback((active: boolean) => {
    setIsTypingActive(active)
    if (!active) {
      setHeaderVisible(true)
    } else {
      setHeaderVisible(false)
    }
  }, [])

  const handleHeaderMouseMove = useCallback(() => {
    if (!isTypingActive) return
    setHeaderVisible(true)
    if (headerTimerRef.current) clearTimeout(headerTimerRef.current)
    headerTimerRef.current = setTimeout(() => setHeaderVisible(false), 2500)
  }, [isTypingActive])

  const handleKeyHighlight = useCallback((_key: string | null) => {}, [])

  const handleLogoClick = () => {
    setIsFinished(false)
    setRestartKey(k => k + 1)
  }

  const showFooter = !isFinished && showKeyboard  // controls layout split, not mounting

  return (
    <div className="flex min-h-dvh w-full flex-col bg-background">
      <motion.header
        animate={{ opacity: headerVisible ? 1 : 0.1 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        onMouseMove={handleHeaderMouseMove}
        className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3"
      >
        <div className="flex items-center gap-3">
          <span
            onClick={handleLogoClick}
            className="cursor-pointer font-(family-name:--font-doto) text-4xl font-bold text-primary"
          >
            KeyZen
          </span>
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-lg cursor-pointer p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <IconSettings size={16} />
          </button>
        </div>
      <CornerBrackets>
        <Button variant="noborderradius" asChild>
          <a
            href="https://github.com/shivabhattacharjee/KeyZen"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <GithubLogo />
            Open Source
          </a>
        </Button>
      </CornerBrackets>
      </motion.header>

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
            onTypingActiveChange={handleTypingActiveChange}
            pauseTypingInputRefocus={settingsOpen}
          />
        </main>

        {!isFinished && (
          <footer className={cn(
            "hidden items-center justify-center border-t border-border lg:flex",
            showKeyboard ? "flex-1 flex-col" : "h-0 overflow-hidden invisible border-0"
          )}>
            <div className="scale-[0.85]">
              <Keyboard theme="classic" enableHaptics enableSound={soundEnabled} forceActive={soundEnabled && !showKeyboard} />
            </div>
          </footer>
        )}
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
