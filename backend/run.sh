#!/bin/bash
echo "Starting LinkedIn Job Agent..."
echo "Make sure Docker is running for PostgreSQL and Redis."

# Start backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start Celery worker
celery -A app.tasks.celery_app worker --loglevel=info &
CELERY_PID=$!

echo "Backend running on http://localhost:8000"
echo "API docs at http://localhost:8000/docs"

wait $BACKEND_PID $CELERY_PID
