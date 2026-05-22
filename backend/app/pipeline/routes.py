"""Pipeline routes: multi-input creative generation API."""

import json
import urllib.request
import urllib.error
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.auth import get_current_user
from app.database import create_task, update_task, now, get_db, create_campaign
from app.activity import log_activity
from app.pipeline import (
    PipelineMode, SCENE_TEMPLATES, EXPORT_FORMATS,
    build_pipeline_prompt, select_provider_for_pipeline,
)
from app.credits import deduct_credits, COST_PER_GENERATE, COST_PER_BATCH_ITEM

router = APIRouter()

PUBLIC_HOST = "15.135.225.16:8000"


def _resolve_public_url(url: str | None) -> str | None:
    """Resolve local upload paths to public URLs accessible by external APIs."""
    if not url:
        return None
    if url.startswith("/") and not url.startswith("//"):
        return f"http://{PUBLIC_HOST}{url}"
    return url


def _to_data_uri(url: str | None) -> str | None:
    """Convert local file path to base64 data URI for APIs that require HTTPS (like fal.ai)."""
    if not url:
        return None
    import base64, mimetypes, os
    # If it's a local path, read and encode
    local_path = None
    if url.startswith("/uploads/"):
        local_path = os.path.join("/home/ubuntu/alexa-forge/backend", url.lstrip("/"))
    elif url.startswith(f"http://{PUBLIC_HOST}/uploads/"):
        local_path = os.path.join("/home/ubuntu/alexa-forge/backend", url.split(f"http://{PUBLIC_HOST}/")[1])
    
    if local_path and os.path.exists(local_path):
        mime = mimetypes.guess_type(local_path)[0] or "image/jpeg"
        with open(local_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        return f"data:{mime};base64,{b64}"
    
    return url  # already a proper URL


class SlotInput(BaseModel):
    person_image: Optional[str] = None
    product_image: Optional[str] = None
    motion_reference: Optional[str] = None
    style_reference: Optional[str] = None
    audio_reference: Optional[str] = None
    person_desc: Optional[str] = "a person"
    product_desc: Optional[str] = "a product"
    motion_desc: Optional[str] = "performing dynamic movements"


class CaptionOptions(BaseModel):
    enabled: bool = False
    hook_style: str = "viral"  # viral, problem_solution, discount, testimonial, curiosity
    text: Optional[str] = None
    position: str = "top"  # top, center, bottom


class PipelineRequest(BaseModel):
    mode: str = "freeform"
    template_id: Optional[str] = None
    slots: SlotInput = SlotInput()
    prompt: str = ""
    style: str = ""
    provider: Optional[str] = None  # None = auto-select
    model: Optional[str] = None  # Override auto model selection
    duration: Optional[str] = None  # "5" or "10" seconds
    export_format: str = "tiktok_reels"
    captions: CaptionOptions = CaptionOptions()
    dry_run: bool = False
    campaign_id: Optional[int] = None


class BatchRequest(BaseModel):
    mode: str = "product_promo"
    template_id: Optional[str] = None
    base_slots: SlotInput = SlotInput()
    variant_images: list[str] = []  # List of image URLs to iterate
    variant_slot: str = "person_image"  # Which slot to vary
    prompt: str = ""
    style: str = ""
    provider: Optional[str] = None
    export_format: str = "tiktok_reels"
    captions: CaptionOptions = CaptionOptions()
    dry_run: bool = False
    campaign_id: Optional[int] = None


# --- Routes ---

@router.get("/templates")
def list_templates():
    """List all available scene templates."""
    return SCENE_TEMPLATES


@router.get("/templates/{template_id}")
def get_template(template_id: str):
    """Get a specific template with details."""
    template = next((t for t in SCENE_TEMPLATES if t["id"] == template_id), None)
    if not template:
        raise HTTPException(404, "Template not found")
    return template


@router.get("/formats")
def list_formats():
    """List available export formats."""
    return EXPORT_FORMATS


@router.get("/modes")
def list_modes():
    """List available pipeline modes."""
    return [
        {"id": "motion_transfer", "name": "Motion Transfer", "desc": "Subject performs movements from reference video", "icon": "motion"},
        {"id": "product_promo", "name": "Product Promo", "desc": "Person promotes/showcases a product", "icon": "product"},
        {"id": "batch_variant", "name": "Batch Variants", "desc": "Generate multiple variants from one setup", "icon": "batch"},
        {"id": "template_scene", "name": "Template Scene", "desc": "Use pre-built scene templates", "icon": "template"},
        {"id": "audio_sync", "name": "Audio Sync", "desc": "Video synced to music or voiceover", "icon": "audio"},
        {"id": "style_transfer", "name": "Style Transfer", "desc": "Apply visual style from reference", "icon": "style"},
        {"id": "freeform", "name": "Freeform", "desc": "Any combination of inputs + prompt", "icon": "free"},
    ]


@router.post("/generate")
def pipeline_generate(body: PipelineRequest, user: dict = Depends(get_current_user)):
    """Generate video using the creative pipeline."""
    # Deduct credits (skip for dry_run)
    if not body.dry_run:
        credit_result = deduct_credits(user["id"], COST_PER_GENERATE)
        if not credit_result["ok"]:
            raise HTTPException(402, f"Insufficient credits. Balance: {credit_result['balance']}, needed: {credit_result['needed']}")

    slots_dict = body.slots.model_dump(exclude_none=True)

    # Auto-select provider if not specified
    provider = body.provider or select_provider_for_pipeline(body.mode, slots_dict)

    # Build prompt
    final_prompt = build_pipeline_prompt(
        mode=body.mode,
        slots=slots_dict,
        template_id=body.template_id,
        user_prompt=body.prompt,
        style=body.style,
    )

    # Add optional TikTok-style caption overlay instructions
    caption_meta = None
    if body.captions.enabled:
        hook_text = body.captions.text or {
            "viral": "STOP SCROLLING — you need to see this",
            "problem_solution": "Problem solved in seconds",
            "discount": "This deal is too good to miss",
            "testimonial": "I didn't expect this to work this well",
            "curiosity": "Nobody is talking about this enough",
        }.get(body.captions.hook_style, "STOP SCROLLING — you need to see this")
        caption_meta = {
            "enabled": True,
            "text": hook_text,
            "hook_style": body.captions.hook_style,
            "position": body.captions.position,
        }
        final_prompt += (
            f"\n\nAdd bold TikTok-style on-screen caption overlay: '{hook_text}'. "
            f"Place it at the {body.captions.position}, high contrast, large readable text, short creator-style typography."
        )

    # Get export format settings
    fmt = EXPORT_FORMATS.get(body.export_format, EXPORT_FORMATS["tiktok_reels"])

    # Determine primary image (subject) — convert to data URI for external APIs
    primary_image = _to_data_uri(slots_dict.get("person_image") or slots_dict.get("product_image"))
    # Resolve all slot image URLs for external API access
    for key in ("person_image", "product_image", "motion_reference", "style_reference"):
        if slots_dict.get(key):
            slots_dict[key] = _to_data_uri(slots_dict[key])

    # Create task
    task = create_task({
        "user_id": user["id"],
        "type": "video",
        "mode": body.mode,
        "provider": provider,
        "status": "queued",
        "prompt": final_prompt,
        "image_url": primary_image,
        "campaign_id": body.campaign_id,
        "metadata": {
            "pipeline_mode": body.mode,
            "template_id": body.template_id,
            "slots": slots_dict,
            "export_format": body.export_format,
            "aspect_ratio": fmt["aspect_ratio"],
            "style": body.style,
            "user_prompt": body.prompt,
            "dry_run": body.dry_run,
            "auto_provider": body.provider is None,
            "captions": caption_meta,
        },
    })

    log_activity(user["id"], "pipeline", f"generate_{body.mode}", "info",
                 f"Task #{task['id']} | mode={body.mode} | provider={provider} | template={body.template_id or 'none'}")

    # Auto-generate image for video modes when no image provided
    VIDEO_MODES = {"motion_transfer", "product_promo", "dance_viral", "template_scene", "audio_sync", "style_transfer"}
    if body.mode in VIDEO_MODES and not primary_image:
        from app.router.policy import choose_provider_key as _choose_key
        import asyncio as _asyncio
        try:
            _prov, _key_row, _secret = _choose_key("fal", user["id"])
            # Use FLUX Schnell to quickly generate a still frame
            img_prompt = final_prompt.replace("performing", "posed in").replace("dancing", "standing in").replace("dynamic", "static")
            img_payload = {"prompt": img_prompt, "mode": "text_to_image", "model": "fal-ai/flux/schnell"}
            _result = _asyncio.run(_prov.submit(img_payload, _secret))
            _poll_url = _result.metadata.get("raw", {}).get("response_url")
            if _poll_url:
                import time as _time
                for _ in range(20):
                    _time.sleep(2)
                    _req = urllib.request.Request(_poll_url, headers={"Authorization": f"Key {_secret}", "Content-Type": "application/json"}, method="GET")
                    try:
                        with urllib.request.urlopen(_req, timeout=10) as _resp:
                            _data = json.loads(_resp.read().decode())
                            _imgs = _data.get("images", [])
                            if _imgs:
                                img_url = _imgs[0].get("url") if isinstance(_imgs[0], dict) else _imgs[0]
                                primary_image = img_url
                                slots_dict["person_image"] = img_url
                                task = update_task(task["id"], {"image_url": img_url, "metadata": {**(task.get("metadata") or {}), "auto_generated_image": img_url}})
                                log_activity(user["id"], "pipeline", "auto_image", "info", f"Auto-generated image for Task #{task['id']}")
                                break
                    except Exception:
                        continue
        except Exception as _exc:
            log_activity(user["id"], "pipeline", "auto_image", "warning", f"Auto-image failed: {str(_exc)[:100]}")

    # Execute (or dry-run)
    if body.dry_run:
        task = update_task(task["id"], {
            "status": "completed",
            "output_url": f"dry-run://{body.mode}/{provider}",
            "finished_at": now(),
        })
    else:
        # Route to provider
        try:
            from app.router.policy import choose_provider_key
            from app.database import increment_key_success, increment_key_error
            import asyncio

            provider_instance, key_row, secret = choose_provider_key(provider, user["id"])
            task = update_task(task["id"], {"status": "running"})

            gen_payload = {
                "prompt": final_prompt,
                "image_url": primary_image,
                "mode": body.mode,
                "aspect_ratio": fmt["aspect_ratio"],
                "duration": body.duration or "5",
                "dry_run": False,
            }
            if body.model:
                gen_payload["model"] = body.model
            # Add motion/style references if available
            if slots_dict.get("motion_reference"):
                gen_payload["motion_reference"] = slots_dict["motion_reference"]
            if slots_dict.get("style_reference"):
                gen_payload["style_reference"] = slots_dict["style_reference"]
            if slots_dict.get("audio_reference"):
                gen_payload["audio_reference"] = slots_dict["audio_reference"]

            result = asyncio.run(provider_instance.submit(gen_payload, secret))
            task = update_task(task["id"], {
                "status": "running",
                "provider_task_id": result.provider_task_id,
                "output_url": result.output_url,
                "metadata": {
                    **(task.get("metadata") or {}),
                    "model": result.metadata.get("model", ""),
                    "raw": result.metadata.get("raw", {}),
                    "response_url": result.metadata.get("raw", {}).get("response_url"),
                },
            })
            increment_key_success(key_row["id"])
            log_activity(user["id"], "pipeline", f"generate_{body.mode}", "success", f"Task #{task['id']} completed")

        except Exception as exc:
            task = update_task(task["id"], {
                "status": "failed",
                "error": str(exc)[:500],
                "finished_at": now(),
            })
            log_activity(user["id"], "pipeline", f"generate_{body.mode}", "failed", f"Task #{task['id']}: {str(exc)[:200]}")

    return task


@router.post("/batch")
def pipeline_batch(body: BatchRequest, user: dict = Depends(get_current_user)):
    """Generate batch variants — iterate one slot across multiple images."""
    if not body.variant_images:
        raise HTTPException(400, "variant_images must contain at least one URL")
    if len(body.variant_images) > 20:
        raise HTTPException(400, "Maximum 20 variants per batch")

    # Deduct credits for entire batch (skip for dry_run)
    total_cost = len(body.variant_images) * COST_PER_BATCH_ITEM
    if not body.dry_run:
        credit_result = deduct_credits(user["id"], total_cost)
        if not credit_result["ok"]:
            raise HTTPException(402, f"Insufficient credits. Balance: {credit_result['balance']}, needed: {total_cost}")

    campaign_id = body.campaign_id
    if campaign_id is None:
        campaign = create_campaign(
            user["id"],
            f"Batch {body.mode.replace('_', ' ').title()} — {now()[:10]}",
            f"Auto-created from Studio batch: {len(body.variant_images)} variants",
        )
        campaign_id = campaign["id"]

    tasks = []
    for i, image_url in enumerate(body.variant_images):
        # Build slots with variant
        slots_dict = body.base_slots.model_dump(exclude_none=True)
        slots_dict[body.variant_slot] = image_url

        provider = body.provider or select_provider_for_pipeline(body.mode, slots_dict)
        final_prompt = build_pipeline_prompt(
            mode=body.mode,
            slots=slots_dict,
            template_id=body.template_id,
            user_prompt=body.prompt,
            style=body.style,
        )
        caption_meta = None
        if body.captions.enabled:
            hook_text = body.captions.text or {
                "viral": "STOP SCROLLING — you need to see this",
                "problem_solution": "Problem solved in seconds",
                "discount": "This deal is too good to miss",
                "testimonial": "I didn't expect this to work this well",
                "curiosity": "Nobody is talking about this enough",
            }.get(body.captions.hook_style, "STOP SCROLLING — you need to see this")
            caption_meta = {
                "enabled": True,
                "text": hook_text,
                "hook_style": body.captions.hook_style,
                "position": body.captions.position,
            }
            final_prompt += (
                f"\n\nAdd bold TikTok-style on-screen caption overlay: '{hook_text}'. "
                f"Place it at the {body.captions.position}, high contrast, large readable text, short creator-style typography."
            )

        fmt = EXPORT_FORMATS.get(body.export_format, EXPORT_FORMATS["tiktok_reels"])
        primary_image = slots_dict.get("person_image") or slots_dict.get("product_image")

        task = create_task({
            "user_id": user["id"],
            "type": "video",
            "mode": body.mode,
            "provider": provider,
            "status": "queued",
            "prompt": final_prompt,
            "image_url": primary_image,
            "campaign_id": campaign_id,
            "metadata": {
                "pipeline_mode": body.mode,
                "batch_index": i,
                "batch_total": len(body.variant_images),
                "template_id": body.template_id,
                "slots": slots_dict,
                "export_format": body.export_format,
                "aspect_ratio": fmt["aspect_ratio"],
                "dry_run": body.dry_run,
                "captions": caption_meta,
            },
        })
        tasks.append(task)

    log_activity(user["id"], "pipeline", "batch_generate", "info",
                 f"Batch {len(tasks)} variants | mode={body.mode} | slot={body.variant_slot}")

    return {"batch_size": len(tasks), "campaign_id": campaign_id, "tasks": tasks}
