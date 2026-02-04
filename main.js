const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let guardianInterval = null;
let isPinnedMode = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 350,
        height: 600,
        frame: false,
        transparent: true,
        resizable: false,
        alwaysOnTop: false,
        skipTaskbar: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, 'icon.png')
    });

    mainWindow.loadFile('index.html');

    mainWindow.on('closed', () => {
        mainWindow = null;
        stopVisibilityGuardian();
    });
}

function startVisibilityGuardian() {
    if (guardianInterval) clearInterval(guardianInterval);

    guardianInterval = setInterval(() => {
        if (!mainWindow || !isPinnedMode) {
            return;
        }

        // 只在窗口被系统隐藏时（如 Win+D）恢复显示
        if (!mainWindow.isVisible()) {
            mainWindow.showInactive();
        }
    }, 150);
}

function stopVisibilityGuardian() {
    if (guardianInterval) {
        clearInterval(guardianInterval);
        guardianInterval = null;
    }
}

ipcMain.on('toggle-pin-desktop', (event, shouldPin) => {
    if (!mainWindow) return;

    isPinnedMode = shouldPin;

    if (shouldPin) {
        // 固定到桌面模式：
        // 1. 禁止最小化 - 这样 Win+D 不会隐藏它（因为窗口不会被最小化）
        // 2. 不在任务栏显示 - 像桌面小部件
        // 3. 不设置 alwaysOnTop - 这样其他应用打开时，它会在后面，不会遮挡
        mainWindow.setMinimizable(false);
        mainWindow.setSkipTaskbar(true);
        startVisibilityGuardian();
    } else {
        // 取消固定 - 恢复为普通窗口
        mainWindow.setMinimizable(true);
        mainWindow.setSkipTaskbar(false);
        stopVisibilityGuardian();
    }
});

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
