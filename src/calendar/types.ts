import type { IsoDate } from './dates';

/** task = can be ticked off; event = appointment; exam = shows a countdown. */
export type EntryKind = 'task' | 'event' | 'exam';

export interface CalEntry {
  id: string;
  /** missing = "someday" task without a date (only tasks can be undated) */
  date?: IsoDate;
  /** "HH:MM"; missing = all day */
  time?: string;
  endTime?: string;
  title: string;
  notes?: string;
  kind: EntryKind;
  done: boolean;
  source: 'local' | 'google';
  /** Google event id (for entries that live in, or were copied to, Google Calendar) */
  googleId?: string;
  /** link to open the event in Google Calendar */
  link?: string;
}
