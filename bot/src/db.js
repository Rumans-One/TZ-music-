import os
from contextlib import contextmanager

import psycopg2
from psycopg2.extras import RealDictCursor


def _dsn() -> str:
    return (
        f"host={os.getenv('DB_HOST')} "
        f"port={os.getenv('DB_PORT', '5432')} "
        f"dbname={os.getenv('DB_NAME')} "
        f"user={os.getenv('DB_USER')} "
        f"password={os.getenv('DB_PASSWORD')}"
    )


@contextmanager
def get_conn():
    conn = psycopg2.connect(_dsn())
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS applications (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(120) NOT NULL,
                    phone VARCHAR(32) NOT NULL,
                    music_style VARCHAR(120) NOT NULL,
                    comment TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW()
                );
                """
            )
            conn.commit()


def create_application(payload: dict) -> dict:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO applications (name, phone, music_style, comment)
                VALUES (%s, %s, %s, %s)
                RETURNING id, name, phone, music_style, comment, created_at;
                """,
                (
                    payload["name"],
                    payload["phone"],
                    payload["musicStyle"],
                    payload["comment"],
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row)
