from __future__ import annotations
from datetime import datetime, timezone
from typing import Any
import itertools

_key_ids = itertools.count(1)
_task_ids = itertools.count(1)
KEYS: list[dict[str, Any]] = []
TASKS: list[dict[str, Any]] = []

def now(): return datetime.now(timezone.utc).isoformat()
def next_key_id(): return next(_key_ids)
def next_task_id(): return next(_task_ids)
