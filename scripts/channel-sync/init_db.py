#!/usr/bin/env python3
import sqlite3
from pathlib import Path
from datetime import datetime, timezone

DB_PATH = Path.home() / '.openclaw' / 'state' / 'channel-sync' / 'channel-sync.db'
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

SCHEMA = [
    '''
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        channel TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        session_key TEXT NULL,
        phone TEXT NULL,
        direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
        text TEXT NOT NULL,
        payload_json TEXT NULL,
        provider_message_id TEXT NULL,
        message_timestamp TEXT NOT NULL,
        synced_to_workspace_at TEXT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    ''',
    '''CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_provider_msgid
       ON messages(provider, provider_message_id)
       WHERE provider_message_id IS NOT NULL''',
    '''CREATE INDEX IF NOT EXISTS idx_messages_chat_time
       ON messages(provider, chat_id, message_timestamp)''',
    '''CREATE INDEX IF NOT EXISTS idx_messages_unsynced
       ON messages(synced_to_workspace_at, message_timestamp)''',
    '''
    CREATE TABLE IF NOT EXISTS sync_cursors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        last_provider_message_id TEXT NULL,
        last_message_timestamp TEXT NULL,
        last_synced_at TEXT NOT NULL,
        UNIQUE(provider, chat_id)
    )
    ''',
    '''
    CREATE TABLE IF NOT EXISTS conversation_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        summary_type TEXT NOT NULL,
        source_message_start_id INTEGER NULL,
        source_message_end_id INTEGER NULL,
        summary_text TEXT NOT NULL,
        routed_to TEXT NULL,
        created_at TEXT NOT NULL
    )
    ''',
    '''CREATE INDEX IF NOT EXISTS idx_summaries_chat_created
       ON conversation_summaries(provider, chat_id, created_at)''',
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.cursor()
        for stmt in SCHEMA:
            cur.execute(stmt)
        conn.commit()
        print(f'Initialized channel sync DB at: {DB_PATH}')
        print('Tables: messages, sync_cursors, conversation_summaries')
        print(f'Created at: {now_iso()}')
    finally:
        conn.close()


if __name__ == '__main__':
    main()
