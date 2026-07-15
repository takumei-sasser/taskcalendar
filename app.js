// ==========================================================================
// Application State & Configuration
// ==========================================================================
let activeTasks = [];
let categoryVisibility = {}; // key: カテゴリ名, value: boolean
let pastMonths = 1;   // 設定: 過去Nヶ月
let futureMonths = 6; // 設定: 未来Mヶ月
let currentBaseYear = new Date().getFullYear();
let currentBaseMonth = new Date().getMonth();

// DOM Elements
const elCalendarContainer = document.getElementById('calendar-container');
const elBoardsWrapper     = document.getElementById('calendar-boards-wrapper');
const elTableContainer    = document.getElementById('table-container');
const elTableBody         = document.getElementById('task-table-body');
const elFilterBar         = document.getElementById('category-filter-bar');
const elFilterCheckboxes  = document.getElementById('filter-checkboxes');

const elBtnViewCalendar = document.getElementById('btn-view-calendar');
const elBtnViewTable    = document.getElementById('btn-view-table');
const elBtnThemeToggle  = document.getElementById('btn-theme-toggle');
const elBtnDownload     = document.getElementById('btn-download');
const elBtnSettings     = document.getElementById('btn-settings');
const elBtnApply        = document.getElementById('btn-apply');

const elModal           = document.getElementById('settings-modal');
const elBtnModalClose   = document.getElementById('btn-modal-close');
const elInputPast       = document.getElementById('input-past-months');
const elInputFuture     = document.getElementById('input-future-months');
const elJsonEditor      = document.getElementById('json-editor');
const elJsonStatus      = document.getElementById('json-status');
const elJsonError       = document.getElementById('json-error');

const elTooltip         = document.getElementById('tooltip-dialog');
const elTooltipTitle    = document.getElementById('tooltip-title');
const elTooltipDesc     = document.getElementById('tooltip-desc');

// ==========================================================================
// Utility: Date & Conflict
// ==========================================================================
function parseDate(dateStr) {
    const [year, month, day] = dateStr.trim().split('-').map(Number);
    return new Date(year, month - 1, day);
}

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getDatesInRange(startDateStr, endDateStr) {
    const dates = [];
    let current = parseDate(startDateStr);
    const end = parseDate(endDateStr);
    let count = 0;
    while (current <= end && count < 366) {
        dates.push(formatDate(current));
        current.setDate(current.getDate() + 1);
        count++;
    }
    return dates;
}

function expandTaskDates(datesArray) {
    const allDates = new Set();
    const rangeRegex = /^(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})$/;
    (datesArray || []).forEach(dateItem => {
        const trimmed = dateItem.trim();
        const match = trimmed.match(rangeRegex);
        if (match) {
            getDatesInRange(match[1], match[2]).forEach(d => allDates.add(d));
        } else {
            allDates.add(trimmed);
        }
    });
    return Array.from(allDates).sort();
}

function resolveTaskPositions(tasks) {
    const slotOccupancy = {};
    return tasks.map(task => {
        const expandedDates = expandTaskDates(task.dates || []);
        const preferredPos = (task.position !== undefined && task.position !== null) ? parseInt(task.position, 10) : 1;
        let resolvedPos = Math.max(preferredPos, 1);
        
        let hasConflict = true;
        while (hasConflict) {
            hasConflict = false;
            for (const dateStr of expandedDates) {
                if (slotOccupancy[dateStr] && slotOccupancy[dateStr].has(resolvedPos)) {
                    hasConflict = true;
                    break;
                }
            }
            if (hasConflict) resolvedPos++;
        }
        expandedDates.forEach(dateStr => {
            if (!slotOccupancy[dateStr]) slotOccupancy[dateStr] = new Set();
            slotOccupancy[dateStr].add(resolvedPos);
        });
        return { ...task, resolvedPosition: resolvedPos, expandedDates };
    });
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// ==========================================================================
// Data Initialization & Filtering
// ==========================================================================
async function loadData() {
    try {
        if (typeof calendarData !== 'undefined') {
            activeTasks = calendarData;
        } else {
            console.warn("calendarData is not defined. Starting with empty tasks.");
            activeTasks = [];
        }
    } catch (e) {
        console.warn("Failed to load data, starting with empty tasks.", e);
        if (!activeTasks || activeTasks.length === 0) activeTasks = [];
    }
    elJsonEditor.value = JSON.stringify(activeTasks, null, 4);
    rebuildCategoryFilter();
    renderAllViews();
    scrollToCurrentMonth();
}

function rebuildCategoryFilter() {
    const categoryColors = {};
    activeTasks.forEach(task => {
        const cat = (task.category && task.category.trim()) ? task.category.trim() : '未分類';
        if (!(cat in categoryColors)) categoryColors[cat] = task.color || 'grad-1';
    });

    const categories = Object.keys(categoryColors);
    const existingCats = Object.keys(categoryVisibility);
    existingCats.forEach(cat => { if (!categories.includes(cat)) delete categoryVisibility[cat]; });
    categories.forEach(cat => { if (!(cat in categoryVisibility)) categoryVisibility[cat] = true; });

    elFilterCheckboxes.innerHTML = '';
    if (categories.length === 0) {
        elFilterBar.style.display = 'none';
        return;
    }
    elFilterBar.style.display = 'flex';

    categories.forEach(cat => {
        const cColor = categoryColors[cat];
        const colorClass = (cColor && /^grad-\d+$/.test(cColor)) ? `chip-${cColor}` : 'chip-default';
        const isChecked = categoryVisibility[cat];

        const label = document.createElement('label');
        label.className = `filter-chip ${colorClass}${isChecked ? ' is-checked' : ''}`;
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = isChecked;
        input.addEventListener('change', () => {
            categoryVisibility[cat] = input.checked;
            label.classList.toggle('is-checked', input.checked);
            renderAllViews();
        });

        const dot = document.createElement('span');
        dot.className = 'filter-chip-dot';
        const text = document.createElement('span');
        text.textContent = cat;

        label.appendChild(input);
        label.appendChild(dot);
        label.appendChild(text);
        elFilterCheckboxes.appendChild(label);
    });
}

function renderAllViews() {
    renderCalendarBoards();
    renderTableView();
}

// ==========================================================================
// Tooltip Handlers
// ==========================================================================
function handleTaskMouseOver(e, task) {
    const rect = e.target.getBoundingClientRect();
    elTooltipTitle.textContent = task.title || '';
    elTooltipDesc.textContent = task.description || '';
    
    // カーソル付近（タスク位置）に表示。固定配置なので scrollY は足さない
    let top = e.clientY + 15;
    let left = e.clientX + 15;
    
    // 画面下部や右端にはみ出さないよう簡易調整
    if (top + 80 > window.innerHeight) top = e.clientY - 80;
    if (left + 250 > window.innerWidth) left = window.innerWidth - 260;
    
    elTooltip.style.top = top + 'px';
    elTooltip.style.left = left + 'px';
    elTooltip.classList.add('show');
}

function handleTaskMouseOut() {
    elTooltip.classList.remove('show');
}

// ==========================================================================
// Calendar View Rendering (Multi-Month)
// ==========================================================================
function renderCalendarBoards() {
    elBoardsWrapper.innerHTML = '';
    
    // 描画用のポジション解決 (フィルタはかけず、全て計算する)
    // ※半透明にするため、非表示タスクも位置を確保する
    const resolvedTasks = resolveTaskPositions(activeTasks);
    
    const startOffset = -pastMonths;
    const endOffset = futureMonths;
    
    for (let i = startOffset; i <= endOffset; i++) {
        // 対象の年月
        const targetDate = new Date(currentBaseYear, currentBaseMonth + i, 1);
        const y = targetDate.getFullYear();
        const m = targetDate.getMonth();
        
        const board = createSingleMonthBoard(y, m, resolvedTasks);
        
        // 「現在月」のボードには特定idを付与してスクロールの目印にする
        if (i === 0) {
            board.id = "current-month-board";
        }
        elBoardsWrapper.appendChild(board);
    }
}

function createSingleMonthBoard(year, month, resolvedTasks) {
    const wrapper = document.createElement('div');
    wrapper.className = 'month-board';
    
    // ヘッダー (〇年〇月)
    const header = document.createElement('div');
    header.className = 'month-header';
    const title = document.createElement('h2');
    title.className = 'month-title';
    title.textContent = `${year}年 ${month + 1}月`;
    header.appendChild(title);
    
    // カレンダーボード
    const board = document.createElement('div');
    board.className = 'calendar-board';
    
    // 曜日
    const weekdays = document.createElement('div');
    weekdays.className = 'calendar-weekdays';
    ["月", "火", "水", "木", "金", "土", "日"].forEach((wd, i) => {
        const div = document.createElement('div');
        div.textContent = wd;
        if (i >= 5) div.className = 'weekend'; // 土日は色変えなど
        weekdays.appendChild(div);
    });
    board.appendChild(weekdays);
    
    // グリッド
    const grid = document.createElement('div');
    grid.className = 'calendar-grid';
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const lastDate = lastDay.getDate();
    let firstDayIndex = (firstDay.getDay() + 6) % 7; // 月曜始まり
    
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    
    const calendarDays = [];
    for (let i = firstDayIndex; i > 0; i--) {
        const d = new Date(year, month - 1, prevMonthLastDate - i + 1);
        calendarDays.push({ date: d, isCurrentMonth: false, dateStr: formatDate(d) });
    }
    for (let i = 1; i <= lastDate; i++) {
        const d = new Date(year, month, i);
        calendarDays.push({ date: d, isCurrentMonth: true, dateStr: formatDate(d) });
    }
    const totalSlots = 42;
    const nextDaysCount = totalSlots - calendarDays.length;
    for (let i = 1; i <= nextDaysCount; i++) {
        const d = new Date(year, month + 1, i);
        calendarDays.push({ date: d, isCurrentMonth: false, dateStr: formatDate(d) });
    }

    const todayStr = formatDate(new Date());

    calendarDays.forEach((dayInfo, index) => {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        if (!dayInfo.isCurrentMonth) dayCell.classList.add('other-month');
        if (dayInfo.dateStr === todayStr) dayCell.classList.add('today');

        const dayNumberContainer = document.createElement('div');
        dayNumberContainer.className = 'day-number-container';
        const dayNumber = document.createElement('span');
        dayNumber.className = 'day-number';
        dayNumber.textContent = dayInfo.date.getDate();
        dayNumberContainer.appendChild(dayNumber);
        dayCell.appendChild(dayNumberContainer);

        const tasksForThisDay = resolvedTasks.filter(task => task.expandedDates.includes(dayInfo.dateStr));

        if (tasksForThisDay.length > 0) {
            const taskContainer = document.createElement('div');
            taskContainer.className = 'task-container';
            const maxSlot = Math.max(...tasksForThisDay.map(t => t.resolvedPosition), 0);
            
            for (let slot = 1; slot <= maxSlot; slot++) {
                const taskInSlot = tasksForThisDay.find(t => t.resolvedPosition === slot);
                const slotDiv = document.createElement('div');
                slotDiv.className = 'task-slot';

                if (taskInSlot) {
                    const taskBar = document.createElement('div');
                    const colorClass = taskInSlot.color || 'grad-1';
                    taskBar.className = `task-bar ${colorClass}`;
                    
                    const cat = (taskInSlot.category && taskInSlot.category.trim()) ? taskInSlot.category.trim() : '未分類';
                    // フィルタOFFの場合は半透明クラスを付与
                    if (categoryVisibility[cat] === false) {
                        taskBar.classList.add('task-inactive');
                    }

                    taskBar.textContent = taskInSlot.title;
                    
                    // ホバーイベント
                    if (categoryVisibility[cat] !== false) {
                        taskBar.addEventListener('mouseenter', (e) => handleTaskMouseOver(e, taskInSlot));
                        taskBar.addEventListener('mouseleave', handleTaskMouseOut);
                    }

                    const dateIndex = taskInSlot.expandedDates.indexOf(dayInfo.dateStr);
                    const isStart = dateIndex === 0;
                    const isEnd = dateIndex === taskInSlot.expandedDates.length - 1;
                    const dayOfWeekIndex = index % 7;

                    if (taskInSlot.expandedDates.length === 1) {
                        taskBar.classList.add('task-single');
                    } else if (isStart) {
                        taskBar.classList.add('task-start');
                        if (dayOfWeekIndex === 6) taskBar.classList.add('week-end-middle');
                    } else if (isEnd) {
                        taskBar.classList.add('task-end');
                        if (dayOfWeekIndex === 0) taskBar.classList.add('week-start-middle');
                    } else {
                        taskBar.classList.add('task-middle');
                        if (dayOfWeekIndex === 0) taskBar.classList.add('week-start-middle');
                        else if (dayOfWeekIndex === 6) taskBar.classList.add('week-end-middle');
                    }
                    slotDiv.appendChild(taskBar);
                }
                taskContainer.appendChild(slotDiv);
            }
            dayCell.appendChild(taskContainer);
        }
        grid.appendChild(dayCell);
    });

    board.appendChild(grid);
    wrapper.appendChild(header);
    wrapper.appendChild(board);
    return wrapper;
}

function scrollToCurrentMonth() {
    const currentBoard = document.getElementById('current-month-board');
    if (currentBoard) {
        // ヘッダーの高さ分を考慮してスクロールする
        const y = currentBoard.getBoundingClientRect().top + window.scrollY - 150;
        window.scrollTo({ top: y, behavior: 'smooth' });
    }
}

// ==========================================================================
// Table View Rendering
// ==========================================================================
function renderTableView() {
    elTableBody.innerHTML = '';
    
    // 表示対象のみフィルタリング
    const visibleTasks = activeTasks.filter(task => {
        const cat = (task.category && task.category.trim()) ? task.category.trim() : '未分類';
        return categoryVisibility[cat] !== false;
    });

    // 日付順に整理するためのマップ
    const dateTaskMap = {};
    visibleTasks.forEach(task => {
        const dates = expandTaskDates(task.dates || []);
        dates.forEach(dStr => {
            if (!dateTaskMap[dStr]) dateTaskMap[dStr] = [];
            dateTaskMap[dStr].push(task);
        });
    });

    const sortedDates = Object.keys(dateTaskMap).sort();

    sortedDates.forEach(dStr => {
        const tasksObjList = dateTaskMap[dStr];
        const d = parseDate(dStr);
        const dayOfWeek = WEEKDAYS[d.getDay()];
        
        // 同じ日のタスクを1行にまとめる (複数タスクは div 等で縦並べ)
        const tr = document.createElement('tr');
        
        const tdDate = document.createElement('td');
        tdDate.textContent = dStr;
        
        const tdDay = document.createElement('td');
        tdDay.textContent = dayOfWeek;
        
        const tdCat = document.createElement('td');
        const tdTitle = document.createElement('td');
        const tdDesc = document.createElement('td');

        tasksObjList.forEach(task => {
            const cat = task.category || '未分類';
            const colorClass = task.color || 'grad-1';
            
            // カテゴリ
            const catDiv = document.createElement('div');
            catDiv.style.marginBottom = '0.5rem';
            catDiv.innerHTML = `<span class="table-color-dot ${colorClass}"></span>${cat}`;
            tdCat.appendChild(catDiv);
            
            // タスク名
            const titleDiv = document.createElement('div');
            titleDiv.style.marginBottom = '0.5rem';
            titleDiv.textContent = task.title;
            tdTitle.appendChild(titleDiv);
            
            // 詳細
            const descDiv = document.createElement('div');
            descDiv.style.marginBottom = '0.5rem';
            descDiv.textContent = task.description || '-';
            tdDesc.appendChild(descDiv);
        });
        
        tr.appendChild(tdDate);
        tr.appendChild(tdDay);
        tr.appendChild(tdCat);
        tr.appendChild(tdTitle);
        tr.appendChild(tdDesc);
        
        elTableBody.appendChild(tr);
    });
}

// ==========================================================================
// Export / Download Standalone HTML
// ==========================================================================
async function exportStandaloneHTML() {
    try {
        // 現在の CSS を取得
        let cssText = '';
        for (const sheet of document.styleSheets) {
            try {
                if (sheet.href && !sheet.href.includes('googleapis')) {
                    const res = await fetch(sheet.href);
                    cssText += await res.text();
                } else if (!sheet.href) {
                    for (const rule of sheet.cssRules) {
                        cssText += rule.cssText + '\n';
                    }
                }
            } catch (e) { console.warn("Cannot read stylesheet", e); }
        }
        // フォールバックとして元のファイルを fetch する
        if (!cssText) {
            const res = await fetch('style.css');
            cssText = await res.text();
        }

        // 現在の JS (app.js) を取得
        const resJs = await fetch('app.js');
        const jsText = await resJs.text();

        // ベースの HTML を取得してインライン化する
        // DOMのクローンを作ってスクリプトタグ等を置き換える方法もあるが、
        // 開発環境と結合するためのシンプルな文字列置換を行う
        const resHtml = await fetch('index.html');
        let htmlText = await resHtml.text();

        // スタイルシートリンクをインラインCSSに置換
        htmlText = htmlText.replace(/<link rel="stylesheet" href="style\.css">/, `<style>\n${cssText}\n</style>`);
        
        // データ読み込み部分のJSを改変し、埋め込んだ変数を使うようにする
        const embeddedData = JSON.stringify(activeTasks, null, 2);
        const embeddedJs = `
// --- INJECTED DATA ---
const embeddedTasksData = ${embeddedData};
// ---------------------
` + jsText.replace(
            /const res = await fetch\('data\.json'\);\s*if \(!res\.ok\) throw new Error\([^)]*\);\s*const data = await res\.json\(\);/,
            `const data = embeddedTasksData;`
        );

        // スクリプトタグをインラインJSに置換
        htmlText = htmlText.replace(/<script src="app\.js"><\/script>/, `<script>\n${embeddedJs}\n<\/script>`);

        // ダウンロード
        const blob = new Blob([htmlText], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `task_calendar_standalone_${formatDate(new Date())}.html`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        alert("エクスポート中にエラーが発生しました: " + e.message);
    }
}

// ==========================================================================
// Event Listeners & Settings
// ==========================================================================

// Theme Toggle
elBtnThemeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('calendarTheme', isLight ? 'light' : 'dark');
});

// View Toggles
elBtnViewCalendar.addEventListener('click', () => {
    elBtnViewCalendar.classList.add('active');
    elBtnViewTable.classList.remove('active');
    elCalendarContainer.classList.add('active');
    elTableContainer.classList.remove('active');
});

elBtnViewTable.addEventListener('click', () => {
    elBtnViewTable.classList.add('active');
    elBtnViewCalendar.classList.remove('active');
    elTableContainer.classList.add('active');
    elCalendarContainer.classList.remove('active');
});

// Settings Modal
elBtnSettings.addEventListener('click', () => {
    elInputPast.value = pastMonths;
    elInputFuture.value = futureMonths;
    elJsonEditor.value = JSON.stringify(activeTasks, null, 4);
    elJsonStatus.textContent = "Valid JSON";
    elJsonStatus.className = "status-valid";
    elJsonError.style.display = "none";
    elJsonEditor.style.borderColor = "";
    elModal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
});

function closeModal() {
    elModal.classList.remove('is-open');
    document.body.style.overflow = '';
}
elBtnModalClose.addEventListener('click', closeModal);
elModal.addEventListener('click', (e) => {
    if (e.target === elModal) closeModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elModal.classList.contains('is-open')) closeModal();
});

// Apply Settings
elBtnApply.addEventListener('click', () => {
    try {
        const rawVal = elJsonEditor.value;
        const parsed = JSON.parse(rawVal);
        if (!Array.isArray(parsed)) throw new Error("JSONは配列である必要があります");
        
        activeTasks = parsed;
        pastMonths = parseInt(elInputPast.value, 10) || 0;
        futureMonths = parseInt(elInputFuture.value, 10) || 0;
        
        rebuildCategoryFilter();
        renderAllViews();
        closeModal();
    } catch(e) {
        elJsonStatus.textContent = "Invalid JSON";
        elJsonStatus.className   = "status-invalid";
        elJsonError.textContent  = e.message;
        elJsonError.style.display = "block";
        elJsonEditor.style.borderColor = "var(--error-color)";
    }
});

// JSON Auto validation during typing
let editTimeout;
elJsonEditor.addEventListener('input', () => {
    clearTimeout(editTimeout);
    editTimeout = setTimeout(() => {
        try {
            const parsed = JSON.parse(elJsonEditor.value);
            if (!Array.isArray(parsed)) throw new Error("配列が必要です");
            elJsonStatus.textContent = "Valid JSON";
            elJsonStatus.className   = "status-valid";
            elJsonError.style.display = "none";
            elJsonEditor.style.borderColor = "";
        } catch (e) {
            elJsonStatus.textContent = "Invalid JSON";
            elJsonStatus.className   = "status-invalid";
            elJsonError.textContent  = e.message;
            elJsonError.style.display = "block";
            elJsonEditor.style.borderColor = "var(--error-color)";
        }
    }, 400);
});

// Download button
elBtnDownload.addEventListener('click', exportStandaloneHTML);

// ==========================================================================
// Boot
// ==========================================================================
function init() {
    // Restore Theme
    if (localStorage.getItem('calendarTheme') === 'light') {
        document.body.classList.add('light-mode');
    }
    
    // Load external data
    loadData();
}

window.addEventListener('DOMContentLoaded', init);
