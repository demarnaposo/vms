<?php

// Translate dynamic alerts while preserving names, status codes, and counts verbatim.
return [
    'notification_sent' => 'Notifikasi berhasil dikirim kepada :count penerima.',
    'contact_message_sent' => 'Terima kasih atas pesan Anda! Kami akan segera menghubungi Anda.',
    'contact_message_failed' => 'Pesan Anda tidak dapat dikirim. Silakan coba lagi.',
    // Localize notification-center success feedback.
    'notifications_marked_read' => 'Semua notifikasi telah ditandai dibaca.',
    // Show clear feedback when form actions are temporarily limited.
    'too_many_requests' => 'Terlalu banyak tindakan dikirim. Tunggu sebentar lalu coba lagi.',
    'document_verified' => ':document berhasil diverifikasi.',
    'document_rejected' => ':document ditolak.',
    'vendor_account_status' => 'Akun vendor Anda saat ini berstatus :status. Silakan hubungi dukungan.',
    'user_account_inactive' => 'Akun Anda tidak aktif. Silakan hubungi dukungan.',
    'vendor_not_compliant' => 'Vendor tidak patuh (Status: :status). Silakan selesaikan masalah kepatuhan terlebih dahulu.',
    'vendor_transition' => 'Vendor tidak dapat :action dari status :status.',
    // Localize lifecycle action and readiness alerts without changing status data.
    'actions' => [
        'approved' => 'disetujui',
        'rejected' => 'ditolak',
        'activated' => 'diaktifkan',
        'suspended' => 'ditangguhkan',
        'terminated' => 'dihentikan',
        'reactivated' => 'diaktifkan kembali',
    ],
    'termination_reason_required' => 'Alasan wajib diisi saat menghentikan vendor.',
    'reactivation_reason_required' => 'Alasan wajib diisi saat mengaktifkan kembali vendor.',
    'documents_required_for_activation' => 'Vendor tidak dapat diaktifkan sampai semua dokumen wajib terverifikasi dan masih berlaku.',
    'compliance_required_for_activation' => 'Vendor tidak dapat diaktifkan sampai skor kepatuhan mencapai ambang aktivasi.',
    'flags_block_activation' => 'Vendor tidak dapat diaktifkan selama masih ada masalah kepatuhan yang belum diselesaikan.',
    'document_upload_missing' => "Unggah dokumen gagal: berkas ':file' tidak ditemukan. Silakan unggah ulang.",
];
