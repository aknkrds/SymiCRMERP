# Symi CRM & ERP

Symi CRM, metal ambalaj ve üretim süreçleri için özel geliştirilmiş, satış, üretim, stok, muhasebe ve sevkiyat süreçlerini tek bir çatı altında toplayan bir web uygulamasıdır.

Bu doküman; teknolojik altyapıyı, uygulama modüllerini, çalışma mantığını, geliştirme ortamını ve dağıtım sürecini özetler.

---

## İçindekiler

- [Genel Bakış](#genel-bakış)
- [Teknolojiler](#teknolojiler)
- [Mimari](#mimari)
- [Öne Çıkan Özellikler](#öne-çıkan-özellikler)
- [Kurulum ve Geliştirme](#kurulum-ve-geliştirme)
- [Ortamlar ve Çalıştırma](#ortamlar-ve-çalıştırma)
- [Modüller ve İş Akışları](#modüller-ve-iş-akışları)
- [Log Sistemi](#log-sistemi)
- [Octavia AI Asistanı](#octavia-ai-asistanı)
- [Sipariş ve Gofre Hesaplama Mantığı](#sipariş-ve-gofre-hesaplama-mantığı)
- [Veritabanı ve Migrasyonlar](#veritabanı-ve-migrasyonlar)
- [Deployment (Sunucuya Yayın)](#deployment-sunucuya-yayın)

---

## Genel Bakış

Symi CRM, tekstil/metal ambalaj üretimi yapan işletmeler için tasarlanmış bir **CRM + Üretim Yönetimi** uygulamasıdır. 

Ana amaçlar:

- Müşteri ve sipariş takibini merkezileştirmek
- Üretim, tedarik, sevkiyat ve muhasebe süreçlerini tek yerden yönetmek
- Ürün ağaçları, kalıplar, gofre ve ek maliyetleri doğru modellemek
- Loglama ve basit AI destekli önerilerle kullanıcı deneyimini güçlendirmek

---

## Teknolojiler

**Frontend**
- React 19 (TypeScript)
- Vite 7 (geliştirme ve build)
- React Router DOM 7 (sayfa yönlendirme)
- React Hook Form + Zod (form ve validasyon)
- Tailwind tabanlı stil sistemi (utility sınıflar)
- Lucide React ikon seti

**Backend**
- Node.js + Express 5
- better-sqlite3 (lokal SQLite tabanlı veritabanı)
- Multer (dosya upload)
- CORS, JSON parsers vb. temel middleware'ler

**Diğer**
- PM2 (production process manager)
- ssh2 ve `deploy.js` ile uzak sunucuya otomatik deploy
- concurrently (dev ortamında backend + frontend aynı anda)

---

## Mimari

Proje **monorepo benzeri tek uygulama** yapısındadır:

- `server/index.js`  
  Express API, static dosya servisleri, log endpointleri, sipariş/ürün/müşteri CRUD işlemleri ve PM2 için giriş noktası.

- `server/db.js`  
  SQLite bağlantısı, tablo oluşturma (`CREATE TABLE IF NOT EXISTS`) ve **migrasyon** mantığı (`PRAGMA table_info` ile kolon ekleme) bu dosyadadır.

- `src/`  
  React uygulamasının tüm kodları.
  - `src/pages` – Üst seviye sayfalar (Login, Dashboard, Orders, Production, Settings vb.)
  - `src/components` – Tekrar kullanılabilir bileşenler (OrderForm, layout, modallar vb.)
  - `src/context` – Context yapıları (AuthContext, AIContext, vb.)
  - `src/types` – Ortak TypeScript tipleri

- `deploy.js`  
  Uzak sunucuda git pull, build ve PM2 restart işlemlerini otomatik yapar.

---

## Öne Çıkan Özellikler

- Müşteri yönetimi
- Ürün ve kalıp (mold) yönetimi
- Sipariş oluşturma ve iş akışı adımları (teklif, tasarım, üretim, sevkiyat, muhasebe vb.)
- Üretim planlama ve takip (Production sayfası, vardiyalar vb.)
- Ek maliyetler (gofre, nakliye vb.) ve KDV hesaplamaları
- Loglama:
  - Login logları
  - Kullanıcı aksiyon logları
  - Hata logları
- Ayarlar sayfasında log inceleme ekranı
- Basit AI destekli öneri sistemi (Octavia)

---

## Kurulum ve Geliştirme

### Gerekli Önkoşullar

- Node.js (önerilen 20+)
- npm

### Kurulum

Depoyu klonladıktan sonra:

```bash
cd symi-crm
npm install
```

### Geliştirme Ortamı (Dev)

```bash
npm run dev
```

Bu komut aynı anda:
- `npm run server` ile Express backend’i (`http://localhost:3005`)
- Vite dev server’ı (`http://localhost:5173`)
çalıştırır.

Tarayıcıdan geliştirme ortamına erişim:  
`http://localhost:5173`

---

## Ortamlar ve Çalıştırma

### Development

- Frontend: `http://localhost:5173`
- Backend API: Vite proxy ile `/api`, `/img`, `/doc` istekleri `http://localhost:3005`’e yönlenir.

### Production

- Build alma:

```bash
npm run build
```

Build sonrası `dist/` klasörü oluşturulur.

- Production sunucusunda:
  - Express + Vite build çıktısı PM2 ile `symi-crm` prosesi olarak çalıştırılır.

---

## Modüller ve İş Akışları

### Login & Yetkilendirme

- Kullanıcılar ve roller `server/db.js` altında tanımlanan `users`, `roles` tabloları üzerinden yönetilir.
- Roller:
  - Admin, Genel Müdür, Satış, Tasarımcı, Matbaa, Fabrika Müdürü, Muhasebe, Sevkiyat vb.
- `AuthContext` ile frontend tarafında oturum durumu yönetilir.
- Login/logout işlemleri login log tablosuna yazılır.

### Sipariş Yönetimi

- Sipariş oluşturma ekranı: `src/components/orders/OrderForm.tsx`
- Özellikler:
  - Müşteri seçimi (autocomplete/dropdown)
  - Müşteri geçmiş ürünleri ile sınırlı ürün listesi
  - Yeni ürün ekleme (form içi modal) ve otomatik seçme
  - Ürün satırları: adet, birim fiyat, KDV, satır toplamı
  - Ek fiyatlar: gofre, nakliye vb.
  - Para birimi seçimi
  - İş akışı durumları (offer_accepted, supply_design_process, production, shipping_completed vb.)

### Üretim Yönetimi

- Production sayfası: `src/pages/Production.tsx`
- Vardiya bazlı takip, üretim adetleri, hedefler, durumlar (active, completed vb.) yönetilir.

### Ayarlar

- Kullanıcılar, roller, firma bilgileri, kalıplar (molds) ve **Loglar** sekmesi buradadır:
  - `src/pages/Settings.tsx`

---

## Log Sistemi

Loglar SQLite’ta tutulur ve backend üzerinden API ile erişilir.

### Tablolar

- `login_logs`
  - Başarılı/başarısız giriş denemeleri, IP, userAgent, süre (login–logout arası)

- `user_actions`
  - `AIContext` üzerinden uygulama içi aksiyonlar (navigasyon, sipariş oluşturma vb.)

- `error_logs`
  - Sunucu tarafındaki hatalar, path, method, ip, mesaj ve stack bilgisi

### Endpointler

- Yazma:
  - `POST /api/logs/actions`
  - `POST /api/logs/error`
  - `POST /api/auth/login` (login log’ları)
  - `POST /api/auth/logout` (logout ve süre hesaplama)

- Okuma:
  - `GET /api/logs/login?limit=200`
  - `GET /api/logs/actions?limit=200`
  - `GET /api/logs/errors?limit=200`

### Logları İnceleme (UI)

- **Ayarlar → Loglar** sekmesi:
  - Giriş Logları
  - Aksiyon Logları
  - Hata Logları
  - Yenile butonu ile güncel veriyi çeker.

---

## Octavia AI Asistanı

Octavia, kullanıcı hareketlerini izleyen basit bir öneri motorudur.

- Konum: `src/context/AIContext.tsx`
- Özellikler:
  - `useLocation` ile sayfa geçmişini (`userHistory`) tutar.
  - `trackAction` ile önemli kullanıcı aksiyonlarını (`userActions`) loglar ve backend’e yollar.
  - `getSuggestions()` ile:
    - Sık ziyaret edilen sayfalara göre (örn. `/orders`, `/customers`) proje içi kısa yol önerileri
    - Aksiyon türlerine göre öneriler (ör. `order_created`, `order_status_updated`, `stock_usage_updated`)
  - Octavia UI’si `OctaviaChat` bileşeni üzerinden gösterilir.

---

## Sipariş ve Gofre Hesaplama Mantığı

Sipariş formunda ürün satırları dışında ek maliyetler alanı vardır: **Gofre** ve **Nakliye**.

### Ürün Satırları

Her ürün satırı için:

```text
satır_toplamı = adet * birim_fiyat * (1 + KDV/100)
```

### Gofre

Sipariş formunda gofre alanları:

- `gofreQuantity` – Gofre adeti
- `gofrePrice` – Gofre birim fiyatı
- `gofreVatRate` – Gofre KDV oranı

Toplam gofre tutarı:

```text
gofre_tutar = gofreQuantity * gofrePrice
gofre_toplam = gofre_tutar * (1 + gofreVatRate/100)
```

Bu değer **genel toplam** hesaplamasına eklenir.

### Nakliye

Benzer şekilde:

- `shippingPrice` – nakliye tutarı
- `shippingVatRate` – nakliye KDV oranı

Nakliye toplamı = `shippingPrice * (1 + shippingVatRate/100)` ve genel toplama eklenir.

### Genel Toplam

```text
genel_toplam = ürün_satır_toplamları + gofre_toplam + nakliye_toplam
```

---

## Veritabanı ve Migrasyonlar

Veritabanı: `crm.db` (SQLite)

Tablo oluşturma ve kolon ekleme mantığı `server/db.js` içerisindedir:

- İlk çalıştırmada gerekli tüm tablolar `CREATE TABLE IF NOT EXISTS` ile açılır.
- Sonradan eklenen alanlar için:
  - `PRAGMA table_info(orders)` gibi sorgularla mevcut kolonlar kontrol edilir.
  - Eksik kolonlar için `ALTER TABLE ... ADD COLUMN` kullanılır.
  - Örnek:
    - `gofreQuantity REAL`
    - `gofreUnitPrice REAL` (ileride gerekirse)

Bu sayede mevcut canlı veritabanı bozulmadan yeni özellikler eklenebilir.

---

## Deployment (Sunucuya Yayın)

Uzak üretim sunucusuna deploy işlemi `deploy.js` üzerinden otomatik yapılır.

### deploy.js Mantığı

Konum: `deploy.js`

Adımlar:

1. SSH ile sunucuya bağlanır (`ssh2` kütüphanesi).
2. `cd SymiCRMERP` dizinine geçer.
3. Veritabanını korumak için:
   - `cp crm.db crm.db.temp_safe`
4. Çalışma alanını temizler:
   - `git checkout .`
5. Son kodu çeker:
   - `git pull`
6. DB’yi geri koyar:
   - `mv crm.db.temp_safe crm.db`
7. Bağımlılıkları yükler:
   - `npm install`
8. Production build alır:
   - `npm run build`
9. PM2 ile süreçleri yeniden başlatır:
   - `pm2 restart all`

Şu anda PM2 üzerinde:

- `symi`
- `symi-crm`

adlarıyla en az iki süreç bulunmaktadır.

---

Bu README; teknolojiyi, modülleri, temel iş mantıklarını ve operasyonel süreçleri hızlıca anlayabilmek için hazırlanmıştır.  
Uygulama içinde yeni modüller/mantıklar eklendikçe burası güncellenebilir. 
