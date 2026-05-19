import sqlite3
from contextlib import contextmanager

DB = 'kryvyi_technika.db'

@contextmanager
def conn():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys = ON")
    try:
        yield c
        c.commit()
    except:
        c.rollback()
        raise
    finally:
        c.close()

def q(sql, params=()):
    with conn() as c:
        return [dict(r) for r in c.execute(sql, params).fetchall()]

def one(sql, params=()):
    with conn() as c:
        r = c.execute(sql, params).fetchone()
        return dict(r) if r else None

def run(sql, params=()):
    with conn() as c:
        cur = c.execute(sql, params)
        return cur.lastrowid
