"""Credit system: free daily credits, deduct on generate, balance tracking."""

from datetime import datetime, timezone, timedelta
from app.database import get_db, now

FREE_DAILY_CREDITS = 5
COST_PER_GENERATE = 1
COST_PER_BATCH_ITEM = 1


def get_user_credits(user_id: int) -> dict:
    """Get user's current credit balance and daily free status."""
    with get_db() as db:
        row = db.execute("SELECT * FROM credits WHERE user_id = ?", (user_id,)).fetchone()
        if not row:
            db.execute(
                "INSERT INTO credits (user_id, balance, free_refreshed_at, total_earned, total_spent) VALUES (?, ?, ?, ?, ?)",
                (user_id, FREE_DAILY_CREDITS, now(), FREE_DAILY_CREDITS, 0)
            )
            db.commit()
            row = db.execute("SELECT * FROM credits WHERE user_id = ?", (user_id,)).fetchone()

        # Check if daily free credits should refresh
        refreshed_at = datetime.fromisoformat(row["free_refreshed_at"])
        now_dt = datetime.now(timezone.utc)
        if now_dt - refreshed_at > timedelta(hours=24):
            new_balance = row["balance"] + FREE_DAILY_CREDITS
            db.execute(
                "UPDATE credits SET balance = ?, free_refreshed_at = ?, total_earned = total_earned + ? WHERE user_id = ?",
                (new_balance, now(), FREE_DAILY_CREDITS, user_id)
            )
            db.commit()
            row = db.execute("SELECT * FROM credits WHERE user_id = ?", (user_id,)).fetchone()

        return {
            "balance": row["balance"],
            "free_daily": FREE_DAILY_CREDITS,
            "next_refresh": _next_refresh(row["free_refreshed_at"]),
            "total_earned": row["total_earned"],
            "total_spent": row["total_spent"],
        }


def deduct_credits(user_id: int, amount: int = COST_PER_GENERATE) -> dict:
    """Deduct credits. Returns updated balance or raises if insufficient."""
    info = get_user_credits(user_id)
    if info["balance"] < amount:
        return {"ok": False, "error": "Insufficient credits", "balance": info["balance"], "needed": amount}

    with get_db() as db:
        db.execute(
            "UPDATE credits SET balance = balance - ?, total_spent = total_spent + ? WHERE user_id = ?",
            (amount, amount, user_id)
        )
        db.commit()
    return {"ok": True, "balance": info["balance"] - amount, "deducted": amount}


def add_credits(user_id: int, amount: int, reason: str = "topup") -> dict:
    """Add credits (purchase, referral bonus, admin grant)."""
    get_user_credits(user_id)  # ensures row exists
    with get_db() as db:
        db.execute(
            "UPDATE credits SET balance = balance + ?, total_earned = total_earned + ? WHERE user_id = ?",
            (amount, amount, user_id)
        )
        db.commit()
        db.execute(
            "INSERT INTO credit_transactions (user_id, amount, type, reason, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, amount, "credit", reason, now())
        )
        db.commit()
        row = db.execute("SELECT balance FROM credits WHERE user_id = ?", (user_id,)).fetchone()
        return {"ok": True, "balance": row["balance"], "added": amount, "reason": reason}


def get_credit_history(user_id: int, limit: int = 50) -> list:
    """Get credit transaction history."""
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
            (user_id, limit)
        ).fetchall()
        return [dict(r) for r in rows]


def _next_refresh(refreshed_at_str: str) -> str:
    """Calculate next refresh time."""
    refreshed_at = datetime.fromisoformat(refreshed_at_str)
    next_refresh = refreshed_at + timedelta(hours=24)
    return next_refresh.isoformat()
