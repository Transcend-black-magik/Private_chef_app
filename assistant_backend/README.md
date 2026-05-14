# Private Chef Assistant Backend

Python FastAPI backend for the in-app food assistant.

For production, use the Supabase Edge Function at `supabase/functions/foodAssistant`. Supabase does not host a long-running Python FastAPI server directly; the Python service is useful for local experiments, dataset tooling, or a separately hosted service on infrastructure such as Cloud Run, Render, Fly.io, Railway, AWS, or Azure.

If you decide to run Python in production, deploy it as its own private FastAPI service behind HTTPS, store `OPENAI_API_KEY` and Supabase server keys in that host's secret manager, and have the mobile app call Supabase Edge Functions or your API gateway rather than exposing Python service secrets in Expo.

## Run locally

```powershell
cd assistant_backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:OPENAI_API_KEY="your_key"
python -m uvicorn main:app --host 0.0.0.0 --port 8787 --reload
```

For Android emulator, use:

```text
EXPO_PUBLIC_FOOD_AI_ENDPOINT=http://10.0.2.2:8787/food-ai
```

For iPhone on the same network, use your laptop IP:

```text
EXPO_PUBLIC_FOOD_AI_ENDPOINT=http://YOUR_LAPTOP_IP:8787/food-ai
```

## Data safety

Do not send passwords, raw addresses, payment data, government IDs, or private messages to training jobs. Only use user data when the user has consented, and prefer anonymized summaries over raw records.

## Build a 5,000-example training/eval file

Put license-compatible open-source JSONL files in:

```text
assistant_backend/data/open_source/
```

Each row can use common fields such as `prompt`/`answer`, `instruction`/`response`, or `question`/`output`.

Then run:

```powershell
python assistant_backend/build_training_dataset.py --target 5000
```

This writes:

```text
assistant_backend/training_dataset.5000.jsonl
```

The script redacts obvious emails, phone numbers, and street addresses, then fills any remaining rows with Private Chef route/action examples.

## Deploy the Supabase assistant

Authenticate the CLI first:

```powershell
npx supabase login
```

Set secrets:

```powershell
npx supabase secrets set OPENAI_API_KEY="your_openai_key"
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
npx supabase secrets set FOOD_AI_FAST_MODEL="gpt-4.1-mini"
npx supabase secrets set FOOD_AI_LARGE_MODEL="gpt-4.1"
npx supabase secrets set ASSISTANT_CACHE_TTL_SECONDS="900"
```

Deploy:

```powershell
npx supabase functions deploy foodAssistant
```

The Expo app already calls `supabase.functions.invoke("foodAssistant")` before falling back to a local endpoint.
