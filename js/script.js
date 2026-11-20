/**
 * To-Do Life Dashboard — script.js
 * Sections:
 *   1. Constants & State
 *   2. Local Storage Helpers
 *   3. Greeting & Clock
 *   4. Theme Toggle
 *   5. Focus Timer
 *   6. To-Do List
 *   7. Quick Links
 *   8. Init
 */

/* ==========================================================================
   1. Constants & State
   ========================================================================== */

const STORAGE_KEYS = {
  theme: 'dashboard_theme',
  name:  'dashboard_name',
  tasks: 'dashboard_tasks',
  links: 'dashboard_links',
};

/** @type {{ id: number, text: string, done: boolean }[]} */
let tasks = [];

/** @type {{ id: number, name: string, url: string }[]} */
let links = [];

/** Interval reference for the countdown timer */
let timerInterval = null;

/** Remaining seconds for the focus timer */
let timerSeconds = 25 * 60;

/* ==========================================================================
   2. Local Storage Helpers
   ========================================================================== */

/**
 * Save a value to localStorage as JSON.
 * Silently ignores storage errors (private browsing, quota exceeded, etc.).
 * @param {string} key
 * @param {*} value
 */
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Storage unavailable — continue without persisting
  }
}

/**
 * Load a value from localStorage, parsed from JSON.
 * Returns `fallback` on any error or if the key is absent.
 * @param {string} key
 * @param {*} fallback
 * @returns {*}
 */
function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

/* ==========================================================================
   3. Greeting & Clock
   ========================================================================== */

/**
 * Returns a greeting phrase based on the current hour.
 * @param {number} hour - 0–23
 * @returns {string}
 */
function getGreetingPhrase(hour) {
  if (hour >= 5  && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 18) return 'Good Afternoon';
  if (hour >= 18 && hour < 22) return 'Good Evening';
  return 'Good Night';
}

/**
 * Pads a number to at least 2 digits.
 * @param {number} n
 * @returns {string}
 */
function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Updates the clock, date, and greeting text every call.
 * Called once immediately and then on a 1-second interval.
 */
function updateClock() {
  const now    = new Date();
  const hour   = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();

  // HH:MM:SS
  const clockEl = document.getElementById('clock');
  if (clockEl) {
    clockEl.textContent = `${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
  }

  // "Tuesday, January 27, 2026"
  const dateEl = document.getElementById('date');
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year:    'numeric',
      month:   'long',
      day:     'numeric',
    });
  }

  updateGreetingText();
}

/**
 * Rebuilds the greeting element text using the stored name.
 */
function updateGreetingText() {
  const greetingEl = document.getElementById('greeting');
  if (!greetingEl) return;

  const phrase = getGreetingPhrase(new Date().getHours());
  const name   = loadFromStorage(STORAGE_KEYS.name, '').trim();

  // Using textContent throughout — never innerHTML — to prevent XSS
  greetingEl.textContent = name ? `${phrase}, ${name}` : phrase;
}

/**
 * Loads and displays the saved name in the input field.
 */
function loadName() {
  const input = document.getElementById('name-input');
  if (!input) return;
  const saved = loadFromStorage(STORAGE_KEYS.name, '');
  input.value = saved || '';
}

/* ==========================================================================
   4. Theme Toggle
   ========================================================================== */

/**
 * Applies the given theme to the document root and updates the toggle button.
 * @param {'light'|'dark'} theme
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  if (theme === 'dark') {
    btn.textContent = '☀️';
    btn.setAttribute('aria-pressed', 'true');
    btn.setAttribute('aria-label', 'Switch to light mode');
  } else {
    btn.textContent = '🌙';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', 'Switch to dark mode');
  }
}

/**
 * Loads the saved theme from storage, falling back to the system preference.
 */
function loadTheme() {
  const saved = loadFromStorage(STORAGE_KEYS.theme, null);
  if (saved === 'dark' || saved === 'light') {
    applyTheme(saved);
  } else {
    // First visit — use system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
}

/**
 * Toggles between light and dark themes and persists the choice.
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  saveToStorage(STORAGE_KEYS.theme, next);
}

/* ==========================================================================
   5. Focus Timer
   ========================================================================== */

/**
 * Renders the current timerSeconds value as MM:SS in the display element.
 */
function renderTimer() {
  const display = document.getElementById('timer-display');
  if (!display) return;
  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;
  display.textContent = `${pad2(mins)}:${pad2(secs)}`;
}

/**
 * Starts the countdown. Guards against duplicate intervals.
 */
function startTimer() {
  // Prevent starting if already running
  if (timerInterval !== null) return;

  // Clear any "Time is up" message on (re)start
  clearTimerMessage();

  timerInterval = setInterval(() => {
    timerSeconds -= 1;
    renderTimer();

    if (timerSeconds <= 0) {
      timerSeconds = 0;
      stopTimer();
      showTimerMessage('Time is up! 🎉');
    }
  }, 1000);
}

/**
 * Pauses the countdown without resetting it.
 */
function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

/**
 * Resets the timer to 25:00 and clears all state.
 */
function resetTimer() {
  stopTimer();
  timerSeconds = 25 * 60;
  clearTimerMessage();
  renderTimer();
}

/**
 * Displays a message below the timer.
 * @param {string} msg
 */
function showTimerMessage(msg) {
  const el = document.getElementById('timer-message');
  if (el) el.textContent = msg; // textContent — safe
}

/** Clears the timer message. */
function clearTimerMessage() {
  const el = document.getElementById('timer-message');
  if (el) el.textContent = '';
}

/* ==========================================================================
   6. To-Do List
   ========================================================================== */

/**
 * Persists the tasks array to Local Storage.
 */
function saveTasks() {
  saveToStorage(STORAGE_KEYS.tasks, tasks);
}

/**
 * Loads tasks from storage and renders them.
 */
function loadTasks() {
  tasks = loadFromStorage(STORAGE_KEYS.tasks, []);
  renderTasks();
}

/**
 * Shows a temporary error message in the to-do error element.
 * Auto-clears after 3 seconds.
 * @param {string} msg
 */
function showTodoError(msg) {
  const el = document.getElementById('todo-error');
  if (!el) return;
  el.textContent = msg; // textContent — safe
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.textContent = ''; }, 3000);
}

/**
 * Checks whether `text` duplicates any existing task (case-insensitive, trimmed).
 * @param {string} text - The candidate text (already trimmed).
 * @param {number|null} excludeId - Task id to exclude from the check (used during edit).
 * @returns {boolean}
 */
function isDuplicateTask(text, excludeId = null) {
  const lower = text.toLowerCase();
  return tasks.some(t => t.id !== excludeId && t.text.toLowerCase() === lower);
}

/**
 * Adds a new task.
 * @param {string} rawText
 */
function addTask(rawText) {
  const text = rawText.trim();

  if (!text) {
    showTodoError('Task cannot be empty.');
    return;
  }

  if (isDuplicateTask(text)) {
    showTodoError('A task with that name already exists.');
    return;
  }

  tasks.push({ id: Date.now(), text, done: false });
  saveTasks();
  renderTasks();
}

/**
 * Toggles the done state of a task.
 * @param {number} id
 */
function toggleDone(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.done = !task.done;
  saveTasks();
  renderTasks();
}

/**
 * Deletes a task by id.
 * @param {number} id
 */
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}

/**
 * Switches a task row into inline editing mode.
 * @param {number} id
 */
function startEdit(id) {
  // Re-render will clear any other open edit first
  renderTasks(id);
}

/**
 * Saves the edited text for a task.
 * @param {number} id
 * @param {string} rawText
 */
function saveEdit(id, rawText) {
  const text = rawText.trim();

  if (!text) {
    showTodoError('Task cannot be empty.');
    return;
  }

  if (isDuplicateTask(text, id)) {
    showTodoError('A task with that name already exists.');
    return;
  }

  const task = tasks.find(t => t.id === id);
  if (task) {
    task.text = text;
    saveTasks();
  }
  renderTasks();
}

/**
 * Cancels an in-progress edit and re-renders the normal list.
 */
function cancelEdit() {
  renderTasks();
}

/**
 * Builds the DOM for the to-do list. If `editingId` is provided,
 * that row renders as an inline edit field.
 * @param {number|null} editingId
 */
function renderTasks(editingId = null) {
  const list = document.getElementById('todo-list');
  if (!list) return;

  // Clear existing rows
  while (list.firstChild) {
    list.removeChild(list.firstChild);
  }

  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = 'todo-item';

    if (task.id === editingId) {
      // --- Inline edit mode ---
      const editRow = document.createElement('div');
      editRow.className = 'todo-edit-row';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'todo-edit-input';
      input.value = task.text;
      input.maxLength = 200;
      input.setAttribute('aria-label', 'Edit task text');
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter')  saveEdit(task.id, input.value);
        if (e.key === 'Escape') cancelEdit();
      });

      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn btn-primary';
      saveBtn.setAttribute('aria-label', 'Save task edit');
      saveBtn.textContent = 'Save';
      saveBtn.addEventListener('click', () => saveEdit(task.id, input.value));

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.setAttribute('aria-label', 'Cancel task edit');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', cancelEdit);

      editRow.appendChild(input);
      editRow.appendChild(saveBtn);
      editRow.appendChild(cancelBtn);
      li.appendChild(editRow);

      // Focus the input after render
      requestAnimationFrame(() => input.focus());

    } else {
      // --- Normal display mode ---
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'todo-checkbox';
      checkbox.checked = task.done;
      checkbox.setAttribute('aria-label', `Mark "${task.text}" as ${task.done ? 'not done' : 'done'}`);
      checkbox.addEventListener('change', () => toggleDone(task.id));

      const textSpan = document.createElement('span');
      textSpan.className = task.done ? 'todo-text done' : 'todo-text';
      textSpan.textContent = task.text; // textContent — safe

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'todo-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'icon-btn';
      editBtn.setAttribute('aria-label', `Edit task: ${task.text}`);
      editBtn.textContent = '✎';
      editBtn.addEventListener('click', () => startEdit(task.id));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'icon-btn danger';
      deleteBtn.setAttribute('aria-label', `Delete task: ${task.text}`);
      deleteBtn.textContent = '🗑';
      deleteBtn.addEventListener('click', () => deleteTask(task.id));

      actionsDiv.appendChild(editBtn);
      actionsDiv.appendChild(deleteBtn);

      li.appendChild(checkbox);
      li.appendChild(textSpan);
      li.appendChild(actionsDiv);
    }

    list.appendChild(li);
  });
}

/* ==========================================================================
   7. Quick Links
   ========================================================================== */

/** Default links pre-filled on first load */
const DEFAULT_LINKS = [
  { id: 1, name: 'Google',   url: 'https://www.google.com' },
  { id: 2, name: 'Gmail',    url: 'https://mail.google.com' },
  { id: 3, name: 'Calendar', url: 'https://calendar.google.com' },
];

/**
 * Persists the links array to Local Storage.
 */
function saveLinks() {
  saveToStorage(STORAGE_KEYS.links, links);
}

/**
 * Loads links from storage (or seeds defaults on first load) and renders.
 */
function loadLinks() {
  const saved = loadFromStorage(STORAGE_KEYS.links, null);
  if (saved === null) {
    // First visit — seed defaults
    links = DEFAULT_LINKS.map(l => ({ ...l }));
    saveLinks();
  } else {
    links = saved;
  }
  renderLinks();
}

/**
 * Normalises a URL string: prepends https:// if no scheme is present.
 * @param {string} raw
 * @returns {string}
 */
function normaliseUrl(raw) {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return 'https://' + trimmed;
  }
  return trimmed;
}

/**
 * Returns true if `url` is a valid absolute URL.
 * @param {string} url
 * @returns {boolean}
 */
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Shows a temporary error in the link error element.
 * @param {string} msg
 */
function showLinkError(msg) {
  const el = document.getElementById('link-error');
  if (!el) return;
  el.textContent = msg; // textContent — safe
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.textContent = ''; }, 3000);
}

/**
 * Adds a new quick link.
 * @param {string} name
 * @param {string} rawUrl
 */
function addLink(name, rawUrl) {
  const trimName = name.trim();
  if (!trimName) {
    showLinkError('Please enter a link name.');
    return;
  }

  const url = normaliseUrl(rawUrl);

  if (!isValidUrl(url)) {
    showLinkError('Please enter a valid URL (e.g. google.com or https://…).');
    return;
  }

  links.push({ id: Date.now(), name: trimName, url });
  saveLinks();
  renderLinks();
}

/**
 * Deletes a quick link by id.
 * @param {number} id
 */
function deleteLink(id) {
  links = links.filter(l => l.id !== id);
  saveLinks();
  renderLinks();
}

/**
 * Builds the DOM for the quick links container.
 */
function renderLinks() {
  const container = document.getElementById('links-container');
  if (!container) return;

  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  links.forEach(link => {
    const chip = document.createElement('span');
    chip.className = 'link-chip';

    // The clickable link button
    const a = document.createElement('a');
    a.href   = link.url;
    a.target = '_blank';
    a.rel    = 'noopener noreferrer';
    a.className = 'link-btn';
    a.textContent = link.name; // textContent — safe
    a.setAttribute('aria-label', `Open ${link.name} in a new tab`);

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'link-delete-btn';
    delBtn.setAttribute('aria-label', `Delete link: ${link.name}`);
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => deleteLink(link.id));

    chip.appendChild(a);
    chip.appendChild(delBtn);
    container.appendChild(chip);
  });
}

/* ==========================================================================
   8. Event Listener Setup
   ========================================================================== */

function attachEventListeners() {
  // --- Theme toggle ---
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // --- Name input ---
  const nameInput = document.getElementById('name-input');
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      saveToStorage(STORAGE_KEYS.name, nameInput.value);
      updateGreetingText();
    });
  }

  // --- Timer buttons ---
  const startBtn = document.getElementById('start-btn');
  const stopBtn  = document.getElementById('stop-btn');
  const resetBtn = document.getElementById('reset-btn');
  if (startBtn) startBtn.addEventListener('click', startTimer);
  if (stopBtn)  stopBtn.addEventListener('click', stopTimer);
  if (resetBtn) resetBtn.addEventListener('click', resetTimer);

  // --- To-Do: Add button & Enter key ---
  const addTaskBtn  = document.getElementById('add-task-btn');
  const todoInput   = document.getElementById('todo-input');

  if (addTaskBtn) {
    addTaskBtn.addEventListener('click', () => {
      if (!todoInput) return;
      addTask(todoInput.value);
      todoInput.value = '';
    });
  }

  if (todoInput) {
    todoInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        addTask(todoInput.value);
        todoInput.value = '';
      }
    });
  }

  // --- Quick Links: Add button & Enter key ---
  const addLinkBtn    = document.getElementById('add-link-btn');
  const linkNameInput = document.getElementById('link-name-input');
  const linkUrlInput  = document.getElementById('link-url-input');

  function handleAddLink() {
    if (!linkNameInput || !linkUrlInput) return;
    addLink(linkNameInput.value, linkUrlInput.value);
    // Clear inputs only on success (renderLinks will have been called)
    // We detect success by checking that the last link's name matches
    const lastName = links.length ? links[links.length - 1].name : '';
    if (lastName === linkNameInput.value.trim()) {
      linkNameInput.value = '';
      linkUrlInput.value  = '';
    }
  }

  if (addLinkBtn) addLinkBtn.addEventListener('click', handleAddLink);
  if (linkUrlInput) {
    linkUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAddLink();
    });
  }
}

/* ==========================================================================
   8. Init — wires everything together on DOMContentLoaded
   ========================================================================== */

function init() {
  loadTheme();
  loadName();
  loadTasks();
  loadLinks();

  updateClock();
  setInterval(updateClock, 1000);

  renderTimer();
  attachEventListeners();
}

document.addEventListener('DOMContentLoaded', init);
