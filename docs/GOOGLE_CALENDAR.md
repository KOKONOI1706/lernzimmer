# Google Calendar sync (optional)

The **Kalender** app works fully offline with local entries. Connecting Google Calendar is optional and adds:

- your Google events (primary calendar) shown next to local entries for the visible weeks
- "Auch in Google speichern": new entries can be created in Google Calendar too
- deleting an entry that exists in Google asks whether to delete it there as well

## How it works (privacy)

- Everything runs in the browser. There is no Lernzimmer server.
- Google's sign-in script is loaded **only when you click "Mit Google Kalender verbinden"**.
- The app asks for one scope: `https://www.googleapis.com/auth/calendar.events` (read and write events).
- The access token is kept **in memory only**, never in IndexedDB or localStorage. It expires after about 1 hour; then the app shows "Google erneut verbinden".
- Google events are not stored locally. They are fetched again after reconnecting. Only your local entries, and the ✓ ticks you set on Google events, are saved.
- Ticking a Google event as done is local only. Google Calendar itself is not changed.

## Setup (about 10 minutes, once)

1. Open <https://console.cloud.google.com/> and create a project (e.g. "Lernzimmer").
2. **APIs & Services → Library** → search **Google Calendar API** → **Enable**.
3. **Google Auth Platform** (older console: *OAuth consent screen*):
   - App name "Lernzimmer", your support email, audience **External**.
   - While the app is in **Testing**, add your own Google account under **Test users**. Only test users can connect.
4. **Clients → Create client → Web application**:
   - **Authorized JavaScript origins**: `http://localhost:5317`, plus your deployed origin later (e.g. `https://lernzimmer.pages.dev`).
   - No redirect URI is needed (the app uses the token popup flow).
5. Copy the **Client ID** (`…apps.googleusercontent.com`) into a file `.env.local` in the project root:

   ```bash
   VITE_GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
   ```

   `.env.local` is git-ignored. A client ID isn't secret, but there's no reason to commit it.
6. Restart `npm run dev`, open **Kalender**, and click **Mit Google Kalender verbinden**.

For a public release, `calendar.events` is a *sensitive* scope: Google requires app verification before people other than your test users can connect.

## Troubleshooting

| Message | Cause |
|---|---|
| "Google nicht eingerichtet" | `VITE_GOOGLE_CLIENT_ID` missing, or the dev server wasn't restarted |
| `popup_closed` / `popup_failed_to_open` | popup blocked or closed. Allow popups for the site and click connect again |
| Google error 403 / "access_denied" | your account isn't a test user, or the Calendar API isn't enabled |
| `idpiframe_initialization_failed` / origin error | the current origin isn't listed under *Authorized JavaScript origins* |
