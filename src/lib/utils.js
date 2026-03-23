'use strict';

// Pure utility functions for testability.
// NO dependencies on DOM, Electron, Tauri, or localStorage.

function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function calculateOpacity(sliderValue, min, max) {
    const num = Number(sliderValue);
    if (isNaN(num) || num < 0 || num > 100) return null;
    if (typeof min !== 'number' || typeof max !== 'number') return null;
    if (min >= max) return null;
    return min + (num / 100) * (max - min);
}

function createTask(text, important = false) {
    if (typeof text !== 'string') return null;
    const trimmed = text.trim();
    if (trimmed.length === 0) return null;
    return {
        id: Date.now(),
        text: trimmed,
        completed: false,
        important: Boolean(important)
    };
}

function toggleTaskCompleted(tasks, taskId) {
    if (!Array.isArray(tasks)) return [];
    return tasks.map(task =>
        task.id === taskId
            ? { ...task, completed: !task.completed }
            : task
    );
}

function removeTask(tasks, taskId) {
    if (!Array.isArray(tasks)) return [];
    return tasks.filter(task => task.id !== taskId);
}

function parseTasks(raw) {
    if (raw === null || raw === undefined) {
        return { tasks: [], error: null };
    }
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return { tasks: [], error: 'Parsed value is not an array' };
        }
        const valid = parsed.filter(t =>
            t && typeof t === 'object' && typeof t.id === 'number' && typeof t.text === 'string'
        );
        return { tasks: valid, error: null };
    } catch (err) {
        return { tasks: [], error: err.message };
    }
}

function isBoolean(value) {
    return typeof value === 'boolean';
}

// Universal export: CommonJS (Node.js/Jest) or browser global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        escapeHtml,
        calculateOpacity,
        createTask,
        toggleTaskCompleted,
        removeTask,
        parseTasks,
        isBoolean
    };
} else {
    window.appUtils = {
        escapeHtml,
        calculateOpacity,
        createTask,
        toggleTaskCompleted,
        removeTask,
        parseTasks,
        isBoolean
    };
}
