# AarogyaKosha Backend

## 100% Open Source - No Proprietary Cloud Dependencies

## Running Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Set up PostgreSQL and Redis (Docker recommended)
docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=aarogyakosha -p 5432:5432 postgres:16
docker run -d --name redis -p 6379:6379 redis:7

# Run migrations
alembic upgrade head

# Start server
uvicorn main:app --reload --port 8000
```

## Running with Docker Compose

```bash
docker-compose up -d
```
