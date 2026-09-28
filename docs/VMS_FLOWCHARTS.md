# Flowchart Proses VMS

## Tujuan

Dokumen ini memetakan proses aktif pada VMS (Vendor Management System) berdasarkan implementasi aplikasi. Diagram menggunakan Mermaid `flowchart`, konvensi diagram alir standar, dan swimlane logis. Diagram ini bukan notasi BPMN formal.

## Ruang Lingkup dan Dasar Verifikasi

- Tanggal verifikasi kode: 2026-09-24.
- Cakupan: autentikasi dan pembatasan akses, alur per peran, pendaftaran awal, alur status vendor, dokumen dan kepatuhan, serta performa.
- Batas aplikasi: proses pembayaran dan peran `finance_manager` tidak termasuk dokumentasi VMS karena digunakan pada aplikasi berbeda.
- Sumber kebenaran: rute aktif, middleware, kelas Form Request, policy/Gate, controller, service, model, penjadwal, dan halaman Inertia.
- Perilaku backend menjadi acuan apabila kontrol UI dan aturan server berbeda.
- Identitas, rekening, kredensial, dan data manual vendor tidak ditampilkan dalam dokumen ini.

## Aktor

| Aktor               | Tanggung jawab yang terverifikasi                                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pengunjung          | Membuka halaman publik, mendaftar sebagai vendor, masuk, dan meminta reset kata sandi.                                                                                      |
| Vendor              | Memverifikasi email, menyelesaikan pendaftaran awal, mengelola profil dan dokumen, serta melihat kepatuhan, performa, dan notifikasi.                                       |
| Manajer Operasional | Meninjau vendor, mengelola alur status vendor, memverifikasi dokumen, menjalankan evaluasi kepatuhan, memberi penilaian performa, mengelola pesan, dan mengirim notifikasi. |
| Administrator Utama | Memperoleh seluruh kewenangan staf melalui `Gate::before`, termasuk pengelolaan aturan kepatuhan dan pengguna staf.                                                         |
| Penjadwal           | Menjalankan evaluasi kepatuhan harian, pemeriksaan kedaluwarsa dokumen, dan perhitungan ulang performa bulanan.                                                             |

## Legenda

| Bentuk atau gaya    | Arti                                               |
| ------------------- | -------------------------------------------------- |
| Stadium `([…])`     | Awal atau akhir proses.                            |
| Kotak `[…]`         | Aktivitas atau perubahan data.                     |
| Belah ketupat `{…}` | Keputusan dengan cabang berlabel.                  |
| Kotak biru          | Proses normal.                                     |
| Kotak kuning        | Keputusan atau kondisi yang memerlukan perhatian.  |
| Kotak merah         | Penolakan, kegagalan, atau akses dihentikan.       |
| Kotak hijau         | Hasil berhasil atau status terminal yang berhasil. |
| Garis putus-putus   | Pemicu terjadwal atau hubungan pendukung.          |

## 1. Konteks Tingkat Tinggi

```mermaid
flowchart LR
    C_START([Akses VMS])

    subgraph C_PUBLIC[Area Publik]
        C_VISITOR[Pengunjung]
        C_AUTH[Registrasi, masuk, dan atur ulang kata sandi]
    end

    subgraph C_VENDOR[Area Vendor]
        C_ONBOARD[Pendaftaran awal]
        C_VDOC[Dokumen dan kepatuhan]
        C_VPERF[Performa]
        C_VNOTIFY[Notifikasi]
    end

    subgraph C_OPS[Manajer Operasional]
        C_REVIEW[Peninjauan dan alur status vendor]
        C_DOC_REVIEW[Verifikasi dokumen]
        C_COMPLIANCE[Evaluasi kepatuhan]
        C_RATE[Penilaian performa]
        C_MESSAGE[Pesan dan notifikasi]
    end

    subgraph C_ADMIN[Administrator Utama]
        C_ALL[Seluruh kewenangan staf]
        C_RULES[Kelola aturan kepatuhan dan pengguna staf]
    end

    subgraph C_SYSTEM[Sistem]
        C_STORE[(Basis data dan penyimpanan privat)]
        C_SCHEDULE[Penjadwal]
        C_AUDIT[Audit dan riwayat yang tidak dapat diubah]
        C_NOTIFY[Notifikasi]
    end

    C_START --> C_VISITOR --> C_AUTH
    C_AUTH -->|Peran vendor| C_ONBOARD
    C_ONBOARD --> C_REVIEW
    C_REVIEW --> C_VDOC
    C_VDOC --> C_DOC_REVIEW --> C_COMPLIANCE
    C_COMPLIANCE --> C_VNOTIFY
    C_RATE --> C_VPERF
    C_ALL --> C_REVIEW
    C_ALL --> C_DOC_REVIEW
    C_ALL --> C_COMPLIANCE
    C_ALL --> C_RATE
    C_ALL --> C_MESSAGE
    C_RULES --> C_COMPLIANCE
    C_ONBOARD --> C_STORE
    C_VDOC --> C_STORE
    C_SCHEDULE -.-> C_COMPLIANCE
    C_SCHEDULE -.-> C_VDOC
    C_SCHEDULE -.-> C_VPERF
    C_REVIEW --> C_AUDIT
    C_DOC_REVIEW --> C_AUDIT
    C_ONBOARD --> C_NOTIFY
    C_VDOC --> C_NOTIFY

    classDef process fill:#dbeafe,stroke:#2563eb,color:#172554
    classDef decision fill:#fef3c7,stroke:#d97706,color:#451a03
    classDef success fill:#dcfce7,stroke:#16a34a,color:#052e16
    class C_AUTH,C_ONBOARD,C_VDOC,C_VPERF,C_VNOTIFY,C_REVIEW,C_DOC_REVIEW,C_COMPLIANCE,C_RATE,C_MESSAGE,C_ALL,C_RULES,C_SCHEDULE,C_AUDIT,C_NOTIFY process
    class C_STORE success
```

## 2. Alur Peran Vendor

Diagram ini hanya memuat tindakan yang tersedia melalui rute `role:vendor`, controller vendor, dan navigasi vendor selain modul pembayaran yang berada di luar batas aplikasi.

```mermaid
flowchart TD
    RV_START([Pengguna dengan peran vendor])

    subgraph RV_ACCESS[Akses]
        RV_LOGIN[Masuk]
        RV_ACCOUNT{Status akun mengizinkan akses?}
        RV_EMAIL{Email terverifikasi?}
        RV_DENIED[Akses dihentikan atau diarahkan ke verifikasi]
    end

    subgraph RV_ONBOARDING[Pendaftaran Awal]
        RV_PROFILE_EXISTS{Profil vendor tersedia?}
        RV_ONBOARD[Isi data perusahaan, bank, dan dokumen]
        RV_SUBMIT[Kirim aplikasi vendor]
        RV_WAIT[Tunggu peninjauan Manajer Operasional]
    end

    subgraph RV_PORTAL[Portal Vendor]
        RV_DASH[Melihat dasbor]
        RV_PROFILE[Mengelola field profil yang diizinkan]
        RV_DOC[Melihat dan mengunggah versi dokumen]
        RV_COMPLIANCE[Melihat status dan hasil kepatuhan terbaru]
        RV_PERFORMANCE[Melihat skor dan riwayat performa]
        RV_NOTIFICATION[Melihat dan menandai notifikasi telah dibaca]
        RV_LOGOUT[Keluar]
    end

    RV_START --> RV_LOGIN --> RV_ACCOUNT
    RV_ACCOUNT -->|Tidak| RV_DENIED
    RV_ACCOUNT -->|Ya| RV_EMAIL
    RV_EMAIL -->|Tidak| RV_DENIED
    RV_EMAIL -->|Ya| RV_PROFILE_EXISTS
    RV_PROFILE_EXISTS -->|Tidak atau berstatus draft| RV_ONBOARD --> RV_SUBMIT --> RV_WAIT
    RV_PROFILE_EXISTS -->|Ya| RV_DASH
    RV_WAIT --> RV_DASH
    RV_DASH --> RV_PROFILE
    RV_DASH --> RV_DOC
    RV_DASH --> RV_COMPLIANCE
    RV_DASH --> RV_PERFORMANCE
    RV_DASH --> RV_NOTIFICATION
    RV_PROFILE --> RV_LOGOUT
    RV_DOC --> RV_LOGOUT
    RV_COMPLIANCE --> RV_LOGOUT
    RV_PERFORMANCE --> RV_LOGOUT
    RV_NOTIFICATION --> RV_LOGOUT

    classDef process fill:#dbeafe,stroke:#2563eb,color:#172554
    classDef decision fill:#fef3c7,stroke:#d97706,color:#451a03
    classDef failure fill:#fee2e2,stroke:#dc2626,color:#450a0a
    classDef success fill:#dcfce7,stroke:#16a34a,color:#052e16
    class RV_LOGIN,RV_ONBOARD,RV_SUBMIT,RV_WAIT,RV_DASH,RV_PROFILE,RV_DOC,RV_COMPLIANCE,RV_PERFORMANCE,RV_NOTIFICATION process
    class RV_ACCOUNT,RV_EMAIL,RV_PROFILE_EXISTS decision
    class RV_DENIED failure
    class RV_LOGOUT success
```

## 3. Alur Peran Manajer Operasional

Kemampuan berikut dibuktikan oleh kelompok rute `role:ops_manager,super_admin`, Gate/policy, izin Inertia bersama, dan item navigasi yang mengizinkan `ops_manager`.

```mermaid
flowchart TD
    RO_START([Pengguna dengan peran ops_manager])

    subgraph RO_ACCESS[Akses]
        RO_LOGIN[Masuk]
        RO_ROLE{RoleMiddleware mengizinkan?}
        RO_DASH[Melihat dasbor admin]
        RO_DENIED[Akses 403 atau dialihkan ke halaman masuk]
    end

    subgraph RO_VENDOR[Pengelolaan Vendor]
        RO_LIST[Melihat daftar dan detail vendor]
        RO_ACTION{Perubahan sesuai status saat ini?}
        RO_APPROVE[Menyetujui vendor]
        RO_REJECT[Menolak dengan alasan]
        RO_ACTIVATE[Mengaktifkan setelah persyaratan kesiapan terpenuhi]
        RO_RESTRICT[Menangguhkan atau menghentikan dengan alasan]
        RO_REACTIVATE[Mengaktifkan kembali vendor terminated ke under_review]
        RO_NOTES[Mengelola catatan internal]
    end

    subgraph RO_OPERATION[Operasional]
        RO_DOCUMENT[Memverifikasi atau menolak dokumen pending]
        RO_COMPLIANCE[Melihat dan menjalankan evaluasi kepatuhan]
        RO_PERFORMANCE[Melihat dan mencatat rating performa]
        RO_MESSAGE[Melihat, memperbarui, atau menghapus pesan kontak]
        RO_NOTIFY[Mengirim notifikasi]
        RO_REPORT[Melihat dan mengekspor laporan non-pembayaran]
        RO_HEALTH[Melihat kesehatan sistem]
    end

    RO_START --> RO_LOGIN --> RO_ROLE
    RO_ROLE -->|Tidak| RO_DENIED
    RO_ROLE -->|Ya| RO_DASH --> RO_LIST --> RO_ACTION
    RO_ACTION -->|Setujui| RO_APPROVE
    RO_ACTION -->|Tolak| RO_REJECT
    RO_ACTION -->|Aktifkan| RO_ACTIVATE
    RO_ACTION -->|Tangguhkan atau hentikan| RO_RESTRICT
    RO_ACTION -->|Aktifkan kembali| RO_REACTIVATE
    RO_ACTION -->|Catatan| RO_NOTES
    RO_DASH --> RO_DOCUMENT
    RO_DASH --> RO_COMPLIANCE
    RO_DASH --> RO_PERFORMANCE
    RO_DASH --> RO_MESSAGE
    RO_DASH --> RO_NOTIFY
    RO_DASH --> RO_REPORT
    RO_DASH --> RO_HEALTH

    classDef process fill:#dbeafe,stroke:#2563eb,color:#172554
    classDef decision fill:#fef3c7,stroke:#d97706,color:#451a03
    classDef failure fill:#fee2e2,stroke:#dc2626,color:#450a0a
    classDef success fill:#dcfce7,stroke:#16a34a,color:#052e16
    class RO_LOGIN,RO_DASH,RO_LIST,RO_APPROVE,RO_REJECT,RO_ACTIVATE,RO_RESTRICT,RO_REACTIVATE,RO_NOTES,RO_DOCUMENT,RO_COMPLIANCE,RO_PERFORMANCE,RO_MESSAGE,RO_NOTIFY,RO_REPORT,RO_HEALTH process
    class RO_ROLE,RO_ACTION decision
    class RO_DENIED failure
```

Manajer Operasional tidak dapat mengelola aturan kepatuhan, melihat log audit, atau mengelola pengguna staf karena fungsi tersebut dibatasi untuk `super_admin`.

## 4. Alur Peran Administrator Utama

`Gate::before` memberi Administrator Utama akses terhadap Gate yang terdaftar. Rute khusus Administrator Utama menambahkan log audit, aturan kepatuhan, dan pengelolaan staf di atas kemampuan operasional yang sama dengan Manajer Operasional.

```mermaid
flowchart TD
    RS_START([Pengguna dengan peran super_admin])

    subgraph RS_ACCESS[Akses]
        RS_LOGIN[Masuk]
        RS_ROLE{Peran super_admin terverifikasi?}
        RS_DASH[Melihat dasbor admin]
        RS_DENIED[Akses ditolak]
    end

    subgraph RS_INHERITED[Kapabilitas Operasional]
        RS_VENDOR[Meninjau dan mengubah status vendor]
        RS_DOCUMENT[Memverifikasi atau menolak dokumen]
        RS_COMPLIANCE[Menjalankan evaluasi kepatuhan]
        RS_PERFORMANCE[Mencatat rating performa]
        RS_MESSAGE[Mengelola pesan kontak]
        RS_NOTIFY[Mengirim notifikasi]
        RS_REPORT[Melihat dan mengekspor laporan non-pembayaran]
        RS_HEALTH[Melihat kesehatan sistem]
    end

    subgraph RS_EXCLUSIVE[Kapabilitas Khusus Administrator Utama]
        RS_AUDIT[Melihat log audit]
        RS_RULE[Memperbarui aturan kepatuhan]
        RS_STAFF[Melihat dan membuat pengguna staf]
    end

    RS_START --> RS_LOGIN --> RS_ROLE
    RS_ROLE -->|Tidak| RS_DENIED
    RS_ROLE -->|Ya| RS_DASH
    RS_DASH --> RS_VENDOR
    RS_DASH --> RS_DOCUMENT
    RS_DASH --> RS_COMPLIANCE
    RS_DASH --> RS_PERFORMANCE
    RS_DASH --> RS_MESSAGE
    RS_DASH --> RS_NOTIFY
    RS_DASH --> RS_REPORT
    RS_DASH --> RS_HEALTH
    RS_DASH --> RS_AUDIT
    RS_DASH --> RS_RULE
    RS_DASH --> RS_STAFF

    classDef process fill:#dbeafe,stroke:#2563eb,color:#172554
    classDef decision fill:#fef3c7,stroke:#d97706,color:#451a03
    classDef failure fill:#fee2e2,stroke:#dc2626,color:#450a0a
    class RS_LOGIN,RS_DASH,RS_VENDOR,RS_DOCUMENT,RS_COMPLIANCE,RS_PERFORMANCE,RS_MESSAGE,RS_NOTIFY,RS_REPORT,RS_HEALTH,RS_AUDIT,RS_RULE,RS_STAFF process
    class RS_ROLE decision
    class RS_DENIED failure
```

## 5. Autentikasi dan Pembatasan Akses

```mermaid
flowchart TD
    A_START([Pengguna membuka VMS])

    subgraph A_UI[Pengunjung atau Pengguna]
        A_CHOICE{Punya akun?}
        A_REGISTER[Isi formulir registrasi vendor]
        A_LOGIN[Isi email dan kata sandi]
        A_VERIFY[Ikuti tautan verifikasi email]
    end

    subgraph A_BACKEND[Backend VMS]
        A_REG_VALID{Data registrasi valid?}
        A_CREATE[Buat pengguna dan tetapkan peran vendor]
        A_CRED{Kredensial valid dan belum dibatasi frekuensinya?}
        A_VENDOR{Peran vendor?}
        A_BLOCKED{Status vendor ditolak, ditangguhkan, atau dihentikan; atau pengguna nonaktif?}
        A_VERIFIED{Email vendor terverifikasi?}
        A_ROLE{Peran staf?}
        A_LOGOUT[Keluar, batalkan sesi, dan buat ulang token]
        A_DENY[Validasi atau autentikasi ditolak]
        A_VERIFY_NOTICE[Kirim terbatas dan tampilkan halaman verifikasi]
        A_VENDOR_DASH[Alihkan ke dasbor vendor]
        A_ADMIN_DASH[Alihkan ke dasbor admin]
    end

    A_START --> A_CHOICE
    A_CHOICE -->|Tidak| A_REGISTER --> A_REG_VALID
    A_REG_VALID -->|Tidak valid| A_DENY
    A_REG_VALID -->|Valid| A_CREATE --> A_VERIFY_NOTICE --> A_VERIFY
    A_CHOICE -->|Ya| A_LOGIN --> A_CRED
    A_CRED -->|Tidak| A_DENY
    A_CRED -->|Ya| A_VENDOR
    A_VENDOR -->|Ya| A_BLOCKED
    A_BLOCKED -->|Ya| A_LOGOUT --> A_DENY
    A_BLOCKED -->|Tidak| A_VERIFIED
    A_VERIFIED -->|Tidak| A_VERIFY_NOTICE
    A_VERIFY -->|Permintaan bertanda tangan valid| A_VENDOR_DASH
    A_VERIFIED -->|Ya| A_VENDOR_DASH
    A_VENDOR -->|Tidak| A_ROLE
    A_ROLE -->|Manajer Operasional atau Administrator Utama| A_ADMIN_DASH
    A_ROLE -->|Peran tidak sesuai rute| A_DENY

    classDef process fill:#dbeafe,stroke:#2563eb,color:#172554
    classDef decision fill:#fef3c7,stroke:#d97706,color:#451a03
    classDef failure fill:#fee2e2,stroke:#dc2626,color:#450a0a
    classDef success fill:#dcfce7,stroke:#16a34a,color:#052e16
    class A_REGISTER,A_LOGIN,A_CREATE,A_VERIFY_NOTICE,A_VERIFY,A_LOGOUT process
    class A_CHOICE,A_REG_VALID,A_CRED,A_VENDOR,A_BLOCKED,A_VERIFIED,A_ROLE decision
    class A_DENY failure
    class A_VENDOR_DASH,A_ADMIN_DASH success
```

Catatan akses:

- Seluruh rute bersama yang terautentikasi melewati `EnsureVendorAccountIsActive` dan `EnsureVendorEmailIsVerified`; pemeriksaan verifikasi email hanya membatasi vendor.
- Saat vendor masuk ke status `rejected`, `suspended`, atau `terminated`, `Vendor::transitionTo()` menonaktifkan pengguna, mengganti token pengingat, dan menghapus sesi berbasis basis data. Middleware juga memutus sesi aktif yang masih mencapai aplikasi.
- Pengaturan ulang kata sandi ditolak untuk vendor `suspended` dan `terminated`; proses masuk dan middleware juga memblokir `rejected`.
- Setelah lolos pemeriksaan bersama, `RoleMiddleware`, policy, dan Gate masih menolak tindakan yang tidak sesuai peran.

## 6. Pendaftaran Awal Vendor

```mermaid
flowchart TD
    O_START([Pengguna vendor sudah masuk dan email terverifikasi])

    subgraph O_VENDOR[Vendor]
        O_OPEN[Buka pendaftaran awal]
        O_STEP1[Isi data perusahaan dan kontak]
        O_STEP2[Isi data bank]
        O_STEP3[Unggah dokumen]
        O_REVIEW[Tinjau data dan kirim]
    end

    subgraph O_BACKEND[Backend VMS]
        O_HAS_VENDOR{Vendor sudah ada dan status bukan draft atau rejected?}
        O_STEP_ALLOWED{Step yang diminta sudah tercapai?}
        O_VALID1{Data tahap 1 valid?}
        O_SAVE1[Simpan tahap 1 pada draf VendorApplication]
        O_HAS1{Step 1 tersedia?}
        O_VALID2{Data tahap 2 valid?}
        O_SAVE2[Simpan tahap 2 pada draf]
        O_PREVIOUS{Step 1 dan Step 2 tersedia?}
        O_VALID3{Berkas, tipe dokumen, dan tanggal kedaluwarsa valid?}
        O_SAVE3[Simpan atau ganti berkas pada penyimpanan privat sementara]
        O_COMPLETE{Semua tahap dan dokumen wajib lengkap?}
        O_EXPIRY{Tanggal kedaluwarsa wajib sudah terisi?}
        O_TX[Transaksi pengiriman aplikasi]
        O_FAIL[Tampilkan kesalahan validasi atau pengiriman]
    end

    subgraph O_SYSTEM[Sistem]
        O_PERSIST[Buat atau perbarui Vendor]
        O_VERSION[Nonaktifkan dokumen current lama dan buat versi current baru berstatus pending]
        O_SUBMITTED[Ubah status ke submitted]
        O_HISTORY[Tambahkan VendorStateLog dan AuditLog]
        O_NOTIFY[Notifikasi Manajer Operasional]
        O_DONE([Dasbor vendor])
    end

    O_START --> O_OPEN --> O_HAS_VENDOR
    O_HAS_VENDOR -->|Ya| O_DONE
    O_HAS_VENDOR -->|Tidak| O_STEP_ALLOWED
    O_STEP_ALLOWED -->|Tidak| O_OPEN
    O_STEP_ALLOWED -->|Ya| O_STEP1 --> O_VALID1
    O_VALID1 -->|Tidak| O_FAIL --> O_STEP1
    O_VALID1 -->|Ya| O_SAVE1 --> O_STEP2 --> O_HAS1
    O_HAS1 -->|Tidak| O_FAIL --> O_STEP1
    O_HAS1 -->|Ya| O_VALID2
    O_VALID2 -->|Tidak| O_FAIL --> O_STEP2
    O_VALID2 -->|Ya| O_SAVE2 --> O_STEP3 --> O_PREVIOUS
    O_PREVIOUS -->|Tidak| O_FAIL --> O_STEP1
    O_PREVIOUS -->|Ya| O_VALID3
    O_VALID3 -->|Tidak| O_FAIL --> O_STEP3
    O_VALID3 -->|Ya| O_SAVE3 --> O_REVIEW --> O_COMPLETE
    O_COMPLETE -->|Tidak| O_FAIL --> O_STEP3
    O_COMPLETE -->|Ya| O_EXPIRY
    O_EXPIRY -->|Tidak| O_FAIL --> O_STEP3
    O_EXPIRY -->|Ya| O_TX --> O_PERSIST --> O_VERSION --> O_SUBMITTED --> O_HISTORY --> O_NOTIFY --> O_DONE

    classDef process fill:#dbeafe,stroke:#2563eb,color:#172554
    classDef decision fill:#fef3c7,stroke:#d97706,color:#451a03
    classDef failure fill:#fee2e2,stroke:#dc2626,color:#450a0a
    classDef success fill:#dcfce7,stroke:#16a34a,color:#052e16
    class O_OPEN,O_STEP1,O_STEP2,O_STEP3,O_REVIEW,O_SAVE1,O_SAVE2,O_SAVE3,O_TX,O_PERSIST,O_VERSION,O_SUBMITTED,O_HISTORY,O_NOTIFY process
    class O_HAS_VENDOR,O_STEP_ALLOWED,O_VALID1,O_HAS1,O_VALID2,O_PREVIOUS,O_VALID3,O_COMPLETE,O_EXPIRY decision
    class O_FAIL failure
    class O_DONE success
```

## Alur Pendaftaran Vendor — Ringkas Berdasarkan Role

```mermaid
flowchart LR
    subgraph R_VENDOR[Vendor]
        direction LR
        R_ACCOUNT[Daftar dan verifikasi email]
        R_COMPANY[Isi informasi perusahaan]
        R_BANK[Isi informasi bank]
        R_DOCUMENTS[Unggah dokumen]
        R_REVIEW[Tinjau data]
        R_COMPLETE{Data lengkap?}
        R_SUBMIT[Kirim pengajuan]
        R_RESULT([Lihat hasil])
    end

    subgraph R_OPS[Operations]
        direction LR
        R_NOTICE[Terima pemberitahuan]
        R_CHECK[Periksa pengajuan]
        R_DECISION{Keputusan?}
        R_REJECT[Tolak dengan alasan]
        R_APPROVE[Setujui pengajuan]
        R_ACTIVATE[Aktifkan setelah syarat terpenuhi]
    end

    subgraph R_ADMIN[Administrator]
        direction LR
        R_ADMIN_SUPPORT[Pantau atau ambil alih]
    end

    R_ACCOUNT --> R_COMPANY --> R_BANK --> R_DOCUMENTS --> R_REVIEW --> R_COMPLETE
    R_COMPLETE -->|Belum| R_COMPANY
    R_COMPLETE -->|Ya| R_SUBMIT --> R_NOTICE --> R_CHECK --> R_DECISION
    R_SUBMIT -.-> R_ADMIN_SUPPORT --> R_CHECK
    R_DECISION -->|Ditolak| R_REJECT --> R_RESULT
    R_DECISION -->|Disetujui| R_APPROVE --> R_ACTIVATE --> R_RESULT

    classDef vendor fill:#dbeafe,stroke:#60a5fa,color:#172554
    classDef operations fill:#dcfce7,stroke:#4ade80,color:#052e16
    classDef administrator fill:#f3e8ff,stroke:#c084fc,color:#3b0764
    class R_ACCOUNT,R_COMPANY,R_BANK,R_DOCUMENTS,R_REVIEW,R_COMPLETE,R_SUBMIT,R_RESULT vendor
    class R_NOTICE,R_CHECK,R_DECISION,R_REJECT,R_APPROVE,R_ACTIVATE operations
    class R_ADMIN_SUPPORT administrator
```

| Tahap                | Vendor                                                      | Operations                                                         | Administrator                                             |
| -------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------- |
| Akun                 | Mendaftar dan memverifikasi email.                          | —                                                                  | —                                                         |
| Informasi perusahaan | Mengisi data perusahaan dan kontak.                         | —                                                                  | —                                                         |
| Informasi bank       | Mengisi data rekening perusahaan.                           | —                                                                  | —                                                         |
| Dokumen              | Mengunggah dokumen lalu meninjau seluruh data.              | —                                                                  | —                                                         |
| Pengiriman           | Mengirim pengajuan lengkap; ID Vendor diterbitkan otomatis. | Menerima pemberitahuan pengajuan baru.                             | Dapat memantau pengajuan.                                 |
| Pemeriksaan          | Menunggu dan melihat hasil pemeriksaan.                     | Memeriksa pengajuan lalu menyetujui atau menolak dengan alasan.    | Dapat mengambil alih pemeriksaan dan keputusan yang sama. |
| Aktivasi             | Melihat status akhir pada VMS.                              | Mengaktifkan vendor yang telah disetujui setelah syarat terpenuhi. | Dapat melakukan aktivasi dengan kewenangan yang sama.     |

Catatan sumber: alur ini diringkas dari bagian **Pendaftaran awal** dan **Alur status vendor** pada tabel [Ketertelusuran](#ketertelusuran). Profil dan ID Vendor dibuat saat pengajuan lengkap dikirim, bukan saat akun atau draf dibuat. Pengajuan ulang setelah penolakan tidak ditampilkan karena alur tersebut belum dapat diselesaikan melalui akses aplikasi saat ini; lihat [Batasan dan Ketidakpastian](#batasan-dan-ketidakpastian).

## 7. Alur Status Vendor

```mermaid
flowchart TD
    L_START([Vendor berstatus submitted])

    subgraph L_STAFF[Manajer Operasional atau Administrator Utama]
        L_REVIEW[Pilih tindakan pada detail vendor]
        L_ACTION{Tindakan?}
        L_REASON[Isi alasan wajib]
    end

    subgraph L_BACKEND[Policy dan VendorLifecycleService]
        L_AUTH{Policy mengizinkan?}
        L_APPROVE[Ubah submitted ke under_review lalu approved]
        L_REJECT[Ubah submitted bila perlu ke under_review lalu rejected]
        L_READY{Dokumen wajib terkini terverifikasi dan belum kedaluwarsa, status kepatuhan compliant dengan skor minimal 80, tanpa penanda terbuka aktif?}
        L_ACTIVATE[Ubah approved atau suspended ke active]
        L_SUSPEND[Ubah active ke suspended]
        L_TERMINATE[Ubah active atau suspended ke terminated]
        L_REACTIVATE[Ubah terminated ke under_review]
        L_INVALID[Tampilkan kesalahan: tanpa wewenang, alasan kosong, status tidak valid, atau persyaratan kesiapan gagal]
    end

    subgraph L_SYSTEM[Sistem]
        L_LOG[Tambahkan VendorStateLog dan AuditLog]
        L_BLOCK[Nonaktifkan pengguna, ganti token pengingat, dan hapus sesi basis data]
        L_RESTORE[Aktifkan kembali pengguna saat keluar dari status terblokir]
        L_END([Status vendor diperbarui])
    end

    L_START --> L_REVIEW --> L_AUTH
    L_AUTH -->|Tidak| L_INVALID
    L_AUTH -->|Ya| L_ACTION
    L_ACTION -->|Setujui| L_APPROVE --> L_LOG --> L_END
    L_ACTION -->|Tolak| L_REASON --> L_REJECT --> L_LOG --> L_BLOCK --> L_END
    L_ACTION -->|Aktifkan| L_READY
    L_READY -->|Tidak| L_INVALID
    L_READY -->|Ya| L_ACTIVATE --> L_LOG --> L_RESTORE --> L_END
    L_ACTION -->|Tangguhkan| L_REASON --> L_SUSPEND --> L_LOG --> L_BLOCK --> L_END
    L_ACTION -->|Hentikan| L_REASON --> L_TERMINATE --> L_LOG --> L_BLOCK --> L_END
    L_ACTION -->|Aktifkan kembali| L_REASON --> L_REACTIVATE --> L_LOG --> L_RESTORE --> L_END

    classDef process fill:#dbeafe,stroke:#2563eb,color:#172554
    classDef decision fill:#fef3c7,stroke:#d97706,color:#451a03
    classDef failure fill:#fee2e2,stroke:#dc2626,color:#450a0a
    classDef success fill:#dcfce7,stroke:#16a34a,color:#052e16
    class L_REVIEW,L_REASON,L_APPROVE,L_REJECT,L_ACTIVATE,L_SUSPEND,L_TERMINATE,L_REACTIVATE,L_LOG,L_BLOCK,L_RESTORE process
    class L_ACTION,L_AUTH,L_READY decision
    class L_INVALID failure
    class L_END success
```

Status dan transisi yang diizinkan model:

| Dari           | Ke                                  |
| -------------- | ----------------------------------- |
| `draft`        | `submitted`                         |
| `submitted`    | `under_review`, `draft`, `rejected` |
| `under_review` | `approved`, `submitted`, `rejected` |
| `approved`     | `active`                            |
| `active`       | `suspended`, `terminated`           |
| `suspended`    | `active`, `terminated`              |
| `terminated`   | `under_review`, `submitted`         |
| `rejected`     | `draft`, `submitted`                |

Rute perubahan status yang aktif menyediakan tindakan approve, reject, activate, suspend, terminate, dan reactivate. Transisi lain pada tabel merupakan kemampuan mesin status dan tidak selalu memiliki rute tindakan langsung.

## 8. Dokumen dan Kepatuhan

```mermaid
flowchart TD
    D_START([Vendor memiliki profil setelah pendaftaran awal])
    D_MANUAL_START([Permintaan evaluasi manual])

    subgraph D_VENDOR[Vendor]
        D_UPLOAD[Buka modal dan unggah dokumen aktif]
        D_VIEW[Lihat status dokumen dan hasil kepatuhan terbaru]
    end

    subgraph D_BACKEND[Backend VMS]
        D_DRAFT{Status vendor draft?}
        D_VALID{Tipe aktif, berkas, ukuran, format, dan tanggal kedaluwarsa valid?}
        D_VERSION[Ubah versi current lama menjadi false]
        D_PENDING[Buat versi current baru berstatus pending]
        D_STAFF_AUTH{Manajer Operasional atau Administrator Utama?}
        D_DOC_PENDING{Dokumen berstatus pending?}
        D_DECISION{Keputusan peninjauan?}
        D_VERIFY[Ubah status menjadi terverifikasi dan simpan catatan]
        D_REJECT[Ubah status menjadi rejected dan simpan alasan]
        D_MANUAL[Manajer Operasional atau Administrator Utama meminta evaluasi]
        D_EVALUATE[Jalankan seluruh ComplianceRule aktif]
        D_RULE{Hasil rule?}
        D_RESULT[Tambahkan ComplianceResult yang tidak dapat diubah]
        D_STATUS[Hitung skor dan status kepatuhan vendor]
        D_ERROR[Tampilkan kesalahan validasi, otorisasi, atau status]
    end

    subgraph D_SCHEDULE[Penjadwal]
        D_NIGHTLY[Setiap hari 02:00: evaluasi vendor approved, active, dan suspended]
        D_EXPIRY[Setiap hari 08:00: kirim pengingat dan tandai dokumen terverifikasi yang melewati masa berlaku sebagai kedaluwarsa]
        D_REEVAL[Evaluasi ulang vendor yang terdampak kedaluwarsa]
    end

    subgraph D_HISTORY[Histori dan Notifikasi]
        D_AUDIT[Audit verifikasi atau penolakan]
        D_FLAG_OPEN[Buat atau perbarui ComplianceFlag terbuka untuk hasil fail]
        D_FLAG_RESOLVE[Selesaikan penanda terbuka untuk aturan yang kembali pass]
        D_NOTIFY[Notifikasi vendor dan staf terkait kedaluwarsa]
        D_DONE([Status dokumen dan kepatuhan tersedia])
    end

    D_START --> D_UPLOAD --> D_DRAFT
    D_DRAFT -->|Ya| D_ERROR
    D_DRAFT -->|Tidak| D_VALID
    D_VALID -->|Tidak| D_ERROR
    D_VALID -->|Ya| D_VERSION --> D_PENDING --> D_STAFF_AUTH
    D_STAFF_AUTH -->|Tidak| D_ERROR
    D_STAFF_AUTH -->|Ya| D_DOC_PENDING
    D_DOC_PENDING -->|Tidak| D_ERROR
    D_DOC_PENDING -->|Ya| D_DECISION
    D_DECISION -->|Verifikasi| D_VERIFY --> D_AUDIT
    D_DECISION -->|Tolak| D_REJECT --> D_AUDIT
    D_AUDIT --> D_VIEW
    D_MANUAL_START --> D_MANUAL --> D_EVALUATE
    D_NIGHTLY -.-> D_EVALUATE
    D_EXPIRY -.-> D_NOTIFY
    D_EXPIRY -.-> D_REEVAL --> D_EVALUATE
    D_EVALUATE --> D_RULE
    D_RULE -->|Lulus| D_RESULT --> D_FLAG_RESOLVE --> D_STATUS
    D_RULE -->|Peringatan| D_RESULT --> D_STATUS
    D_RULE -->|Gagal| D_RESULT --> D_FLAG_OPEN --> D_STATUS
    D_STATUS --> D_VIEW --> D_DONE

    classDef process fill:#dbeafe,stroke:#2563eb,color:#172554
    classDef decision fill:#fef3c7,stroke:#d97706,color:#451a03
    classDef failure fill:#fee2e2,stroke:#dc2626,color:#450a0a
    classDef success fill:#dcfce7,stroke:#16a34a,color:#052e16
    class D_UPLOAD,D_VIEW,D_VERSION,D_PENDING,D_VERIFY,D_REJECT,D_MANUAL,D_EVALUATE,D_RESULT,D_STATUS,D_NIGHTLY,D_EXPIRY,D_REEVAL,D_AUDIT,D_FLAG_OPEN,D_FLAG_RESOLVE,D_NOTIFY process
    class D_DRAFT,D_VALID,D_STAFF_AUTH,D_DOC_PENDING,D_DECISION,D_RULE decision
    class D_ERROR failure
    class D_DONE success
```

Aturan status kepatuhan keseluruhan:

- `blocked` jika terdapat kegagalan aturan dengan penanda pemblokiran, atau lebih dari dua penanda kegagalan terbuka.
- `compliant` jika skor minimal 80 dan tidak terblokir.
- `at_risk` jika skor 50–79 dan tidak terblokir.
- `non_compliant` jika skor di bawah 50 dan tidak terblokir.
- Hanya aturan aktif yang dievaluasi. `ComplianceResult` hanya dapat ditambahkan; tampilan menggunakan hasil terbaru per vendor dan aturan sehingga riwayat lama tidak dianggap sebagai status aktif.

## 9. Penilaian Performa

```mermaid
flowchart TD
    P_START([Vendor berstatus approved atau active])

    subgraph P_OPS[Manajer Operasional atau Administrator Utama]
        P_OPEN[Buka form penilaian vendor]
        P_INPUT[Isi periode dan nilai untuk metric aktif]
    end

    subgraph P_BACKEND[Backend VMS]
        P_AUTH{Gate dan Form Request mengizinkan?}
        P_VALID{Metrik unik, periode valid, dan nilai dalam batas metrik?}
        P_STORE[Tambahkan PerformanceScore yang tidak dapat diubah untuk setiap metrik]
        P_LATEST[Ambil skor terbaru untuk setiap metrik aktif]
        P_CALC[Normalisasi dan hitung rata-rata berbobot]
        P_UPDATE[Perbarui performance_score vendor]
        P_HISTORY[Tambahkan ScoreHistory]
        P_ERROR[Tampilkan kesalahan otorisasi atau validasi]
    end

    subgraph P_SCHEDULE[Penjadwal]
        P_MONTHLY[Setiap tanggal 1 pukul 03:00]
        P_ALL[Ambil vendor approved dan active]
    end

    subgraph P_OUTPUT[Tampilan]
        P_ADMIN[Lihat breakdown dan histori]
        P_VENDOR[Lihat skor dan riwayat performa sendiri]
        P_DONE([Performa terbaru tersedia])
    end

    P_START --> P_OPEN --> P_INPUT --> P_AUTH
    P_AUTH -->|Tidak| P_ERROR
    P_AUTH -->|Ya| P_VALID
    P_VALID -->|Tidak| P_ERROR
    P_VALID -->|Ya| P_STORE --> P_LATEST --> P_CALC --> P_UPDATE --> P_HISTORY
    P_MONTHLY -.-> P_ALL --> P_LATEST
    P_HISTORY --> P_ADMIN --> P_DONE
    P_HISTORY --> P_VENDOR --> P_DONE

    classDef process fill:#dbeafe,stroke:#2563eb,color:#172554
    classDef decision fill:#fef3c7,stroke:#d97706,color:#451a03
    classDef failure fill:#fee2e2,stroke:#dc2626,color:#450a0a
    classDef success fill:#dcfce7,stroke:#16a34a,color:#052e16
    class P_OPEN,P_INPUT,P_STORE,P_LATEST,P_CALC,P_UPDATE,P_HISTORY,P_MONTHLY,P_ALL,P_ADMIN,P_VENDOR process
    class P_AUTH,P_VALID decision
    class P_ERROR failure
    class P_DONE success
```

## Ketertelusuran

Tautan berikut menunjuk ke sumber implementasi yang menjadi dasar diagram.

| Diagram                   | Rute aktif                                                                                                                        | Controller dan validasi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Service, model, dan otorisasi                                                                                                                                                                                                                                                                                                                                                        | Antarmuka atau penjadwal                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Konteks                   | [`routes/web.php`](../routes/web.php), [`routes/auth.php`](../routes/auth.php)                                                    | Seluruh controller fitur yang dirinci pada baris berikut                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | [`app/Providers/AppServiceProvider.php`](../app/Providers/AppServiceProvider.php), [`app/Http/Middleware/HandleInertiaRequests.php`](../app/Http/Middleware/HandleInertiaRequests.php)                                                                                                                                                                                               | [`resources/js/Pages`](../resources/js/Pages), [`routes/console.php`](../routes/console.php)                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Peran Vendor              | Kelompok `role:vendor` pada [`routes/web.php`](../routes/web.php) dan [`routes/auth.php`](../routes/auth.php)                     | [`VendorController.php`](../app/Http/Controllers/VendorController.php), [`VendorOnboardingController.php`](../app/Http/Controllers/VendorOnboardingController.php), [`NotificationController.php`](../app/Http/Controllers/NotificationController.php)                                                                                                                                                                                                                                                                       | [`EnsureVendorAccountIsActive.php`](../app/Http/Middleware/EnsureVendorAccountIsActive.php), [`EnsureVendorEmailIsVerified.php`](../app/Http/Middleware/EnsureVendorEmailIsVerified.php), kelas Form Request pada [`app/Http/Requests/Vendor`](../app/Http/Requests/Vendor)                                                                                                          | [`Sidebar.jsx`](../resources/js/Components/Sidebar.jsx), [`VendorLayout.jsx`](../resources/js/Components/VendorLayout.jsx), [`resources/js/Pages/Vendor`](../resources/js/Pages/Vendor)                                                                                                                                                                                                                                                                                                                         |
| Peran Manajer Operasional | Kelompok `role:ops_manager,super_admin` dan kelompok staf bersama pada [`routes/web.php`](../routes/web.php)                      | [`VendorManagementController.php`](../app/Http/Controllers/Admin/VendorManagementController.php), [`DocumentController.php`](../app/Http/Controllers/DocumentController.php), [`ComplianceController.php`](../app/Http/Controllers/ComplianceController.php), [`PerformanceController.php`](../app/Http/Controllers/PerformanceController.php), [`ContactController.php`](../app/Http/Controllers/ContactController.php), [`AdminNotificationController.php`](../app/Http/Controllers/Admin/AdminNotificationController.php) | [`VendorPolicy.php`](../app/Policies/VendorPolicy.php), [`VendorDocumentPolicy.php`](../app/Policies/VendorDocumentPolicy.php), Gate pada [`AppServiceProvider.php`](../app/Providers/AppServiceProvider.php), izin bersama pada [`HandleInertiaRequests.php`](../app/Http/Middleware/HandleInertiaRequests.php)                                                                     | [`Sidebar.jsx`](../resources/js/Components/Sidebar.jsx), [`resources/js/Pages/Admin`](../resources/js/Pages/Admin)                                                                                                                                                                                                                                                                                                                                                                                              |
| Peran Administrator Utama | Kelompok `role:super_admin` serta seluruh kelompok Operasional pada [`routes/web.php`](../routes/web.php)                         | [`AuditLogController.php`](../app/Http/Controllers/Admin/AuditLogController.php), [`ComplianceController.php`](../app/Http/Controllers/ComplianceController.php), [`StaffUserController.php`](../app/Http/Controllers/Admin/StaffUserController.php)                                                                                                                                                                                                                                                                         | `Gate::before`, `manageComplianceRules`, dan `viewAuditLogs` pada [`AppServiceProvider.php`](../app/Providers/AppServiceProvider.php), [`StoreStaffUserRequest.php`](../app/Http/Requests/Admin/StoreStaffUserRequest.php)                                                                                                                                                           | [`Sidebar.jsx`](../resources/js/Components/Sidebar.jsx), [`Admin/Audit`](../resources/js/Pages/Admin/Audit), [`Admin/Compliance/Rules.jsx`](../resources/js/Pages/Admin/Compliance/Rules.jsx), [`Admin/Staff`](../resources/js/Pages/Admin/Staff)                                                                                                                                                                                                                                                               |
| Autentikasi dan akses     | [`routes/auth.php`](../routes/auth.php), kelompok middleware pada [`routes/web.php`](../routes/web.php)                           | [`AuthenticatedSessionController.php`](../app/Http/Controllers/Auth/AuthenticatedSessionController.php), [`RegisteredUserController.php`](../app/Http/Controllers/Auth/RegisteredUserController.php), [`EmailVerificationController.php`](../app/Http/Controllers/Auth/EmailVerificationController.php), [`LoginRequest.php`](../app/Http/Requests/Auth/LoginRequest.php)                                                                                                                                                    | [`EnsureVendorAccountIsActive.php`](../app/Http/Middleware/EnsureVendorAccountIsActive.php), [`EnsureVendorEmailIsVerified.php`](../app/Http/Middleware/EnsureVendorEmailIsVerified.php), [`RoleMiddleware.php`](../app/Http/Middleware/RoleMiddleware.php), [`Vendor.php`](../app/Models/Vendor.php)                                                                                | [`Login.jsx`](../resources/js/Pages/Auth/Login.jsx), [`Register.jsx`](../resources/js/Pages/Auth/Register.jsx), [`VerifyEmail.jsx`](../resources/js/Pages/Auth/VerifyEmail.jsx)                                                                                                                                                                                                                                                                                                                                 |
| Pendaftaran awal          | Rute `vendor.onboarding*` pada [`routes/web.php`](../routes/web.php)                                                              | [`VendorOnboardingController.php`](../app/Http/Controllers/VendorOnboardingController.php), [`StoreStep1Request.php`](../app/Http/Requests/Vendor/StoreStep1Request.php), [`StoreStep2Request.php`](../app/Http/Requests/Vendor/StoreStep2Request.php), [`StoreStep3Request.php`](../app/Http/Requests/Vendor/StoreStep3Request.php)                                                                                                                                                                                         | [`VendorService.php`](../app/Services/VendorService.php), [`VendorApplication.php`](../app/Models/VendorApplication.php), [`Vendor.php`](../app/Models/Vendor.php), [`VendorStateLog.php`](../app/Models/VendorStateLog.php)                                                                                                                                                         | [`Wizard.jsx`](../resources/js/Pages/Vendor/Onboarding/Wizard.jsx), direktori [`Steps`](../resources/js/Pages/Vendor/Onboarding/Steps)                                                                                                                                                                                                                                                                                                                                                                          |
| Alur status vendor        | Rute `admin.vendors.*` pada [`routes/web.php`](../routes/web.php)                                                                 | [`VendorManagementController.php`](../app/Http/Controllers/Admin/VendorManagementController.php)                                                                                                                                                                                                                                                                                                                                                                                                                             | [`VendorLifecycleService.php`](../app/Services/VendorLifecycleService.php), [`Vendor.php`](../app/Models/Vendor.php), [`VendorPolicy.php`](../app/Policies/VendorPolicy.php), [`VendorStateLog.php`](../app/Models/VendorStateLog.php)                                                                                                                                               | [`Admin/Vendors/Show.jsx`](../resources/js/Pages/Admin/Vendors/Show.jsx)                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Dokumen dan kepatuhan     | Rute `vendor.documents*`, `documents.*`, `admin.documents.*`, dan `admin.compliance.*` pada [`routes/web.php`](../routes/web.php) | [`VendorController.php`](../app/Http/Controllers/VendorController.php), [`DocumentController.php`](../app/Http/Controllers/DocumentController.php), [`ComplianceController.php`](../app/Http/Controllers/ComplianceController.php), [`UploadDocumentRequest.php`](../app/Http/Requests/Vendor/UploadDocumentRequest.php), [`UpdateComplianceRuleRequest.php`](../app/Http/Requests/Admin/UpdateComplianceRuleRequest.php)                                                                                                    | [`VendorService.php`](../app/Services/VendorService.php), [`ComplianceService.php`](../app/Services/ComplianceService.php), [`VendorDocument.php`](../app/Models/VendorDocument.php), [`ComplianceResult.php`](../app/Models/ComplianceResult.php), [`ComplianceRule.php`](../app/Models/ComplianceRule.php), [`VendorDocumentPolicy.php`](../app/Policies/VendorDocumentPolicy.php) | [`Vendor/Documents.jsx`](../resources/js/Pages/Vendor/Documents.jsx), [`Admin/Documents/Index.jsx`](../resources/js/Pages/Admin/Documents/Index.jsx), [`Vendor/Compliance.jsx`](../resources/js/Pages/Vendor/Compliance.jsx), [`Admin/Compliance`](../resources/js/Pages/Admin/Compliance), [`routes/console.php`](../routes/console.php), [`SendExpiryReminders.php`](../app/Console/Commands/SendExpiryReminders.php), [`EvaluateVendorCompliance.php`](../app/Console/Commands/EvaluateVendorCompliance.php) |
| Performa                  | Rute `vendor.performance` dan `admin.performance.*` pada [`routes/web.php`](../routes/web.php)                                    | [`VendorController.php`](../app/Http/Controllers/VendorController.php), [`PerformanceController.php`](../app/Http/Controllers/PerformanceController.php), [`StorePerformanceRatingRequest.php`](../app/Http/Requests/Admin/StorePerformanceRatingRequest.php)                                                                                                                                                                                                                                                                | [`PerformanceService.php`](../app/Services/PerformanceService.php), [`PerformanceScore.php`](../app/Models/PerformanceScore.php), [`PerformanceMetric.php`](../app/Models/PerformanceMetric.php), Gate pada [`AppServiceProvider.php`](../app/Providers/AppServiceProvider.php)                                                                                                      | [`Vendor/Performance.jsx`](../resources/js/Pages/Vendor/Performance.jsx), [`Admin/Performance`](../resources/js/Pages/Admin/Performance), [`routes/console.php`](../routes/console.php), [`GeneratePerformanceScores.php`](../app/Console/Commands/GeneratePerformanceScores.php)                                                                                                                                                                                                                               |

## Batasan dan Ketidakpastian

1. `VendorOnboardingController::show()` mengizinkan status `rejected` membuka pendaftaran awal, dan mesin status mengizinkan `rejected` kembali ke `draft` atau `submitted`. Namun, semua rute pendaftaran awal berada di dalam `EnsureVendorAccountIsActive`, sedangkan status `rejected` termasuk `Vendor::ACCESS_BLOCKED_STATUSES`. Akibatnya, sesi vendor berstatus `rejected` diputus sebelum mencapai pendaftaran awal. Dokumen ini tidak menggambarkan pengajuan ulang vendor berstatus `rejected` sebagai alur yang dapat diselesaikan sampai ketidaksesuaian tersebut diputuskan dan diperbaiki.
2. `ComplianceService::checkRequiredDocuments()` mengambil seluruh tipe wajib tanpa filter `is_active`, sedangkan pemeriksaan kesiapan aktivasi hanya menghitung tipe wajib aktif. Diagram mencatat evaluasi berdasarkan aturan aktif tetapi tidak menyamakan kedua cakupan dokumen tersebut.
3. Kode saat verifikasi masih memiliki peran `finance_manager`, rute, menu, model, service, penjadwal, dan halaman pembayaran. Berdasarkan keputusan bisnis, peran dan proses tersebut berada pada aplikasi berbeda sehingga sengaja tidak digambarkan sebagai alur VMS. Dokumentasi ini tidak menyatakan artefak teknis tersebut telah dihapus dari repository.
4. Navigasi vendor dan admin saat verifikasi masih menampilkan menu pembayaran. Menu tersebut tidak dimasukkan ke alur peran karena berada di luar batas aplikasi yang ditetapkan untuk dokumentasi ini.
5. `StaffUserController` dan `StoreStaffUserRequest` saat verifikasi masih mengenali `finance_manager` sebagai pilihan peran staf. Alur Administrator Utama hanya menyatakan kemampuan membuat pengguna staf dan tidak menyatakan daftar peran yang seharusnya tersedia.
6. Verifikasi atau penolakan dokumen tidak otomatis memanggil evaluasi kepatuhan dalam `DocumentController`. Evaluasi berikutnya terjadi melalui tindakan manual atau penjadwal malam; diagram menempatkan evaluasi setelah peninjauan sebagai tahapan lanjutan, bukan transaksi yang sama.
7. Laporan pembayaran dan ekspor terkait tidak dimasukkan ke alur Manajer Operasional atau Administrator Utama. Label “laporan non-pembayaran” membatasi diagram pada ringkasan vendor, performa, kepatuhan, dan kedaluwarsa dokumen yang terbukti memiliki rute aktif.
8. Validasi Mermaid dilakukan sesuai alat yang tersedia di repository. Apabila CLI Mermaid tidak tersedia, validasi terbatas pada pemeriksaan struktur source dan fence Markdown.
