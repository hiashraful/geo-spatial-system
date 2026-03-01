#!/bin/bash
# GEOINT Tactical Intelligence System - Startup Script
# Starts all services: Docker (PostgreSQL/PostGIS + Redis), API, AI Service, Frontend

set -e

echo "============================================"
echo "  GEOINT TACTICAL INTELLIGENCE SYSTEM"
echo "  Starting all services..."
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Docker services
echo -e "${YELLOW}[1/4] Starting Docker services (PostgreSQL/PostGIS + Redis)...${NC}"
docker compose up -d 2>&1
echo -e "${GREEN}  Docker services started${NC}"
echo ""

# Wait for PostgreSQL
echo "  Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
  if docker exec geo-postgres pg_isready -U geouser -d geospatial > /dev/null 2>&1; then
    echo -e "${GREEN}  PostgreSQL is ready${NC}"
    break
  fi
  sleep 1
done
echo ""

# 2. AI Service (Python)
echo -e "${YELLOW}[2/4] Starting AI Detection Service (Python)...${NC}"
cd apps/ai-service
python main.py &
AI_PID=$!
echo -e "${GREEN}  AI Service started (PID: $AI_PID)${NC}"
cd ../..
echo ""

# 3. API Server (Node.js)
echo -e "${YELLOW}[3/4] Starting API Server (Node.js + WebSocket)...${NC}"
cd apps/api
node src/server.js &
API_PID=$!
echo -e "${GREEN}  API Server started (PID: $API_PID)${NC}"
cd ../..
echo ""

# 4. Frontend (Vite)
echo -e "${YELLOW}[4/4] Starting Frontend (Vite Dev Server)...${NC}"
cd apps/web
npm run dev &
WEB_PID=$!
cd ../..
echo ""

sleep 3

echo "============================================"
echo -e "${GREEN}  All services running!${NC}"
echo ""
echo "  Frontend:    http://localhost:5173"
echo "  API:         http://localhost:3001"
echo "  WebSocket:   ws://localhost:3001/ws"
echo "  AI Service:  http://localhost:8500"
echo "  PostgreSQL:  localhost:5435"
echo "  Redis:       localhost:6381"
echo ""
echo "  Press Ctrl+C to stop all services"
echo "============================================"

# Trap to clean up on exit
cleanup() {
  echo ""
  echo "Shutting down services..."
  kill $AI_PID $API_PID $WEB_PID 2>/dev/null
  docker compose stop 2>/dev/null
  echo "All services stopped."
}

trap cleanup EXIT INT TERM

# Wait for any process to exit
wait
