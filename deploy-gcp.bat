@echo off
echo ============================================
echo  Deploying ITC Saathi to GCP Cloud Run
echo ============================================

cd /d "%~dp0"

:: Build and push Docker image with NEXT_PUBLIC vars baked in
echo.
echo [1/2] Building and pushing Docker image...
gcloud builds submit ^
  --config cloudbuild.yaml ^
  --project itc-saathi-app ^
  --substitutions ^
    _NEXT_PUBLIC_SUPABASE_URL="https://nyjmonjndjofhqgazuhw.supabase.co",^
    _NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55am1vbmpuZGpvZmhxZ2F6dWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MTExNTQsImV4cCI6MjA4OTk4NzE1NH0.d5qf1kDNA9TeO1D_aAOEX_WYSUCbwJ6qMSG0Xzxp_XU",^
    _NEXT_PUBLIC_APP_URL="https://itc-saathi-601467866912.asia-south1.run.app"

if %errorlevel% neq 0 (
    echo ERROR: Build failed. Aborting deployment.
    pause
    exit /b 1
)

:: Deploy to Cloud Run
echo.
echo [2/2] Deploying to Cloud Run...
gcloud run deploy itc-saathi ^
  --image gcr.io/itc-saathi-app/itc-saathi ^
  --region asia-south1 ^
  --platform managed ^
  --project itc-saathi-app

if %errorlevel% neq 0 (
    echo ERROR: Deployment failed.
    pause
    exit /b 1
)

echo.
echo ============================================
echo  Deployed successfully!
echo  URL: https://itc-saathi-601467866912.asia-south1.run.app
echo ============================================
pause
