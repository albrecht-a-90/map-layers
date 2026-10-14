import { createGlobalStyle } from 'styled-components';

/** Tokens resolve to CSS variables, so light/dark switching needs no re-render. */
export const theme = {
  color: {
    bg: 'var(--bg)',
    surface: 'var(--surface)',
    text: 'var(--text)',
    muted: 'var(--muted)',
    border: 'var(--border)',
    accent: 'var(--accent)',
    success: 'var(--success)',
    danger: 'var(--danger)',
    onAccent: 'var(--on-accent)',
  },
  font: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
} as const;

export type AppTheme = typeof theme;

export const GlobalStyle = createGlobalStyle`
  :root {
    --bg: #f1f4f8;
    --surface: #ffffff;
    --text: #18212f;
    --muted: #5f6b7c;
    --border: #dbe1e9;
    --accent: #2563eb;
    --success: #15803d;
    --danger: #c62828;
    --on-accent: #ffffff;
    color-scheme: light;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f141c;
      --surface: #18202c;
      --text: #e6eaf0;
      --muted: #97a3b4;
      --border: #2b3646;
      --accent: #7aa2ff;
      --success: #4ade80;
      --danger: #ff7b7b;
      --on-accent: #0f141c;
      color-scheme: dark;
    }
  }

  *, *::before, *::after { box-sizing: border-box; }

  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: ${theme.font};
    font-size: 14px;
  }
`;
