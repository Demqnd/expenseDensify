# OCR Receipt Extractor (Python + Tesseract)

This service lets you upload a receipt image, runs OCR with Tesseract, then extracts useful fields like amount and category.

## What it returns

- `total_amount`
- `currency`
- `category`
- `merchant`
- `date`
- `raw_text` (OCR output)

## 1) Install Tesseract (Windows)

Install Tesseract OCR so `tesseract.exe` is available.

Option A (Winget):

```powershell
winget install --id UB-Mannheim.TesseractOCR -e
```

Option B: Install manually from UB Mannheim build.

If it is not in your PATH, set `TESSERACT_CMD` in `.env`.

## 2) Create virtual env + install Python deps

```powershell
cd ocr_service
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 3) Configure environment

```powershell
copy .env.example .env
```

Set these in `.env`:

- `TESSERACT_CMD` (optional if Tesseract is already on PATH)
- `OPENAI_API_KEY` (optional but recommended for better extraction)
- `OPENAI_MODEL` (default `gpt-4o-mini`)

## 4) Run API

```powershell
uvicorn main:app --reload --port 8010
```

Open docs at:

- http://localhost:8010/docs

## API

### `POST /receipt/extract`

Form-data:

- `file`: receipt image (`.png`, `.jpg`, `.jpeg`, `.webp`, `.bmp`, `.tiff`)

Response:

```json
{
  "merchant": "Walmart",
  "date": "2026-06-14",
  "total_amount": 42.19,
  "currency": "USD",
  "category": "Groceries",
  "confidence": 0.87,
  "raw_text": "...ocr text..."
}
```

## Notes

- Without `OPENAI_API_KEY`, the service falls back to regex/keyword extraction.
- AI extraction is more accurate for messy receipts.
