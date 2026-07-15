const calendarData = [
    {
        "id": 1,
        "title": "新年休暇 (期間タスク)",
        "dates": [
            "2026-01-01 - 2026-01-05"
        ],
        "position": 1,
        "color": "grad-1",
        "category": "休暇",
        "description": "お正月休み。実家に帰省する予定です。"
    },
    {
        "id": 2,
        "title": "タスクA (複数日指定)",
        "dates": [
            "2026-01-01",
            "2026-01-03",
            "2026-01-05"
        ],
        "position": 2,
        "color": "grad-2",
        "category": "個人",
        "description": "飛び石で発生する個人のタスクです。"
    },
    {
        "id": 3,
        "title": "スロット1重複テストA",
        "dates": [
            "2026-01-03"
        ],
        "position": 1,
        "color": "grad-3",
        "category": "テスト",
        "description": "スロット配置の競合解決ロジックをテストするためのタスクAです。"
    },
    {
        "id": 4,
        "title": "スロット1重複テストB (自動で段下へ)",
        "dates": [
            "2026-01-03"
        ],
        "position": 1,
        "color": "grad-4",
        "category": "テスト",
        "description": "テストAと競合するため自動的に1段下に配置されます。"
    },
    {
        "id": 5,
        "title": "出張 (週またぎ期間)",
        "dates": [
            "2026-01-08 - 2026-01-14"
        ],
        "position": 1,
        "color": "grad-5",
        "category": "仕事",
        "description": "東京本社への出張。月曜の会議とクライアント訪問が含まれます。"
    },
    {
        "id": 6,
        "title": "プロジェクト会議 (未指定は1)",
        "dates": [
            "2026-01-14"
        ],
        "color": "grad-6",
        "category": "仕事",
        "description": "四半期ごとの全体プロジェクト進捗確認会議です。"
    },
    {
        "id": 7,
        "title": "超長期プロジェクト",
        "dates": [
            "2026-07-05 - 2026-07-25"
        ],
        "position": 2,
        "color": "grad-7",
        "category": "仕事",
        "description": "新しいシステムの要件定義からモックアップ作成までを行う大規模なプロジェクトです。"
    },
    {
        "id": 8,
        "title": "飛び石ミーティング",
        "dates": [
            "2026-01-06",
            "2026-01-08",
            "2026-01-13",
            "2026-01-15",
            "2026-01-20",
            "2026-01-22"
        ],
        "position": 3,
        "color": "grad-8",
        "category": "仕事",
        "description": "定期的に行われるデザインレビューミーティング。"
    }
];
