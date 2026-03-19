const { contextBridge, ipcRenderer } = require('electron');
const utils = require('./lib/utils');

// Expose a safe, minimal API to the renderer process via contextBridge.
// This replaces the insecure nodeIntegration: true / contextIsolation: false pattern.
// Only whitelisted IPC channels are accessible from the renderer.

const VALID_SEND_CHANNELS = [
    'toggle-position-lock',
    'get-position-lock-state',
    'request-window-context'
];

const VALID_RECEIVE_CHANNELS = [
    'position-lock-changed',
    'window-context'
];

contextBridge.exposeInMainWorld('electronAPI', {
    // Send a message to the main process (fire-and-forget)
    send: (channel, ...args) => {
        if (VALID_SEND_CHANNELS.includes(channel)) {
            ipcRenderer.send(channel, ...args);
        } else {
            console.warn(`[preload] Blocked send to invalid channel: ${channel}`);
        }
    },

    // Register a listener for messages from the main process
    on: (channel, callback) => {
        if (VALID_RECEIVE_CHANNELS.includes(channel)) {
            const subscription = (event, ...args) => callback(...args);
            ipcRenderer.on(channel, subscription);
            // Return an unsubscribe function for cleanup
            return () => ipcRenderer.removeListener(channel, subscription);
        } else {
            console.warn(`[preload] Blocked listen on invalid channel: ${channel}`);
            return () => {};
        }
    },

    // One-time listener for messages from the main process
    once: (channel, callback) => {
        if (VALID_RECEIVE_CHANNELS.includes(channel)) {
            ipcRenderer.once(channel, (event, ...args) => callback(...args));
        } else {
            console.warn(`[preload] Blocked once-listen on invalid channel: ${channel}`);
        }
    }
});

// Expose pure utility functions to the renderer (no Node/Electron access).
// These are the same functions tested in __tests__/utils.test.js.
contextBridge.exposeInMainWorld('appUtils', {
    escapeHtml: utils.escapeHtml,
    calculateOpacity: utils.calculateOpacity,
    createTask: utils.createTask,
    toggleTaskCompleted: utils.toggleTaskCompleted,
    removeTask: utils.removeTask,
    parseTasks: utils.parseTasks,
    isBoolean: utils.isBoolean
});
