// ==========================================================================
// Preset Data Definitions (category フィールド追加)
// ==========================================================================
const presets = {
    default: [
        {
            "id": 1,
            "title": "新年休暇 (期間タスク)",
            "dates": ["2026-01-01 - 2026-01-05"],
            "position": 1,
            "color": "grad-1",
            "category": "休暇"
        },
        {
            "id": 2,
            "title": "タスクA (複数日指定)",
            "dates": ["2026-01-01", "2026-01-03", "2026-01-05"],
            "position": 2,
            "color": "grad-2",
            "category": "個人"
        },
        {
            "id": 3,
            "title": "スロット1重複テストA",
            "dates": ["2026-01-03"],
            "position": 1,
            "color": "grad-3",
            "category": "テスト"
        },
        {
            "id": 4,
            "title": "スロット1重複テストB (自動で段下へ)",
            "dates": ["2026-01-03"],
            "position": 1,
            "color": "grad-4",
            "category": "テスト"
        },
        {
            "id": 5,
            "title": "出張 (週またぎ期間)",
            "dates": ["2026-01-08 - 2026-01-14"],
            "position": 1,
            "color": "grad-5",
            "category": "仕事"
        },
        {
            "id": 6,
            "title": "プロジェクト会議 (未指定は1)",
            "dates": ["2026-01-14"],
            "color": "grad-6",
            "category": "仕事"
        }
    ],
    multiDay: [
        {
            "id": 1,
            "title": "超長期プロジェクト",
            "dates": ["2026-01-05 - 2026-01-25"],
            "position": 1,
            "color": "grad-7",
            "category": "仕事"
        },
        {
            "id": 2,
            "title": "飛び石ミーティング",
            "dates": ["2026-01-06", "2026-01-08", "2026-01-13", "2026-01-15", "2026-01-20", "2026-01-22"],
            "position": 2,
            "color": "grad-8",
            "category": "仕事"
        },
        {
            "id": 3,
            "title": "中間レビュー",
            "dates": ["2026-01-15"],
            "position": 3,
            "color": "grad-3",
            "category": "個人"
        }
    ],
    overlap: [
        {
            "id": 1,
            "title": "最優先タスク (段3指定)",
            "dates": ["2026-01-10 - 2026-01-12"],
            "position": 3,
            "color": "grad-1",
            "category": "仕事"
        },
        {
            "id": 2,
            "title": "通常タスクA (段1指定)",
            "dates": ["2026-01-10"],
            "position": 1,
            "color": "grad-2",
            "category": "個人"
        },
        {
            "id": 3,
            "title": "通常タスクB (段1指定 -> 衝突回避で段2へ)",
            "dates": ["2026-01-10"],
            "position": 1,
            "color": "grad-3",
            "category": "テスト"
        },
        {
            "id": 4,
            "title": "通常タスクC (段1指定 -> 段1,2,3が埋まっているため段4へ)",
            "dates": ["2026-01-10"],
            "position": 1,
            "color": "grad-4",
            "category": "テスト"
        },
        {
            "id": 5,
            "title": "通常タスクD (段2指定 -> 段2,3,4が埋まっているため段5へ)",
            "dates": ["2026-01-10"],
            "position": 2,
            "color": "grad-5",
            "category": "個人"
        }
    ]
};

// ==========================================================================
// Date Utility Functions
// ==========================================================================

// 安全な日付解析 (タイムゾーンの影響を受けない)
function parseDate(dateStr) {
    const [year, month, day] = dateStr.trim().split('-').map(Number);
    return new Date(year, month - 1, day);
}

// 安全な日付フォーマット (YYYY-MM-DD)
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// 開始日から終了日までの全日付を配列で取得
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

// タスクのdates定義を展開して、全対象日付のフラットな配列を作る
function expandTaskDates(datesArray) {
    const allDates = new Set();
    const rangeRegex = /^(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})$/;

    datesArray.forEach(dateItem => {
        const trimmed = dateItem.trim();
        const match = trimmed.match(rangeRegex);
        if (match) {
            const start = match[1];
            const end = match[2];
            const range = getDatesInRange(start, end);
            range.forEach(d => allDates.add(d));
        } else {
            allDates.add(trimmed);
        }
    });

    return Array.from(allDates).sort();
}

// ==========================================================================
// Task Positioning Logic (Conflict Resolution)
// ==========================================================================

function resolveTaskPositions(tasks) {
    const slotOccupancy = {};
    
    return tasks.map(task => {
        const expandedDates = expandTaskDates(task.dates || []);
        const preferredPos = (task.position !== undefined && task.position !== null) ? parseInt(task.position, 10) : 1;
        
        let resolvedPos = preferredPos;
        if (resolvedPos < 1) resolvedPos = 1;
        
        let hasConflict = true;
        while (hasConflict) {
            hasConflict = false;
            for (const dateStr of expandedDates) {
                if (slotOccupancy[dateStr] && slotOccupancy[dateStr].has(resolvedPos)) {
                    hasConflict = true;
                    break;
                }
            }
            if (hasConflict) {
                resolvedPos++;
            }
        }
        
        expandedDates.forEach(dateStr => {
            if (!slotOccupancy[dateStr]) {
                slotOccupancy[dateStr] = new Set();
            }
            slotOccupancy[dateStr].add(resolvedPos);
        });

        return {
            ...task,
            resolvedPosition: resolvedPos,
            expandedDates: expandedDates
        };
    });
}

// ==========================================================================
// Application State
// ==========================================================================
let currentYear = 2026;
let currentMonth = 0; // 0 = 1月
let activeTasks = [];

// カテゴリごとの表示・非表示状態 (key: カテゴリ名, value: boolean)
const categoryVisibility = {};

// DOM Elements
const elCalendarGrid   = document.getElementById('calendar-grid');
const elCurrentMonthYear = document.getElementById('current-month-year');
const elJsonEditor     = document.getElementById('json-editor');
const elJsonStatus     = document.getElementById('json-status');
const elJsonError      = document.getElementById('json-error');
const elFilterBar      = document.getElementById('category-filter-bar');
const elFilterCheckboxes = document.getElementById('filter-checkboxes');

const elBtnPrev     = document.getElementById('btn-prev');
const elBtnNext     = document.getElementById('btn-next');
const elBtnToday    = document.getElementById('btn-today');
const elBtnApply    = document.getElementById('btn-apply');
const elBtnSettings = document.getElementById('btn-settings');

const elModal        = document.getElementById('settings-modal');
const elBtnModalClose = document.getElementById('btn-modal-close');

// Presets Elements
const elPresetDefault  = document.getElementById('preset-default');
const elPresetMultiDay = document.getElementById('preset-multi-day');
const elPresetOverlap  = document.getElementById('preset-overlap');

// ==========================================================================
// Modal Control
// ==========================================================================

function openModal() {
    elModal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    elModal.classList.remove('is-open');
    document.body.style.overflow = '';
}

elBtnSettings.addEventListener('click', openModal);
elBtnModalClose.addEventListener('click', closeModal);

// モーダル背景クリックで閉じる
elModal.addEventListener('click', (e) => {
    if (e.target === elModal) closeModal();
});

// Escape キーで閉じる
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elModal.classList.contains('is-open')) {
        closeModal();
    }
});

// ==========================================================================
// Category Filter
// ==========================================================================

/**
 * color 値 (例: "grad-1") からチップ用 CSS クラス名を返す。
 * カテゴリには複数のタスクがある場合があるため、
 * 最初に見つかったタスクの color を代表色として使う。
 */
function chipClassFromColor(colorValue) {
    if (colorValue && /^grad-\d+$/.test(colorValue)) {
        return `chip-${colorValue}`;
    }
    return 'chip-default';
}

/**
 * activeTasks からカテゴリの一覧を抽出し、
 * categoryVisibility を更新してフィルターチップ UI を再構築する。
 */
function rebuildCategoryFilter() {
    // カテゴリ名 -> 代表 color のマップ
    const categoryColors = {};
    activeTasks.forEach(task => {
        const cat = (task.category && task.category.trim()) ? task.category.trim() : '未分類';
        if (!(cat in categoryColors)) {
            categoryColors[cat] = task.color || 'grad-1';
        }
    });

    const categories = Object.keys(categoryColors);

    // 新しいカテゴリは「表示」で追加、既存のカテゴリは状態を維持、
    // なくなったカテゴリはキーを削除
    const existingCats = Object.keys(categoryVisibility);
    existingCats.forEach(cat => {
        if (!categories.includes(cat)) delete categoryVisibility[cat];
    });
    categories.forEach(cat => {
        if (!(cat in categoryVisibility)) categoryVisibility[cat] = true;
    });

    // UI の再構築
    elFilterCheckboxes.innerHTML = '';

    if (categories.length === 0) {
        elFilterBar.style.display = 'none';
        return;
    }
    elFilterBar.style.display = 'flex';

    categories.forEach(cat => {
        const colorClass = chipClassFromColor(categoryColors[cat]);
        const isChecked = categoryVisibility[cat];

        const label = document.createElement('label');
        label.className = `filter-chip ${colorClass}${isChecked ? ' is-checked' : ''}`;
        label.title = cat;

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = isChecked;
        input.addEventListener('change', () => {
            categoryVisibility[cat] = input.checked;
            label.classList.toggle('is-checked', input.checked);
            renderCalendar();
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

// ==========================================================================
// UI Rendering Functions
// ==========================================================================

// 年月表示の更新
function updateHeader() {
    elCurrentMonthYear.textContent = `${currentYear}年 ${currentMonth + 1}月`;
}

// カレンダーの描画
function renderCalendar() {
    elCalendarGrid.innerHTML = '';
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay  = new Date(currentYear, currentMonth + 1, 0);
    const lastDate = lastDay.getDate();
    
    let firstDayIndex = (firstDay.getDay() + 6) % 7;
    
    const prevMonthLastDay  = new Date(currentYear, currentMonth, 0);
    const prevMonthLastDate = prevMonthLastDay.getDate();
    
    const calendarDays = [];
    
    // 1. 前月の日付
    for (let i = firstDayIndex; i > 0; i--) {
        const d = new Date(currentYear, currentMonth - 1, prevMonthLastDate - i + 1);
        calendarDays.push({ date: d, isCurrentMonth: false, dateStr: formatDate(d) });
    }
    
    // 2. 当月の日付
    for (let i = 1; i <= lastDate; i++) {
        const d = new Date(currentYear, currentMonth, i);
        calendarDays.push({ date: d, isCurrentMonth: true, dateStr: formatDate(d) });
    }
    
    // 3. 翌月の日付（合計42セル）
    const totalSlots = 42;
    const nextDaysCount = totalSlots - calendarDays.length;
    for (let i = 1; i <= nextDaysCount; i++) {
        const d = new Date(currentYear, currentMonth + 1, i);
        calendarDays.push({ date: d, isCurrentMonth: false, dateStr: formatDate(d) });
    }

    // カテゴリフィルターで絞り込んだタスクのみ描画対象にする
    const visibleTasks = activeTasks.filter(task => {
        const cat = (task.category && task.category.trim()) ? task.category.trim() : '未分類';
        return categoryVisibility[cat] !== false;
    });

    // 表示対象タスクのみでポジション解決（非表示タスクの隙間を詰める）
    const resolvedTasks = resolveTaskPositions(visibleTasks);
    const todayStr = formatDate(new Date());

    calendarDays.forEach((dayInfo, index) => {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        if (!dayInfo.isCurrentMonth) dayCell.classList.add('other-month');
        if (dayInfo.dateStr === todayStr)  dayCell.classList.add('today');

        const dayOfWeekIndex = index % 7;

        // 日付の数字
        const dayNumberContainer = document.createElement('div');
        dayNumberContainer.className = 'day-number-container';
        const dayNumber = document.createElement('span');
        dayNumber.className = 'day-number';
        dayNumber.textContent = dayInfo.date.getDate();
        dayNumberContainer.appendChild(dayNumber);
        dayCell.appendChild(dayNumberContainer);

        // その日のタスク
        const tasksForThisDay = resolvedTasks.filter(task =>
            task.expandedDates.includes(dayInfo.dateStr)
        );

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
                    taskBar.className = `task-bar ${taskInSlot.color || 'grad-1'}`;
                    
                    const catLabel = (taskInSlot.category && taskInSlot.category.trim()) ? taskInSlot.category.trim() : '未分類';
                    taskBar.textContent = taskInSlot.title;
                    taskBar.title = `[${catLabel}] ${taskInSlot.title} (段:${slot})`;

                    // 期間内位置によるスタイル分岐
                    const dateIndex = taskInSlot.expandedDates.indexOf(dayInfo.dateStr);
                    const isStart   = dateIndex === 0;
                    const isEnd     = dateIndex === taskInSlot.expandedDates.length - 1;

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

        elCalendarGrid.appendChild(dayCell);
    });
}

// ==========================================================================
// JSON Editor Handlers
// ==========================================================================

function applyEditorJson() {
    const rawVal = elJsonEditor.value;
    try {
        const parsed = JSON.parse(rawVal);
        if (!Array.isArray(parsed)) {
            throw new Error("JSONのルートは配列（タスクのリスト）でなければなりません。");
        }
        
        activeTasks = parsed;
        
        elJsonStatus.textContent = "Valid JSON";
        elJsonStatus.className   = "status-valid";
        elJsonError.style.display = "none";
        elJsonEditor.style.borderColor = "";

        // カテゴリフィルター再構築 → カレンダー再描画
        rebuildCategoryFilter();
        renderCalendar();

        // 適用成功時にモーダルを閉じる
        closeModal();
    } catch (e) {
        elJsonStatus.textContent = "Invalid JSON";
        elJsonStatus.className   = "status-invalid";
        elJsonError.textContent  = e.message;
        elJsonError.style.display = "block";
        elJsonEditor.style.borderColor = "var(--error-color)";
    }
}

// プリセットデータの読み込み
function loadPreset(key) {
    if (presets[key]) {
        elJsonEditor.value = JSON.stringify(presets[key], null, 4);
        applyEditorJson();
    }
}

// ==========================================================================
// Event Listeners Setup
// ==========================================================================

elBtnPrev.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    updateHeader();
    renderCalendar();
});

elBtnNext.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    updateHeader();
    renderCalendar();
});

elBtnToday.addEventListener('click', () => {
    const now = new Date();
    currentYear  = now.getFullYear();
    currentMonth = now.getMonth();
    updateHeader();
    renderCalendar();
});

elBtnApply.addEventListener('click', applyEditorJson);

// エディタ上のタイピングに応じて自動検証（エラー表示のみ、モーダルは閉じない）
let editTimeout;
elJsonEditor.addEventListener('input', () => {
    clearTimeout(editTimeout);
    editTimeout = setTimeout(() => {
        const rawVal = elJsonEditor.value;
        try {
            const parsed = JSON.parse(rawVal);
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

// プリセットボタン
elPresetDefault.addEventListener('click',  () => loadPreset('default'));
elPresetMultiDay.addEventListener('click', () => loadPreset('multiDay'));
elPresetOverlap.addEventListener('click',  () => loadPreset('overlap'));

// ==========================================================================
// Initialization
// ==========================================================================
function init() {
    currentYear  = 2026;
    currentMonth = 0;
    
    updateHeader();
    loadPreset('default'); // applyEditorJson → rebuildCategoryFilter → renderCalendar まで連鎖
}

window.addEventListener('DOMContentLoaded', init);
