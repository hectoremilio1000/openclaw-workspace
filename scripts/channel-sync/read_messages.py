#!/usr/bin/env python3
import argparse
import json
from message_store import get_messages, get_unsynced_messages, get_cursor


def main() -> None:
    parser = argparse.ArgumentParser(description='Read messages from channel-sync.db')
    sub = parser.add_subparsers(dest='command', required=True)

    p_chat = sub.add_parser('chat')
    p_chat.add_argument('--provider', required=True)
    p_chat.add_argument('--chat-id', required=True)
    p_chat.add_argument('--limit', type=int, default=20)

    p_unsynced = sub.add_parser('unsynced')
    p_unsynced.add_argument('--limit', type=int, default=50)

    p_cursor = sub.add_parser('cursor')
    p_cursor.add_argument('--provider', required=True)
    p_cursor.add_argument('--chat-id', required=True)

    args = parser.parse_args()

    if args.command == 'chat':
        data = get_messages(provider=args.provider, chat_id=args.chat_id, limit=args.limit)
    elif args.command == 'unsynced':
        data = get_unsynced_messages(limit=args.limit)
    else:
        data = get_cursor(provider=args.provider, chat_id=args.chat_id)

    print(json.dumps(data, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
