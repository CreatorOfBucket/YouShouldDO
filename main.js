const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { isBoolean } = require('./lib/utils');

// --- Application State ---
let mainWindow = null;
let tray = null;
let isQuitting = false; // Proper flag instead of patching app object
let isPositionLocked = false;

// --- Logging Utility (Systematic Debugging) ---
// Simple structured logger for main process diagnostics.
// Prefixes messages with timestamp and component for easy filtering.
function log(component, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${component}]`;
    if (data !== null) {
        console.log(`${prefix} ${message}`, data);
    } else {
        console.log(`${prefix} ${message}`);
    }
}

function logError(component, message, error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [${component}] ${message}`, error?.message || error);
    if (error?.stack) {
        console.error(`[${timestamp}] [${component}] Stack:`, error.stack);
    }
}

// --- Icon Helpers ---
// Consolidated icon lookup with error handling.
// Falls back gracefully if no icon file is found.
function loadIcon(targetSize = null) {
    const iconPaths = [
        { ext: 'png', path: path.join(__dirname, 'icon.png') },
        { ext: 'ico', path: path.join(__dirname, 'icon.ico') },
        { ext: 'svg', path: path.join(__dirname, 'icon.svg') }
    ];

    for (const icon of iconPaths) {
        try {
            if (fs.existsSync(icon.path)) {
                const image = nativeImage.createFromPath(icon.path);
                if (image.isEmpty()) {
                    log('icon', `Icon file exists but loaded empty: ${icon.path}`);
                    continue;
                }
                // Resize for tray if targetSize specified (SVG especially needs this)
                if (targetSize && icon.ext === 'svg') {
                    return image.resize({ width: targetSize, height: targetSize });
                }
                return image;
            }
        } catch (err) {
            logError('icon', `Failed to load icon: ${icon.path}`, err);
        }
    }

    log('icon', 'No icon file found, generating fallback');
    return createFallbackIcon();
}

function createFallbackIcon() {
    const size = 16;
    const buffer = Buffer.alloc(size * size * 4);
    for (let i = 0; i < size * size; i++) {
        buffer[i * 4] = 96;       // R
        buffer[i * 4 + 1] = 205;  // G
        buffer[i * 4 + 2] = 255;  // B (Windows 11 Blue)
        buffer[i * 4 + 3] = 255;  // A
    }
    return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}

// --- Window Management ---
function createWindow() {
    try {
        mainWindow = new BrowserWindow({
            width: 350,
            height: 600,
            frame: false,
            transparent: true, // Pure transparent window — no DWM Acrylic
            resizable: false,
            alwaysOnTop: false,
            skipTaskbar: true,
            icon: loadIcon(),
            backgroundColor: '#00000000',
            webPreferences: {
                // Security: Use preload script with contextBridge
                // instead of nodeIntegration + contextIsolation: false
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false // Required for preload to use require()
            }
        });

        mainWindow.loadFile('index.html');

        // Window lifecycle events
        mainWindow.webContents.on('did-finish-load', () => {
            log('window', 'Content loaded, sending initial context');
            sendWindowContext();
        });

        mainWindow.on('move', () => {
            sendWindowContext();
        });

        mainWindow.on('show', () => {
            sendWindowContext();
        });

        // Hide on close instead of quitting (tray app pattern)
        mainWindow.on('close', (event) => {
            if (!isQuitting) {
                event.preventDefault();
                mainWindow.hide();
            }
        });

        mainWindow.on('closed', () => {
            mainWindow = null;
            log('window', 'Window destroyed');
        });

        log('window', 'Window created successfully');
    } catch (err) {
        logError('window', 'Failed to create window', err);
    }
}

// --- Toggle Window Visibility (DRY helper) ---
function toggleWindowVisibility() {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
        mainWindow.hide();
    } else {
        mainWindow.show();
        mainWindow.focus();
    }
}

// --- Tray Management ---
function createTray() {
    try {
        const trayIcon = loadIcon(16);
        tray = new Tray(trayIcon);

        const contextMenu = Menu.buildFromTemplate([
            {
                label: '显示/隐藏',
                click: toggleWindowVisibility
            },
            { type: 'separator' },
            {
                label: '退出',
                click: () => {
                    isQuitting = true;
                    app.quit();
                }
            }
        ]);

        tray.setToolTip('YouShouldDO');
        tray.setContextMenu(contextMenu);
        tray.on('click', toggleWindowVisibility);

        log('tray', 'Tray created successfully');
    } catch (err) {
        logError('tray', 'Failed to create tray', err);
    }
}

// --- IPC Handlers (with input validation) ---

// Toggle position lock
// Validates that shouldLock is a boolean before applying.
ipcMain.on('toggle-position-lock', (event, shouldLock) => {
    if (!isBoolean(shouldLock)) {
        log('ipc', 'Invalid toggle-position-lock payload, expected boolean', { shouldLock });
        return;
    }
    if (!mainWindow) return;
    isPositionLocked = shouldLock;
    event.reply('position-lock-changed', isPositionLocked);
    log('ipc', `Position lock: ${isPositionLocked}`);
});

// Get current lock state
ipcMain.on('get-position-lock-state', (event) => {
    event.reply('position-lock-changed', isPositionLocked);
});

// Send window position and display info to the renderer
function sendWindowContext() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
        const bounds = mainWindow.getBounds();
        const display = screen.getDisplayMatching(bounds);
        mainWindow.webContents.send('window-context', {
            windowBounds: bounds,
            displayBounds: display.bounds,
            displaySize: display.size,
            scaleFactor: display.scaleFactor,
            displayId: display.id
        });
    } catch (err) {
        logError('ipc', 'Failed to send window context', err);
    }
}

// Respond to renderer requesting window context
ipcMain.on('request-window-context', () => {
    sendWindowContext();
});

// --- App Lifecycle ---
app.whenReady().then(() => {
    log('app', 'App ready, creating window and tray');
    createWindow();
    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
}).catch((err) => {
    logError('app', 'Failed during app initialization', err);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Cleanup tray on quit to prevent ghost icons
app.on('before-quit', () => {
    isQuitting = true;
    log('app', 'App quitting');
});

app.on('will-quit', () => {
    if (tray) {
        tray.destroy();
        tray = null;
    }
});
