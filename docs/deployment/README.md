# 🚀 Deployment Guide

Руководство по deployment платформы в production.

---

## 📋 Содержание

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Production Setup](#production-setup)
- [Configuration](#configuration)
- [Monitoring](#monitoring)
- [Scaling](#scaling)
- [Troubleshooting](#troubleshooting)

---

## Overview

Deployment включает настройку production окружения, баз данных, мониторинга и безопасности.

**Компоненты:**
- Web App (Next.js)
- Backend (Node.js/Rust)
- Database (PostgreSQL + TimescaleDB)
- Cache (Redis)
- Monitoring (Prometheus + Grafana)

---

## Prerequisites

### Требования
- Server: 4 CPU, 8GB RAM, 100GB SSD
- OS: Ubuntu 20.04+ или Docker
- Domain: your-domain.com
- SSL Certificate

### Установка зависимостей
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Docker
curl -fsSL https://get.docker.com | sh
```

---

## Production Setup

### 1. Клонирование
```bash
git clone https://github.com/yourusername/trading-platform.git
cd trading-platform
```

### 2. Настройка окружения
```bash
cp .env.example .env.production

# Редактировать .env.production
nano .env.production
```

### 3. Установка зависимостей
```bash
pnpm install --production
```

### 4. Сборка
```bash
pnpm build
```

### 5. База данных
```bash
# Docker Compose
docker-compose -f docker/docker-compose.prod.yml up -d

# Миграции
pnpm db:migrate
```

### 6. Запуск
```bash
# PM2
pnpm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Configuration

### .env.production
```bash
# App
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/trading_prod
REDIS_URL=redis://localhost:6379

# Exchanges
BINANCE_API_KEY=prod_key
BINANCE_API_SECRET=prod_secret

# Security
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here

# ML
ML_MODEL_PATH=/var/lib/trading-platform/models
ML_BATCH_SIZE=64

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
```

### Docker Compose (Production)
```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis

  postgres:
    image: timescale/timescaledb:latest-pg14
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  monitoring:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"

volumes:
  postgres_data:
  redis_data:
```

---

## Monitoring

### Prometheus + Grafana
```bash
# Запуск мониторинга
docker-compose -f docker-monitoring.yml up -d

# Доступ к Grafana
# http://localhost:3001 (admin/admin)
```

### Метрики для мониторинга
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'trading-platform'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics'
```

### Алерты
```yaml
# alerts.yml
groups:
  - name: trading
    rules:
      - alert: HighDrawdown
        expr: max_drawdown > 0.2
        for: 5m
        annotations:
          summary: "Drawdown > 20%"
      
      - alert: APIErrorRate
        expr: rate(api_errors[5m]) > 0.1
        for: 2m
        annotations:
          summary: "High API error rate"
```

---

## Scaling

### Horizontal Scaling
```bash
# Load Balancer (Nginx)
upstream trading_platform {
    server app1:3000;
    server app2:3000;
    server app3:3000;
}

server {
    listen 80;
    location / {
        proxy_pass http://trading_platform;
    }
}
```

### Vertical Scaling
```bash
# Увеличение ресурсов PM2
pm2 start ecosystem.config.js -i max  # Cluster mode
```

### Database Scaling
```sql
-- TimescaleDB hypertables
SELECT create_hypertable('candles', 'timestamp');

-- Partitioning
SELECT add_retention_policy('candles', INTERVAL '1 year');
```

---

## Security

### SSL Certificate
```bash
# Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Firewall
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### API Keys Encryption
```typescript
import { encrypt, decrypt } from '@trading-platform/core';

const encrypted = encrypt(apiKey, process.env.ENCRYPTION_KEY);
const decrypted = decrypt(encrypted, process.env.ENCRYPTION_KEY);
```

---

## Troubleshooting

### Логи
```bash
# PM2 logs
pm2 logs trading-platform

# Docker logs
docker-compose logs -f

# System logs
journalctl -u trading-platform -f
```

### Перезапуск
```bash
# PM2
pm2 restart all

# Docker
docker-compose restart
```

### Проверка здоровья
```bash
curl https://your-domain.com/api/health
# {"status": "ok", "uptime": 86400}
```

### Database issues
```bash
# Проверка подключения
psql -U postgres -d trading_prod -c "SELECT 1"

# Ваккуум
psql -U postgres -d trading_prod -c "VACUUM ANALYZE"
```

---

## Backup

### Database Backup
```bash
# Daily backup script
#!/bin/bash
pg_dump -U postgres trading_prod | gzip > /backups/trading_$(date +%Y%m%d).sql.gz

# Retention: 30 days
find /backups -name "*.sql.gz" -mtime +30 -delete
```

### Restore
```bash
gunzip -c /backups/trading_20250122.sql.gz | psql -U postgres trading_prod
```

---

## Performance Tuning

### PostgreSQL
```sql
-- postgresql.conf
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 64MB
maintenance_work_mem = 512MB
max_connections = 200
```

### Redis
```bash
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

### Node.js
```bash
# Increase heap size
export NODE_OPTIONS="--max-old-space-size=4096"
```

---

**Последнее обновление:** 2025-01-22  
**Версия:** 1.0.0
