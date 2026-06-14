import json
import os
import re
from datetime import datetime
from io import BytesIO
from typing import Any

import pytesseract
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageEnhance, ImageOps

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover
    OpenAI = None

load_dotenv()

app = FastAPI(title="Receipt OCR Extractor", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPPORTED_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/bmp",
    "image/tiff",
}

CATEGORY_KEYWORDS = {
    "Groceries": ["grocery", "market", "supermarket", "walmart", "aldi", "kroger", "tesco"],
    "Dining": ["restaurant", "cafe", "coffee", "bar", "burger", "pizza", "diner", "mcdonald"],
    "Transport": ["uber", "lyft", "taxi", "fuel", "gas", "shell", "exxon", "metro", "train"],
    "Shopping": ["mall", "store", "amazon", "target", "best buy", "retail"],
    "Utilities": ["electric", "water", "internet", "utility", "telecom", "phone bill"],
    "Health": ["pharmacy", "clinic", "hospital", "medicine", "drugstore"],
    "Entertainment": ["cinema", "movie", "netflix", "spotify", "game", "concert"],
    "Other": [],
}


def configure_tesseract() -> None:
    tess_cmd = os.getenv("TESSERACT_CMD", "").strip()
    if tess_cmd:
        pytesseract.pytesseract.tesseract_cmd = tess_cmd


def extract_text_from_image(file_bytes: bytes) -> str:
    try:
        image = Image.open(BytesIO(file_bytes)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {exc}") from exc

    # Preprocess for low-contrast receipt photos.
    gray = ImageOps.grayscale(image)
    upscaled = gray.resize((gray.width * 2, gray.height * 2), Image.Resampling.LANCZOS)
    contrast = ImageEnhance.Contrast(upscaled).enhance(1.8)
    bw = contrast.point(lambda x: 255 if x > 150 else 0)

    try:
        text_blocks = [
            pytesseract.image_to_string(contrast, config="--oem 3 --psm 6"),
            pytesseract.image_to_string(bw, config="--oem 3 --psm 6"),
            pytesseract.image_to_string(bw, config="--oem 3 --psm 4"),
        ]
        text = "\n".join(part.strip() for part in text_blocks if part and part.strip())
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Tesseract OCR failed. Ensure Tesseract is installed and TESSERACT_CMD is set "
                "if tesseract.exe is not in PATH."
            ),
        ) from exc

    cleaned = text.strip()
    if not cleaned:
        raise HTTPException(status_code=422, detail="OCR found no text in the image.")
    return cleaned


def _guess_currency(text: str) -> str:
    if "$" in text:
        return "USD"
    if "EUR" in text.upper() or "€" in text:
        return "EUR"
    if "GBP" in text.upper() or "£" in text:
        return "GBP"
    return "UNKNOWN"


def _extract_amount_candidates(text: str) -> list[float]:
    # Normalize common OCR mistakes (O/o -> 0) when touching numbers.
    normalized = re.sub(r"(?<=\d)[oO]|[oO](?=\d)", "0", text)

    candidates = []
    pattern = r"(?<!\d)(?:\$|USD\s*)?(\d{1,5}(?:[.,:\- ]\d{2}))"
    for m in re.finditer(pattern, normalized, flags=re.IGNORECASE):
        value = re.sub(r"[,:\-\s]", ".", m.group(1)).replace(",", ".")
        try:
            amount = float(value)
            if 0.01 <= amount <= 50000:
                candidates.append(amount)
        except ValueError:
            continue
    return candidates


def _extract_total_with_keywords(text: str) -> float | None:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    best_total = None

    for line in lines:
        lower = line.lower()
        if any(k in lower for k in ["total", "amount", "balance due", "grand total"]):
            numbers = _extract_amount_candidates(line)
            if numbers:
                candidate = max(numbers)
                if best_total is None or candidate > best_total:
                    best_total = candidate

    if best_total is not None:
        return best_total

    # Fallback: receipts often place total near the bottom.
    for line in reversed(lines[-8:]):
        numbers = _extract_amount_candidates(line)
        if numbers:
            return max(numbers)

    return None


def _guess_merchant(text: str) -> str | None:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return None
    top = lines[0]
    if len(top) >= 2 and any(c.isalpha() for c in top):
        return top[:80]
    return None


def _guess_date(text: str) -> str | None:
    patterns = [
        r"\b(\d{4}[-/]\d{2}[-/]\d{2})\b",
        r"\b(\d{2}[-/]\d{2}[-/]\d{4})\b",
        r"\b(\d{2}[-/]\d{2}[-/]\d{2})\b",
    ]
    for p in patterns:
        m = re.search(p, text)
        if m:
            raw = m.group(1)
            for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%d/%m/%Y", "%m-%d-%Y", "%m/%d/%Y", "%d-%m-%y", "%d/%m/%y", "%m-%d-%y", "%m/%d/%y"):
                try:
                    return datetime.strptime(raw, fmt).date().isoformat()
                except ValueError:
                    continue
            return raw
    return None


def _guess_category(text: str) -> str:
    lower = text.lower()
    best_category = "Other"
    best_score = 0
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in lower)
        if score > best_score:
            best_score = score
            best_category = category
    return best_category


def fallback_extract(text: str) -> dict[str, Any]:
    keyword_total = _extract_total_with_keywords(text)
    all_amounts = _extract_amount_candidates(text)
    max_amount = max(all_amounts) if all_amounts else None

    total_amount = keyword_total if keyword_total is not None else max_amount

    return {
        "merchant": _guess_merchant(text),
        "date": _guess_date(text),
        "total_amount": total_amount,
        "currency": _guess_currency(text),
        "category": _guess_category(text),
        "confidence": 0.55,
    }


def ai_extract(text: str) -> dict[str, Any]:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()

    if not api_key or OpenAI is None:
        return fallback_extract(text)

    client = OpenAI(api_key=api_key)
    prompt = (
        "You are a receipt parser. Extract fields from OCR text. Return strict JSON with keys: "
        "merchant (string|null), date (YYYY-MM-DD|string|null), total_amount (number|null), "
        "currency (3-letter code|string), category (one of Groceries, Dining, Transport, Shopping, "
        "Utilities, Health, Entertainment, Other), confidence (0 to 1)."
    )

    try:
        response = client.chat.completions.create(
            model=model,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"OCR text:\n{text}"},
            ],
        )
        raw = response.choices[0].message.content or "{}"
        raw = raw.strip()
        parsed = json.loads(raw)

        return {
            "merchant": parsed.get("merchant"),
            "date": parsed.get("date"),
            "total_amount": parsed.get("total_amount"),
            "currency": parsed.get("currency", "UNKNOWN"),
            "category": parsed.get("category", "Other"),
            "confidence": parsed.get("confidence", 0.75),
        }
    except Exception:
        return fallback_extract(text)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/receipt/extract")
async def receipt_extract(file: UploadFile = File(...)) -> dict[str, Any]:
    configure_tesseract()

    if file.content_type not in SUPPORTED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type: {file.content_type}. "
                "Use png/jpg/jpeg/webp/bmp/tiff."
            ),
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")

    text = extract_text_from_image(data)
    extracted = ai_extract(text)
    extracted["raw_text"] = text
    return extracted
