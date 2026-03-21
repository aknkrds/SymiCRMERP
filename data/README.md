Bu klasör, uygulamanın PostgreSQL verisini (dump) içerir.

- Dump dosyası: `symicrm.dump` (pg_dump custom format)

Restore (sunucuda / Linux):

1) PostgreSQL kurulumu (Ubuntu/Debian):
   - `sudo apt-get update && sudo apt-get install -y postgresql postgresql-contrib`

2) Kullanıcı/DB oluştur:
   - `sudo -u postgres psql -c "CREATE ROLE symicrm LOGIN PASSWORD 'postgres';" || true`
   - `sudo -u postgres createdb -O symicrm symicrm || true`

3) Restore:
   - `pg_restore -U postgres -d symicrm --role=symicrm --no-owner --no-privileges --clean --if-exists symicrm.dump`

