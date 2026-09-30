# Audit dan integrasi RBAC VMS

Tanggal: 2026-09-30.

## Status

CRUD pengguna staff, CRUD role staff, matriks permission, katalog permission, dan integrasi Spatie sudah diimplementasikan dalam kode. Pemeriksaan baca-saja pada 2026-09-30 menemukan schema Spatie sudah tersedia pada database lokal, tetapi assignment legacy tidak terbaca akibat `model_type` yang kehilangan backslash. **Migrasi koreksi tambahan masih harus dijalankan manual sebelum akses dapat pulih.** Tidak ada migrasi/seeder/operasi perubahan data pada database lokal, QA, atau produksi yang dijalankan oleh agen. Migrasi dalam tes hanya berjalan pada SQLite `:memory:` yang telah diverifikasi.

Pengguna menyetujui instalasi dependency dan pemetaan berdasarkan akses endpoint efektif sebelum perubahan. Semua perubahan worktree sebelumnya, termasuk tema filter Dokumen/Pembayaran, dipertahankan.

## Dependency dan sumber

- `spatie/laravel-permission` **6.25.0**, constraint `^6.0`. Dry-run dan instalasi aktual masing-masing menghasilkan satu paket baru, nol update, nol penghapusan dependency lain. Script Composer tidak dijalankan.
- [Manifest resmi versi 6.25.0](https://github.com/spatie/laravel-permission/blob/6.25.0/composer.json) mendukung PHP `^8.0` dan Illuminate 12, sesuai PHP `^8.2` / Laravel `^12.0` proyek.
- [Konfigurasi resmi paket](https://github.com/spatie/laravel-permission/blob/6.25.0/config/permission.php) menjadi acuan pemetaan tabel/kolom. Provider didaftarkan eksplisit di `bootstrap/providers.php`; konfigurasi aplikasi berada di `config/permission.php`.
- Dry-run/instalasi melaporkan satu advisory pada satu paket. **Identitas/advisory belum terverifikasi**: `composer audit --locked --format=json --no-interaction` gagal mengakses endpoint security advisories karena DNS/connection timeout, termasuk setelah diberikan akses jaringan di luar sandbox. Jangan menyimpulkan advisory berasal dari Spatie atau audit dependency bersih. Ulangi `composer audit --locked` ketika jaringan tersedia; perubahan dependency untuk remediasi memerlukan penilaian terpisah.

## Matriks sebelum/sesudah

"Boleh" berarti lolos pembatasan role/permission, bukan jaminan transaksi bisnis berhasil. Matriks sebelum berasal dari penelusuran route/Gate/policy/UI pada worktree sebelum integrasi, bukan database aktual. Matriks sesudah berlaku bagi role bawaan setelah migrasi; permission role tetap dapat dikelola super admin sesudahnya.

| Endpoint/aksi                                                       | Sebelum: Ops | Sebelum: Finance | Sesudah: Ops | Sesudah: Finance | Permission operasional                                          |
| ------------------------------------------------------------------- | ------------ | ---------------- | ------------ | ---------------- | --------------------------------------------------------------- |
| Dashboard                                                           | Boleh        | Boleh            | Boleh        | Boleh            | `staff.dashboard.view`, `staff.dashboard.summary`               |
| Vendor list/detail                                                  | Boleh        | Boleh            | Boleh        | Boleh            | `staff.vendors.view`                                            |
| Approve/reject/activate/suspend/terminate/reactivate/catatan vendor | Boleh        | Ditolak          | Boleh        | Ditolak          | `staff.vendors.approve/reject/activate/suspend/terminate/notes` |
| Pembayaran list/detail                                              | Boleh        | Boleh            | Boleh        | Boleh            | `staff.payments.view`                                           |
| Validasi Ops pembayaran (approve/reject)                            | Boleh        | Ditolak          | Boleh        | Ditolak          | `staff.payments.validate`                                       |
| Approval Finance (approve/reject), mark paid                        | Ditolak      | Boleh            | Ditolak      | Boleh            | `staff.payments.approve`, `staff.payments.disburse`             |
| Dokumen list/preview admin, verify/reject                           | Boleh        | Ditolak          | Boleh        | Ditolak          | `staff.documents.list/view/verify/reject`                       |
| Dokumen privat melalui route bersama                                | Boleh        | Boleh            | Boleh        | Boleh            | `staff.documents.view`                                          |
| Compliance admin, evaluasi                                          | Boleh        | Ditolak          | Boleh        | Ditolak          | `staff.compliance.access/evaluate`                              |
| Performance, rate                                                   | Boleh        | Ditolak          | Boleh        | Ditolak          | `staff.performance.view/rate`                                   |
| Semua laporan dan export                                            | Boleh        | Boleh            | Boleh        | Boleh            | `staff.reports.view/export`                                     |
| System Health                                                       | Boleh        | Boleh            | Boleh        | Boleh            | `staff.system.health`                                           |
| Messages, broadcast notification admin                              | Boleh        | Ditolak          | Boleh        | Ditolak          | `staff.messages.manage`, `staff.notifications.send`             |
| Master Data, Audit Logs, edit compliance rules, RBAC management     | Ditolak      | Ditolak          | Ditolak      | Ditolak          | Tetap super admin saja                                          |

Super admin tetap mempunyai bypass Gate/role yang sudah ada. Vendor tetap memakai pembatasan jenis akun, ownership, status, dan alur `/vendor/*`; permission staff tanpa role berscope staff tidak memberikan akses admin. Role custom baru memperoleh kemampuan hanya dari pilihan permission operasional. Role kosong tetap dikenali sebagai staff, tetapi tidak dapat membuka endpoint modul yang tidak diizinkan.

Katalog runtime dan baseline bawaan tersedia di `config/rbac.php`. Route aktif memakai `staff.permission:<kemampuan>` di `routes/web.php`; helper `User::staffCan()` memetakan kemampuan tersebut ke kode `staff.*` melalui Spatie. Alias middleware `role` lama tetap menerima nama role dipisahkan koma dan mempertahankan bypass super admin.

## Penanganan konflik lama

`database/data/system_master_data.php` berisi array `roles`, `permissions`, dan `role_permissions`, bukan tabel bernama demikian. Tabel aktual tetap `roles`, `permissions`, `permission_role`, dan `role_user`.

Finance sebelumnya memiliki konfigurasi `documents.view`/`compliance.view` tetapi ditolak pada list/preview admin Dokumen dan Compliance. Ops sebelumnya dapat export laporan dan validasi pembayaran meskipun permission tersebut tidak tercantum dalam mapping lama. Karena enforcement terdahulu banyak memakai nama role, **semua capability staff baru menggunakan namespace `staff.*`**. Ini mencegah assignment lama yang tidak efektif tiba-tiba menjadi aktif.

Permission/assignment lama tidak dihapus atau diubah kodenya. Katalog menandai entri di luar katalog operasional sebagai legacy/protected dan tidak selectable. Vendor masih menggunakan assignment lama untuk identitas/alur akun. `users.manage`/`roles.manage` lama tidak membuka pengelolaan RBAC kepada role custom. Metadata role custom ditampilkan verbatim.

`SystemMasterDataService::syncRolesAndPermissions()` kini create-if-missing. Bootstrap capability hanya diberikan kepada role bawaan yang baru dibuat; metadata/grant role yang sudah ada tidak ditimpa. Bootstrap akun staff default tidak mengubah identitas atau memulihkan assignment akun yang sudah ada.

## Temuan audit dan hasil perbaikan

| ID      | Prioritas awal           | Bukti implementasi                                                                                                                     | Hasil                                                                                                                                                                            |
| ------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RBAC-01 | Tinggi                   | `app/Traits/HasRoles.php`; `StaffPermissionMiddleware.php`; `routes/web.php`; policy Vendor/Document/Payment; `AppServiceProvider.php` | Staff scope eksplisit, capability melalui Spatie, role custom berfungsi pada endpoint/policy/Gate                                                                                |
| RBAC-02 | Tinggi                   | `config/rbac.php`; `2026_09_30_000000_integrate_spatie_rbac.php`; `RbacMigrationTest.php`                                              | Namespace terpisah mempertahankan assignment legacy dan batas Finance/Ops yang efektif                                                                                           |
| RBAC-03 | Tinggi                   | `config/rbac.php`; `resources/js/Components/Sidebar.jsx`; `HandleInertiaRequests.php`                                                  | Katalog terhubung ke route/Gate/policy; menu, flags aksi, dan tujuan dashboard mengikuti kemampuan                                                                               |
| RBAC-04 | Tinggi                   | `SystemMasterDataService.php:53`; `Role.php`; tes bootstrap                                                                            | Sinkronisasi tidak menghapus pivot atau menimpa label/pengaturan role existing                                                                                                   |
| RBAC-05 | Sedang                   | `HandleInertiaRequests.php:21`; `:71`; `RbacService::clearUserCaches/locked`                                                           | Props otorisasi dihitung segar pada setiap request; relasi actor direset; cache lama setiap pengguna terdampak dan cache Spatie dibersihkan setelah commit                       |
| RBAC-06 | Tinggi                   | `RbacService::locked/assertNotLastAdmin`; `ProfileController::destroy`; `AccountDeletionService`                                       | CRUD transactional; perubahan admin terakhir diserialisasi lewat row super_admin yang dilindungi; penghapusan profil memakai guard yang sama; histori dan audit tetap dilindungi |
| RBAC-07 | Sedang                   | `StaffUserController`; `StaffRoleController`; `SaveStaffUserRequest`; `SaveStaffRoleRequest`; `Admin/Staff/Index.jsx`                  | Tabs Pengguna/Role/Permission, multi-role assignment, kode immutable, guard/scope/ID validation dan perlindungan role terpakai/bawaan                                            |
| RBAC-08 | Tinggi untuk subset role | `Admin/DashboardController.php`; `Admin/Dashboard.jsx`; tes dashboard                                                                  | Role dengan dashboard biasa hanya menerima data modul yang boleh dilihat; permission ringkasan lintas modul terpisah mempertahankan tampilan role bawaan                         |

Tes langsung mencakup denial role custom/vendor, role/permission invalid, guard berbeda, multi-role, role terpakai, penghapusan berhistori, admin terakhir, revocation dua pengguna dengan cache lama, bootstrap, dan preservation migrasi. Permission yang diberikan tidak melewati pemeriksaan status transisi vendor dan ownership vendor.

### Batas capability yang perlu dipahami

- `staff.dashboard.summary` memberikan statistik dan daftar ringkasan lintas modul serta activity yang sebelumnya tersedia bagi role bawaan. Pilih permission ini hanya bila akses ringkasan luas memang diperlukan. `staff.dashboard.view` sendiri tidak membuka semua data tersebut.
- `staff.reports.view` mencakup seluruh jenis laporan existing; `staff.reports.export` mencakup export existing. Granularitas per jenis laporan tidak ditambahkan.
- `staff.vendors.view` mencakup detail vendor existing; `staff.vendors.notes` juga mengatur ringkasan identitas terlindung yang sebelumnya khusus Ops.
- Approval/rejection pembayaran tetap satu endpoint per tahap; permission approve Finance mengizinkan approve/reject pada tahap tersebut. Tidak mengubah alur pembayaran.
- Penerima notifikasi terjadwal dan notifikasi pengajuan vendor masih mengikuti routing role bawaan existing; ini bukan pembatasan akses endpoint. Distribusi email tidak diperluas otomatis ke role custom. Pemilih penerima staff pada broadcast sudah mencakup role berscope staff.
- Role legacy yang tidak termasuk role bawaan tetap `is_staff=false` untuk menghindari perubahan akses tanpa review. Ditampilkan pada bagian Legacy Roles. Assignmentnya tidak hilang; klasifikasi sebagai staff memerlukan review manual.
- Akun campuran vendor/staff tetap mempertahankan assignment dan akses sebelumnya; tidak bisa diedit/dihapus melalui CRUD staff sampai direview manual.
- Penghapusan akun berhistori, termasuk audit yang merujuk akun, ditolak. Audit creation/update staff dipertahankan sehingga akun yang sudah memiliki histori audit tidak bisa dihapus melalui CRUD.

## Schema, deployment, dan langkah manual

Migrasi baru: `database/migrations/2026_09_30_000000_integrate_spatie_rbac.php`. Migrasi lama tidak diedit. Pemetaan:

| Struktur                | Perlakuan                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `roles`, `permissions`  | ID/kode/metadata existing dipertahankan; tambah `guard_name=web`; role mempunyai `is_staff`                                      |
| `permission_role`       | Pivot Spatie role-permission; seluruh grant legacy dipertahankan; tambah grant `staff.*` sesuai baseline endpoint yang disetujui |
| `role_user`             | Tetap pivot assignment tunggal; `user_id` menjadi morph key Spatie; tambah `model_type` sesuai morph class User                  |
| `model_has_permissions` | Schema direct-permission Spatie, kosong saat migrasi; tidak ada UI assignment langsung                                           |

Konfigurasi hanya mendukung User dan guard web. PK/FK legacy dipertahankan; jangan memakai konfigurasi ini untuk model polymorphic lain atau guard baru tanpa schema/review tambahan. Tidak ada pivot aktif kedua, snapshot dual-write, atau penggantian ID.

Preflight dalam migrasi memeriksa tabel legacy, konversi parsial, assignment yatim, dan collision namespace operasional sebelum DDL. Collision `staff.*` atau schema parsial menghentikan migrasi. SQLite memory tests membuktikan ID/metadata/pivot lama tetap ada dan batas Finance tetap sama. DDL koreksi belum dijalankan pada MySQL aktual.

### Koreksi akses superadmin — 2026-09-30

Pemeriksaan baca-saja menemukan config tidak dicache, tabel assignment `role_user`, role `super_admin` dengan `guard_name=web` dan `is_staff=1`, tetapi seluruh nilai distinct `role_user.model_type` adalah `AppModelsUser`. Spatie memakai morph class `App\Models\User`; relasi roles kosong menyebabkan `isStaff()`/middleware dashboard menolak akses. Sumber kesalahan adalah default string pada migrasi awal: MySQL mengonsumsi backslash pada literal DDL biasa. Ini bukan pencabutan role atau permission.

Migrasi tambahan `database/migrations/2026_09_30_000001_repair_rbac_user_morph_type.php` memperbaiki default MySQL memakai literal hex dan memperbaiki nilai yang rusak dengan parameter binding. ID akun/role, pasangan assignment, grant, serta histori dipertahankan. Model type di luar tipe User yang benar dan tipe rusak yang diketahui menghentikan migrasi sebelum perubahan. Migrasi awal yang sudah diterapkan tidak diedit. Tes `RbacMigrationTest::test_morph_repair_restores_legacy_super_admin_without_changing_assignments` mereproduksi penolakan lalu membuktikan pemulihan pengenalan superadmin, permission dashboard dan redirect `/dashboard`; tes kedua melindungi tipe model yang tidak dikenal. Login browser dan penerapan koreksi pada database nyata belum diverifikasi.

Tes HTTP `RbacManagementTest::test_morph_repair_restores_super_admin_dashboard_access` membuktikan `/admin/dashboard` berubah dari 403 menjadi 200 setelah koreksi. Kompilasi SQL default MySQL diuji tanpa koneksi database nyata. Verifikasi ulang konfigurasi membuktikan config uncached, SQLite `:memory:`, mail/cache/session array dan queue sync; seluruh suite PHP lulus 229 tes/1517 assertions, termasuk 22 tes RBAC/185 assertions. PHP syntax, Pint, Prettier dokumen dan `git diff --check` lulus. Tidak ada perubahan frontend pada koreksi ini; lint frontend, tes Node dan build tidak diulang.

Urutan manual:

1. Review diff dan kondisi schema aktual. Catat jumlah roles, permissions, role_user, permission_role serta seluruh assignment legacy. Pastikan guard web/User morph map sesuai dan tidak ada kode `staff.*` existing yang perlu direkonsiliasi. Tentukan waktu deployment yang menghentikan write/request RBAC sementara.
2. Siapkan prosedur pemulihan menurut kebijakan deployment Anda. Tidak ada backup otomatis yang dijalankan oleh agen. Jika DDL MySQL gagal di tengah, jangan mencoba rollback/reset atau menghapus kolom/pivot; rekonsiliasi schema parsial dengan data yang tercatat.
3. Terapkan dependency/code yang konsisten dengan lockfile. Jalankan `php artisan config:clear` secara manual jika deployment memakai config cache lama.
4. Jalankan **hanya migrasi RBAC ini**, agar migrasi pending lain tidak berjalan tanpa review:

    ```sh
    php artisan migrate --path=database/migrations/2026_09_30_000000_integrate_spatie_rbac.php
    ```

    Setelah schema awal tersedia, jalankan migrasi koreksi berikut. Untuk database lokal yang sudah memiliki schema awal, cukup jalankan migrasi koreksi ini; jangan mengulang konversi awal secara langsung:

    ```sh
    php artisan migrate --path=database/migrations/2026_09_30_000001_repair_rbac_user_morph_type.php
    ```

5. Setelah berhasil, jalankan `php artisan permission:cache-reset` dan bangun ulang cache konfigurasi sesuai kebijakan deployment. Tidak perlu menjalankan seeder atau bootstrap akun default untuk konversi data existing.
6. Verifikasi jumlah/ID/metadata role dan assignment user tetap sama; grant legacy role-permission harus tetap ada, ditambah baseline `staff.*`. Verifikasi Ops export/validate payment, Finance deny list Dokumen/Compliance, Finance akses file privat bersama, dan super admin CRUD.
7. Uji role custom pada environment terisolasi sebelum deployment produksi. Browser CRUD tidak boleh diuji dengan akun atau assignment nyata tanpa izin operasi data.

**Rollback otomatis dinonaktifkan:** `down()` melempar exception. Menjatuhkan schema baru atau mengembalikan snapshot lama setelah admin mengubah assignment dapat kehilangan data. Revert kode juga tidak boleh dilakukan tanpa konversi balik/rekonsiliasi capability `staff.*`; perubahan permission modern tidak direfleksikan pada grant legacy yang diarsipkan. Kompatibilitas data fisik bukan jaminan kesetaraan hak akses.

## File yang diubah pada tugas RBAC

- Dependency: `composer.json`, `composer.lock`.
- Schema/config/bootstrap: migrasi RBAC baru, `config/permission.php`, `config/rbac.php`, `bootstrap/app.php`, `bootstrap/providers.php`, `database/data/system_master_data.php`.
- Model/otorisasi: `Role.php`, `Permission.php`, `app/Traits/HasRoles.php`, policy Vendor/Document/Payment, `AppServiceProvider.php`, `StaffPermissionMiddleware.php`, `HandleInertiaRequests.php`, `routes/web.php`.
- CRUD dan histori: `StaffUserController.php`, `StaffRoleController.php`, `SaveStaffUserRequest.php`, `SaveStaffRoleRequest.php`, adapter `StoreStaffUserRequest.php`, `RbacService.php`, `AccountDeletionService.php`, `ProfileController.php`.
- Integrasi aktif: controller Dashboard/Redirect/SystemHealth/Document/VendorManagement/AdminNotification/RegisteredUser, request SendNotification/StorePerformanceRating/UpdateContactMessage, `SystemMasterDataService.php`.
- UI/i18n: `Admin/Staff/Index.jsx`, `Admin/Staff/Show.jsx`, `Admin/Dashboard.jsx`, `Sidebar.jsx`, `translations.js`, `systemMasterData.js`, `lang/en/alerts.php`, `lang/id/alerts.php`.
- Verifikasi/dokumentasi: `RbacManagementTest.php`, `RbacMigrationTest.php`, `staffLocalization.test.js`, `docs/RBAC_AUDIT.md`, `CHANGELOG.md`.

File lain yang sudah berubah sebelum tugas ini tidak diklaim sebagai implementasi RBAC.

## Verifikasi dan keterbatasan

- Target tes dibuktikan: config tidak cached, driver SQLite, database `:memory:`, mail/cache/session array, queue sync. Migration tests menggunakan koneksi SQLite memory terpisah dan memeriksa targetnya sebelum DDL/data fixture.
- Suite PHP dan regression frontend dijalankan; hasil final dicatat setelah pemeriksaan terakhir di bawah.
- Syntax PHP dan Pint pada file PHP tugas; Prettier pada JS/JSX dan dokumen, lint frontend, build ke `/private/tmp/vms-rbac-build-20260930`, Composer validate, dan diff check.
- Sesi browser yang tersedia melalui alat browser berjumlah nol. Browser CRUD, desktop/mobile, focus modal, dan flow UI end-to-end belum diverifikasi. Tes HTTP memverifikasi CRUD dan otorisasi server.
- `lockForUpdate` dan lock bersama ada pada kode, tetapi SQLite tidak membuktikan perilaku dua request bersamaan pada MySQL. Tes admin terakhir memverifikasi request berurutan; concurrency database nyata tetap perlu diuji pada environment disposable MySQL.
- Advisory dependency belum teridentifikasi akibat timeout. Schema database nyata belum dimigrasikan/divalidasi dan tidak ada klaim production-ready.

## Hasil pemeriksaan terakhir

- Suite PHP: **225 tes, 1.495 assertions lulus**.
- Frontend Node: **98 tes lulus**.
- PHP syntax dan Pint: 39 file PHP tugas lulus.
- Prettier, ESLint, Vite build ke direktori sementara, Composer validate, dan `git diff --check` lulus.
- Audit advisory Composer dan verifikasi browser/concurrency MySQL memiliki keterbatasan seperti dijelaskan di atas.

## Peta bukti kode saat pemeriksaan terakhir

| Lokasi                                                               | Bukti                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------ |
| `app/Http/Middleware/StaffPermissionMiddleware.php:11`               | Pembatasan staff dan capability endpoint                     |
| `app/Traits/HasRoles.php:50`                                         | Adapter capability ke namespace Spatie                       |
| `app/Services/RbacService.php:15`                                    | Lock bersama dan invalidasi cache setelah commit             |
| `app/Services/RbacService.php:42`                                    | Perlindungan admin terakhir                                  |
| `app/Services/AccountDeletionService.php:12`                         | Penolakan penghapusan berhistori                             |
| `app/Http/Controllers/ProfileController.php:75`                      | Jalur penghapusan profil memakai lock dan guard yang sama    |
| `app/Http/Middleware/HandleInertiaRequests.php:21`                   | Reset relasi otorisasi pada awal request                     |
| `app/Services/SystemMasterDataService.php:53`                        | Bootstrap yang tidak menimpa assignment existing             |
| `database/migrations/2026_09_30_000000_integrate_spatie_rbac.php:10` | Preflight dan konversi schema/pivot                          |
| `tests/Feature/RbacManagementTest.php:150`                           | Bukti HTTP pencabutan akses pada dua pengguna role yang sama |
