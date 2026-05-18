"""Credit routes: balance, history, topup."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.auth import get_current_user
from app.credits import get_user_credits, add_credits, get_credit_history

router = APIRouter()


@router.get("")
def get_balance(user: dict = Depends(get_current_user)):
    """Get current credit balance."""
    return get_user_credits(user["id"])


@router.get("/history")
def get_history(user: dict = Depends(get_current_user)):
    """Get credit transaction history."""
    return get_credit_history(user["id"])


class TopupRequest(BaseModel):
    amount: int
    reason: str = "manual_topup"


@router.post("/topup")
def topup_credits(body: TopupRequest, user: dict = Depends(get_current_user)):
    """Add credits (admin or payment callback)."""
    if body.amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    if body.amount > 10000:
        raise HTTPException(400, "Maximum 10000 credits per topup")
    return add_credits(user["id"], body.amount, body.reason)
