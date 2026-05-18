"""Creative Pipeline: multi-input generation system with modes, slots, and templates."""

from dataclasses import dataclass
from enum import Enum
from typing import Optional


class PipelineMode(str, Enum):
    MOTION_TRANSFER = "motion_transfer"      # Subject + Motion Reference
    PRODUCT_PROMO = "product_promo"          # Person + Product + Prompt
    BATCH_VARIANT = "batch_variant"          # 1 asset + N variants
    TEMPLATE_SCENE = "template_scene"        # Pre-built scene + assets
    AUDIO_SYNC = "audio_sync"               # Subject + Audio
    STYLE_TRANSFER = "style_transfer"       # Subject + Style Reference
    FREEFORM = "freeform"                   # Any combination


# --- Scene Templates ---

SCENE_TEMPLATES = [
    {
        "id": "unboxing",
        "name": "Unboxing",
        "description": "Person excitedly opens and reveals a product",
        "category": "commerce",
        "prompt_template": "{person_desc} is excitedly unboxing {product_desc}, showing it to the camera with genuine surprise and enthusiasm, {style}",
        "required_slots": ["person_image", "product_image"],
        "optional_slots": ["style_reference"],
        "default_style": "UGC casual, natural lighting, vertical format",
    },
    {
        "id": "product_review",
        "name": "Product Review",
        "description": "Person reviews and demonstrates a product",
        "category": "commerce",
        "prompt_template": "{person_desc} is holding and reviewing {product_desc}, pointing out features, speaking to camera confidently, {style}",
        "required_slots": ["person_image", "product_image"],
        "optional_slots": ["style_reference", "audio_reference"],
        "default_style": "studio lighting, clean background, professional UGC",
    },
    {
        "id": "before_after",
        "name": "Before & After",
        "description": "Transformation reveal with product",
        "category": "commerce",
        "prompt_template": "{person_desc} shows a before state, then uses {product_desc}, revealing an impressive after transformation, {style}",
        "required_slots": ["person_image", "product_image"],
        "optional_slots": ["style_reference"],
        "default_style": "split screen transition, dramatic reveal, bright lighting",
    },
    {
        "id": "testimonial",
        "name": "Testimonial",
        "description": "Person gives authentic testimonial about product",
        "category": "commerce",
        "prompt_template": "{person_desc} speaking directly to camera, sharing genuine experience with {product_desc}, emotional and relatable, {style}",
        "required_slots": ["person_image", "product_image"],
        "optional_slots": ["audio_reference"],
        "default_style": "close-up, natural setting, warm tones, authentic feel",
    },
    {
        "id": "ootd_showcase",
        "name": "OOTD / Fashion",
        "description": "Person showcases outfit or fashion product",
        "category": "fashion",
        "prompt_template": "{person_desc} confidently modeling and showcasing {product_desc}, doing a slow spin, posing naturally, {style}",
        "required_slots": ["person_image", "product_image"],
        "optional_slots": ["motion_reference", "style_reference"],
        "default_style": "full body shot, aesthetic background, golden hour lighting",
    },
    {
        "id": "dance_viral",
        "name": "Viral Dance",
        "description": "Person performs trending dance move",
        "category": "entertainment",
        "prompt_template": "{person_desc} performing an energetic dance, {motion_desc}, {style}",
        "required_slots": ["person_image", "motion_reference"],
        "optional_slots": ["audio_reference", "style_reference"],
        "default_style": "dynamic camera, vibrant colors, high energy",
    },
    {
        "id": "lifestyle_ad",
        "name": "Lifestyle Ad",
        "description": "Person using product in daily life context",
        "category": "commerce",
        "prompt_template": "{person_desc} naturally using {product_desc} in everyday life, candid and aspirational, {style}",
        "required_slots": ["person_image", "product_image"],
        "optional_slots": ["style_reference"],
        "default_style": "cinematic, warm tones, shallow depth of field, aspirational",
    },
    {
        "id": "comparison",
        "name": "Product Comparison",
        "description": "Side-by-side product comparison",
        "category": "commerce",
        "prompt_template": "{person_desc} comparing two products side by side, clearly showing why {product_desc} is the better choice, {style}",
        "required_slots": ["person_image", "product_image"],
        "optional_slots": [],
        "default_style": "clean background, clear lighting, informative layout",
    },
]


# --- Prompt Builder ---

def build_pipeline_prompt(mode: str, slots: dict, template_id: str = None, user_prompt: str = "", style: str = "") -> str:
    """Build the final prompt from mode, slots, and optional template."""

    if template_id:
        template = next((t for t in SCENE_TEMPLATES if t["id"] == template_id), None)
        if template:
            return template["prompt_template"].format(
                person_desc=slots.get("person_desc", "a person"),
                product_desc=slots.get("product_desc", "a product"),
                motion_desc=slots.get("motion_desc", "with fluid movements"),
                style=style or template["default_style"],
            )

    # Mode-based prompt construction
    parts = []

    if mode == PipelineMode.PRODUCT_PROMO:
        person = slots.get("person_desc", "a person")
        product = slots.get("product_desc", "a product")
        parts.append(f"{person} is promoting and showcasing {product}")
        if user_prompt:
            parts.append(user_prompt)
        parts.append(style or "UGC style, natural lighting, engaging, vertical format")

    elif mode == PipelineMode.MOTION_TRANSFER:
        person = slots.get("person_desc", "a person")
        motion = slots.get("motion_desc", "performing dynamic movements")
        parts.append(f"{person} {motion}")
        if user_prompt:
            parts.append(user_prompt)
        parts.append(style or "smooth motion, high quality")

    elif mode == PipelineMode.STYLE_TRANSFER:
        person = slots.get("person_desc", "a subject")
        parts.append(f"{person}")
        if user_prompt:
            parts.append(user_prompt)
        parts.append(style or "artistic, cinematic")

    elif mode == PipelineMode.AUDIO_SYNC:
        person = slots.get("person_desc", "a person")
        parts.append(f"{person} moving and expressing in sync with audio")
        if user_prompt:
            parts.append(user_prompt)
        parts.append(style or "rhythmic, expressive, dynamic")

    else:  # FREEFORM
        if user_prompt:
            parts.append(user_prompt)
        if style:
            parts.append(style)

    return ", ".join(parts)


# --- Provider Selection ---

def select_provider_for_pipeline(mode: str, slots: dict) -> str:
    """Auto-select best provider based on mode and available inputs."""

    has_motion = "motion_reference" in slots
    has_audio = "audio_reference" in slots
    has_style = "style_reference" in slots

    if mode == PipelineMode.MOTION_TRANSFER:
        return "kling"  # Best for motion reference
    elif mode == PipelineMode.PRODUCT_PROMO:
        return "kling"  # Good at subject + context generation
    elif mode == PipelineMode.STYLE_TRANSFER:
        return "runway"  # Best for style transfer
    elif mode == PipelineMode.AUDIO_SYNC:
        return "fal"  # Best for audio-reactive
    elif has_motion:
        return "kling"
    elif has_style:
        return "runway"
    elif has_audio:
        return "fal"
    else:
        return "fal"  # Default


# --- Export Formats ---

EXPORT_FORMATS = {
    "tiktok_reels": {"aspect_ratio": "9:16", "duration": "5-15", "label": "TikTok / Reels (9:16)"},
    "feed_square": {"aspect_ratio": "1:1", "duration": "5-15", "label": "Feed Square (1:1)"},
    "youtube": {"aspect_ratio": "16:9", "duration": "5-30", "label": "YouTube (16:9)"},
    "story": {"aspect_ratio": "9:16", "duration": "5", "label": "Story (9:16, 5s)"},
}
