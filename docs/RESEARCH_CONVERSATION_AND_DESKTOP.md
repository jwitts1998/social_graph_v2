# Research & Backlog: Conversation-from-Contact, Google Meet AI, Desktop-First

## 1. Start conversation from contact record

**Current state:** We do **not** have a feature to start a conversation/recording from a contact record. Recording today starts from:
- Home: Mic FAB → Recording Drawer (optionally with a calendar event when you tap “Coming Up”)
- Record page: `/record?eventId=...` when linked from a calendar/meeting
- There is no “Start conversation” or “Record with this contact” from the contact profile or contact card.

**Target:** One-click (or very intuitive) way to begin a conversation record from a contact, with optional link to a Google Meet/Calendar event so it syncs with “your Google Meets.”

**Use case:** User opens a contact → one action → “Start conversation” → recording flow opens with that contact in context (e.g. title pre-filled “Conversation with [Name]”), and ideally that conversation can later be associated with a Meet/Calendar event when they join or create one.

**Backlog / implementation notes:**
- [x] **One-click “Start conversation” from contact profile** – Button/link that opens the recording flow with contact context (e.g. pre-filled title, and/or passing `contactId` so the conversation can be linked to that contact when we support it). *Minimal version: open Recording Drawer from Home with default title “Conversation with [Contact Name]” via sessionStorage/URL.*
- [x] **Associate conversation with contact** – When started from a contact, attach that contact as a participant or “primary contact” for the conversation so it appears in “Conversations with [Name]” and in match/context logic.
- [ ] **Optional: link to Google Meet / Calendar event** – Allow “Start conversation” to optionally pick or create a calendar event / Meet link so the recording is tied to a specific meeting. Could be: “Start recording” + “Link to upcoming meeting” (dropdown or “Create Meet link”).
- [ ] **Notifications to begin conversation records** – E.g. “You have a call with [Contact] in 15 minutes – start recording?” or “Meeting starting soon – open recorder?” so starting a conversation record is intuitive and timely. Desktop-first: could be system tray or browser notification that opens the app and optionally the record flow.

---

## 2. Google Meet AI tools (transcripts, summary, action items)

**Current state:** We use our own pipeline: browser microphone → chunks → Whisper transcription → segments in DB → entity extraction → match generation. We do **not** use Google Meet’s built-in AI (transcripts, summary, action items).

**Target:** Explore using Google Meet’s AI outputs as **optional** inputs to improve ease of use, without making the product dependent on them. Desktop-first: our own recording/transcription remains the primary path.

**Research / backlog:**
- [ ] **Research: Google Meet transcript & AI APIs** – What can we access programmatically? (e.g. Meet add-ons, Calendar/Meet API, or export formats.) Document: transcripts, summaries, action items, and whether they’re available via API or manual export.
- [ ] **Optional import of Meet transcript/summary** – If the user used Meet’s built-in transcript or summary, could we let them paste/import it (or sync it if an API exists) to backfill or supplement our transcript? Non-blocking: works only when user has that data.
- [ ] **Optional use of Meet action items / summary** – If we have Meet summary/action items (import or API), consider surfacing them in conversation detail or match context. Keep our entity extraction and matching as the main source of truth so we’re not reliant on Meet AI.

**Design principle:** Prefer “optional enhancement” over “required integration.” Our recording + Whisper + matching stays the default and works without any Google Meet AI.

---

## 3. Desktop-first use case

**Target:** The primary experience is a **desktop tool** – quick access to start recordings, see contacts, and act on matches without depending on in-call or in-browser automation.

**Implications (backlog / design):**
- [ ] **Always-available “Start conversation”** – From contact profile, from Home, from a quick launcher. One or two clicks to open the record flow.
- [ ] **Notifications that don’t rely on “auto”** – User can get a nudge (“Call with X in 15 min – start recording?”) but **chooses** to start the record. No requirement for “auto-start when Meet starts.”
- [ ] **Offline / local-first considerations** – Document or explore: what works if the desktop app has limited connectivity? (e.g. queue transcript upload, sync when back online.)
- [ ] **Desktop UX** – Layout, shortcuts, and flows optimized for keyboard + mouse and a resident window or tray app, not only for mobile or in-tab use.

---

## 4. Desktop app that plugs into browser or account (RESEARCH)

**Backlog item:** Explore building a **desktop application** that “plugs into” the user’s browser or account.

**Research questions:**
- **What does “plugs into” mean?**
  - **Browser:** Extension or companion that can trigger recording, open our UI, or read Meet/Calendar from the active tab? (Permissions, distribution, and privacy implications.)
  - **Account:** OAuth to Google (we have Calendar sync) – does a native desktop app change how we do auth, tokens, or consent?
- **Tech options:**
  - Electron/Tauri (or similar) wrapping the existing web app, with optional system tray, shortcuts, and “Start recording” from outside the browser.
  - Browser extension: quick “Start conversation” from a toolbar, or “Record this tab” / “Record this Meet” – subject to platform rules and user trust.
  - PWA + install prompt: “Install app” for a desktop-like window and notifications, without a separate native binary.
- **Constraints:**
  - Desktop-first but not *dependent* on auto-capture: user still explicitly starts a conversation record.
  - Prefer not to be fully reliant on one auto feature (e.g. “only works when Meet auto-starts”) so the desktop tool is useful even when the user is in a different app or a Meet without our integration.

**Deliverable:** A short **research memo** (or section in this doc) that covers:
- “Plug into browser” vs “plug into account” – concrete options and tradeoffs.
- Desktop app (Electron/Tauri), extension, and PWA – pros/cons and effort.
- How each option supports: one-click “Start conversation,” optional Meet/Calendar link, and notifications.
- Recommendation (or 2–3 ranked options) for next step.

**Status:** Backlog – research item. No implementation until we complete the memo and decide direction.

---

## Summary

| Area | Have today? | Target |
|------|-------------|--------|
| Start conversation from contact | No | One-click from contact profile; optional link to Meet/Calendar; optional notifications |
| Google Meet AI (transcript/summary/actions) | No | Research; optional use only; not required |
| Desktop-first | Partial (web app works on desktop) | Explicit “desktop tool” UX and notifications user controls |
| Desktop app / browser plug-in | No | **Research:** desktop app or extension that plugs into browser/account |

---

## References

- Recording flow: `RecordingDrawer`, Home Mic FAB, `useAudioRecorder`, Whisper + segments.
- Calendar/Meet sync: `sync-google-calendar`, `useUpcomingEvents`, `calendar_events`, `event_id` on conversations.
- Contact profile: `ContactProfile.tsx`, `useContactProfileData` – add “Start conversation” here as first step.
