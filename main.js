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

        // 只在窗口被"隐藏"时恢复（如 Win+D）
        // 不设置 alwaysOnTop，这样其他应用可以正常覆盖它
        if (!mainWindow.isVisible()) {
            mainWindow.showInactive(); // 显示但不抢占焦点
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
        // 固定模式：
        // 1. 隐藏任务栏图标
        // 2. 不设置 alwaysOnTop（允许其他窗口覆盖）
        // 3. 启动守护进程，只对抗 Win+D
        mainWindow.setSkipTaskbar(true);
        mainWindow.setAlwaysOnTop(false);
        startVisibilityGuardian();
    } else {
        // 取消固定：恢复普通窗口行为
        mainWindow.setSkipTaskbar(false);
        mainWindow.setAlwaysOnTop(false);
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
