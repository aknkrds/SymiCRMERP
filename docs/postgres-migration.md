# PostgreSQL Geçiş Notları

Bu proje şu an SQLite (`crm.db`) kullanır. Çoklu kullanıcı ve sürekli kullanım senaryosu için PostgreSQL’e geçiş planı:

## 1) Sunucudan mevcut veriyi indir (SQLite + upload dosyaları)

Yerelde:

```bash
cd symi-crm
node backup-server.js
```

Bu işlem aşağıdakileri indirir:
- `crm.db` (SQLite verisi)
- `server/img` ve `server/doc` (yüklenen dosyalar, tar.gz)
- PM2 dump/list çıktıları (çalışma ayarlarını görmek için)

İndirilenler `server-backups/` altında timestamp’li klasöre yazılır.

## 2) PostgreSQL şemasını oluştur

PostgreSQL bağlantı adresini `DATABASE_URL` olarak ver:

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME"
npm run pg:init
```

Şema dosyası:
- `server/postgres/schema.sql`

## 3) SQLite verisini PostgreSQL’e aktar

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME"
export SQLITE_PATH="/path/to/crm.db"
npm run pg:migrate
```

Notlar:
- Eski/legacy kolonlar otomatik olarak atlanır.
- JSON alanlar PostgreSQL’de `jsonb` olarak tutulur.

## 4) Uygulamanın PostgreSQL’e geçmesi (kod değişikliği)

Bu doküman sadece “veriyi taşıma” adımını kapsar.
Backend’in `better-sqlite3` yerine PostgreSQL’e bağlanması için ayrıca refactor gerekir.

