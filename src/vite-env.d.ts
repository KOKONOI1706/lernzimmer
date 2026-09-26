/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google OAuth Web client ID for the optional Calendar sync (docs/GOOGLE_CALENDAR.md) */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }
