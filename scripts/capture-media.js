const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function capturePng(win, outPath) {
    const image = await win.webContents.capturePage();
    fs.writeFileSync(outPath, image.toPNG());
}

async function captureFrame(win, outPath) {
    // Let layout/paint settle before capturing.
    await nextFrame(win, 2);
    await capturePng(win, outPath);
}

async function waitForDomReady(win) {
    await win.webContents.executeJavaScript(`
        new Promise((resolve) => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                resolve();
                return;
            }
            document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
        });
    `);
}

async function nextFrame(win, count = 2) {
    const frames = Math.max(1, Number(count) || 1);
    await win.webContents.executeJavaScript(`
        new Promise((resolve) => {
            let left = ${frames};
            const step = () => {
                left -= 1;
                if (left <= 0) {
                    resolve();
                    return;
                }
                requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        });
    `);
}

async function reload(win) {
    await win.webContents.executeJavaScript('location.reload();');
    await new Promise(resolve => win.webContents.once('did-finish-load', resolve));
    await waitForDomReady(win);
    await nextFrame(win, 2);
}

async function setLocalStorageAndReload(win, kv) {
    const payload = JSON.stringify(kv);
    await win.webContents.executeJavaScript(`
        (function () {
            const kv = ${payload};
            Object.keys(kv).forEach(k => localStorage.setItem(k, kv[k]));
        })();
    `);
    await reload(win);
}

async function setLocalStorage(win, kv) {
    const payload = JSON.stringify(kv);
    await win.webContents.executeJavaScript(`
        (function () {
            const kv = ${payload};
            Object.keys(kv).forEach(k => localStorage.setItem(k, kv[k]));
        })();
    `);
}

async function clearTasksAndUI(win) {
    await setLocalStorage(win, { tasks: '[]' });
    await win.webContents.executeJavaScript(`
        (function () {
            const list = document.querySelector('.task-list');
            if (list) list.innerHTML = '';
        })();
    `);
    await nextFrame(win, 2);
}

async function setInputValue(win, value) {
    const payload = JSON.stringify(String(value));
    await win.webContents.executeJavaScript(`
        (function () {
            const input = document.getElementById('task-input');
            if (!input) return;
            input.focus();
            input.value = ${payload};
            input.dispatchEvent(new Event('input', { bubbles: true }));
        })();
    `);
    await nextFrame(win, 2);
}

async function setInputHintText(win, text) {
    const payload = JSON.stringify(String(text));
    await win.webContents.executeJavaScript(`
        (function () {
            const el = document.querySelector('.input-hint');
            if (!el) return;
            el.textContent = ${payload};
        })();
    `);
    await nextFrame(win, 2);
}

async function pressEnterOnInput(win) {
    // Use multiple event types to match different browser behaviors.
    await win.webContents.executeJavaScript(`
        (function () {
            const input = document.getElementById('task-input');
            if (!input) return;
            const mk = (type) => new KeyboardEvent(type, { key: 'Enter', code: 'Enter', bubbles: true });
            input.dispatchEvent(mk('keydown'));
            input.dispatchEvent(mk('keypress'));
            input.dispatchEvent(mk('keyup'));
        })();
    `);
    await nextFrame(win, 3);
}

async function getRects(win) {
    return await win.webContents.executeJavaScript(`
        (function () {
            const item = document.querySelector('.task-item');
            const del = document.querySelector('.task-item .delete-btn');
            if (!item || !del) return null;
            const ir = item.getBoundingClientRect();
            const dr = del.getBoundingClientRect();
            return {
                item: { x: ir.x, y: ir.y, w: ir.width, h: ir.height },
                del: { x: dr.x, y: dr.y, w: dr.width, h: dr.height }
            };
        })();
    `);
}

function rectCenter(rect) {
    return {
        x: Math.round(rect.x + rect.w / 2),
        y: Math.round(rect.y + rect.h / 2)
    };
}

async function hoverAndClickDelete(win) {
    const rects = await getRects(win);
    if (!rects) return { ok: false, reason: 'No task item/delete button found' };

    const itemCenter = rectCenter(rects.item);
    win.webContents.sendInputEvent({ type: 'mouseMove', x: itemCenter.x, y: itemCenter.y, movementX: 0, movementY: 0 });
    await nextFrame(win, 3);

    const delCenter = rectCenter(rects.del);
    win.webContents.sendInputEvent({ type: 'mouseMove', x: delCenter.x, y: delCenter.y, movementX: 0, movementY: 0 });
    await nextFrame(win, 2);
    win.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', x: delCenter.x, y: delCenter.y, clickCount: 1 });
    win.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', x: delCenter.x, y: delCenter.y, clickCount: 1 });
    await nextFrame(win, 2);
    return { ok: true };
}

async function setDeleteButtonVisible(win, visible = true) {
    const shouldShow = Boolean(visible);
    await win.webContents.executeJavaScript(`
        (function () {
            const cssId = 'demo-force-delete-btn';
            let style = document.getElementById(cssId);
            if (!style) {
                style = document.createElement('style');
                style.id = cssId;
                document.head.appendChild(style);
            }
            style.textContent = ${shouldShow ? "'.task-item .delete-btn{opacity:1 !important;}'" : "''"};
        })();
    `);
    await nextFrame(win, 2);
}

async function main() {
    const repoRoot = path.join(__dirname, '..');
    const assetsDir = path.join(repoRoot, 'assets');
    const framesRoot = path.join(assetsDir, 'frames');
    const addFramesDir = path.join(framesRoot, 'add');
    const delFramesDir = path.join(framesRoot, 'delete');

    fs.mkdirSync(addFramesDir, { recursive: true });
    fs.mkdirSync(delFramesDir, { recursive: true });

    // Improve determinism for offscreen captures.
    app.commandLine.appendSwitch('disable-gpu');
    app.commandLine.appendSwitch('disable-gpu-compositing');
    app.commandLine.appendSwitch('disable-software-rasterizer');

    await app.whenReady();

    const win = new BrowserWindow({
        width: 350,
        height: 600,
        show: false,
        backgroundColor: '#0b0f14',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            offscreen: true
        }
    });

    await win.loadFile(path.join(repoRoot, 'index.html'));
    await waitForDomReady(win);
    await nextFrame(win, 3);

    // --- Screenshot (use Glass theme to match default look) ---
    await setLocalStorageAndReload(win, {
        theme: 'glass',
        bgOpacity: '75',
        isPositionLocked: 'false',
        tasks: JSON.stringify([
            { id: 1, text: 'Buy milk', completed: false, important: false },
            { id: 2, text: 'Submit report', completed: false, important: true },
            { id: 3, text: 'Walk 10 min', completed: true, important: false }
        ])
    });
    await sleep(250);
    await captureFrame(win, path.join(assetsDir, 'screenshot.png'));

    // --- Add task demo (stable Dark theme to avoid GIF flicker) ---
    await setLocalStorageAndReload(win, {
        theme: 'dark',
        tasks: '[]'
    });
    await clearTasksAndUI(win);

    // Hold initial state.
    await captureFrame(win, path.join(addFramesDir, '000.png'));
    await captureFrame(win, path.join(addFramesDir, '001.png'));

    const text = 'Buy milk';
    for (let i = 0; i < text.length; i++) {
        await setInputValue(win, text.slice(0, i + 1));
        await setInputHintText(win, `Typing: ${text.slice(0, i + 1)}`);
        const idx = String(i + 2).padStart(3, '0');
        await captureFrame(win, path.join(addFramesDir, `${idx}.png`));
    }

    await pressEnterOnInput(win);
    await setInputHintText(win, 'Added!');
    await sleep(120);
    await captureFrame(win, path.join(addFramesDir, '010.png'));
    await sleep(220);
    await captureFrame(win, path.join(addFramesDir, '011.png'));
    await captureFrame(win, path.join(addFramesDir, '012.png'));
    await captureFrame(win, path.join(addFramesDir, '013.png'));

    // --- Delete task demo (stable Dark theme) ---
    await setLocalStorageAndReload(win, {
        theme: 'dark',
        tasks: JSON.stringify([
            { id: 1, text: 'Buy milk', completed: false, important: false }
        ])
    });
    await sleep(150);
    await setDeleteButtonVisible(win, true);
    await captureFrame(win, path.join(delFramesDir, '000.png'));
    await captureFrame(win, path.join(delFramesDir, '001.png'));

    await hoverAndClickDelete(win);
    await captureFrame(win, path.join(delFramesDir, '002.png'));

    const delIntervals = [80, 100, 110, 120, 140, 200];
    for (let i = 0; i < delIntervals.length; i++) {
        await sleep(delIntervals[i]);
        const idx = String(i + 3).padStart(3, '0');
        await captureFrame(win, path.join(delFramesDir, `${idx}.png`));
    }

    // Hold final state.
    await captureFrame(win, path.join(delFramesDir, '009.png'));
    await captureFrame(win, path.join(delFramesDir, '010.png'));

    win.destroy();
    app.quit();
}

main().catch(err => {
    // eslint-disable-next-line no-console
    console.error(err);
    try {
        app.quit();
    } catch (_) {
        // ignore
    }
    process.exit(1);
});
