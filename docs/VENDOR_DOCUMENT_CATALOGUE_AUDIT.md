# VMS vendor document catalogue audit

Tanggal: 2026-09-30.

## Pemetaan penambahan katalog (sebelum keputusan rename)

Pemeriksaan database lokal dilakukan baca-saja: terdapat tujuh jenis existing (ID 1–7), masing-masing memiliki dua relasi dokumen. Tidak ada migrasi, seeder, unggahan atau perubahan data nyata yang dijalankan. ID jenis baru baru ditentukan database saat penerapan manual.

| Target Indonesia               | Sebelum                                                                                  | Kode sesudah           | Tindakan                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------- |
| Akta Pendirian Perusahaan      | `company_registration` (ID 1) berarti sertifikat pendirian/pendaftaran usaha secara umum | `company_deed`         | Tambah khusus; ID 1 dan dokumennya tetap                            |
| NPWP Perusahaan                | NPWP tersedia, ID 2                                                                      | `gst_certificate`      | Kode/metadata/assignment dipertahankan; label Indonesia disesuaikan |
| NIB OSS                        | NIB tersedia, ID 3                                                                       | `pan_card`             | Kode/metadata/assignment dipertahankan; label Indonesia disesuaikan |
| Surat Domisili                 | Tidak tersedia                                                                           | `domicile_letter`      | Tambah                                                              |
| KTP PIC                        | Tidak tersedia                                                                           | `pic_identity_card`    | Tambah                                                              |
| Surat Keterangan Rekening Bank | `cancelled_cheque` (ID 4) berarti bukti kepemilikan rekening secara umum                 | `bank_account_letter`  | Tambah khusus; ID 4 dan dokumennya tetap                            |
| Portofolio Pengalaman          | Tidak tersedia                                                                           | `experience_portfolio` | Tambah                                                              |
| SIUP / Izin Usaha              | Tidak tersedia                                                                           | `business_license`     | Tambah terpisah dari Akta                                           |
| Sertifikat PKP (jika PKP)      | Tidak tersedia; `gst_certificate` sudah dipakai untuk NPWP                               | `pkp_certificate`      | Tambah terpisah dari NPWP, opsional                                 |

Penambahan dua jenis khusus, tanpa menganggap dokumen lama sebagai Akta/surat bank, mengikuti keputusan pengguna. Katalog baru memiliki 14 jenis; tujuh existing termasuk insurance/NDA/service agreement tetap ada. Tidak ada penggantian kode, pemindahan assignment, penggabungan atau penghapusan jenis.

## Penyesuaian kode canonical — 2026-09-30

Keputusan berikutnya dari pengguna menggantikan pelestarian tiga kode legacy pada fase penambahan katalog. Nama sekarang pada konfigurasi baru adalah:

| Legacy             | Canonical            | Label Indonesia tetap |
| ------------------ | -------------------- | --------------------- |
| `gst_certificate`  | `npwp`               | NPWP Perusahaan       |
| `pan_card`         | `nib_oss`            | NIB OSS               |
| `cancelled_cheque` | `bank_account_proof` | Bukti Rekening Bank   |

Hanya `name` diubah. ID, timestamp, metadata, kewajiban dan relasi tidak berubah. `bank_account_letter` dan `pkp_certificate` tetap jenis terpisah. Ketiga ejaan legacy tetap dikenali dalam terjemahan frontend/backend dan pemeriksaan penggunaan oleh JSON histori/compliance melalui alias read-only; payload dan JSON tersimpan tidak dinormalisasi/ditulis ulang. Migrasi historis dan fixture tes legacy sengaja dipertahankan untuk membuktikan kompatibilitas.

Migrasi tambahan `2026_09_30_000003_rename_legacy_document_type_codes.php` melakukan preflight seluruh pasangan sebelum update, mengunci row, hanya memperbarui `name` pada ID yang sama, serta menghapus cache `document_types_active` setelah commit. Tidak ada cache jenis lain yang ditemukan pada pemanggil runtime yang diaudit. Tidak ada row pengganti, penghapusan, update timestamp, atau perubahan schema. Kode sumber yang hilang tidak dibuat; kondisi sudah direname menjadi no-op. Jika kedua kode ada sebagai record berbeda, atau ada duplicate code, seluruh transaksi ditolak. Collision database nyata belum diperiksa ulang pada fase rename ini; preflight migrasi tetap wajib sebelum penerapan.

Perlindungan immutable pada `DocumentType` dan `SaveDocumentTypeRequest` tidak diubah. Query builder pada migrasi dipakai khusus untuk rename terkontrol, bukan untuk membuka rename melalui CRUD. Bootstrap existing tetap tidak menimpa data; instalasi kosong memakai kode canonical baru.

Jalankan manual setelah meninjau ketiga pasangan kode dan kondisi database:

```sh
php artisan migrate --path=database/migrations/2026_09_30_000003_rename_legacy_document_type_codes.php
```

Jangan menjalankan semua migrasi pending tanpa review. Migrasi penambahan katalog `000002` dan rename `000003` adalah tindakan terpisah; rename tidak mensyaratkan penambahan tujuh jenis telah diterapkan.

Rollback `down()` melakukan pemetaan terbalik pada row/ID yang sama dengan preflight collision yang identik. Snapshot sebelum/sesudah wajib dibandingkan; row canonical yang dibuat sesudah deployment juga dapat berubah ke kode legacy saat rollback, tanpa menghapus assignment. Jika kode lama telah dipakai row lain, rollback berhenti tanpa perubahan. Jangan melakukan rollback seluruh batch karena migrasi lain memiliki batas rollback berbeda. Untuk rollback khusus, gunakan prosedur deployment yang memanggil hanya `down()` migrasi rename setelah review, atau rename balik manual dalam transaksi dengan preflight seluruh pasangan. Agen tidak menjalankan rollback atau operasi data nyata.

Verifikasi fase rename: seluruh 240 tes PHP/1627 assertions dan 103 tes Node lulus. Koneksi tes dibuktikan uncached SQLite `:memory:` dengan mail/cache/session array dan queue sync. Enam tes `DocumentTypeCodeRenameTest` mencakup snapshot seluruh kolom selain name, ID/dokumen historis/draft/JSON tetap, idempotensi, cache setelah commit, collision semua pasangan, rollback collision, tidak membuat row hilang, perlindungan referensi nama legacy/canonical, kedua alur upload, validasi draft submission, filter admin dan feedback NIB bilingual, serta kesetaraan compliance dan activation readiness. Tes existing membuktikan bootstrap canonical serta penolakan rename lewat CRUD. Sintaks PHP, Pint, Prettier, lint, build Vite ke `/private/tmp/vms-code-rename-build-20260930` dan `git diff --check` lulus. Browser terhubung tidak tersedia. Rename nyata dan concurrency MySQL belum diuji; hanya koneksi terisolasi yang dimutasi.

File yang berubah khusus fase rename: `database/data/system_master_data.php`, migrasi `000003`, `app/Support/DocumentTypeCode.php`, `app/Http/Controllers/DocumentController.php`, `app/Services/DocumentTypeUsage.php`, `resources/js/i18n/systemMasterData.js`, `lang/en/master_data.php`, `lang/id/master_data.php`, `tests/Feature/DocumentTypeCodeRenameTest.php`, `tests/Feature/DocumentTypeManagementTest.php`, `tests/Js/documentTypeLocalization.test.js`, dokumen audit ini dan `CHANGELOG.md`. Perubahan fase katalog sebelumnya tetap dipertahankan.

## Metadata dan batas bisnis

Semua tujuh jenis baru aktif, opsional (`is_mandatory=false`), tanpa expiry (`has_expiry=false`, warning 0), ekstensi PDF/JPG/JPEG/PNG, maksimum 10 MB mengikuti schema dan `DocumentUploadRules`. Tidak ada masa berlaku khusus yang diasumsikan. Enam kewajiban bawaan lama tidak berubah; konfigurasi admin existing tetap authoritative.

Tidak ditemukan field/aturan PKP dalam model, migrasi, layanan atau frontend yang diperiksa. PKP disediakan dengan label/deskripsi bilingual yang menyatakan opsional. **Enforcement wajib hanya bagi vendor PKP belum tersedia**; tidak ada status/field PKP baru. Penentuan kebijakan wajib/expiry baru memerlukan keputusan bisnis terpisah.

## Relasi dan pemanggil yang diperiksa

- `database/migrations/2026_01_12_000003_create_documents_tables.php:16`: schema jenis dokumen; FK `vendor_documents.document_type_id` membatasi penghapusan jenis yang digunakan.
- `app/Models/VendorDocument.php:58`: relasi `documentType()` melalui ID. `DocumentType::documents()` menggunakan FK existing.
- `app/Services/SystemMasterDataService.php:93`: bootstrap hanya saat tabel kosong, dengan marker `master_data_initializations`. Menambah konfigurasi saja tidak mengubah instalasi existing; perilaku ini dipertahankan.
- `app/Http/Controllers/VendorController.php:94`: pilihan upload bersumber dari jenis aktif dan cache `document_types_active`, urutan `display_name` existing dipertahankan.
- `app/Http/Controllers/VendorOnboardingController.php:43`: daftar onboarding dari master; draft/submission memakai `document_type_id`.
- `app/Services/VendorService.php:140`: penyimpanan draft mempertahankan ID; submission menyalin dokumen/version melalui ID yang sama.
- `app/Support/DocumentUploadRules.php:20`: kedua alur menggunakan aturan file per jenis, batas global 10 MB dan aturan expiry existing.
- `app/Services/DraftDocumentValidator.php:19`, `app/Services/ComplianceService.php:196`, `app/Services/VendorLifecycleService.php:184`: kewajiban berdasarkan master aktif/mandatory; penambahan jenis opsional tidak memperluas syarat.
- `app/Http/Controllers/DocumentController.php:23`: filter memakai ID, kombinasi status/search/pagination dan pilihan active/history tetap sama. `documentTypeLabel()` memakai kode dan label baseline untuk feedback bilingual, dengan label custom verbatim.
- `resources/js/Pages/Vendor/Onboarding/Steps/StepDocuments.jsx:220`: label dan deskripsi memakai resolver master. Upload vendor/admin dan halaman master memakai resolver yang sama. Tidak ada daftar jenis baru yang di-hardcode dalam halaman.
- `routes/web.php:86`, `routes/web.php:219`: endpoint upload/master existing; route, request, policy, ownership dan permission tidak diubah.

## Penerapan manual untuk database existing

1. Review kode/label jenis existing sebelum penerapan. Jika salah satu kode baru sudah digunakan untuk makna berbeda, selesaikan pemetaan secara manual terlebih dahulu. Migrasi mempertahankan record dengan kode yang sudah ada tanpa mengubah label, kebijakan atau statusnya; itu tidak membuktikan kesetaraan semantik.
2. Pastikan schema pengelolaan jenis dokumen existing tersedia, terutama unique code dan marker bootstrap. Jangan menjalankan semua migrasi pending tanpa review.
3. Jalankan hanya migrasi tambahan:

    ```sh
    php artisan migrate --path=database/migrations/2026_09_30_000002_extend_vendor_document_catalogue.php
    ```

4. Migrasi bersifat idempotent, menyisipkan hanya kode baru yang belum ada, dan menghapus cache `document_types_active` sesudah commit. Tabel kosong dibiarkan untuk bootstrap instalasi baru. Jangan mengulang seeder/master sync untuk menimpa record existing.
5. Verifikasi ID/assignment/draft/histori existing tetap sama, kode baru unik dan opsional, serta pilihan muncul pada upload/onboarding/master dan filter admin. Jangan mengharapkan dokumen existing pindah ke jenis baru.

Rollback otomatis ditolak karena jenis dapat memperoleh dokumen/draft setelah deployment. Jangan menghapus row baru atau mengembalikan snapshot tanpa audit relasi. Revert label tampilan saja tidak menghapus data; pemulihan data memerlukan prosedur terpisah.

## Verifikasi

Tes regresi baru mencakup bootstrap 14 jenis, kewajiban lama tetap enam, idempotensi, pelestarian metadata custom/ID/dokumen historis/draft, invalidasi cache, rollback terproteksi, tujuh jenis baru pada kedua alur upload dan filter admin, serta kesetaraan hasil validasi draft/compliance/activation sebelum dan sesudah penambahan opsional. Tes frontend mencakup sembilan label target, deskripsi PKP bilingual dan pelestarian label/deskripsi admin.

Hasil aktual: 25 tes dokumen terarah/332 assertions dan seluruh suite PHP 234 tes/1581 assertions lulus. Konfigurasi diperiksa sebelum tes: uncached, SQLite `:memory:`, mail/cache/session array dan queue sync. Seluruh 102 tes Node, lint, sintaks PHP, Pint, Prettier dan `git diff --check` lulus. Build Vite berhasil ke `/private/tmp/vms-catalogue-build-20260930`, tanpa mengedit build aplikasi. Browser terhubung tidak tersedia, sehingga verifikasi visual tidak dilakukan. Penerapan migrasi data pada MySQL nyata belum dilakukan; inspeksi database nyata hanya baca-saja.

## File berubah

- `database/data/system_master_data.php`
- `database/migrations/2026_09_30_000002_extend_vendor_document_catalogue.php`
- `resources/js/i18n/systemMasterData.js`, `resources/js/i18n/translations.js`
- `lang/en/master_data.php`, `lang/id/master_data.php`
- `tests/Feature/DocumentTypeManagementTest.php`, `tests/Feature/DocumentVerificationWorkflowTest.php`
- `tests/Js/documentTypeLocalization.test.js`, `tests/Js/complianceDetails.test.js`, `tests/Js/systemMasterDataLocalization.test.js`
- `docs/VENDOR_DOCUMENT_CATALOGUE_AUDIT.md`, `CHANGELOG.md`
