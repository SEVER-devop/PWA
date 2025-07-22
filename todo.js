let todoList = [];
const baseTodoId = 'task-';
let currentSort = 'order';
let currentFilter = 'all';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/serviceworker.js')
      .then((registration) => {
        console.log('ServiceWorker зарегистрирован:', registration.scope);
      })
      .catch((error) => {
        console.log('Ошибка регистрации ServiceWorker:', error);
      });
  });
}


// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();
    updateDeleteButtonState();
    renderAllTasks();
});

// Основные функции
function addToDo() {
    const form = document.forms.toDoForm;
    const title = form.elements.title.value.trim();
    const date = form.elements.date.value;
    
    if (!title || !date) {
        alert('Пожалуйста, заполните название и дату задачи');
        return;
    }

    const newTodo = {
        id: Date.now(),
        title: title,
        color: form.elements.color.value || '#0d6efd',
        description: form.elements.description.value.trim(),
        date: date,
        priority: form.elements.priority.value,
        completed: false,
        order: todoList.length > 0 ? Math.max(...todoList.map(t => t.order)) + 1 : 1
    };

    todoList.push(newTodo);
    saveToLocalStorage();
    renderAllTasks();
    form.reset();
}

function renderTask(task) {
    const priorityClasses = {
        high: 'priority-high',
        medium: 'priority-medium',
        low: 'priority-low'
    };

    const taskElement = document.createElement('div');
    taskElement.className = `col-12 ${priorityClasses[task.priority] || ''}`;
    taskElement.id = baseTodoId + task.id;
    taskElement.innerHTML = `
        <div class="card mb-3 ${task.completed ? 'border-success' : ''}">
            <div class="card-header d-flex justify-content-between align-items-center py-2" 
                 style="background-color: ${task.color}">
                <div>
                    <button class="btn btn-sm btn-outline-secondary me-1" onclick="moveTaskUp(${task.id})" ${isFirstTask(task.id) ? 'disabled' : ''}>
                        ↑
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="moveTaskDown(${task.id})" ${isLastTask(task.id) ? 'disabled' : ''}>
                        ↓
                    </button>
                </div>
                <div class="form-check">
                    <input class="form-check-input task-checkbox" type="checkbox" 
                           id="check-${task.id}" 
                           ${task.completed ? 'checked' : ''}
                           onchange="toggleTaskStatus(${task.id})">
                    <label class="form-check-label text-white" for="check-${task.id}">
                        ${task.completed ? 'Выполнена' : 'Активна'}
                    </label>
                </div>
                <small class="text-white">${formatDate(task.date)}</small>
                <span class="badge ${getPriorityBadgeClass(task.priority)} ms-2">
                    ${getPriorityText(task.priority)}
                </span>
            </div>
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h5 class="card-title mb-2 ${task.completed ? 'text-decoration-line-through' : ''}">
                            ${task.title}
                        </h5>
                        ${task.description ? `<p class="card-text text-muted">${task.description}</p>` : ''}
                    </div>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteTask(${task.id})">
                        Удалить
                    </button>
                </div>
            </div>
        </div>
    `;
    return taskElement;
}

function getPriorityBadgeClass(priority) {
    const classes = {
        high: 'bg-danger',
        medium: 'bg-warning',
        low: 'bg-success'
    };
    return classes[priority] || 'bg-secondary';
}

function getPriorityText(priority) {
    const texts = {
        high: 'Высокий',
        medium: 'Средний',
        low: 'Низкий'
    };
    return texts[priority] || '';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function isFirstTask(id) {
    if (currentSort === 'date') return true;
    const sorted = getFilteredTasks().sort((a, b) => a.order - b.order);
    return sorted[0]?.id === id;
}

function isLastTask(id) {
    if (currentSort === 'date') return true;
    const sorted = getFilteredTasks().sort((a, b) => a.order - b.order);
    return sorted[sorted.length - 1]?.id === id;
}

function getFilteredTasks() {
    if (currentFilter === 'all') return [...todoList];
    return todoList.filter(task => task.priority === currentFilter);
}

function renderAllTasks() {
    const container = document.getElementById('tasksContainer');
    if (!container) return;

    container.innerHTML = '';
    
    // Сортируем и фильтруем задачи
    let tasksToRender = getFilteredTasks();
    
    if (currentSort === 'date') {
        tasksToRender.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else {
        tasksToRender.sort((a, b) => a.order - b.order);
    }
    
    tasksToRender.forEach(task => {
        container.appendChild(renderTask(task));
    });
    
    // Обновляем активные кнопки
    updateActiveButtons();
}

function updateActiveButtons() {
    // Сортировка
    document.getElementById('sortDateBtn')?.classList.toggle('filter-active', currentSort === 'date');
    document.getElementById('sortCreatedBtn')?.classList.toggle('filter-active', currentSort === 'order');
    
    // Фильтры
    document.getElementById('filterAllBtn')?.classList.toggle('filter-active', currentFilter === 'all');
    document.getElementById('filterHighBtn')?.classList.toggle('filter-active', currentFilter === 'high');
    document.getElementById('filterMediumBtn')?.classList.toggle('filter-active', currentFilter === 'medium');
    document.getElementById('filterLowBtn')?.classList.toggle('filter-active', currentFilter === 'low');
}

function moveTaskUp(id) {
    if (currentSort === 'date') return;
    
    const task = todoList.find(t => t.id === id);
    if (!task) return;
    
    // Находим предыдущую задачу в текущем порядке
    const prevTask = todoList
        .filter(t => t.order < task.order)
        .sort((a, b) => b.order - a.order)[0];
    
    if (!prevTask) return;
    
    // Меняем порядок
    [task.order, prevTask.order] = [prevTask.order, task.order];
    
    saveToLocalStorage();
    renderAllTasks();
}

function moveTaskDown(id) {
    if (currentSort === 'date') return;
    
    const task = todoList.find(t => t.id === id);
    if (!task) return;
    
    // Находим следующую задачу в текущем порядке
    const nextTask = todoList
        .filter(t => t.order > task.order)
        .sort((a, b) => a.order - b.order)[0];
    
    if (!nextTask) return;
    
    // Меняем порядок
    [task.order, nextTask.order] = [nextTask.order, task.order];
    
    saveToLocalStorage();
    renderAllTasks();
}

function sortTasks(type) {
    currentSort = type;
    renderAllTasks();
}

function filterTasks(priority) {
    currentFilter = priority;
    renderAllTasks();
}

function deleteTask(id) {
    if (!confirm('Удалить эту задачу?')) return;
    
    todoList = todoList.filter(task => task.id !== id);
    saveToLocalStorage();
    renderAllTasks();
    updateDeleteButtonState();
}

function toggleTaskStatus(id) {
    const task = todoList.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    saveToLocalStorage();
    renderAllTasks();
    updateDeleteButtonState();
}

function deleteSelected() {
    const checkboxes = document.querySelectorAll('.task-checkbox:checked');
    if (checkboxes.length === 0) return;
    
    if (!confirm(`Удалить ${checkboxes.length} выделенных задач?`)) return;
    
    const idsToDelete = Array.from(checkboxes).map(cb => parseInt(cb.id.replace('check-', '')));
    todoList = todoList.filter(task => !idsToDelete.includes(task.id));
    saveToLocalStorage();
    renderAllTasks();
    updateDeleteButtonState();
}

function updateDeleteButtonState() {
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    if (deleteBtn) {
        const hasSelected = document.querySelectorAll('.task-checkbox:checked').length > 0;
        deleteBtn.disabled = !hasSelected;
    }
}

function saveToLocalStorage() {
    localStorage.setItem('todoList', JSON.stringify(todoList));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('todoList');
    if (saved) {
        try {
            todoList = JSON.parse(saved);
            // Инициализируем порядок, если его нет
            if (todoList.length > 0 && typeof todoList[0].order === 'undefined') {
                todoList.forEach((task, index) => {
                    task.order = index + 1;
                });
            }
            // Инициализируем приоритет, если его нет
            todoList.forEach(task => {
                if (!task.priority) task.priority = 'medium';
            });
        } catch {
            localStorage.removeItem('todoList');
            todoList = [];
        }
    }
}