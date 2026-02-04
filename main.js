const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let tray = null;
let isPositionLocked = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 350,
        height: 600,
        frame: false,
        transparent: true,
        resizable: false,
        alwaysOnTop: false,
        skipTaskbar: true, // 默认不显示在任务栏，由托盘控制
        icon: getAppIcon(), // 设置窗口图标
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');

    // 拦截关闭事件：点击关闭按钮时隐藏窗口而不是退出
    mainWindow.on('close', (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            mainWindow.hide();
        }
        return false;
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// 获取应用图标（用于窗口）
function getAppIcon() {
    const iconPathPng = path.join(__dirname, 'icon.png');
    const iconPathIco = path.join(__dirname, 'icon.ico');
    // SVG 支持可能有限，优先使用 PNG/ICO
    if (fs.existsSync(iconPathPng)) return nativeImage.createFromPath(iconPathPng);
    if (fs.existsSync(iconPathIco)) return nativeImage.createFromPath(iconPathIco);
    return null;
}

function getTrayIcon() {
    // 托盘图标查找顺序：PNG -> ICO -> SVG -> 默认生成
    const iconPathPng = path.join(__dirname, 'icon.png');
    if (fs.existsSync(iconPathPng)) return nativeImage.createFromPath(iconPathPng);
    
    const iconPathIco = path.join(__dirname, 'icon.ico');
    if (fs.existsSync(iconPathIco)) return nativeImage.createFromPath(iconPathIco);

    // 尝试加载 SVG (Electron 对 Tray SVG 的支持视平台而定，通常需要 Resize)
    const iconPathSvg = path.join(__dirname, 'icon.svg');
    if (fs.existsSync(iconPathSvg)) {
        const image = nativeImage.createFromPath(iconPathSvg);
        // 调整为适合托盘的大小 (通常 16x16 或 32x32)
        return image.resize({ width: 16, height: 16 });
    }

    // 如果图标文件不存在，创建一个简单的图标
    const icon = nativeImage.createEmpty();
    // 创建一个16x16的蓝色图标
    const size = 16;
    const buffer = Buffer.alloc(size * size * 4);
    for (let i = 0; i < size * size; i++) {
        buffer[i * 4] = 96;     // R
        buffer[i * 4 + 1] = 205; // G  
        buffer[i * 4 + 2] = 255; // B (Windows 11 Blue)
        buffer[i * 4 + 3] = 255; // A
    }
    return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}

function createTray() {
    const trayIcon = getTrayIcon();
    tray = new Tray(trayIcon);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: '显示/隐藏',
            click: () => {
                if (mainWindow) {
                    if (mainWindow.isVisible()) {
                        mainWindow.hide();
                    } else {
                        mainWindow.show();
                        mainWindow.focus();
                    }
                }
            }
        },
        { type: 'separator' },
        {
            label: '退出',
            click: () => {
                app.isQuiting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('YouShouldDO');
    tray.setContextMenu(contextMenu);

    // 单击托盘图标显示/隐藏窗口
    tray.on('click', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
                mainWindow.focus();
            }
        }
    });
}

// 处理固定位置切换
ipcMain.on('toggle-position-lock', (event, shouldLock) => {
    if (!mainWindow) return;
    isPositionLocked = shouldLock;
    // 通知渲染进程更新状态
    event.reply('position-lock-changed', isPositionLocked);
});

// 获取当前锁定状态
ipcMain.on('get-position-lock-state', (event) => {
    event.reply('position-lock-changed', isPositionLocked);
});

app.whenReady().then(() => {
    createWindow();
    createTray();

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
