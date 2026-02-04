const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 350,
        height: 600,
        frame: false, // Frameless window
        transparent: true, // Transparent background
        resizable: false, // Widget-style fixed size (user can't resize)
        alwaysOnTop: false, // Optional: true if user wants it purely as a widget overlay
        skipTaskbar: false,
        webPreferences: {
            nodeIntegration: true, // For simple local apps this is fine, though contextIsolation: true is safer.
            contextIsolation: false // Disabling isolation to allow direct renderer usage for now.
        },
        icon: path.join(__dirname, 'icon.png') // If we had one
    });

    mainWindow.loadFile('index.html');

    // Open DevTools for debugging (comment out in production)
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
}

// IPC Listener for Pinning (Desktop Mode)
ipcMain.on('toggle-pin-desktop', (event, shouldPin) => {
    if (!mainWindow) return;

    if (shouldPin) {
        // Pinned Mode:
        // 1. skipTaskbar: true to hide from taskbar
        // 2. minimizable: false to prevent minimize
        // 3. alwaysOnTop: FALSE (Stays on desktop level, below other windows)
        mainWindow.setSkipTaskbar(true);
        mainWindow.setMinimizable(false);
        mainWindow.setAlwaysOnTop(false);

        // Win+D Defense Strategy:
        // If hidden by Win+D, we force show it.
        startVisibilityGuardian();
    } else {
        // Unpinned Mode:
        mainWindow.setSkipTaskbar(false);
        mainWindow.setMinimizable(true);
        mainWindow.setAlwaysOnTop(false);
    }
});

// Visibility Guardian
// Since Win+D is a system-level hook, we detect if we're hidden and force show
let guardianInterval = null;

function startVisibilityGuardian() {
    if (guardianInterval) clearInterval(guardianInterval);

    guardianInterval = setInterval(() => {
        if (!mainWindow) {
            clearInterval(guardianInterval);
            return;
        }

        // 如果窗口被隐藏（如 Win+D），重新显示它
        if (!mainWindow.isVisible()) {
            mainWindow.show();
            mainWindow.setAlwaysOnTop(true, 'screen-saver');
        }
    }, 100); // 每100ms检测一次
}


app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
