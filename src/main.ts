import './styles/reset.css';
import './styles/tokens.css';
import './styles/app.css';
import { App } from './app/App';

function bootstrap(): void {
  const canvas = document.getElementById('whiteboard-canvas') as HTMLCanvasElement | null;
  const hudCoords = document.getElementById('hud-coords');
  const hudZoom = document.getElementById('hud-zoom');
  const themeToggle = document.getElementById('theme-toggle') as HTMLButtonElement | null;
  const toolButtons = document.querySelectorAll<HTMLButtonElement>('[data-tool]');

  if (!canvas || !hudCoords || !hudZoom || !themeToggle) {
    throw new Error('Required DOM elements are missing from index.html.');
  }

  new App({ canvas, hudCoords, hudZoom, themeToggle, toolButtons });
}

bootstrap();
