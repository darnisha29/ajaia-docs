"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error"

export type UseAutosaveOptions<T> = {
  save: (value: T) => Promise<void>
  /** Quiet period after the last keystroke before a write goes out. */
  delayMs?: number
}

/**
 * Debounced save-on-change with in-flight coalescing.
 *
 * Two things this handles that a bare `setTimeout` does not:
 *
 * 1. Typing during a request. Only one save is ever in flight; edits made while
 *    it runs are held and written immediately after it resolves, so the last
 *    keystroke always reaches the server without stacking concurrent PATCHes
 *    that could land out of order.
 * 2. Leaving with unsaved work — `flush()` skips the debounce, and a
 *    beforeunload guard warns if a write is still outstanding.
 */
export const useAutosave = <T>({
  save,
  delayMs = 900,
}: UseAutosaveOptions<T>) => {
  const [status, setStatus] = useState<SaveStatus>("idle")

  // The latest save closure without re-creating schedule/flush on every render.
  const saveRef = useRef(save)

  useEffect(() => {
    saveRef.current = save
  }, [save])

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingRef = useRef<{ value: T } | null>(null)
  const inFlightRef = useRef(false)

  const run = useCallback(async (): Promise<void> => {
    if (inFlightRef.current || !pendingRef.current) return

    inFlightRef.current = true
    setStatus("saving")

    try {
      // Drain rather than recurse: an edit that lands mid-request is picked up
      // by the next pass, so the final keystroke always reaches the server and
      // only one request is ever open.
      while (pendingRef.current) {
        const { value } = pendingRef.current
        pendingRef.current = null

        try {
          await saveRef.current(value)
        } catch (error) {
          // Put the value back (unless something newer already replaced it) so
          // a later flush or keystroke retries instead of dropping the edit.
          pendingRef.current ??= { value }
          throw error
        }
      }

      setStatus("saved")
    } catch {
      setStatus("error")
    } finally {
      inFlightRef.current = false
    }
  }, [])

  const schedule = useCallback(
    (value: T) => {
      pendingRef.current = { value }
      setStatus((current) => (current === "saving" ? current : "unsaved"))

      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => void run(), delayMs)
    },
    [delayMs, run],
  )

  const flush = useCallback(async (): Promise<void> => {
    clearTimeout(timerRef.current)
    await run()
  }, [run])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!pendingRef.current && !inFlightRef.current) return
      event.preventDefault()
    }

    window.addEventListener("beforeunload", onBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      clearTimeout(timerRef.current)

      // Flush rather than drop: navigating away mid-debounce (clicking "Back"
      // right after typing) must not lose the last edit. The request outlives
      // this component, so it isn't awaited here.
      void run()
    }
  }, [run])

  return { status, schedule, flush }
}
