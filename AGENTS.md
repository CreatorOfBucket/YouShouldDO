# YouShouldDO - Agent Guidelines

An Electron-based task management app with glass-morphism UI and desktop pinning features.

## Build/Test Commands

```bash
# Install dependencies
npm install

# Run the application
npm start

# Note: Testing framework not yet configured
# To add testing: npm install --save-dev jest
# Then update package.json scripts.test
```

## Code Style Guidelines

### JavaScript (ES6+)

**General Principles:**
- Use `const` by default, `let` when reassignment needed
- Prefer arrow functions for callbacks
- Use template literals for string interpolation
- Follow 4-space indentation
- Use semicolons (see existing code pattern)

**Naming Conventions:**
- Variables/functions: camelCase (`taskList`, `createWindow`)
- DOM elements: descriptive IDs (`task-input`, `settings-btn`)
- CSS classes: kebab-case (`task-item`, `checkbox-container`)
- Constants: UPPER_SNAKE_CASE for true constants

**Imports:**
- Main process: Use CommonJS (`const { app } = require('electron')`)
- Renderer: ES6 modules or Electron's `require()`
- Node built-ins: `const path = require('path')`

### Electron Patterns

**Main Process (main.js):**
- Export app lifecycle handlers
- Use `ipcMain.on()` for renderer communication
- Manage window state in module-level variables
- Clean up resources in `window.on('closed')`

**Renderer Process (renderer.js):**
- Wrap in `DOMContentLoaded` listener
- Use `ipcRenderer.send()` for main process communication
- Access Electron APIs via `require('electron')`

### CSS Guidelines

**Variables:**
- Define in `:root` with `--` prefix
- Theme overrides in `html[data-theme="..."]` selectors
- Use semantic names: `--bg-app`, `--text-primary`, `--accent-color`

**Structure:**
- BEM-like naming: `.component-element-modifier`
- Flexbox for layout
- `transition` for interactive elements (0.2s ease)
- `-webkit-app-region: drag` for draggable areas

### Data Persistence

- Use `localStorage` for user preferences and task data
- Keys: `tasks`, `theme`, `isPinned`
- Always `JSON.parse()` on retrieval, `JSON.stringify()` on save
- Sanitize user input with `escapeHtml()` before DOM insertion

### Error Handling

- Guard against null/undefined before DOM operations
- Validate IPC message data before processing
- Use optional chaining where appropriate (`mainWindow?.isVisible()`)

### Comments

- English preferred for codebase consistency
- Use inline comments for non-obvious logic
- Document Electron API quirks and workarounds

## File Structure

```
youshoulddo/
├── main.js           # Electron main process
├── renderer.js       # UI logic and IPC
├── index.html        # Application markup
├── styles.css        # Themed styling
├── package.json      # Dependencies (electron)
└── .gitignore        # node_modules/, dist/
```

## Testing (Not Yet Implemented)

To run single test when Jest is added:
```bash
npm test -- renderer.test.js
```

## Git Workflow

- Feature branches from main
- Atomic commits with descriptive messages
- No commits of node_modules/ or dist/
