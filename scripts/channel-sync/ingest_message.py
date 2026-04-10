#!/usr/bin/env python3
import argparse
from datetime import datetime, timezone
from message_store import insert_message


def default_ts() -> str:
    return datetime.now(timezone.utc).isoformat()


def main() -> None:
    parser = argparse.ArgumentParser(description='Insert a channel message into channel-sync.db')
    parser.add_argument('--provider', required=True)
    parser.add_argument('--channel', required=True)
    parser.add_argument('--chat-id', required=True)
    parser.add_argument('--direction', required=True, choices=['inbound', 'outbound'])
    parser.add_argument('--role', required=True, choices=['user', 'assistant', 'system'])
    parser.add_argument('--text', required=True)
    parser.add_argument('--timestamp', default=default_ts())
    parser.add_argument('--session-key')
    parser.add_argument('--phone')
    parser.add_argument('--payload-json')
    parser.add_argument('--provider-message-id')
    args = parser.parse_args()

    row_id = insert_message(
        provider=args.provider,
        channel=args.channel,
        chat_id=args.chat_id,
        direction=args.direction,
        role=args.role,
        text=args.text,
        message_timestamp=args.timestamp,
        session_key=args.session_key,
        phone=args.phone,
        payload_json=args.payload_json,
        provider_message_id=args.provider_message_id,
    )
    print(f'Inserted message id: {row_id}')


if __name__ == '__main__':
    main()
