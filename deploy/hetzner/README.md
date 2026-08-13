# Hetzner kurulumu (Fiba Tournament)

Sunucu: Ubuntu + Docker. Uygulama `/opt/fiba` altında çalışır.

## İlk kurulum

```bash
git clone https://github.com/dnzkynk/fiba-play.git /opt/fiba
cd /opt/fiba/deploy/hetzner
cp .env.example .env      # sonra .env içindeki gizli değerleri doldur (aşağıdaki komut üretir)
docker compose up -d --build
```

Gizli değerleri sunucuda üretmek için:

```bash
{
  echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)"
  echo "SESSION_SECRET=$(openssl rand -hex 32)"
  echo "PASSWORD_SECRET=$(openssl rand -hex 32)"
  echo "BGAMMON_WEBHOOK_SECRET=$(openssl rand -hex 16)"
} >> .env
```

> **PASSWORD_SECRET bir kez belirlenir, asla değiştirilmez.** Değişirse kayıtlı
> parolalar çözülemez ve kullanıcılar giriş yapamaz.

## Alan adı bağlama

1. DNS'te A kaydı: `turnuva.example.com → <sunucu IP>`
2. `.env` içinde:
   ```
   SITE_ADDRESS=turnuva.example.com
   BASE_URL=https://turnuva.example.com
   ```
3. `docker compose up -d` — Caddy sertifikayı otomatik alır.

## Güncelleme (yeni sürüm yayınlama)

```bash
cd /opt/fiba && git pull && cd deploy/hetzner && docker compose up -d --build
```

## Yedekleme

`/etc/cron.daily/fiba-backup` her gece veritabanını `/var/backups/fiba/` altına alır
(14 gün saklanır). Elle yedek: `docker compose exec -T db pg_dump -U fiba fiba > yedek.sql`
