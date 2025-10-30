
# Shoes Care POS API

Backend untuk aplikasi Point of Sales Laundry Sepatu. Dibangun dengan Node.js, Express, dan Prisma (PostgreSQL).

## Fitur Inti
- Autentikasi (login/register, JWT)
- Manajemen Rak (create/list/update/delete)
- Pembuatan Transaksi (dengan snapshot customer + QR)
- Lacak Transaksi via QR/Invoice
- Pengambilan Sepatu via QR (ubah status, kosongkan rak)

## Endpoint Utama

Auth
- POST `/auth/register`
- POST `/auth/login`

Users
- GET `/users/profile/me`
- PUT `/users/profile/me`

Racks (Admin/Superadmin)
- GET `/racks/`
- POST `/racks/`
- PUT `/racks/:id`
- DELETE `/racks/:id`

Transactions
- GET `/transactions/` (Admin/Superadmin)
- POST `/transactions/` (Admin/Superadmin) — body: `{ rackId, price, customerEmail?, customerName? }`
- POST `/transactions/scan` (Admin/Superadmin) — body: `{ qr }` untuk pickup
- GET `/transactions/my` (Customer) — daftar transaksi milik user login
- GET `/transactions/lookup?qr=...` atau `?invoice=...` — lacak status transaksi

Catatan
- Format QR: `qr-{INVOICE}`
- Ketika membuat transaksi dengan `customerEmail`, sistem akan membuat customer jika email belum terdaftar; jika sudah ada akan menggunakan data yang ada. Snapshot `customerName` & `customerEmail` disimpan di transaksi.

## Menjalankan
- Salin `.env.example` ke `.env`
- Install deps: `yarn` atau `npm i`
- Generate prisma: `yarn build` atau `npx prisma generate`
- Jalankan dev: `yarn dev`
