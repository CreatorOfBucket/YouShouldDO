const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let guardianInterval = null;

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
        if (guardianInterval) clearInterval(guardianInterval);
    });
}

function startVisibilityGuardian() {
    if (guardianInterval) clearInterval(guardianInterval);

    guardianInterval = setInterval(() => {
        if (!mainWindow) {
            clearInterval(guardianInterval);
            return;
        }

        // 核心技术：强力对抗 Win+D
        // 1. 如果窗口被隐藏或最小化，立刻恢复
        // 2. 维持最高级别的置顶
        if (!mainWindow.isVisible() || mainWindow.isMinimized()) {
            mainWindow.restore(); // 恢复最小化
            mainWindow.show();    // 确保显示
            mainWindow.setAlwaysOnTop(true, 'screen-saver');
        }
    }, 100);
}

function stopVisibilityGuardian() {
    if (guardianInterval) {
        clearInterval(guardianInterval);
        guardianInterval = null;
    }
}

ipcMain.on('toggle-pin-desktop', (event, shouldPin) => {
    if (!mainWindow) return;

    if (shouldPin) {
        // 开启固定模式：禁止最小化，隐藏任务栏图标，最高级置顶
        mainWindow.setMinimizable(false);
        mainWindow.setSkipTaskbar(true);
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
        startVisibilityGuardian();
    } else {
        // 关闭固定模式：恢复普通窗口行为
        mainWindow.setMinimizable(true);
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
