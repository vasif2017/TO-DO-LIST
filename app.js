const STORAGE_KEY = 'my-todo-list-tasks';
const STARTER_KEY = 'my-todo-list-starter-seeded-v2';
const THEME_KEY = 'my-todo-list-theme';
const taskForm = document.querySelector('#task-form');
const taskInput = document.querySelector('#task-input');
const categoryInput = document.querySelector('#category-input');
const priorityInput = document.querySelector('#priority-input');
const dueDateInput = document.querySelector('#due-date-input');
const taskList = document.querySelector('#task-list');
const emptyState = document.querySelector('#empty-state');
const emptyTitle = document.querySelector('#empty-title');
const emptyCopy = document.querySelector('#empty-copy');
const activeCount = document.querySelector('#active-count');
const countLabel = document.querySelector('#count-label');
const completedCount = document.querySelector('#completed-count');
const clearCompletedButton = document.querySelector('#clear-completed');
const filterButtons = document.querySelectorAll('[data-filter]');
const searchInput = document.querySelector('#search-input');
const sortSelect = document.querySelector('#sort-select');
const themeToggle = document.querySelector('#theme-toggle');
const exportButton = document.querySelector('#export-tasks');
const importButton = document.querySelector('#import-tasks');
const importFile = document.querySelector('#import-file');
let tasks = loadTasks();
let currentFilter = 'all';
let sortMode = 'newest';
let searchTerm = '';
let draggedTaskId = null;
let editingTaskId = null;

function getStoredValue(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function setStoredValue(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {
    }
}

function loadTasks() {
    try {
        const storedTasks = getStoredValue(STORAGE_KEY);
        if (storedTasks === null) return createStarterTasks();
        const savedTasks = JSON.parse(storedTasks);
        if (!Array.isArray(savedTasks)) return [];
        if (savedTasks.length === 0) return createStarterTasks();
        return savedTasks.map((task, index) => ({
            id: task.id || `${Date.now()}-${index}`,
            text: String(task.text || '').trim(),
            completed: Boolean(task.completed),
            category: task.category || 'General',
            priority: task.priority || 'medium',
            dueDate: task.dueDate || '',
            createdAt: task.createdAt || Date.now() - index,
        })).filter((task) => task.text);
    } catch {
        return [];
    }
}

function createStarterTasks() {
    const today = new Date();
    const formatDate = (daysFromNow) => {
        const date = new Date(today);
        date.setDate(date.getDate() + daysFromNow);
        return date.toISOString().slice(0, 10);
    };

    return [
        {
            id: `starter-${Date.now()}-1`,
            text: 'Plan the week ahead',
            completed: false,
            category: 'Personal',
            priority: 'high',
            dueDate: formatDate(1),
            createdAt: Date.now(),
        },
        {
            id: `starter-${Date.now()}-2`,
            text: 'Finish the most important task',
            completed: false,
            category: 'Work',
            priority: 'medium',
            dueDate: formatDate(2),
            createdAt: Date.now() - 1,
        },
        {
            id: `starter-${Date.now()}-3`,
            text: 'Take a short break',
            completed: false,
            category: 'Wellbeing',
            priority: 'low',
            dueDate: '',
            createdAt: Date.now() - 2,
        },
    ];
}

function saveTasks() {
    setStoredValue(STORAGE_KEY, JSON.stringify(tasks));
}

function createTask(text) {
    return {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        text,
    completed: false,
    category: categoryInput.value,
    priority: priorityInput.value,
        dueDate: dueDateInput.value,
        createdAt: Date.now(),
    };
}

function getVisibleTasks() {
    const filteredTasks = tasks.filter((task) => {
        const matchesFilter = currentFilter === 'all'
            || (currentFilter === 'active' && !task.completed)
            || (currentFilter === 'completed' && task.completed);
        const searchableText = `${task.text} ${task.category}`.toLowerCase();
        return matchesFilter && searchableText.includes(searchTerm);
    });

    if (sortMode === 'manual') return filteredTasks;
    const priorityRank = { high: 0, medium: 1, low: 2 };
    return filteredTasks.sort((firstTask, secondTask) => {
    if (sortMode === 'priority') return priorityRank[firstTask.priority] - priorityRank[secondTask.priority];
    if (sortMode === 'due') return (firstTask.dueDate || '9999-12-31').localeCompare(secondTask.dueDate || '9999-12-31');
    if (sortMode === 'alphabetical') return firstTask.text.localeCompare(secondTask.text);
        return secondTask.createdAt - firstTask.createdAt;
    });
}

function formatDueDate(dueDate) {
    if (!dueDate) return '';
    return new Date(`${dueDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function isOverdue(task) {
    if (!task.dueDate || task.completed) return false;
    return task.dueDate < new Date().toISOString().slice(0, 10);
}

function render() {
    const visibleTasks = getVisibleTasks();
    const remainingTasks = tasks.filter((task) => !task.completed).length;
    const finishedTasks = tasks.length - remainingTasks;
    activeCount.textContent = remainingTasks;
    countLabel.textContent = remainingTasks === 1 ? 'task left' : 'tasks left';
    completedCount.textContent = `· ${finishedTasks} done`;
    taskList.innerHTML = visibleTasks.map(renderTask).join('');
    emptyState.hidden = visibleTasks.length > 0;
    if (searchTerm) {
        emptyTitle.textContent = 'No matching tasks';
        emptyCopy.textContent = 'Try a different search';
    } else if (currentFilter === 'completed') {
        emptyTitle.textContent = 'No completed tasks';
        emptyCopy.textContent = 'Complete a task to see it here';
    } else if (currentFilter === 'active') {
        emptyTitle.textContent = 'All tasks are done';
        emptyCopy.textContent = 'Great work for today';
    } else {
        emptyTitle.textContent = 'Nothing here yet';
        emptyCopy.textContent = 'Add your first task above';
    }
}

function renderTask(task) {
    const priorityLabel = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
    const dueLabel = formatDueDate(task.dueDate);
    const editing = editingTaskId === task.id;
    return `
        <li class="task-item${task.completed ? ' is-completed' : ''}${isOverdue(task) ? ' is-overdue' : ''}" data-id="${task.id}" draggable="${editing ? 'false' : 'true'}" tabindex="0">
            <button class="task-check" type="button" aria-label="${task.completed ? 'Mark as active' : 'Mark as completed'}" title="${task.completed ? 'Mark as active' : 'Mark as completed'}">${task.completed ? '✓' : ''}</button>
            <div class="task-content">
                ${editing ? `<input class="edit-input" value="${escapeHtml(task.text)}" aria-label="Edit task" maxlength="120">` : `<span class="task-text">${escapeHtml(task.text)}</span>`}
                <div class="task-meta"><span class="category-tag">${escapeHtml(task.category)}</span><span class="priority-tag priority-${task.priority}">${priorityLabel}</span>${dueLabel ? `<span class="due-tag">${isOverdue(task) ? 'Overdue · ' : ''}${dueLabel}</span>` : ''}</div>
            </div>
            <div class="task-actions">
                ${editing ? '<button class="task-action save-task" type="button" aria-label="Save task" title="Save task">✓</button><button class="task-action cancel-edit" type="button" aria-label="Cancel editing" title="Cancel editing">×</button>' : '<button class="task-action edit-task" type="button" aria-label="Edit task" title="Edit task">✎</button><button class="task-action delete-task" type="button" aria-label="Delete task" title="Delete task">×</button>'}
            </div>
        </li>
    `;
}

function escapeHtml(text) {
    return String(text).replace(/[&<>'"]/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
    }[character]));
}

function saveEdit(taskItem) {
    const task = tasks.find((item) => item.id === taskItem.dataset.id);
    const editInput = taskItem.querySelector('.edit-input');
    const text = editInput?.value.trim();
    if (!task || !text) return;
    task.text = text;
    task.updatedAt = Date.now();
    editingTaskId = null;
    saveTasks();
    render();
}

function applyTheme(theme) {
    document.body.classList.toggle('dark-theme', theme === 'dark');
    themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    themeToggle.textContent = theme === 'dark' ? '☼' : '◐';
}

taskForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;
    tasks.unshift(createTask(text));
    saveTasks();
    taskInput.value = '';
    dueDateInput.value = '';
    render();
    taskInput.focus();
});

taskList.addEventListener('click', (event) => {
    const taskItem = event.target.closest('.task-item');
    if (!taskItem) return;
    const task = tasks.find((item) => item.id === taskItem.dataset.id);
    if (!task) return;

    if (event.target.closest('.task-check')) task.completed = !task.completed;
    if (event.target.closest('.delete-task')) tasks = tasks.filter((item) => item.id !== task.id);
    if (event.target.closest('.edit-task')) editingTaskId = task.id;
    if (event.target.closest('.save-task')) saveEdit(taskItem);
    if (event.target.closest('.cancel-edit')) editingTaskId = null;
    saveTasks();
    render();
    if (editingTaskId) taskList.querySelector('.edit-input')?.focus();
});

taskList.addEventListener('keydown', (event) => {
    const taskItem = event.target.closest('.task-item');
    if (!taskItem) return;
    if (event.key === 'Enter' && event.target.matches('.edit-input')) saveEdit(taskItem);
    if (event.key === 'Escape' && event.target.matches('.edit-input')) {
        editingTaskId = null;
        render();
    }
    if (event.key === 'Delete' && !event.target.matches('input')) {
        tasks = tasks.filter((task) => task.id !== taskItem.dataset.id);
        saveTasks();
        render();
    }
});

taskList.addEventListener('dragstart', (event) => {
    const taskItem = event.target.closest('.task-item');
    if (!taskItem || editingTaskId) return;
    draggedTaskId = taskItem.dataset.id;
    taskItem.classList.add('is-dragging');
});

taskList.addEventListener('dragover', (event) => {
    event.preventDefault();
    const taskItem = event.target.closest('.task-item');
    if (taskItem && taskItem.dataset.id !== draggedTaskId) taskItem.classList.add('is-drop-target');
});

taskList.addEventListener('dragleave', (event) => event.target.closest('.task-item')?.classList.remove('is-drop-target'));

taskList.addEventListener('drop', (event) => {
    event.preventDefault();
    const targetItem = event.target.closest('.task-item');
    const draggedIndex = tasks.findIndex((task) => task.id === draggedTaskId);
    const targetIndex = tasks.findIndex((task) => task.id === targetItem?.dataset.id);
    if (draggedIndex > -1 && targetIndex > -1) {
        const [draggedTask] = tasks.splice(draggedIndex, 1);
        tasks.splice(targetIndex, 0, draggedTask);
        sortMode = 'manual';
        sortSelect.value = 'manual';
        saveTasks();
        render();
    }
    draggedTaskId = null;
});

taskList.addEventListener('dragend', () => {
    draggedTaskId = null;
    document.querySelectorAll('.is-dragging, .is-drop-target').forEach((item) => item.classList.remove('is-dragging', 'is-drop-target'));
});

filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
        currentFilter = button.dataset.filter;
        filterButtons.forEach((filterButton) => filterButton.classList.toggle('is-active', filterButton === button));
        render();
    });
});

searchInput.addEventListener('input', () => {
    searchTerm = searchInput.value.trim().toLowerCase();
    render();
});

sortSelect.addEventListener('change', () => {
    sortMode = sortSelect.value;
    render();
});

clearCompletedButton.addEventListener('click', () => {
    tasks = tasks.filter((task) => !task.completed);
    saveTasks();
    render();
});

themeToggle.addEventListener('click', () => {
    const nextTheme = document.body.classList.contains('dark-theme') ? 'light' : 'dark';
    setStoredValue(THEME_KEY, nextTheme);
    applyTheme(nextTheme);
});

exportButton.addEventListener('click', () => {
    const file = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = 'my-tasks.json';
    link.click();
    URL.revokeObjectURL(link.href);
});

importButton.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', async () => {
    const [file] = importFile.files;
    if (!file) return;
    try {
        const importedTasks = JSON.parse(await file.text());
        if (!Array.isArray(importedTasks)) throw new Error('Invalid file');
        tasks = importedTasks.map((task, index) => ({
            id: task.id || `${Date.now()}-${index}`,
            text: String(task.text || '').trim(),
            completed: Boolean(task.completed),
            category: task.category || 'General',
            priority: task.priority || 'medium',
            dueDate: task.dueDate || '',
            createdAt: task.createdAt || Date.now() - index,
        })).filter((task) => task.text);
        saveTasks();
        render();
    } catch {
        window.alert('Could not import this file.');
    }
    importFile.value = '';
});

window.addEventListener('pagehide', saveTasks);

function updateDate() {
    const today = new Date();
    document.querySelector('#date-day').textContent = today.getDate();
    document.querySelector('#date-month').textContent = today.toLocaleDateString('en-US', { month: 'short' }).replace('.', '').toUpperCase();
    const nextDay = new Date(today);
    nextDay.setHours(24, 0, 0, 0);
    window.setTimeout(updateDate, nextDay.getTime() - today.getTime() + 1000);
}

if (getStoredValue(STARTER_KEY) !== 'true' && tasks.some((task) => task.id.startsWith('starter-'))) {
    saveTasks();
    setStoredValue(STARTER_KEY, 'true');
}
applyTheme(getStoredValue(THEME_KEY) || 'light');
updateDate();
render();
