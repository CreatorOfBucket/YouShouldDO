# YouShouldDO - Agent Guidelines

Electron-based task manager with glass-morphism UI and desktop pinning.

## Editor Rules

- No `.cursorrules`, `.cursor/rules/`, or `.github/copilot-instructions.md` found in this repo.

## Build / Run / Test

```bash
# Install dependencies
npm install

# Run the app
npm start

# Tests (placeholder - currently fails)
npm test
```

- Build step: none configured (app runs via Electron directly).
- Lint/format: none configured (no ESLint/Prettier config found).
- Single-test command: not available until a test runner is added.
- If a runner is added later (e.g., Jest), the conventional single test would be:
  `npm test -- <test-file>`.

## Code Style Guidelines

### JavaScript (ES6+)

- Indentation: 4 spaces; no tabs.
- Semicolons: required.
- Quotes: single quotes in JS.
- Prefer `const`, use `let` when reassignment is necessary.
- Prefer arrow functions for callbacks.
- Use template literals for HTML snippets and string interpolation.
- Keep functions small and purpose-focused.

### Imports and Modules

- Main process uses CommonJS: `const { app } = require('electron')`.
- Renderer uses `require('electron')` within `DOMContentLoaded` scope.
- Node built-ins use CommonJS: `const path = require('path')`.

### Naming

- Variables/functions: `camelCase` (e.g., `createWindow`, `taskList`).
- Constants: `UPPER_SNAKE_CASE` only for true constants.
- DOM IDs: kebab-case (e.g., `task-input`, `settings-btn`).
- CSS classes: kebab-case, BEM-like structure where helpful.

### Electron Patterns

- Main process keeps window/tray state in module-level variables.
- `createWindow()` and `createTray()` are the primary setup functions.
- Use `ipcMain.on()` / `ipcRenderer.send()` for IPC.
- Use `event.reply()` or `webContents.send()` for replies.
- Guard `mainWindow` access before use.
- Window close behavior hides window unless app is quitting.

### Renderer Patterns

- Wrap renderer logic in `DOMContentLoaded`.
- Use `escapeHtml()` before inserting user content into `innerHTML`.
- Use `dataset` and `classList` for DOM state.
- Keep event handlers close to the DOM elements they manage.

### HTML

- Indentation: 4 spaces.
- Attributes use double quotes.
- Keep structure semantic (header, input area, list, modal).
- IDs are referenced directly in `renderer.js`.

### CSS

- Use CSS variables in `:root` and theme overrides in `html[data-theme="..."]`.
- Prefer semantic variables: `--bg-app`, `--text-primary`, `--accent-color`.
- Use flexbox for layout.
- Prefer transitions in the 0.2s to 0.3s range.
- Use `-webkit-app-region: drag` for draggable areas.

### Data Persistence

- Use `localStorage` for user state and preferences.
- Current keys: `tasks`, `theme`, `bgOpacity`, `isPositionLocked`.
- Always `JSON.parse()` on read and `JSON.stringify()` on write.

### Error Handling

- Guard for null/undefined DOM references before use.
- Validate IPC payloads before acting on them.
- Avoid empty `catch` blocks.

### Comments

- Use English comments for non-obvious logic.
- Document Electron API quirks and platform limitations.

## Files and Structure

```
youshoulddo/
├── main.js           # Electron main process
├── renderer.js       # UI logic and IPC
├── index.html        # Application markup
├── styles.css        # Styling and theme variables
├── package.json      # Scripts and dependencies
└── .gitignore        # node_modules/, dist/
```

## Testing (Not Yet Implemented)

- No test framework configured.
- Placeholder `npm test` fails by design.
- When a runner is added, keep single-test syntax in `package.json`.

## Assets and Platform Notes

- App icons are loaded from `icon.png`, `icon.ico`, or `icon.svg`.
- Windows acrylic blur uses `backgroundMaterial: 'acrylic'`.

## Git Workflow

- Feature branches from `main`.
- Atomic commits with descriptive messages.
- Do not commit `node_modules/` or `dist/`.
