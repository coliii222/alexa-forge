import uuid

from fastapi.testclient import TestClient

from app.database import init_db
from app.main import app


client = TestClient(app)


def auth_headers() -> dict[str, str]:
    init_db()
    username = f"pytest_user_{uuid.uuid4().hex[:12]}"
    response = client.post(
        "/api/auth/register",
        json={
            "username": username,
            "email": f"{username}@example.com",
            "password": "pytest-pass",
        },
    )
    assert response.status_code == 200
    token = response.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def add_provider_key(headers: dict[str, str], provider: str = "fake") -> dict:
    response = client.post(
        "/api/vault/keys",
        headers=headers,
        json={
            "provider": provider,
            "label": f"{provider.title()} Key",
            "secret": f"sk-{provider}-test",
            "priority": 10,
        },
    )
    assert response.status_code == 200
    return response.json()


def test_vault_create_and_list_key_masks_secret():
    headers = auth_headers()

    key = add_provider_key(headers, "fake")

    assert key["provider"] == "fake"
    assert key["label"] == "Fake Key"
    assert key["secret_preview"].startswith("sk-")
    assert "secret" not in key

    response = client.get("/api/vault/keys", headers=headers)
    assert response.status_code == 200
    keys = response.json()
    assert any(k["id"] == key["id"] for k in keys)
    assert all("secret" not in k for k in keys)


def test_generate_video_completes_with_fake_provider():
    headers = auth_headers()
    add_provider_key(headers, "fake")

    response = client.post(
        "/api/generate/video",
        headers=headers,
        json={
            "mode": "image_to_video",
            "prompt": "make a dance reel",
            "image_url": "https://example.com/a.jpg",
            "provider": "fake",
        },
    )

    assert response.status_code == 200
    task = response.json()
    assert task["status"] == "completed"
    assert task["provider"] == "fake"
    assert task["output_url"].endswith(".mp4")

    fetched = client.get(f"/api/tasks/{task['id']}", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json()["status"] == "completed"


def test_upload_image_returns_public_asset_url():
    files = {"file": ("photo.jpg", b"fake-jpeg-bytes", "image/jpeg")}

    response = client.post("/api/uploads/image", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["url"].startswith("/uploads/")
    asset = client.get(data["url"])
    assert asset.status_code == 200
    assert asset.content == b"fake-jpeg-bytes"


def test_fal_provider_can_run_in_dry_run_mode():
    headers = auth_headers()
    add_provider_key(headers, "fal")

    response = client.post(
        "/api/generate/video",
        headers=headers,
        json={
            "mode": "image_to_video",
            "prompt": "make a cinematic dance reel",
            "image_url": "https://example.com/a.jpg",
            "provider": "fal",
            "dry_run": True,
        },
    )

    assert response.status_code == 200
    task = response.json()
    assert task["status"] == "completed"
    assert task["provider"] == "fal"
    assert task["output_url"].startswith("fal-dry-run://")
    assert task["metadata"]["model"]


def test_presets_available():
    response = client.get("/api/presets")

    assert response.status_code == 200
    names = [preset["name"] for preset in response.json()]
    assert "TikTok Girl Dance" in names


def test_pipeline_batch_auto_creates_campaign_and_keeps_caption_metadata():
    headers = auth_headers()

    response = client.post(
        "/api/pipeline/batch",
        headers=headers,
        json={
            "mode": "product_promo",
            "base_slots": {
                "person_desc": "creator",
                "product_desc": "serum",
            },
            "variant_images": [
                "https://example.com/product-a.jpg",
                "https://example.com/product-b.jpg",
            ],
            "variant_slot": "product_image",
            "prompt": "UGC ad",
            "captions": {
                "enabled": True,
                "hook_style": "curiosity",
                "text": "Watch this before buying",
                "position": "top",
            },
            "dry_run": True,
        },
    )

    assert response.status_code == 200
    batch = response.json()
    assert batch["batch_size"] == 2
    assert batch["campaign_id"]

    task = batch["tasks"][0]
    assert task["campaign_id"] == batch["campaign_id"]
    assert "Watch this before buying" in task["prompt"]
    assert task["metadata"]["captions"] == {
        "enabled": True,
        "text": "Watch this before buying",
        "hook_style": "curiosity",
        "position": "top",
    }

    campaigns = client.get("/api/campaigns", headers=headers)
    assert campaigns.status_code == 200
    assert any(c["id"] == batch["campaign_id"] and c["task_count"] == 2 for c in campaigns.json())


def test_asset_library_is_user_scoped_and_lists_uploaded_asset():
    headers = auth_headers()
    other_headers = auth_headers()

    files = {"file": ("asset.jpg", b"asset-bytes", "image/jpeg")}
    uploaded = client.post("/api/assets", headers=headers, files=files)

    assert uploaded.status_code == 200
    asset = uploaded.json()
    assert asset["url"].startswith("/uploads/assets/")
    assert asset["media_type"] == "image"

    listed = client.get("/api/assets", headers=headers)
    assert listed.status_code == 200
    assert any(item["id"] == asset["id"] for item in listed.json())

    other_listed = client.get("/api/assets", headers=other_headers)
    assert other_listed.status_code == 200
    assert all(item["id"] != asset["id"] for item in other_listed.json())


def test_scheduled_connector_preview_and_due_dry_run_flow():
    headers = auth_headers()
    add_provider_key(headers, "fake")

    task_response = client.post(
        "/api/generate/video",
        headers=headers,
        json={
            "mode": "image_to_video",
            "prompt": "scheduled reel",
            "image_url": "https://example.com/input.jpg",
            "provider": "fake",
        },
    )
    assert task_response.status_code == 200
    task = task_response.json()

    connector = client.put(
        "/api/scheduled/connectors/tiktok",
        headers=headers,
        json={"platform": "tiktok", "status": "ready", "mode": "dry_run", "config": {"note": "test"}},
    )
    assert connector.status_code == 200
    assert connector.json()["configured"] is True

    scheduled = client.post(
        "/api/scheduled",
        headers=headers,
        json={
            "task_id": task["id"],
            "platform": "tiktok",
            "scheduled_at": "2000-01-01T00:00:00+00:00",
            "caption": "Dry-run caption",
        },
    )
    assert scheduled.status_code == 200
    post = scheduled.json()

    preview = client.get(f"/api/scheduled/{post['id']}/preview", headers=headers)
    assert preview.status_code == 200
    payload = preview.json()["payload"]
    assert payload["platform"] == "tiktok"
    assert payload["asset_url"] == task["output_url"]
    assert payload["caption"] == "Dry-run caption"

    due = client.post("/api/scheduled/process-due?dry_run=true", headers=headers)
    assert due.status_code == 200
    processed = due.json()["processed"]
    assert any(item["post_id"] == post["id"] and item["status"] == "dry_run_ready" for item in processed)


def test_credit_packages_checkout_and_manual_mark_paid_flow():
    headers = auth_headers()

    packages = client.get("/api/credits/packages", headers=headers)
    assert packages.status_code == 200
    assert {pkg["id"] for pkg in packages.json()} >= {"starter", "growth", "scale"}

    checkout = client.post("/api/credits/checkout", headers=headers, json={"package_id": "starter"})
    assert checkout.status_code == 200
    order = checkout.json()
    assert order["status"] == "pending"
    assert order["credits"] == 50
    assert order["amount_idr"] == 49000
    assert order["checkout_url"]

    orders = client.get("/api/credits/orders", headers=headers)
    assert orders.status_code == 200
    assert any(item["order_id"] == order["order_id"] for item in orders.json())

    before = client.get("/api/credits", headers=headers).json()["balance"]
    paid = client.post("/api/credits/orders/mark-paid", headers=headers, json={"order_id": order["order_id"]})
    assert paid.status_code == 200
    assert paid.json()["added"] == 50

    after = client.get("/api/credits", headers=headers).json()["balance"]
    assert after == before + 50

    history = client.get("/api/credits/history", headers=headers)
    assert history.status_code == 200
    assert any(tx["reason"] == f"payment:{order['order_id']}" for tx in history.json())
