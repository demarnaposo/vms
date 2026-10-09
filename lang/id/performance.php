<?php

// Centralize Indonesian performance form validation labels and messages.
return [
    'configuration_updated' => 'Konfigurasi kinerja diperbarui.',
    'baseline' => [
        'work_quality' => ['name' => 'Kualitas Pekerjaan', 'description' => 'Kualitas barang/jasa yang diberikan sesuai spesifikasi'],
        'work_quantity' => ['name' => 'Kuantitas Pekerjaan', 'description' => 'Ketepatan jumlah barang/jasa sesuai pesanan'],
        'goods_services_price' => ['name' => 'Harga Barang/Jasa', 'description' => 'Penilaian terhadap seberapa kompetitif penawaran harga yang diberikan oleh vendor'],
        'goods_services_provision' => ['name' => 'Penyediaan Barang/Jasa', 'description' => 'Ketepatan waktu pengiriman barang/jasa termasuk penyediaan barang/jasa pengganti atau penanganan komplain'],
        'payment_mechanism' => ['name' => 'Mekanisme', 'description' => 'Fleksibilitas pembayaran (bisa pembayaran tempo)'],
        'invoice_delivery' => ['name' => 'Pengiriman Invoice', 'description' => 'Ketepatan waktu pengiriman tagihan dengan lengkap dan benar'],
    ],
    'metric_created' => 'Metrik kinerja ditambahkan.',
    'metric_updated' => 'Metrik kinerja diperbarui.',
    'metric_deleted' => 'Metrik kinerja dihapus.',
    'ratings_recorded' => 'Penilaian kinerja berhasil dicatat.',

    'fields' => [
        'name' => 'kode metrik',
        'display_name' => 'nama metrik',
        'description' => 'deskripsi',
        'weight' => 'bobot',
        'max_score' => 'skor maksimum',
        'is_active' => 'status aktif',

        'ratings' => 'penilaian',
        'metric' => 'metrik',
        'score' => 'skor',
        'notes' => 'catatan',
        'start_date' => 'tanggal mulai',
        'end_date' => 'tanggal selesai',
    ],
    'validation' => [
        'precision' => 'Gunakan maksimal dua angka desimal untuk bobot persentase.',
        'maximum_four' => 'Setiap metrik aktif harus memiliki skor maksimum 4.',
        'total' => 'Total bobot aktif harus tepat 100%. Total saat ini: :total%. Sesuaikan konfigurasi sekaligus.',
        'stale' => 'Konfigurasi telah berubah. Muat ulang halaman dan terapkan perubahan Anda kembali.',
        'complete_ratings' => 'Nilai seluruh metrik aktif. Muat ulang formulir jika konfigurasi telah berubah.',

        'code_immutable' => 'Kode metrik tidak dapat diubah setelah dibuat.',
        'scale_locked' => 'Skor maksimum metrik yang sudah dinilai tidak dapat diubah. Buat metrik baru dan nonaktifkan metrik lama.',
        'metric_in_use' => 'Metrik bawaan atau yang sudah dinilai tidak dapat dihapus. Nonaktifkan metrik tersebut.',
        'metric_unavailable' => 'Metrik ini tidak tersedia atau nonaktif. Muat ulang formulir penilaian.',
        'score_range' => 'Skor harus berupa bilangan bulat antara 1 dan :max.',

        'score_max' => 'Skor tidak boleh lebih dari :max untuk metrik yang dipilih.',
        'end_after_start' => 'Tanggal selesai harus setelah atau sama dengan tanggal mulai.',
    ],
];
