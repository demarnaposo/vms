# Master jenis dokumen VMS — 2026-09-27

## Dependensi yang diperiksa

| Alur / relasi | Hasil |
| --- | --- |
| `routes/web.php`, `DocumentTypeController`, `SaveDocumentTypeRequest`, Sidebar | CRUD dalam grup `role:super_admin`, binding model, kode tetap; submenu setelah kategori sebelum pengguna staf. |
| `DocumentType` → `VendorDocument` → `DocumentVersion` | FK restrict lama dipertahankan. Hapus ditolak untuk referensi dokumen termasuk soft-deleted/non-current. Versi dan file tidak dihapus oleh master. |
| `VendorApplication.data.step3.documents` | Referensi draft/submitted mencegah hapus. Submit memeriksa ulang file nyata, format/MIME, ukuran, status jenis, tanggal dan mandatory. Pengguna dapat melepas referensi draft dengan konfirmasi; file tidak dihapus saat melepas referensi. |
| `StoreStep3Request`, `UploadDocumentRequest`, `VendorService` | Aturan bersama PDF/JPG/JPEG/PNG, maksimum global 10 MB; per jenis dapat lebih ketat. Expiry wajib bila dikonfigurasi dan dilarang pada unggahan baru tanpa expiry. Validasi diulang di service dengan lock jenis dalam transaksi. |
| `StepDocuments`, `StepReview`, `Documents.jsx` | Review memakai semua metadata jenis untuk histori draft; pilihan/upload hanya aktif. UI menampilkan batas per jenis; draft lama dapat diperbaiki tanpa otomatis dibuang. |
| `DocumentController`, `VendorDocumentPolicy`, preview/download/verify/reject | Tidak ditambah syarat aktif untuk akses historis. Ownership dan role lama tetap berlaku. Label bawaan diterjemahkan hanya jika belum disunting admin. |
| `ComplianceService` | Mandatory aktif saja. Expiry aktif saja, ambang per jenis, tanggal hari ini belum expired. Status expired tetap diperhitungkan. Hasil historis tetap append-only; master tidak memicu evaluasi. |
| `VendorLifecycleService`, `VendorManagementController` | Aktivasi dan readiness UI memakai mandatory aktif; jenis tanpa expiry tidak diblokir oleh tanggal historis. Approve tetap merupakan tahap terpisah dari aktivasi sesuai lifecycle yang ada. |
| `ReportService` | Query, ekspor dan statistik expiry operasional memfilter jenis aktif dengan expiry. Filter periode laporan tetap pilihan pengguna. |
| `DashboardService` | Dokumen pending memakai relasi jenis; tidak ditemukan query expiry/mandatory tersendiri yang perlu diubah. |
| `SendExpiryReminders`, jadwal `routes/console.php`, notifikasi expiry | Jenis nonaktif dikecualikan. Horizon dan hari peringatan awal mengikuti jenis; checkpoint 30/15/7/3/1 tetap digunakan dalam horizon itu. Tidak mengirim notifikasi saat master diubah. |
| `ComplianceRule.conditions`, `ComplianceResult.metadata`, `ComplianceFlag.metadata` | Baseline rule memakai `warning_days`/`min_score`, tanpa ID jenis. Scanner melindungi key `document_type_id(s)`, `document_type_name(s)` dan `missing_document_ids` pada metadata hasil/flag (ID jenis dalam evaluasi mandatory). ID dokumen pada hasil expiry tidak disalahartikan sebagai ID jenis. JSON rusak memblokir hapus untuk diperbaiki manual. |
| `SystemMasterDataService`, `DocumentTypeSeeder`, baseline | Bootstrap hanya untuk instalasi kosong dan satu kali. Penanda `master_data_initializations` mencegah overwrite/reactivate/recreate oleh sinkronisasi rutin. Jenis custom tetap utuh; data baseline dan kode bawaan tidak diubah. |
| Cache `document_types_active` | Event model menjadwalkan invalidasi setelah commit; rollback tidak memublikasikan state baru. Tidak ditemukan cache jenis lain. |
| i18n helper React, label backend, validasi Indonesia | Label/description custom dan perubahan label bawaan tampil sesuai input. Teks statis tersedia Inggris/Indonesia. |

## Migration manual

Migration baru menolak duplikasi `name` sebelum perubahan schema, menambahkan unique index dan tabel penanda bootstrap. Tidak ada penggabungan/penghapusan record lama. Bila ada duplikasi, penyelesaian manual harus mempertahankan semua referensi; migration menyebut kode yang bermasalah.

Jalankan setelah meninjau migration lain yang masih pending:

```sh
php artisan migrate --path=database/migrations/2026_09_27_000000_protect_document_type_master_data.php
```

Bukan perintah seeder: instalasi dengan record yang sudah ada langsung ditandai telah di-bootstrap. Instalasi benar-benar kosong dapat menjalankan bootstrap bawaan melalui workflow seeder manual yang ada. Setelah semua jenis dihapus melalui CRUD, seeder rutin tidak membuatnya kembali.

## Batas verifikasi

Tes penulis data dijalankan dengan target yang sudah dibuktikan `sqlite :memory:` tanpa config cache. Tidak ada migration/seeder/job pada database aplikasi yang dijalankan oleh agen. Pemeriksaan browser terbatas pada submenu, halaman dan formulir edit tanpa menyimpan mutasi. Uji browser upload/submit/destructive CRUD tidak dilakukan pada database aplikasi. SQLite tidak membuktikan perilaku collation/lock MySQL; penerapan migration dan konkurensi perlu diperiksa pada lingkungan deployment yang sesuai.

Transaksi database tidak membuat operasi filesystem submit menjadi atomik. Pemindahan file pada submit masih mengikuti mekanisme VMS yang ada; kegagalan storage di tengah pemindahan memerlukan penanganan operasional. Revalidasi konfigurasi dilakukan sebelum pemindahan dan mempertahankan draft/file bila ditolak.

## File yang diubah untuk fitur ini

- `app/Console/Commands/SendExpiryReminders.php`
- `app/Http/Controllers/Admin/DocumentTypeController.php`
- `app/Http/Controllers/Admin/VendorManagementController.php`
- `app/Http/Controllers/DocumentController.php`
- `app/Http/Controllers/VendorController.php`
- `app/Http/Controllers/VendorOnboardingController.php`
- `app/Http/Requests/Admin/SaveDocumentTypeRequest.php`
- `app/Http/Requests/Vendor/StoreStep3Request.php`
- `app/Http/Requests/Vendor/UploadDocumentRequest.php`
- `app/Models/DocumentType.php`
- `app/Services/ComplianceService.php`
- `app/Services/DocumentTypeUsage.php`
- `app/Services/DraftDocumentValidator.php`
- `app/Services/ReportService.php`
- `app/Services/SystemMasterDataService.php`
- `app/Services/VendorLifecycleService.php`
- `app/Services/VendorService.php`
- `app/Support/DocumentUploadRules.php`
- `database/migrations/2026_09_27_000000_protect_document_type_master_data.php`
- `lang/id/validation.php`
- `routes/web.php`
- `tests/Feature/DocumentTypeManagementTest.php`
- `tests/Feature/DocumentExpiryWorkflowTest.php`
- `tests/Feature/VendorOnboardingTest.php`
- `tests/Feature/FullSystemTest.php`
- `resources/js/Components/Sidebar.jsx`
- `resources/js/Pages/Admin/DocumentTypes/Index.jsx`
- `resources/js/Pages/Vendor/Documents.jsx`
- `resources/js/Pages/Vendor/Onboarding/Steps/StepDocuments.jsx`
- `resources/js/i18n/systemMasterData.js`
- `resources/js/i18n/translations.js`
- `tests/Js/systemMasterDataLocalization.test.js`
- `CHANGELOG.md`
- `docs/DOCUMENT_TYPES_IMPLEMENTATION.md`
