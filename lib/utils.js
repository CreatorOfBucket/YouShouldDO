'use strict';

// Pure utility functions extracted from renderer.js for testability.
// These functions have NO dependencies on DOM, Electron, or localStorage.

/**
 * Escape HTML special characters to prevent XSS when inserting into innerHTML.
 * Pure string transformation — no DOM dependency.
 * @param {string} text - Raw user input
 * @returns {string} Escaped HTML string
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Calculate the effective CSS opacity float from a slider value (0–100).
 * Maps the user-facing percentage range to the configured min/max opacity range.
 * @param {number} sliderValue - Integer 0–100
 * @param {number} min - Minimum opacity float (e.g. 0.12)
 * @param {number} max - Maximum opacity float (e.g. 0.92)
 * @returns {number|null} Opacity float, or null if input is invalid
 */
function calculateOpacity(sliderValue, min, max) {
    const num = Number(sliderValue);
    if (isNaN(num) || num < 0 || num > 100) return null;
    if (typeof min !== 'number' || typeof max !== 'number') return null;
    if (min >= max) return null;
    return min + (num / 100) * (max - min);
}

/**
 * Create a new task object.
 * @param {string} text - Task description (will be trimmed)
 * @param {boolean} important - Whether the task is marked important
 * @returns {object|null} Task object or null if text is empty
 */
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

/**
 * Toggle the completed state of a task in a task array (immutable).
 * @param {Array} tasks - Current task list
 * @param {number} taskId - ID of the task to toggle
 * @returns {Array} New array with the toggled task
 */
function toggleTaskCompleted(tasks, taskId) {
    if (!Array.isArray(tasks)) return [];
    return tasks.map(task =>
        task.id === taskId
            ? { ...task, completed: !task.completed }
            : task
    );
}

/**
 * Remove a task from the task array by id (immutable).
 * @param {Array} tasks - Current task list
 * @param {number} taskId - ID of the task to remove
 * @returns {Array} New array without the removed task
 */
function removeTask(tasks, taskId) {
    if (!Array.isArray(tasks)) return [];
    return tasks.filter(task => task.id !== taskId);
}

/**
 * Parse tasks from a raw JSON string (e.g. from localStorage).
 * Returns a safe array even if the data is corrupted.
 * @param {string|null} raw - JSON string or null
 * @returns {{ tasks: Array, error: string|null }}
 */
function parseTasks(raw) {
    if (raw === null || raw === undefined) {
        return { tasks: [], error: null };
    }
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return { tasks: [], error: 'Parsed value is not an array' };
        }
        // Filter out entries that don't look like valid tasks
        const valid = parsed.filter(t =>
            t && typeof t === 'object' && typeof t.id === 'number' && typeof t.text === 'string'
        );
        return { tasks: valid, error: null };
    } catch (err) {
        return { tasks: [], error: err.message };
    }
}

/**
 * Validate that a value is a boolean (for IPC payload validation).
 * @param {*} value
 * @returns {boolean}
 */
function isBoolean(value) {
    return typeof value === 'boolean';
}

module.exports = {
    escapeHtml,
    calculateOpacity,
    createTask,
    toggleTaskCompleted,
    removeTask,
    parseTasks,
    isBoolean
};
