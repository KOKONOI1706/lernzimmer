import { create } from 'zustand';
import { nanoid } from 'nanoid';

export interface Todo { id: string; text: string; done: boolean }

interface TodoState {
  todos: Todo[];
  add: (text: string) => void;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clearDone: () => void;
  hydrate: (todos: Todo[]) => void;
}

export const useTodos = create<TodoState>()((set) => ({
  todos: [],
  add: (text) => { const t = text.trim(); if (t) set((s) => ({ todos: [...s.todos, { id: nanoid(8), text: t, done: false }] })); },
  toggle: (id) => set((s) => ({ todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })),
  remove: (id) => set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),
  clearDone: () => set((s) => ({ todos: s.todos.filter((t) => !t.done) })),
  hydrate: (todos) => set({ todos }),
}));
