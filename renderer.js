document.addEventListener('DOMContentLoaded', () => {
    // Use the safe electronAPI exposed via preload.js / contextBridge
    // instead of directly requiring electron (security improvement).
    const api = window.electronAPI;
    const utils = window.appUtils;

    if (!api) {
        console.error('[renderer] electronAPI not found. Preload script may have failed.');
        return;
    }
    if (!utils) {
        console.error('[renderer] appUtils not found. Preload script may have failed.');
        return;
    }

    // --- DOM References with null guards ---
    const html = document.documentElement;
    const taskInput = document.getElementById('task-input');
    const taskList = document.querySelector('.task-list');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-modal-btn');
    const confirmSettingsBtn = document.getElementById('confirm-settings-btn');
    const themeOptions = document.querySelectorAll('.theme-btn');
    const pinBtn = document.getElementById('pin-btn');
    const dragRegion = document.querySelector('.drag-region');

    // Defensive check: abort if critical DOM elements are missing
    const criticalElements = { taskInput, taskList, settingsBtn, settingsModal, pinBtn, dragRegion };
    for (const [name, el] of Object.entries(criticalElements)) {
        if (!el) {
            console.error(`[renderer] Critical DOM element missing: ${name}`);
            return;
        }
    }

    // --- Task Logic ---
    let tasks = loadTasks();
    let isImportantMode = false;

    taskList.innerHTML = '';
    tasks.forEach(task => renderTask(task));

    // Handle Tab to toggle importance
    taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            isImportantMode = !isImportantMode;
            taskInput.classList.toggle('important-mode', isImportantMode);
        }
    });

    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const newTask = utils.createTask(taskInput.value, isImportantMode);
            if (newTask) {
                tasks.push(newTask);
                saveTasks();
                renderTask(newTask);

                taskInput.value = '';
                isImportantMode = false;
                taskInput.classList.remove('important-mode');
            }
        }
    });

    function renderTask(task) {
        const li = document.createElement('li');
        const classes = ['task-item'];
        if (task.completed) classes.push('completed');
        if (task.important) classes.push('important');

        li.className = classes.join(' ');
        li.dataset.id = task.id;

        li.innerHTML = `
            <label class="checkbox-container">
                <input type="checkbox" ${task.completed ? 'checked' : ''}>
                <div class="checkmark-wrapper">
                    <svg class="checkmark-svg" viewBox="0 0 24 24">
                        <path class="checkmark-path" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M5 12l5 5l10 -10"/>
                    </svg>
                </div>
            </label>
            <span class="task-text">${utils.escapeHtml(task.text)}</span>
            <button class="toggle-importance-btn" title="${task.important ? '转为常规' : '转为紧急'}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                    <line x1="4" y1="22" x2="4" y2="15"/>
                </svg>
            </button>
            <button class="delete-btn" title="Delete task">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        `;

        const checkbox = li.querySelector('input[type="checkbox"]');
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                task.completed = checkbox.checked;
                li.classList.toggle('completed', task.completed);
                saveTasks();
            });
        }

        const deleteBtn = li.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                li.style.pointerEvents = 'none';
                li.classList.add('is-deleting');

                setTimeout(() => {
                    li.remove();
                    tasks = utils.removeTask(tasks, task.id);
                    saveTasks();
                }, 400); // Matches CSS animation duration
            });
        }

        const toggleBtn = li.querySelector('.toggle-importance-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                task.important = !task.important;
                li.classList.toggle('important', task.important);
                toggleBtn.title = task.important ? '转为常规' : '转为紧急';
                saveTasks();
            });
        }

        taskList.appendChild(li);
        if (!task.completed) {
            taskList.scrollTop = taskList.scrollHeight;
        }
    }

    // --- Data Persistence Helpers ---
    // Uses shared parseTasks from lib/utils.js for validated parsing.
    function loadTasks() {
        try {
            const raw = localStorage.getItem('tasks');
            const { tasks: parsed, error } = utils.parseTasks(raw);
            if (error) {
                console.warn('[renderer] Task parse issue:', error);
            }
            return parsed;
        } catch (err) {
            console.error('[renderer] Failed to load tasks from localStorage', err);
            return [];
        }
    }

    function saveTasks() {
        try {
            localStorage.setItem('tasks', JSON.stringify(tasks));
        } catch (err) {
            console.error('[renderer] Failed to save tasks to localStorage', err);
        }
    }

    // --- Position Lock Logic ---
    let isPositionLocked = false;

    // Listen for lock state changes from main process
    api.on('position-lock-changed', (locked) => {
        isPositionLocked = locked;
        updateLockState(locked);
    });

    // Request initial lock state
    api.send('get-position-lock-state');

    pinBtn.addEventListener('click', () => {
        isPositionLocked = !isPositionLocked;
        api.send('toggle-position-lock', isPositionLocked);
        try {
            localStorage.setItem('isPositionLocked', JSON.stringify(isPositionLocked));
        } catch (err) {
            console.error('[renderer] Failed to save lock state', err);
        }
    });

    function updateLockState(locked) {
        if (locked) {
            pinBtn.classList.add('pinned');
            pinBtn.title = '解锁窗口位置';
            dragRegion.style.webkitAppRegion = 'no-drag';
        } else {
            pinBtn.classList.remove('pinned');
            pinBtn.title = '锁定窗口位置';
            dragRegion.style.webkitAppRegion = 'drag';
        }
    }

    // --- Theme Logic ---
    let savedTheme = localStorage.getItem('theme') || 'glass';
    if (savedTheme === 'system') savedTheme = 'glass'; // Legacy migration
    applyTheme(savedTheme);

    // Toggle Modal
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('active');
    });

    function closeModal() {
        settingsModal.classList.remove('active');
    }

    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeModal);
    if (confirmSettingsBtn) confirmSettingsBtn.addEventListener('click', closeModal);

    // Close when clicking outside modal content
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeModal();
        }
    });

    // Theme switching
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const theme = option.dataset.theme;
            if (theme) {
                applyTheme(theme);
            }
        });
    });

    function applyTheme(theme) {
        themeOptions.forEach(opt => {
            opt.classList.toggle('active', opt.dataset.theme === theme);
        });

        html.setAttribute('data-theme', theme);

        try {
            localStorage.setItem('theme', theme);
        } catch (err) {
            console.error('[renderer] Failed to save theme', err);
        }
    }

});
