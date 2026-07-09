import { useEffect, useRef, useCallback } from 'react'
import api from '@/services/api'

/**
 * useMatchWatchdog
 *
 * Polls all SCHEDULED matches every `pollIntervalMs` (default 60s).
 * When a match's scheduled date has passed and it hasn't started:
 *  1. Calls `onOverdue(match)` so the UI can show an alert.
 *  2. Starts a `abandonAfterMs` (default 10 min) countdown.
 *     If the countdown completes without admin action, the match is
 *     automatically marked ABANDONED via PUT /api/matches/:id.
 *
 * @param {object} options
 * @param {Function} options.onOverdue   - called with each newly overdue match object
 * @param {Function} options.onAbandoned - called with matchId when auto-abandoned
 * @param {number}  [options.pollIntervalMs=60000]   - how often to re-check
 * @param {number}  [options.abandonAfterMs=600000]  - 10-min window before auto-abandon
 */
export function useMatchWatchdog({
  onOverdue,
  onAbandoned,
  pollIntervalMs = 60_000,
  abandonAfterMs = 600_000,
} = {}) {
  // Track which match IDs we have already alerted (to avoid duplicate alerts)
  const alertedIds = useRef(new Set())
  // Track per-match abandon timers: matchId → timeoutId
  const abandonTimers = useRef({})

  const checkMatches = useCallback(async () => {
    try {
      const res = await api.get('/matches')
      const matches = res.data?.data ?? []
      const now = new Date()

      matches.forEach((match) => {
        if (match.status !== 'SCHEDULED') return
        if (!match.date) return
        if (new Date(match.date) > now) return          // not yet overdue
        if (alertedIds.current.has(match.id)) return    // already alerted

        // Mark as alerted so we don't fire again on next poll
        alertedIds.current.add(match.id)

        // Tell the UI
        onOverdue?.(match)

        // Start the 10-minute auto-abandon timer
        const timerId = setTimeout(async () => {
          try {
            await api.put(`/matches/${match.id}`, { status: 'ABANDONED' })
            onAbandoned?.(match.id, match)
          } catch (err) {
            console.error('[watchdog] Auto-abandon failed for', match.id, err.message)
          } finally {
            delete abandonTimers.current[match.id]
            alertedIds.current.delete(match.id) // allow re-alerting if somehow reverted
          }
        }, abandonAfterMs)

        abandonTimers.current[match.id] = timerId
      })
    } catch (err) {
      console.error('[watchdog] Poll failed:', err.message)
    }
  }, [onOverdue, onAbandoned, abandonAfterMs])

  useEffect(() => {
    // Run once immediately, then on interval
    checkMatches()
    const pollTimer = setInterval(checkMatches, pollIntervalMs)

    return () => {
      clearInterval(pollTimer)
      // Clear all pending abandon timers on unmount
      Object.values(abandonTimers.current).forEach(clearTimeout)
      abandonTimers.current = {}
    }
  }, [checkMatches, pollIntervalMs])

  /**
   * Dismiss the auto-abandon timer for a specific match.
   * Call this when the admin takes action (Start Now / Abandon manually).
   */
  const dismissTimer = useCallback((matchId) => {
    if (abandonTimers.current[matchId]) {
      clearTimeout(abandonTimers.current[matchId])
      delete abandonTimers.current[matchId]
    }
    alertedIds.current.delete(matchId)
  }, [])

  return { dismissTimer }
}
