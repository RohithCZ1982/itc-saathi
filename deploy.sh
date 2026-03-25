#!/bin/bash
set -e

# ── Config — edit these ─────────────────────────────────────────────────────
PROJECT_ID="your-gcp-project-id"
REGION="asia-south1"        # Mumbai — closest to India
SERVICE_NAME="itc-saathi"
IMAGE="gcr.io/$PROJECT_ID/$SERVICE_NAME"
# ───────────────────────────────────────────────────────────────────────────

echo "🔨 Building & pushing image..."
gcloud builds submit --tag "$IMAGE" --project "$PROJECT_ID"

echo "🚀 Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "\
NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL,\
NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY,\
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY,\
GROQ_API_KEY=$GROQ_API_KEY,\
NEXT_PUBLIC_APP_URL=https://$SERVICE_NAME-$(gcloud config get-value project).run.app" \
  --project "$PROJECT_ID"

echo "✅ Deployed! URL:"
gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format "value(status.url)" --project "$PROJECT_ID"
