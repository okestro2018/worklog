// --- Global Variables ---
let currentDate = new Date();
let selectedDate = null;
let previouslySelectedCell = null;
let currentEditLogId = null;

// --- Helper Functions ---
const el = (selector) => document.getElementById(selector);
const qSel = (selector) => document.querySelector(selector);
const qSelAll = (selector) => document.querySelectorAll(selector);

function dateToYyyyMmDd(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString || '';
    try {
        const [year, month, day] = dateString.split('-');
        if (!year || !month || !day) return dateString;
        return `${year} / ${month} / ${day}`;
    } catch (e) { return dateString; }
}

function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// --- Initialization ---
window.addEventListener('DOMContentLoaded', (event) => {
    // Ensure the DOM is fully loaded before running init code
    console.log('DOM fully loaded and parsed');
    const todayStr = dateToYyyyMmDd(new Date());
    selectedDate = null;
    const workDateEl = el('work-date');
    if(workDateEl) workDateEl.value = todayStr;
    renderCalendar();
    showTab('view');
});


// --- Tab Management ---
function showTab(tabName) {
    qSelAll('.tab').forEach(tab => tab.classList.remove('active'));
    el('write-content')?.classList.add('hidden');
    el('view-content')?.classList.add('hidden');

    if (tabName === 'view' && el('view-content')) {
        el('view-content').classList.remove('hidden');
        qSel('.tab:nth-child(1)')?.classList.add('active');
        applyFilters();
    } else if (tabName === 'write' && el('write-content')) {
        el('write-content').classList.remove('hidden');
        qSel('.tab:nth-child(2)')?.classList.add('active');
        if (!currentEditLogId && el('work-date')) {
            el('work-date').value = selectedDate || dateToYyyyMmDd(new Date());
        }
    }
}

// --- Task Item Management (Write Form) ---
function addTask() {
    const taskList = el('task-list');
    if (!taskList) return;
    const taskItem = document.createElement('div');
    taskItem.className = 'task-item';
    taskItem.innerHTML = `
        <div class="task-input">
            <textarea placeholder="세부 작업 내용을 입력하세요" required></textarea>
        </div>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeTask(this)">삭제</button>`;
    taskList.appendChild(taskItem);
    taskItem.querySelector('textarea')?.focus();
}
function removeTask(button) {
    const taskList = el('task-list');
    if (taskList && taskList.children.length > 1) {
        button.closest('.task-item')?.remove();
    } else {
        alert('최소 하나의 작업 항목은 유지해야 합니다.');
    }
}
function resetForm() {
    const form = el('work-log-form');
    if (form) form.reset();
    const editIdEl = el('edit-log-id');
    if(editIdEl) editIdEl.value = '';
    currentEditLogId = null;
    const detailCatEl = el('work-detail-category');
    if (detailCatEl) detailCatEl.value = '';
    const workDateEl = el('work-date');
    if (workDateEl) workDateEl.value = selectedDate || dateToYyyyMmDd(new Date());

    const taskList = el('task-list');
    if (!taskList) return;
    while (taskList.children.length > 1) {
        taskList.removeChild(taskList.lastChild);
    }
    const firstTextarea = taskList.querySelector('textarea');
    if (firstTextarea) {
        firstTextarea.value = '';
        firstTextarea.placeholder = "세부 작업 내용을 입력하세요";
    } else if (taskList.children.length === 0) {
        addTask(); // 혹시 모르니 하나 추가
    }
    console.log("Form reset");
}

// --- Local Storage Management ---
function getWorkLogs() {
    try {
        const logs = JSON.parse(localStorage.getItem('workLogs')) || [];
        return Array.isArray(logs) ? logs : [];
    } catch (e) {
        console.error("Local Storage Read Error:", e);
        return [];
    }
}
function setWorkLogs(logs) {
    try {
        localStorage.setItem('workLogs', JSON.stringify(logs));
    } catch (e) {
        console.error("Local Storage Save Error:", e);
        alert("로그 저장 중 오류가 발생했습니다.");
    }
}

// --- Log CRUD Operations ---
function saveWorkLog() {
    const logId = el('edit-log-id')?.value ? parseInt(el('edit-log-id').value) : null;
    const date = el('work-date')?.value;
    const category = el('work-category')?.value;
    const detailCategory = el('work-detail-category')?.value;
    const summary = el('work-summary')?.value.trim();
    const result = el('work-result')?.value;
    const notes = el('work-notes')?.value.trim();

    if (!date || !category || !summary || !result) {
        alert('필수 항목(*)을 모두 입력 또는 선택해주세요.');
        return;
    }
    const tasks = [];
    const taskTextareas = qSelAll('#task-list textarea');
    let hasAnyTaskContent = false;
    taskTextareas.forEach(textarea => {
        const content = textarea.value.trim();
        tasks.push(content);
        if (content) {
            hasAnyTaskContent = true;
        }
    });
    if (!hasAnyTaskContent && taskTextareas.length > 0) { // taskTextareas가 존재할 때만 체크
        alert('세부 작업 내용을 하나 이상 입력해주세요.');
        taskTextareas[0]?.focus();
        return;
    }
    const validTasks = tasks.filter(t => !!t);
    let workLogs = getWorkLogs();
    const catSel = el('work-category');
    const resSel = el('work-result');
    const categoryName = catSel?.options[catSel.selectedIndex]?.text ?? category;
    const resultName = resSel?.options[resSel.selectedIndex]?.text ?? result;
    const logData = { date, category, categoryName, detailCategory, summary, tasks: validTasks, result, resultName, notes };

    if (logId) {
        const index = workLogs.findIndex(log => log.id === logId);
        if (index > -1) {
            workLogs[index] = { ...workLogs[index], ...logData };
            alert('업무 일지가 수정되었습니다.');
        } else {
            alert('수정할 로그를 찾는 데 실패했습니다.');
            currentEditLogId = null;
            const editIdEl = el('edit-log-id');
            if(editIdEl) editIdEl.value = '';
            showTab('view');
            return;
        }
    } else {
        const newLog = { id: Date.now(), ...logData, createdAt: new Date().toISOString() };
        workLogs.push(newLog);
        alert('업무 일지가 저장되었습니다.');
    }
    setWorkLogs(workLogs);
    resetForm();
    renderCalendar();
    showTab('view');
}
function deleteWorkLog(id) {
    if (!confirm('정말 이 업무 일지를 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.')) {
        return;
    }
    let logs = getWorkLogs();
    const logToDelete = logs.find(l => l.id === id);
    if (!logToDelete) {
        alert('삭제할 로그를 찾지 못했습니다.');
        applyFilters();
        return;
    }
    const dateHadLog = logToDelete.date;
    logs = logs.filter(l => l.id !== id);
    setWorkLogs(logs);
    applyFilters();
    const remainsOnDate = getWorkLogs().some(l => l.date === dateHadLog);
    if (!remainsOnDate || selectedDate === dateHadLog) { // 관련 날짜면 달력 갱신
        renderCalendar();
    }
    alert('업무 일지가 삭제되었습니다.');
    if (el('detail-modal')?.style.display === 'block' && currentEditLogId === id) {
        closeModal();
    }
}

// --- Display & Filter ---
function displayLogsInTable(logs) {
    const logList = el('log-list');
    if (!logList) return;
    logList.innerHTML = '';
    if (!logs || logs.length === 0) {
        let message = '표시할 업무 일지가 없습니다.';
        if(selectedDate) {
            message = `${formatDate(selectedDate)} 에는 등록된 업무가 없습니다.`;
        } else {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            message = `${year}년 ${month}월 에는 등록된 업무가 없습니다.`;
        }
        logList.innerHTML = `<tr><td colspan="5" style="text-align: center;">${message}</td></tr>`;
        return;
    }
    logs.forEach(log => {
        const row = logList.insertRow();
        row.dataset.logId = log.id;
        const categoryValue = log.category || 'default';
        const badgeClass = `badge-${escapeHtml(categoryValue.toLowerCase())}`;
        const categoryDisplayName = log.categoryName || log.category || '미지정';
        const resultDisplayName = log.resultName || log.result || '미지정';
        row.insertCell().textContent = formatDate(log.date);
        row.insertCell().innerHTML = `<span class="badge ${badgeClass}">${escapeHtml(categoryDisplayName)}</span>`;
        row.insertCell().textContent = escapeHtml(log.summary);
        row.insertCell().textContent = escapeHtml(resultDisplayName);
        const actionCell = row.insertCell();
        actionCell.classList.add('actions');
        actionCell.innerHTML = `
            <button class="btn btn-sm" onclick="viewWorkLog(${log.id})" title="상세 보기">보기</button>
            <button class="btn btn-sm btn-danger" onclick="deleteWorkLog(${log.id})" title="삭제">삭제</button>`;
    });
}
function searchLogs() { applyFilters(); }
function applyFilters() {
    const categoryFilter = el('category-filter')?.value ?? '';
    const statusFilter = el('status-filter')?.value ?? '';
    const textFilter = el('search-input')?.value.toLowerCase().trim() ?? '';
    let logs = getWorkLogs();

    try {
        logs.sort((a, b) => {
            // Provide default dates if missing or invalid? Or filter out invalid ones?
             // Filter out invalid dates first for safer sort/filter
             if (!a.date || !b.date) return 0; // Basic handling for missing dates
            try {
                const dateA = new Date(a.date + 'T00:00:00');
                const dateB = new Date(b.date + 'T00:00:00');
                 if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0; // Invalid dates don't move
                return dateA - dateB;
             } catch(sortErr) {
                console.warn("Date sort issue for:", a.date, b.date, sortErr);
                return 0; // Don't crash if date format unexpected
             }
        });
    } catch(e){ console.error("Sorting error:", e); }

    const currentCalendarYear = currentDate.getFullYear();
    const currentCalendarMonth = currentDate.getMonth(); // 0-indexed

    const filteredLogs = logs.filter(log => {
        let matchDate = false;
        if (selectedDate) {
            matchDate = log.date === selectedDate;
        } else {
            if(!log.date) return false; // Skip logs with no date
            try {
                const logDateObj = new Date(log.date + 'T00:00:00'); // Assume local timezone midnight
                if (!isNaN(logDateObj.getTime())) {
                    const logYear = logDateObj.getFullYear();
                    const logMonth = logDateObj.getMonth(); // 0-indexed
                    matchDate = (logYear === currentCalendarYear && logMonth === currentCalendarMonth);
                } else { matchDate = false; } // Invalid date format
            } catch (e) {
                console.error(`Error parsing log date '${log.date}' for filtering:`, e);
                matchDate = false; // Treat errors as non-match
            }
        }

        const matchCategory = !categoryFilter || log.category === categoryFilter;
        const matchStatus = !statusFilter || log.result === statusFilter;
        const matchText = !textFilter ||
            (log.summary && log.summary.toLowerCase().includes(textFilter)) ||
            (log.detailCategory && log.detailCategory.toLowerCase().includes(textFilter)) ||
            (log.tasks && log.tasks.some(task => task && String(task).toLowerCase().includes(textFilter))) || // check if task exists
            (log.notes && log.notes.toLowerCase().includes(textFilter));

        return matchDate && matchCategory && matchStatus && matchText;
    });
    displayLogsInTable(filteredLogs);

    if (selectedDate) {
        showAddTaskButton(selectedDate);
    } else {
        hideAddTaskButton();
    }
}
function resetFilters() {
    ['category-filter', 'status-filter', 'date-filter', 'search-input'].forEach(id => {
        const element = el(id);
        if(element) element.value = '';
    });
    if (previouslySelectedCell) {
        previouslySelectedCell.classList.remove('selected');
    }
    selectedDate = null;
    previouslySelectedCell = null;
    renderCalendar(); // This will call applyFilters after rendering
}
function syncCalendarWithDateInput() {
    const dateInput = el('date-filter');
    const newDate = dateInput?.value;
    if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
        try{
            const targetDate = new Date(newDate + 'T00:00:00');
            if (!isNaN(targetDate.getTime())) {
                currentDate = targetDate; // Update the month view
                selectedDate = newDate;  // Select the specific date
                renderCalendar();       // Re-render to show selection and new month
            }
        } catch(e){console.error("Error parsing date from input:",e);}
    } else if (!newDate) { // If date input is cleared
        if (previouslySelectedCell) previouslySelectedCell.classList.remove('selected');
        selectedDate = null;
        previouslySelectedCell = null;
        applyFilters(); // Show current month's view
        hideAddTaskButton();
    }
}

// --- Modal Management ---
function viewWorkLog(id) {
    const log = getWorkLogs().find(l => l.id === id);
    if (!log) { alert('선택한 업무 일지를 찾을 수 없습니다.'); closeModal(); return; }
    currentEditLogId = id; // Store for potential edit
    const modalTitle = el('modal-title');
    const modalBody = el('modal-body');
    const detailModal = el('detail-modal');
    if (!modalTitle || !modalBody || !detailModal) return;

    modalTitle.textContent = `${formatDate(log.date)} - ${escapeHtml(log.summary)}`;
    let tasksHtml = '<ul>';
    if (log.tasks && log.tasks.length > 0) {
        log.tasks.forEach(task => tasksHtml += `<li>${escapeHtml(task) || '(내용 없음)'}</li>`);
    } else { tasksHtml += '<li>(세부 내용 없음)</li>'; }
    tasksHtml += '</ul>';
    const categoryDisplayName = log.categoryName || log.category || '미지정';
    const detailCategoryDisplay = log.detailCategory || '-';
    const resultDisplayName = log.resultName || log.result || '미지정';
    const notesDisplay = log.notes || '-';
    modalBody.innerHTML = `
        <p><strong>날짜:</strong> ${formatDate(log.date)}</p>
        <p><strong>업무 구분:</strong> ${escapeHtml(categoryDisplayName)}</p>
        <p><strong>항목 상세:</strong> ${escapeHtml(detailCategoryDisplay)}</p>
        <p><strong>업무 요약:</strong> ${escapeHtml(log.summary)}</p>
        <p><strong>세부 내용:</strong></p>${tasksHtml}
        <p><strong>업무 상태:</strong> ${escapeHtml(resultDisplayName)}</p>
        <p><strong>비고:</strong> ${escapeHtml(notesDisplay)}</p>`;
    detailModal.style.display = 'block';
}
function closeModal() {
    const detailModal = el('detail-modal');
    if (detailModal) detailModal.style.display = 'none';
    const modalBody = el('modal-body');
    if (modalBody) modalBody.innerHTML = ''; // Clear content
    currentEditLogId = null; // Reset edit ID when closing details
}
function editWorkLogFromModal() {
    if (!currentEditLogId) return;
    const logToEdit = getWorkLogs().find(log => log.id === currentEditLogId);
    if (!logToEdit) { alert("수정할 로그 정보를 찾을 수 없습니다."); closeModal(); return; }

    // Populate the main form
    const editIdEl = el('edit-log-id'); if(editIdEl) editIdEl.value = logToEdit.id;
    const workDateEl = el('work-date'); if(workDateEl) workDateEl.value = logToEdit.date;
    const workCatEl = el('work-category'); if(workCatEl) workCatEl.value = logToEdit.category;
    const detailCatEl = el('work-detail-category'); if(detailCatEl) detailCatEl.value = logToEdit.detailCategory || '';
    const summaryEl = el('work-summary'); if(summaryEl) summaryEl.value = logToEdit.summary;
    const resultEl = el('work-result'); if(resultEl) resultEl.value = logToEdit.result;
    const notesEl = el('work-notes'); if(notesEl) notesEl.value = logToEdit.notes || '';

    const taskList = el('task-list');
    if(taskList){
        taskList.innerHTML = ''; // Clear existing task items
        const tasksToFill = logToEdit.tasks && logToEdit.tasks.length > 0 ? logToEdit.tasks : [''];
        tasksToFill.forEach(taskContent => {
            const taskItem = document.createElement('div');
            taskItem.className = 'task-item';
            taskItem.innerHTML = `
                <div class="task-input">
                    <textarea required>${escapeHtml(taskContent)}</textarea>
                </div>
                <button type="button" class="btn btn-danger btn-sm" onclick="removeTask(this)">삭제</button>`;
            taskList.appendChild(taskItem);
        });
        if (taskList.children.length === 0) { addTask(); } // Add one if no tasks were present
    }

    closeModal(); // Close the detail modal
    showTab('write'); // Switch to the write tab
    el('work-summary')?.focus(); // Focus on summary field
}
function openQuickAddModal() {
    const modal = el('add-task-modal');
    const dateInput = el('quick-add-target-date');
    const modalTitle = el('quick-modal-title');
    const quickAddForm = el('quick-add-form');
    const quickAddCat = el('quick-add-category');
    const quickAddResult = el('quick-add-result');
    const targetDate = el('add-task-for-date-button')?.dataset.date || selectedDate;

    if (!modal || !dateInput || !modalTitle || !targetDate || !quickAddForm) {
        alert('업무를 추가할 날짜가 선택되지 않았거나 모달 요소가 없습니다.');
        return;
    }

    quickAddForm.reset(); // Reset form fields
    dateInput.value = targetDate;
    modalTitle.textContent = `${formatDate(targetDate)} 빠른 업무 추가`;
    if(quickAddResult) quickAddResult.value = 'in-progress'; // Default status
    modal.style.display = 'block';
    if(quickAddCat) quickAddCat.focus(); // Focus on the first input
}
function closeQuickAddModal() {
    const quickAddModal = el('add-task-modal');
    if (quickAddModal) quickAddModal.style.display = 'none';
}
function saveQuickTask() {
    const targetDate = el('quick-add-target-date')?.value;
    const category = el('quick-add-category')?.value;
    const detailCategory = el('quick-add-detail-category')?.value;
    const summary = el('quick-add-summary')?.value.trim();
    const detailsText = el('quick-add-details')?.value.trim();
    const result = el('quick-add-result')?.value;
    const notes = el('quick-add-notes')?.value.trim();

    if (!targetDate || !category || !summary || !result) {
        alert('필수 항목(*)을 모두 입력 또는 선택해주세요.');
        return;
    }

    const catSel = el('quick-add-category');
    const resSel = el('quick-add-result');
    const categoryName = catSel?.options[catSel.selectedIndex]?.text ?? category;
    const resultName = resSel?.options[resSel.selectedIndex]?.text ?? result;
    // Split details by newline, trim lines, and filter out empty lines
    const tasksArray = detailsText ? detailsText.split('\n').map(line => line.trim()).filter(line => line) : [];

    let workLogs = getWorkLogs();
    const newLog = { id: Date.now(), date: targetDate, category, categoryName, detailCategory, summary, tasks: tasksArray, result, resultName, notes, createdAt: new Date().toISOString() };
    workLogs.push(newLog);
    setWorkLogs(workLogs);
    closeQuickAddModal();
    selectedDate = targetDate; // Select the date just added
    applyFilters();          // Refresh list to show the new entry for the selected date
    renderCalendar();        // Update calendar (dot and selection)
    alert('빠른 업무가 추가되었습니다.');
}

// --- Calendar Management ---
function renderCalendar() {
    const calendarDiv = el('calendar');
    if (!calendarDiv) { console.error("Calendar div not found!"); return; }
    calendarDiv.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'calendar-header';
    header.innerHTML = `
        <button type="button" class="calendar-nav prev-month" title="이전 달">&lt;</button>
        <span>${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월</span>
        <button type="button" class="calendar-nav next-month" title="다음 달">&gt;</button>`;
    calendarDiv.appendChild(header);
    header.querySelector('.prev-month')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        selectedDate = null; // Deselect date when changing month
        if (previouslySelectedCell) previouslySelectedCell.classList.remove('selected');
        previouslySelectedCell = null;
        const dateFilterEl = el('date-filter'); if(dateFilterEl) dateFilterEl.value = '';
        renderCalendar(); // Re-render the calendar for the new month
    });
    header.querySelector('.next-month')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        selectedDate = null; // Deselect date when changing month
        if (previouslySelectedCell) previouslySelectedCell.classList.remove('selected');
        previouslySelectedCell = null;
        const dateFilterEl = el('date-filter'); if(dateFilterEl) dateFilterEl.value = '';
        renderCalendar(); // Re-render the calendar for the new month
    });
    const table = document.createElement('table');
    table.className = 'calendar';
    const thead = table.createTHead(), tbody = table.createTBody();
    const hRow = thead.insertRow();
    ['일', '월', '화', '수', '목', '금', '토'].forEach(day => { const th = document.createElement('th'); th.textContent = day; hRow.appendChild(th); });
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed
    const firstDayOfMonth = new Date(year, month, 1);
    let currentDay = new Date(firstDayOfMonth);
    currentDay.setDate(currentDay.getDate() - firstDayOfMonth.getDay()); // Go back to the start of the week (Sunday)
    const logs = getWorkLogs();
    const datesWithLogs = logs.reduce((acc, log) => { if (log.date) acc[log.date] = true; return acc; }, {});
    const todayStr = dateToYyyyMmDd(new Date());

    for (let i = 0; i < 6; i++) { // Render 6 weeks
        const row = tbody.insertRow();
        let weekHasDayInMonth = false;
        for (let j = 0; j < 7; j++) {
            const cell = row.insertCell();
            const cellDateStr = dateToYyyyMmDd(currentDay);
            const isCurrentMonth = currentDay.getMonth() === month;
            cell.textContent = currentDay.getDate();
            cell.dataset.date = cellDateStr; // Store YYYY-MM-DD in data attribute
            cell.classList.toggle('other-month', !isCurrentMonth);

            if (isCurrentMonth) {
                weekHasDayInMonth = true;
                cell.classList.toggle('today', cellDateStr === todayStr);
                cell.classList.toggle('has-logs', !!datesWithLogs[cellDateStr]);
                if (cellDateStr === selectedDate) {
                    cell.classList.add('selected');
                    previouslySelectedCell = cell; // Track the selected cell
                }

                // Click handler for dates in the current month
                cell.onclick = function() {
                    const clickedDate = this.dataset.date;
                    const isEditing = !!currentEditLogId; // Check if currently editing a log

                    if (clickedDate === selectedDate) { // Clicked on the already selected date
                        selectedDate = null; // Deselect
                        this.classList.remove('selected');
                        previouslySelectedCell = null;
                        const dateFilterEl = el('date-filter'); if(dateFilterEl) dateFilterEl.value = ''; // Clear date input
                    } else { // Clicked on a new date
                        selectedDate = clickedDate; // Select the new date
                        if (previouslySelectedCell && previouslySelectedCell !== this) {
                            previouslySelectedCell.classList.remove('selected'); // Deselect previous
                        }
                        this.classList.add('selected'); // Highlight current
                        previouslySelectedCell = this;
                        const dateFilterEl = el('date-filter'); if(dateFilterEl) dateFilterEl.value = clickedDate; // Update date input
                    }

                    if (!isEditing && el('work-date')) { // Update write form date only if not editing
                         el('work-date').value = selectedDate || dateToYyyyMmDd(new Date());
                    }
                    applyFilters(); // Refresh the log list based on the new selection
                };
            } else {
                cell.onclick = null; // Disable click for dates outside the current month
            }
            currentDay.setDate(currentDay.getDate() + 1); // Move to the next day
        }
        // Optional: Hide the last row if it contains only days from the next month and 5 rows already rendered
        if (!weekHasDayInMonth && i >= 4 && tbody.contains(row)) {
             try {
                let containsCurrentMonth = false;
                 for(const td of row.cells){
                    if(!td.classList.contains('other-month')){
                         containsCurrentMonth = true;
                        break;
                     }
                 }
                if(!containsCurrentMonth) tbody.removeChild(row); // Remove row if it ONLY contains other month days
             } catch (e) { console.warn("Error trying to remove empty calendar row: ", e); }
            //break; // Stop rendering further rows (might be needed depending on logic)
        }
    }
    calendarDiv.appendChild(table);
    applyFilters(); // Ensure list is updated after calendar is drawn/redrawn
}
function showAddTaskButton(date) {
    const btn = el('add-task-for-date-button');
    const disp = el('selected-date-display');
    const cont = el('add-task-button-container');
    if (!btn || !disp || !cont) return;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        disp.textContent = formatDate(date); // Show formatted date on button
        btn.dataset.date = date; // Store YYYY-MM-DD on button
        btn.classList.remove('hidden');
        cont.classList.remove('hidden');
    } else { hideAddTaskButton(); }
}
function hideAddTaskButton() {
    const btn = el('add-task-for-date-button');
    const cont = el('add-task-button-container');
    if(btn) btn.classList.add('hidden');
    if(cont) cont.classList.add('hidden');
}

// --- Export Functions (TXT and Excel) ---
function exportToTXT() {
    const logs = getWorkLogs();
    if (logs.length === 0) { alert('내보낼 데이터가 없습니다.'); return; }
    let txtContent = "==================== 업무 일지 내보내기 ====================\n\n";
    try{ logs.sort((a, b) => { // Safe sort
        try {
            const dA = new Date(a.date + 'T00:00:00');
            const dB = new Date(b.date + 'T00:00:00');
             return isNaN(dA) || isNaN(dB) ? 0 : dA - dB;
         } catch (e) { return 0; }
     });
    } catch(e) {console.warn("Sorting before TXT export failed", e)}
    logs.forEach((log, index) => {
        txtContent += `[업무 일지 #${index + 1}]\n--------------------------------------------------\n`;
        txtContent += `ID: ${log.id || '-'}\n날짜: ${formatDate(log.date) || '-'}\n`;
        txtContent += `업무 구분: ${log.categoryName || log.category || '-'}\n항목 상세: ${log.detailCategory || '-'}\n`;
        txtContent += `업무 요약: ${log.summary || '-'}\n업무 상태: ${log.resultName || log.result || '-'}\n`;
        txtContent += `세부 내용:\n${(log.tasks && log.tasks.length > 0) ? log.tasks.map(t => `  - ${t || '(내용 없음)'}`).join('\n') : '  (세부 내용 없음)'}\n`;
        txtContent += `비고: ${log.notes || '-'}\n`;
        if (log.createdAt) txtContent += `생성일시: ${new Date(log.createdAt).toLocaleString()}\n`;
        txtContent += `--------------------------------------------------\n\n`;
    });
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const today = dateToYyyyMmDd(new Date());
    link.setAttribute("download", `worklogs_${today}.txt`);
    link.style.visibility = 'hidden'; document.body.appendChild(link);
    link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
}

function exportToExcel() {
    if (typeof XLSX === 'undefined') {
        console.error('SheetJS library (XLSX) is not loaded.');
        alert('Excel 내보내기 라이브러리를 로드하지 못했습니다. 인터넷 연결을 확인하거나 페이지를 새로고침 해주세요.');
        return;
    }
    const logs = getWorkLogs();
    if (logs.length === 0) { alert('내보낼 데이터가 없습니다.'); return; }
    const dataForExcel = logs.map(log => ({
        '날짜': log.date ? formatDate(log.date) : '',
        '업무 구분': log.categoryName || log.category || '',
        '항목 상세': log.detailCategory || '',
        '업무 요약': log.summary || '',
        '세부 내용': (log.tasks || []).join('\n'), // Join with newline
        '상태': log.resultName || log.result || '',
        '비고': log.notes || '',
        '생성일시': log.createdAt ? new Date(log.createdAt).toLocaleString() : '',
    }));
    try {
        const worksheet = XLSX.utils.json_to_sheet(dataForExcel);

        // Calculate column widths
        const cols = Object.keys(dataForExcel[0] || {});
        const colWidths = cols.map((key, i) => {
            let maxLen = String(key).length; // Header length first
            dataForExcel.forEach(row => {
                const cellContent = row[key];
                if (cellContent != null) { // Check content exists
                    // Find the longest line within the cell
                    const currentMaxLineLen = String(cellContent).split('\n').reduce((max, line) => Math.max(max, line.length), 0);
                    if (currentMaxLineLen > maxLen) {
                        maxLen = currentMaxLineLen;
                    }
                }
            });
            if (key === '세부 내용') { maxLen = Math.max(maxLen, 30); } // Min width for details
             return { wch: Math.min(maxLen + 3, 70) }; // Add padding, max 70 chars wide
        });
        if (colWidths.length > 0) worksheet['!cols'] = colWidths;

        // Estimate row heights based on newlines in '세부 내용'
        const rowHeights = []; // Sparse array: key is 0-based row index (XLSX needs 1-based later)
        dataForExcel.forEach((row, index) => {
            const detailContent = row['세부 내용'];
            if (detailContent && typeof detailContent === 'string') {
                const lineCount = (detailContent.match(/\n/g) || []).length + 1;
                if (lineCount > 1) {
                    // Store height for the *data* row index (which is worksheet row index - 1)
                    rowHeights[index] = { hpt: lineCount * 12 + 6 }; // Approx height per line + padding
                }
            }
        });
        // Apply row heights if any were calculated
         // SheetJS expects '!rows' array where index corresponds to ROW number (1-based for data)
         const worksheetRows = [];
         for (let i = 0; i < dataForExcel.length; i++) {
             if (rowHeights[i]) {
                 worksheetRows[i + 1] = rowHeights[i]; // Assign height to the correct (1-based) row index
             }
         }
         if (worksheetRows.length > 0) {
             worksheet['!rows'] = worksheetRows;
         }
         // It might also be necessary to set cell style 'wrapText' for this to fully work in Excel
         // This requires more complex cell-by-cell styling usually.

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "업무일지");

        const today = dateToYyyyMmDd(new Date());
        const fileName = `worklogs_${today}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    } catch (error) {
        console.error("Excel 생성 오류:", error);
        alert("Excel 파일을 생성하는 중 오류가 발생했습니다.");
    }
}

// --- Global Event Listeners ---
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (el('detail-modal')?.style.display === 'block') { closeModal(); }
        if (el('add-task-modal')?.style.display === 'block') { closeQuickAddModal(); }
    }
});
window.addEventListener('click', (e) => {
    // Close modals if clicked outside content
    if (e.target === el('detail-modal')) { closeModal(); }
    if (e.target === el('add-task-modal')) { closeQuickAddModal(); }
});