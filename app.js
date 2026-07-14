// ==========================================================================
// Preset Data Definitions
// ==========================================================================
const presets = {
    default: [
        {
            "id": 1,
            "title": "新年休暇 (期間タスク)",
            "dates": ["2026-01-01 - 2026-01-05"],
            "position": 1,
            "color": "grad-1"
        },
        {
            "id": 2,
            "title": "タスクA (複数日指定)",
            "dates": ["2026-01-01", "2026-01-03", "2026-01-05"],
            "position": 2,
            "color": "grad-2"
        },
        {
            "id": 3,
            "title": "スロット1重複テストA",
            "dates": ["2026-01-03"],
            "position": 1,
            "color": "grad-3"
        },
        {
            "id": 4,
            "title": "スロット1重複テストB (自動で段下へ)",
            "dates": ["2026-01-03"],
            "position": 1,
            "color": "grad-4"
        },
        {
            "id": 5,
            "title": "出張 (週またぎ期間)",
            "dates": ["2026-01-08 - 2026-01-14"],
            "position": 1,
            "color": "grad-5"
        },
        {
            "id": 6,
            "title": "プロジェクト会議 (未指定は1)",
            "dates": ["2026-01-14"],
            "color": "grad-6"
        }
    ],
    multiDay: [
        {
            "id": 1,
            "title": "超長期プロジェクト",
            "dates": ["2026-01-05 - 2026-01-25"],
            "position": 1,
            "color": "grad-7"
        },
        {
            "id": 2,
            "title": "飛び石ミーティング",
            "dates": ["2026-01-06", "2026-01-08", "2026-01-13", "2026-01-15", "2026-01-20", "2026-01-22"],
            "position": 2,
            "color": "grad-8"
        },
        {
            "id": 3,
            "title": "中間レビュー",
            "dates": ["2026-01-15"],
            "position": 3,
            "color": "grad-3"
        }
    ],
    overlap: [
        {
            "id": 1,
            "title": "最優先タスク (段3指定)",
            "dates": ["2026-01-10 - 2026-01-12"],
            "position": 3,
            "color": "grad-1"
        },
        {
            "id": 2,
            "title": "通常タスクA (段1指定)",
            "dates": ["2026-01-10"],
            "position": 1,
            "color": "grad-2"
        },
        {
            "id": 3,
            "title": "通常タスクB (段1指定 -> 衝突回避で段2へ)",
            "dates": ["2026-01-10"],
            "position": 1,
            "color": "grad-3"
        },
        {
            "id": 4,
            "title": "通常タスクC (段1指定 -> 段1,2,3が埋まっているため段4へ)",
            "dates": ["2026-01-10"],
            "position": 1,
            "color": "grad-4"
        },
        {
            "id": 5,
            "title": "通常タスクD (段2指定 -> 段2,3,4が埋まっているため段5へ)",
            "dates": ["2026-01-10"],
            "position": 2,
            "color": "grad-5"
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
    
    // 無限ループ防止用のセーフガード (最大1年間)
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
            // 単一日の指定
            allDates.add(trimmed);
        }
    });

    return Array.from(allDates).sort();
}

// ==========================================================================
// Task Positioning Logic (Conflict Resolution)
// ==========================================================================

function resolveTaskPositions(tasks) {
    // 日付ごとのスロット占有状況を管理するマップ (key: "YYYY-MM-DD", value: Set of busy slot numbers)
    const slotOccupancy = {};
    
    return tasks.map(task => {
        // 全対象日のリストを作成
        const expandedDates = expandTaskDates(task.dates || []);
        
        // 希望位置を取得 (未指定時は 1)
        const preferredPos = (task.position !== undefined && task.position !== null) ? parseInt(task.position, 10) : 1;
        
        // 競合しない最小のポジション(スロット)を見つける
        let resolvedPos = preferredPos;
        if (resolvedPos < 1) resolvedPos = 1;
        
        let hasConflict = true;
        while (hasConflict) {
            hasConflict = false;
            // 展開されたすべての日にちについて、この resolvedPos が空いているか検証
            for (const dateStr of expandedDates) {
                if (slotOccupancy[dateStr] && slotOccupancy[dateStr].has(resolvedPos)) {
                    hasConflict = true;
                    break;
                }
            }
            if (hasConflict) {
                resolvedPos++; // 衝突があれば下の段へ
            }
        }
        
        // 決定した resolvedPos で占有マップを更新
        expandedDates.forEach(dateStr => {
            if (!slotOccupancy[dateStr]) {
                slotOccupancy[dateStr] = new Set();
            }
            slotOccupancy[dateStr].add(resolvedPos);
        });

        // 描画用に、展開された日付と決定された位置を持つタスクのクローンを返す
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

// DOM Elements
const elCalendarGrid = document.getElementById('calendar-grid');
const elCurrentMonthYear = document.getElementById('current-month-year');
const elJsonEditor = document.getElementById('json-editor');
const elJsonStatus = document.getElementById('json-status');
const elJsonError = document.getElementById('json-error');

const elBtnPrev = document.getElementById('btn-prev');
const elBtnNext = document.getElementById('btn-next');
const elBtnToday = document.getElementById('btn-today');
const elBtnApply = document.getElementById('btn-apply');

// Presets Elements
const elPresetDefault = document.getElementById('preset-default');
const elPresetMultiDay = document.getElementById('preset-multi-day');
const elPresetOverlap = document.getElementById('preset-overlap');

// ==========================================================================
// UI Rendering Functions
// ==========================================================================

// 年月表示の更新
function updateHeader() {
    elCurrentMonthYear.textContent = `${currentYear}年 ${currentMonth + 1}月`;
}

// カレンダーの描画
function renderCalendar() {
    // グリッドを一旦クリア
    elCalendarGrid.innerHTML = '';
    
    // 表示月の1日
    const firstDay = new Date(currentYear, currentMonth, 1);
    // 表示月の末日
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const lastDate = lastDay.getDate();
    
    // 月曜日始まりのインデックス調整 (0 = 月曜日, 6 = 日曜日)
    // getDay() は 0 = 日曜日, 1 = 月曜日...
    let firstDayIndex = (firstDay.getDay() + 6) % 7;
    
    // 前月の情報
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0);
    const prevMonthLastDate = prevMonthLastDay.getDate();
    
    const calendarDays = [];
    
    // 1. 前月の日付を埋める
    for (let i = firstDayIndex; i > 0; i--) {
        const d = new Date(currentYear, currentMonth - 1, prevMonthLastDate - i + 1);
        calendarDays.push({
            date: d,
            isCurrentMonth: false,
            dateStr: formatDate(d)
        });
    }
    
    // 2. 当月の日付を埋める
    for (let i = 1; i <= lastDate; i++) {
        const d = new Date(currentYear, currentMonth, i);
        calendarDays.push({
            date: d,
            isCurrentMonth: true,
            dateStr: formatDate(d)
        });
    }
    
    // 3. 翌月の日付を埋めて、合計42セル(6行×7列)にする
    // 常に6行に固定することでカレンダー全体の高さがガタつかず美しく保たれます
    const totalSlots = 42;
    const nextDaysCount = totalSlots - calendarDays.length;
    for (let i = 1; i <= nextDaysCount; i++) {
        const d = new Date(currentYear, currentMonth + 1, i);
        calendarDays.push({
            date: d,
            isCurrentMonth: false,
            dateStr: formatDate(d)
        });
    }

    // 各日付のセルを描画
    const resolvedTasks = resolveTaskPositions(activeTasks);
    const todayStr = formatDate(new Date());

    calendarDays.forEach((dayInfo, index) => {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        if (!dayInfo.isCurrentMonth) {
            dayCell.classList.add('other-month');
        }
        if (dayInfo.dateStr === todayStr) {
            dayCell.classList.add('today');
        }

        // 曜日インデックス (0 = 月曜, 6 = 日曜)
        const dayOfWeekIndex = index % 7;

        // 日付の数字
        const dayNumberContainer = document.createElement('div');
        dayNumberContainer.className = 'day-number-container';
        
        const dayNumber = document.createElement('span');
        dayNumber.className = 'day-number';
        dayNumber.textContent = dayInfo.date.getDate();
        dayNumberContainer.appendChild(dayNumber);
        dayCell.appendChild(dayNumberContainer);

        // その日にあるタスクを抽出して配置
        const tasksForThisDay = resolvedTasks.filter(task => 
            task.expandedDates.includes(dayInfo.dateStr)
        );

        if (tasksForThisDay.length > 0) {
            const taskContainer = document.createElement('div');
            taskContainer.className = 'task-container';

            // その日にあるタスクの中で、最大の resolvedPosition を割り出す
            const maxSlot = Math.max(...tasksForThisDay.map(t => t.resolvedPosition), 0);

            // 1段目から maxSlot 段目までループして、各スロットを埋める
            for (let slot = 1; slot <= maxSlot; slot++) {
                const taskInSlot = tasksForThisDay.find(t => t.resolvedPosition === slot);
                const slotDiv = document.createElement('div');
                slotDiv.className = 'task-slot';

                if (taskInSlot) {
                    const taskBar = document.createElement('div');
                    taskBar.className = `task-bar ${taskInSlot.color || 'grad-1'}`;
                    
                    // タイトルをセット
                    taskBar.textContent = taskInSlot.title;
                    taskBar.title = `${taskInSlot.title} (段:${slot})`;

                    // 期間内の位置を特定してスタイル変更 (連結して見せるため)
                    const dateIndex = taskInSlot.expandedDates.indexOf(dayInfo.dateStr);
                    const isStart = dateIndex === 0;
                    const isEnd = dateIndex === taskInSlot.expandedDates.length - 1;

                    if (taskInSlot.expandedDates.length === 1) {
                        taskBar.classList.add('task-single');
                    } else if (isStart) {
                        taskBar.classList.add('task-start');
                        // 開始日が日曜日（週の最後）なら、右側をフラットにする
                        if (dayOfWeekIndex === 6) {
                            taskBar.classList.add('week-end-middle');
                        }
                    } else if (isEnd) {
                        taskBar.classList.add('task-end');
                        // 終了日が月曜日（週の最初）なら、左側をフラットにする
                        if (dayOfWeekIndex === 0) {
                            taskBar.classList.add('week-start-middle');
                        }
                    } else {
                        taskBar.classList.add('task-middle');
                        // 週の最初（月曜）なら左側をフラットにし、週の最後（日曜）なら右側をフラットにする
                        if (dayOfWeekIndex === 0) {
                            taskBar.classList.add('week-start-middle');
                        } else if (dayOfWeekIndex === 6) {
                            taskBar.classList.add('week-end-middle');
                        }
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

// エディタに入っているJSONを解析し、カレンダーをリロード
function applyEditorJson() {
    const rawVal = elJsonEditor.value;
    try {
        const parsed = JSON.parse(rawVal);
        if (!Array.isArray(parsed)) {
            throw new Error("JSONのルートは配列（タスクのリスト）でなければなりません。");
        }
        
        activeTasks = parsed;
        
        // 成功時の状態表示
        elJsonStatus.textContent = "Valid JSON";
        elJsonStatus.className = "status-valid";
        elJsonError.style.display = "none";
        elJsonEditor.style.borderColor = "";

        // 表示の再更新
        renderCalendar();
    } catch (e) {
        // エラー時の状態表示
        elJsonStatus.textContent = "Invalid JSON";
        elJsonStatus.className = "status-invalid";
        elJsonError.textContent = e.message;
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
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    updateHeader();
    renderCalendar();
});

elBtnNext.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    updateHeader();
    renderCalendar();
});

elBtnToday.addEventListener('click', () => {
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
    updateHeader();
    renderCalendar();
});

elBtnApply.addEventListener('click', applyEditorJson);

// エディタ上でタイピングした際にも自動検証 (ただし少しウェイトを挟むとより良い)
let editTimeout;
elJsonEditor.addEventListener('input', () => {
    clearTimeout(editTimeout);
    editTimeout = setTimeout(applyEditorJson, 500); // タイピング停止から500ms後に自動反映
});

// プリセットボタン
elPresetDefault.addEventListener('click', () => loadPreset('default'));
elPresetMultiDay.addEventListener('click', () => loadPreset('multiDay'));
elPresetOverlap.addEventListener('click', () => loadPreset('overlap'));

// ==========================================================================
// Initialization
// ==========================================================================
function init() {
    // 今日を基準にするか、サンプルの2026年1月を初期表示にするか
    // サンプルの日付が2026年1月なので、初期表示は2026年1月に固定して見やすくする
    currentYear = 2026;
    currentMonth = 0; // 1月
    
    updateHeader();
    loadPreset('default');
}

window.addEventListener('DOMContentLoaded', init);
