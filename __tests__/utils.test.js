'use strict';

const {
    escapeHtml,
    calculateOpacity,
    createTask,
    toggleTaskCompleted,
    removeTask,
    parseTasks,
    isBoolean
} = require('../lib/utils');

// ============================================================
// escapeHtml
// ============================================================
describe('escapeHtml', () => {
    test('escapes & < > " and single quote', () => {
        expect(escapeHtml('a & b < c > d "e" \'f\'')).toBe(
            'a &amp; b &lt; c &gt; d &quot;e&quot; &#039;f&#039;'
        );
    });

    test('returns empty string for non-string input', () => {
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
        expect(escapeHtml(123)).toBe('');
        expect(escapeHtml({})).toBe('');
    });

    test('passes through safe text unchanged', () => {
        expect(escapeHtml('hello world')).toBe('hello world');
    });

    test('handles empty string', () => {
        expect(escapeHtml('')).toBe('');
    });

    test('handles script injection attempt', () => {
        expect(escapeHtml('<script>alert("xss")</script>')).toBe(
            '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
        );
    });
});

// ============================================================
// calculateOpacity
// ============================================================
describe('calculateOpacity', () => {
    const MIN = 0.12;
    const MAX = 0.92;

    test('maps 0 to min', () => {
        expect(calculateOpacity(0, MIN, MAX)).toBeCloseTo(0.12);
    });

    test('maps 100 to max', () => {
        expect(calculateOpacity(100, MIN, MAX)).toBeCloseTo(0.92);
    });

    test('maps 50 to midpoint', () => {
        const mid = MIN + 0.5 * (MAX - MIN);
        expect(calculateOpacity(50, MIN, MAX)).toBeCloseTo(mid);
    });

    test('accepts numeric string', () => {
        expect(calculateOpacity('75', MIN, MAX)).toBeCloseTo(
            MIN + 0.75 * (MAX - MIN)
        );
    });

    test('returns null for NaN', () => {
        expect(calculateOpacity('abc', MIN, MAX)).toBeNull();
    });

    test('returns null for out-of-range values', () => {
        expect(calculateOpacity(-1, MIN, MAX)).toBeNull();
        expect(calculateOpacity(101, MIN, MAX)).toBeNull();
    });

    test('returns null if min >= max', () => {
        expect(calculateOpacity(50, 0.9, 0.1)).toBeNull();
        expect(calculateOpacity(50, 0.5, 0.5)).toBeNull();
    });

    test('returns null if min/max are not numbers', () => {
        expect(calculateOpacity(50, 'a', 'b')).toBeNull();
    });
});

// ============================================================
// createTask
// ============================================================
describe('createTask', () => {
    test('creates a task with correct shape', () => {
        const task = createTask('Buy groceries');
        expect(task).toEqual(expect.objectContaining({
            text: 'Buy groceries',
            completed: false,
            important: false
        }));
        expect(typeof task.id).toBe('number');
    });

    test('trims whitespace from text', () => {
        const task = createTask('  hello  ');
        expect(task.text).toBe('hello');
    });

    test('returns null for empty or whitespace-only text', () => {
        expect(createTask('')).toBeNull();
        expect(createTask('   ')).toBeNull();
    });

    test('returns null for non-string input', () => {
        expect(createTask(null)).toBeNull();
        expect(createTask(123)).toBeNull();
        expect(createTask(undefined)).toBeNull();
    });

    test('respects the important flag', () => {
        const task = createTask('Urgent item', true);
        expect(task.important).toBe(true);
    });

    test('defaults important to false', () => {
        const task = createTask('Normal item');
        expect(task.important).toBe(false);
    });

    test('coerces truthy important value to boolean', () => {
        const task = createTask('test', 1);
        expect(task.important).toBe(true);
    });
});

// ============================================================
// toggleTaskCompleted
// ============================================================
describe('toggleTaskCompleted', () => {
    const tasks = [
        { id: 1, text: 'A', completed: false, important: false },
        { id: 2, text: 'B', completed: true, important: true }
    ];

    test('toggles completed from false to true', () => {
        const result = toggleTaskCompleted(tasks, 1);
        expect(result[0].completed).toBe(true);
    });

    test('toggles completed from true to false', () => {
        const result = toggleTaskCompleted(tasks, 2);
        expect(result[1].completed).toBe(false);
    });

    test('does not mutate the original array', () => {
        const result = toggleTaskCompleted(tasks, 1);
        expect(tasks[0].completed).toBe(false); // original unchanged
        expect(result).not.toBe(tasks);
    });

    test('leaves other tasks unchanged', () => {
        const result = toggleTaskCompleted(tasks, 1);
        expect(result[1]).toEqual(tasks[1]);
    });

    test('returns empty array for non-array input', () => {
        expect(toggleTaskCompleted(null, 1)).toEqual([]);
        expect(toggleTaskCompleted('oops', 1)).toEqual([]);
    });

    test('returns identical copy if id not found', () => {
        const result = toggleTaskCompleted(tasks, 999);
        expect(result).toEqual(tasks);
    });
});

// ============================================================
// removeTask
// ============================================================
describe('removeTask', () => {
    const tasks = [
        { id: 1, text: 'A', completed: false, important: false },
        { id: 2, text: 'B', completed: true, important: true },
        { id: 3, text: 'C', completed: false, important: false }
    ];

    test('removes the specified task', () => {
        const result = removeTask(tasks, 2);
        expect(result).toHaveLength(2);
        expect(result.find(t => t.id === 2)).toBeUndefined();
    });

    test('does not mutate the original array', () => {
        const result = removeTask(tasks, 1);
        expect(tasks).toHaveLength(3);
        expect(result).not.toBe(tasks);
    });

    test('returns same-length array if id not found', () => {
        const result = removeTask(tasks, 999);
        expect(result).toHaveLength(3);
    });

    test('returns empty array for non-array input', () => {
        expect(removeTask(null, 1)).toEqual([]);
    });
});

// ============================================================
// parseTasks
// ============================================================
describe('parseTasks', () => {
    test('returns empty array for null input', () => {
        const { tasks, error } = parseTasks(null);
        expect(tasks).toEqual([]);
        expect(error).toBeNull();
    });

    test('returns empty array for undefined input', () => {
        const { tasks, error } = parseTasks(undefined);
        expect(tasks).toEqual([]);
        expect(error).toBeNull();
    });

    test('parses valid JSON task array', () => {
        const raw = JSON.stringify([
            { id: 1, text: 'Buy milk', completed: false, important: false }
        ]);
        const { tasks, error } = parseTasks(raw);
        expect(tasks).toHaveLength(1);
        expect(tasks[0].text).toBe('Buy milk');
        expect(error).toBeNull();
    });

    test('returns error for non-array JSON', () => {
        const { tasks, error } = parseTasks(JSON.stringify({ id: 1 }));
        expect(tasks).toEqual([]);
        expect(error).toBe('Parsed value is not an array');
    });

    test('returns error for malformed JSON', () => {
        const { tasks, error } = parseTasks('not-json{{{');
        expect(tasks).toEqual([]);
        expect(error).toBeTruthy();
    });

    test('filters out invalid entries (missing id or text)', () => {
        const raw = JSON.stringify([
            { id: 1, text: 'Valid' },
            { id: 'bad', text: 'Bad id' },      // id must be number
            { id: 2 },                            // missing text
            null,                                  // null entry
            { id: 3, text: 'Also valid', completed: true }
        ]);
        const { tasks, error } = parseTasks(raw);
        expect(tasks).toHaveLength(2);
        expect(tasks[0].text).toBe('Valid');
        expect(tasks[1].text).toBe('Also valid');
        expect(error).toBeNull();
    });
});

// ============================================================
// isBoolean
// ============================================================
describe('isBoolean', () => {
    test('returns true for true and false', () => {
        expect(isBoolean(true)).toBe(true);
        expect(isBoolean(false)).toBe(true);
    });

    test('returns false for non-boolean types', () => {
        expect(isBoolean(0)).toBe(false);
        expect(isBoolean(1)).toBe(false);
        expect(isBoolean('')).toBe(false);
        expect(isBoolean('true')).toBe(false);
        expect(isBoolean(null)).toBe(false);
        expect(isBoolean(undefined)).toBe(false);
    });
});
