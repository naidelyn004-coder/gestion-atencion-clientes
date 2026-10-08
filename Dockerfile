FROM node:24-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt
COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/dist/turnos-atencion/browser ./frontend/dist/turnos-atencion/browser
ENV PORT=10000 PYTHONUNBUFFERED=1
WORKDIR /app/backend
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT} app:app"]
