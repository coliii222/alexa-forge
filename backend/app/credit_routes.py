"""Credit routes: balance, history, top-up orders, and Midtrans-ready checkout."""

import base64
import json
import urllib.error
import urllib.request
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user
from app.config import settings
from app.credits import get_user_credits, add_credits, get_credit_history
from app.database import get_db, now

router = APIRouter()

TOPUP_PACKAGES = {
    "starter": {"id": "starter", "label": "Starter", "credits": 50, "amount_idr": 49000},
    "growth": {"id": "growth", "label": "Growth", "credits": 150, "amount_idr": 129000},
    "scale": {"id": "scale", "label": "Scale", "credits": 500, "amount_idr": 349000},
}


@router.get("")
def get_balance(user: dict = Depends(get_current_user)):
    """Get current credit balance."""
    return get_user_credits(user["id"])


@router.get("/history")
def get_history(user: dict = Depends(get_current_user)):
    """Get credit transaction history."""
    return get_credit_history(user["id"])


@router.get("/packages")
def list_packages():
    """List available credit top-up packages."""
    return list(TOPUP_PACKAGES.values())


@router.get("/orders")
def list_orders(user: dict = Depends(get_current_user)):
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM payment_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
            (user["id"],),
        ).fetchall()
        return [dict(r) for r in rows]


class TopupRequest(BaseModel):
    amount: int
    reason: str = "manual_topup"


@router.post("/topup")
def topup_credits(body: TopupRequest, user: dict = Depends(get_current_user)):
    """Add credits manually. Kept for admin/dev/manual reconciliation."""
    if body.amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    if body.amount > 10000:
        raise HTTPException(400, "Maximum 10000 credits per topup")
    return add_credits(user["id"], body.amount, body.reason)


class CheckoutRequest(BaseModel):
    package_id: str


@router.post("/checkout")
def create_checkout(body: CheckoutRequest, user: dict = Depends(get_current_user)):
    """Create a Midtrans-ready payment order. Uses mock checkout when server key is not configured."""
    package = TOPUP_PACKAGES.get(body.package_id)
    if not package:
        raise HTTPException(400, "Unknown credit package")

    order_id = f"AF-{user['id']}-{uuid4().hex[:12]}"
    checkout_url = f"/settings?checkout=mock&order_id={order_id}"
    provider_reference = None
    status = "pending"
    error = None

    if settings.midtrans_server_key:
        try:
            snap = _create_midtrans_snap(order_id, package, user)
            checkout_url = snap.get("redirect_url") or checkout_url
            provider_reference = snap.get("token")
        except Exception as exc:
            status = "failed"
            error = str(exc)[:500]

    with get_db() as db:
        db.execute(
            """INSERT INTO payment_orders
               (user_id, order_id, provider, package_id, credits, amount_idr, status, checkout_url, provider_reference, error, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user["id"],
                order_id,
                "midtrans",
                package["id"],
                package["credits"],
                package["amount_idr"],
                status,
                checkout_url,
                provider_reference,
                error,
                now(),
            ),
        )
        row = db.execute("SELECT * FROM payment_orders WHERE order_id = ?", (order_id,)).fetchone()
        return dict(row)


class MarkPaidRequest(BaseModel):
    order_id: str


@router.post("/orders/mark-paid")
def mark_order_paid(body: MarkPaidRequest, user: dict = Depends(get_current_user)):
    """Dev/manual payment completion until Midtrans webhook is wired."""
    with get_db() as db:
        row = db.execute(
            "SELECT * FROM payment_orders WHERE order_id = ? AND user_id = ?",
            (body.order_id, user["id"]),
        ).fetchone()
        if not row:
            raise HTTPException(404, "Order not found")
        order = dict(row)
        if order["status"] == "paid":
            return {"ok": True, "order": order, "credits": get_user_credits(user["id"])}
        if order["status"] == "failed":
            raise HTTPException(400, "Cannot mark failed order as paid")

        db.execute(
            "UPDATE payment_orders SET status = ?, paid_at = ? WHERE order_id = ?",
            ("paid", now(), body.order_id),
        )
    credit_result = add_credits(user["id"], order["credits"], f"payment:{body.order_id}")
    return {"ok": True, "order_id": body.order_id, "added": order["credits"], "credits": credit_result}


def _create_midtrans_snap(order_id: str, package: dict, user: dict) -> dict:
    base_url = "https://app.midtrans.com" if settings.midtrans_environment == "production" else "https://app.sandbox.midtrans.com"
    api_url = f"{base_url}/snap/v1/transactions"
    payload = {
        "transaction_details": {
            "order_id": order_id,
            "gross_amount": package["amount_idr"],
        },
        "item_details": [
            {
                "id": package["id"],
                "price": package["amount_idr"],
                "quantity": 1,
                "name": f"Alexa Forge {package['label']} Credits ({package['credits']})",
            }
        ],
        "customer_details": {
            "first_name": user.get("username") or "Alexa Forge User",
            "email": user.get("email") or "user@example.com",
        },
    }
    token = base64.b64encode(f"{settings.midtrans_server_key}:".encode()).decode()
    request = urllib.request.Request(
        api_url,
        data=json.dumps(payload).encode(),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Basic {token}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="ignore")[:500]
        raise RuntimeError(f"Midtrans error {exc.code}: {detail}") from exc
