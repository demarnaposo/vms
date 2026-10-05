<?php

// Translate dynamic alerts while preserving names, status codes, and counts verbatim.
return [
    'rbac_last_admin' => 'Super admin terakhir tidak dapat dihapus atau dicabut perannya.',
    'rbac_invalid_role' => 'Pilih peran staff yang valid.',
    'rbac_invalid_permission' => 'Pilih izin dari katalog operasional.',
    'rbac_role_in_use' => 'Peran bawaan dan peran yang digunakan pengguna tidak dapat dihapus.',
    'rbac_user_updated' => 'Pengguna staff berhasil diubah.',
    'rbac_user_password_updated' => 'Pengguna staff dan kata sandi berhasil diubah.',
    'rbac_user_saved' => 'Pengguna staff berhasil disimpan.',
    'staff_deletion_schema_required' => 'Migration penyimpanan riwayat penghapusan staff harus dijalankan sebelum akun ini dapat dihapus.',
    'staff_deletion_vendor_owner' => 'Akun ini memiliki data vendor dan tidak dapat dihapus melalui pengelolaan pengguna internal.',
    'rbac_user_deleted' => 'Pengguna staff berhasil dihapus permanen.',
    'rbac_role_saved' => 'Peran staff berhasil disimpan.',
    'rbac_role_deleted' => 'Peran staff berhasil dihapus.',

    'vendor_decision_mail_failed' => 'Status vendor sudah berubah, tetapi pemberitahuan email tidak dapat diproses.',
    'notification_sent' => 'Notifikasi berhasil dikirim kepada :count penerima.',
    'contact_message_sent' => 'Terima kasih atas pesan Anda! Kami akan segera menghubungi Anda.',
    'contact_message_failed' => 'Pesan Anda tidak dapat dikirim. Silakan coba lagi.',
    // Localize notification-center success feedback.
    'notifications_marked_read' => 'Semua notifikasi telah ditandai dibaca.',
    // Show clear feedback when form actions are temporarily limited.
    'too_many_requests' => 'Terlalu banyak tindakan dikirim. Tunggu sebentar lalu coba lagi.',
    'document_verified' => ':document berhasil diverifikasi.',
    'document_rejected' => ':document ditolak.',
    'document_pending_current_only' => 'Hanya dokumen current yang masih pending dapat ditinjau.',
    'account_deletion_has_history' => 'Akun ini memiliki riwayat yang harus disimpan dan tidak dapat dihapus. Silakan hubungi dukungan.',
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
