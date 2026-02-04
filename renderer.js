document.addEventListener('DOMContentLoaded', () => {
    const { ipcRenderer } = require('electron');

    // --- DOM References ---
    const html = document.documentElement;

    // --- Task Logic ---
    const taskInput = document.getElementById('task-input');
    const taskList = document.querySelector('.task-list');

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let isImportantMode = false;

    taskList.innerHTML = '';
    tasks.forEach(task => renderTask(task));

    // Handle Tab to toggle importance
    taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault(); // Prevent focus loss
            isImportantMode = !isImportantMode;
            taskInput.classList.toggle('important-mode', isImportantMode);
        }
    });

    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const text = taskInput.value.trim();
            if (text) {
                const newTask = {
                    id: Date.now(),
                    text: text,
                    completed: false,
                    important: isImportantMode
                };
                tasks.push(newTask);
                saveTasks();
                renderTask(newTask);

                // Reset input and importance state
                taskInput.value = '';
                isImportantMode = false;
                taskInput.classList.remove('important-mode');
            }
        }
    });

    function renderTask(task) {
        const li = document.createElement('li');
        // Add 'important' class if task is marked as such
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
            <span class="task-text">${escapeHtml(task.text)}</span>
            <button class="delete-btn" title="Delete task">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        `;

        const checkbox = li.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => {
            task.completed = checkbox.checked;
            li.classList.toggle('completed', task.completed);
            saveTasks();
        });

        const deleteBtn = li.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            // Uncheck (visually) immediately if checking out
            li.style.pointerEvents = 'none'; // Prevent further clicks
            li.classList.add('is-deleting');

            // Wait for animation to finish
            setTimeout(() => {
                li.remove();
                tasks = tasks.filter(t => t.id !== task.id);
                saveTasks();
            }, 400); // Matches CSS animation duration
        });

        taskList.appendChild(li);
        // Only scroll if it's a new task (not re-rendering all) - simple check
        if (!task.completed) {
            taskList.scrollTop = taskList.scrollHeight;
        }
    }

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- Settings & Theme Logic ---
    // FIXED: Selectors match HTML now
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-modal-btn'); // Fixed ID
    const confirmSettingsBtn = document.getElementById('confirm-settings-btn'); // New Button
    const themeOptions = document.querySelectorAll('.theme-btn'); // Fixed class
    // html 已在文件顶部定义

    // Position Lock Logic
    const pinBtn = document.getElementById('pin-btn');
    const dragRegion = document.querySelector('.drag-region');
    let isPositionLocked = false;

    // 监听主进程的锁定状态变化
    ipcRenderer.on('position-lock-changed', (event, locked) => {
        isPositionLocked = locked;
        updateLockState(locked);
    });

    // 获取初始锁定状态
    ipcRenderer.send('get-position-lock-state');

    pinBtn.addEventListener('click', () => {
        isPositionLocked = !isPositionLocked;
        ipcRenderer.send('toggle-position-lock', isPositionLocked);
        localStorage.setItem('isPositionLocked', isPositionLocked);
    });

    function updateLockState(locked) {
        if (locked) {
            pinBtn.classList.add('pinned');
            pinBtn.title = "解锁窗口位置";
            // 禁用拖动
            dragRegion.style.webkitAppRegion = 'no-drag';
        } else {
            pinBtn.classList.remove('pinned');
            pinBtn.title = "锁定窗口位置";
            // 启用拖动
            dragRegion.style.webkitAppRegion = 'drag';
        }
    }

    // --- Glass Density (Opacity) Logic ---
    const opacitySlider = document.getElementById('opacity-slider');
    const opacityValueLabel = document.getElementById('opacity-value');
    const glassControlSections = document.querySelectorAll('.glass-control');
    const glassOpacityMin = 0.12;
    const glassOpacityMax = 0.92;

    // Load & Init Opacity
    // Default higher (75) to provide good contrast against Acrylic's white noise
    const savedOpacity = localStorage.getItem('bgOpacity');
    setOpacity(savedOpacity !== null ? savedOpacity : '75');

    opacitySlider.addEventListener('input', (e) => {
        setOpacity(e.target.value);
    });

    function setOpacity(value, shouldPersist = true) {
        const numericValue = Number(value);
        const opacityFloat = glassOpacityMin + (numericValue / 100) * (glassOpacityMax - glassOpacityMin);

        html.style.setProperty('--glass-opacity', opacityFloat.toFixed(2));

        opacitySlider.value = String(numericValue);
        opacityValueLabel.textContent = `${numericValue}%`;

        if (shouldPersist) {
            localStorage.setItem('bgOpacity', String(numericValue));
        }
    }



    // Load saved theme

    // Load saved theme
    let savedTheme = localStorage.getItem('theme') || 'glass';
    if (savedTheme === 'system') savedTheme = 'glass';
    applyTheme(savedTheme);

    // Toggle Modal
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('active');
    });

    // Close Actions
    function closeModal() {
        settingsModal.classList.remove('active');
    }

    closeSettingsBtn.addEventListener('click', closeModal);
    confirmSettingsBtn.addEventListener('click', closeModal); // Added Confirm Action

    // Close when clicking outside
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeModal();
        }
    });

    // Theme Switching
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const theme = option.dataset.theme;
            applyTheme(theme);
        });
    });

    function applyTheme(theme) {
        // Update UI state
        themeOptions.forEach(opt => {
            opt.classList.toggle('active', opt.dataset.theme === theme);
        });

        let effectiveTheme = theme;
        // System theme logic removed


        html.setAttribute('data-theme', effectiveTheme);

        const isGlass = theme === 'glass';
        if (isGlass) {
            const savedOpacity = localStorage.getItem('bgOpacity') || '75';
            setOpacity(savedOpacity, false);
        }

        setGlassControlsEnabled(isGlass);

        // Save preference immediately
        localStorage.setItem('theme', theme);
    }

    function setGlassControlsEnabled(enabled) {
        opacitySlider.disabled = !enabled;
        glassControlSections.forEach(section => {
            section.classList.toggle('is-disabled', !enabled);
        });
    }


});
