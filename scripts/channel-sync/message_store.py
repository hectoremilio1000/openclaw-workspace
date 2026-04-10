#!/usr/bin/env python3
from __future__ import annotations
import sqlite3
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Iterable

DB_PATH = Path.home() / '.openclaw' / 'state' / 'channel-sync' / 'channel-sync.db'


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def insert_message(
    *,
    provider: str,
    channel: str,
    chat_id: str,
    direction: str,
    role: str,
    text: str,
    message_timestamp: str,
    session_key: str | None = None,
    phone: str | None = None,
    payload_json: str | None = None,
    provider_message_id: str | None = None,
) -> int:
    ts = now_iso()
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT OR IGNORE INTO messages (
                provider, channel, chat_id, session_key, phone,
                direction, role, text, payload_json, provider_message_id,
                message_timestamp, synced_to_workspace_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
            """,
            (
                provider,
                channel,
                chat_id,
                session_key,
                phone,
                direction,
                role,
                text,
                payload_json,
                provider_message_id,
                message_timestamp,
                ts,
                ts,
            ),
        )
        if cur.lastrowid:
            return int(cur.lastrowid)
        row = cur.execute(
            "SELECT id FROM messages WHERE provider = ? AND provider_message_id = ?",
            (provider, provider_message_id),
        ).fetchone()
        return int(row['id']) if row else 0


def get_messages(*, provider: str, chat_id: str, limit: int = 50) -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT * FROM messages
            WHERE provider = ? AND chat_id = ?
            ORDER BY message_timestamp DESC, id DESC
            LIMIT ?
            """,
            (provider, chat_id, limit),
        ).fetchall()
    return [dict(row) for row in rows]


def get_unsynced_messages(limit: int = 200) -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT * FROM messages
            WHERE synced_to_workspace_at IS NULL
            ORDER BY message_timestamp ASC, id ASC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]


def mark_messages_synced(message_ids: Iterable[int]) -> int:
    ids = [int(x) for x in message_ids]
    if not ids:
        return 0
    placeholders = ','.join(['?'] * len(ids))
    ts = now_iso()
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            f"UPDATE messages SET synced_to_workspace_at = ?, updated_at = ? WHERE id IN ({placeholders})",
            [ts, ts, *ids],
        )
        return int(cur.rowcount)


def upsert_cursor(
    *,
    provider: str,
    chat_id: str,
    last_provider_message_id: str | None,
    last_message_timestamp: str | None,
) -> None:
    ts = now_iso()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO sync_cursors (
                provider, chat_id, last_provider_message_id, last_message_timestamp, last_synced_at
            ) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(provider, chat_id)
            DO UPDATE SET
                last_provider_message_id = excluded.last_provider_message_id,
                last_message_timestamp = excluded.last_message_timestamp,
                last_synced_at = excluded.last_synced_at
            """,
            (provider, chat_id, last_provider_message_id, last_message_timestamp, ts),
        )


def get_cursor(*, provider: str, chat_id: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM sync_cursors WHERE provider = ? AND chat_id = ?",
            (provider, chat_id),
        ).fetchone()
    return dict(row) if row else None
