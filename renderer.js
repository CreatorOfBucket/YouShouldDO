document.addEventListener('DOMContentLoaded', () => {
    const { ipcRenderer } = require('electron');

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
                <span class="checkmark"></span>
            </label>
            <span class="task-text">${escapeHtml(task.text)}</span>
            <button class="delete-btn" title="Delete task">×</button>
        `;

        const checkbox = li.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => {
            task.completed = checkbox.checked;
            li.classList.toggle('completed', task.completed);
            saveTasks();
        });

        const deleteBtn = li.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            li.remove();
            tasks = tasks.filter(t => t.id !== task.id);
            saveTasks();
        });

        taskList.appendChild(li);
        taskList.scrollTop = taskList.scrollHeight;
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
    const html = document.documentElement;

    // Pin Logic
    const pinBtn = document.getElementById('pin-btn');
    let isPinned = localStorage.getItem('isPinned') === 'true';

    // Apply initial state
    updatePinState(isPinned);

    pinBtn.addEventListener('click', () => {
        isPinned = !isPinned;
        updatePinState(isPinned);
        localStorage.setItem('isPinned', isPinned);
    });

    function updatePinState(pinned) {
        if (pinned) {
            pinBtn.classList.add('pinned');
            pinBtn.title = "Unpin from Desktop";
        } else {
            pinBtn.classList.remove('pinned');
            pinBtn.title = "Pin to Desktop (Ignore Win+D)";
        }
        // Send state to Main Process
        ipcRenderer.send('toggle-pin-desktop', pinned);
    }

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'glass';
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

        if (theme === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            html.setAttribute('data-theme', isDark ? 'dark' : 'light');
        } else {
            html.setAttribute('data-theme', theme);
        }

        // Save preference immediately
        localStorage.setItem('theme', theme);
    }
    
    // System theme change listener
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (localStorage.getItem('theme') === 'system') {
            html.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
    });
});
