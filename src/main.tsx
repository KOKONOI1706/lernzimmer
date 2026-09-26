import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/press-start-2p';
import '@fontsource/vt323';
import '@fontsource/silkscreen';
import './styles/theme.css';
import './styles/app.css';
import { App } from './app/App';
import { hydrate, startAutosave } from './data/persist';
import { useLearn } from './learn/store';

await hydrate();
startAutosave();
void useLearn.getState().load(); // flashcards live in their own tables; seeds the starter decks on first run

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
