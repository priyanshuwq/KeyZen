"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useMountEffect } from "@/hooks/use-mount-effect"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "motion/react"
import { IconInfoCircle, IconSettings } from "@tabler/icons-react"
import { GithubLogo } from "@phosphor-icons/react"

import { CornerBrackets } from "@/components/corner-brackets"
import { DynamicFavicon } from "@/components/dynamic-favicon"
import { SettingsPanel } from "@/components/settings-panel"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AppChromeContextValue {
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  typingActive: boolean
  setTypingActive: (active: boolean) => void
  homeLogoHandlerRef: React.MutableRefObject<(() => void) | null>
}

const AppChromeContext = createContext<AppChromeContextValue | null>(null)

export function useAppChrome() {
  const ctx = useContext(AppChromeContext)
  if (!ctx)
    throw new Error("useAppChrome must be used within AppChrome")
  return ctx
}

export function AppChrome({ children }: { children: ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [typingActive, setTypingActive] = useState(false)
  const homeLogoHandlerRef = useRef<(() => void) | null>(null)

  const value = useMemo(
    () => ({
      settingsOpen,
      setSettingsOpen,
      typingActive,
      setTypingActive,
      homeLogoHandlerRef,
    }),
    [settingsOpen, typingActive],
  )

  return (
    <AppChromeContext.Provider value={value}>
      <DynamicFavicon />
      <div className="flex min-h-dvh w-full flex-col bg-background">
        <SiteHeader />
        {children}
      </div>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </AppChromeContext.Provider>
  )
}

function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { setSettingsOpen, typingActive, setTypingActive, homeLogoHandlerRef } =
    useAppChrome()

  const isHome = pathname === "/"
  const dimHeader = isHome && typingActive

  // Rule 1: derive header visibility inline instead of syncing via useEffect.
  // mouseHeaderVisible tracks the temporary override when the user moves the mouse
  // while actively typing on the home page.
  const [mouseHeaderVisible, setMouseHeaderVisible] = useState(false)
  const headerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Base: always visible unless on home page AND actively typing.
  // Mouse override only matters when the base would hide the header.
  const headerVisible = !isHome || !typingActive || (isHome && typingActive && mouseHeaderVisible)

  const handleHeaderMouseMove = useCallback(() => {
    if (!isHome || !typingActive) return
    setMouseHeaderVisible(true)
    if (headerTimerRef.current) clearTimeout(headerTimerRef.current)
    headerTimerRef.current = setTimeout(() => setMouseHeaderVisible(false), 2500)
  }, [isHome, typingActive])

  // Rule 4: useMountEffect for cleanup-only timer on unmount.
  useMountEffect(() => {
    return () => {
      if (headerTimerRef.current) clearTimeout(headerTimerRef.current)
    }
  })

  function handleLogoClick() {
    if (isHome && homeLogoHandlerRef.current) {
      homeLogoHandlerRef.current()
      return
    }
    router.push("/")
  }

  const iconButtonClass =
    "rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"

  return (
    <motion.header
      animate={{ opacity: dimHeader ? (headerVisible ? 1 : 0.1) : 1 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      onMouseMove={handleHeaderMouseMove}
      className="flex shrink-0 justify-center border-b border-border px-6 py-3"
    >
      <div className="flex w-full max-w-5xl items-center justify-between">
      <div className="flex items-center gap-3">
        {isHome ? (
          <button
            type="button"
            onClick={handleLogoClick}
            className="cursor-pointer font-(family-name:--font-doto) text-4xl font-bold text-primary"
          >
            KeyZen
          </button>
        ) : (
          <Link
            href="/"
            className="font-(family-name:--font-doto) text-4xl font-bold text-primary"
          >
            KeyZen
          </Link>
        )}
        <div className="flex items-center gap-0.5">
          <Link
            href="/about"
            prefetch
            className={cn(
              iconButtonClass,
              pathname === "/about" && "text-foreground",
            )}
            aria-current={pathname === "/about" ? "page" : undefined}
            aria-label="About KeyZen"
          >
            <IconInfoCircle size={16} stroke={1.5} aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className={cn(iconButtonClass, "cursor-pointer")}
            aria-label="Settings"
          >
            <IconSettings size={16} />
          </button>
        </div>
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
      </div>
    </motion.header>
  )
}
