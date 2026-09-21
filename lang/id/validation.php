<?php

// Translate common Laravel validation responses for Indonesian requests.
return [
    'accepted' => ':attribute harus diterima.',
    // Cover validation rules used by the performance rating form.
    'array' => ':attribute harus berupa daftar.',
    'between' => [
        'numeric' => ':attribute harus bernilai antara :min dan :max.',
    ],
    'boolean' => ':attribute harus bernilai benar atau salah.',
    'confirmed' => 'Konfirmasi :attribute tidak cocok.',
    // Localize an incorrect current-password response on profile settings.
    'current_password' => 'Kata sandi saat ini tidak sesuai.',
    'date' => ':attribute harus berupa tanggal yang valid.',
    'email' => ':attribute harus berupa alamat email yang valid.',
    'distinct' => ':attribute memiliki nilai yang duplikat.',
    'exists' => ':attribute yang dipilih tidak valid.',
    'in' => ':attribute yang dipilih tidak valid.',
    'integer' => ':attribute harus berupa bilangan bulat.',
    'max' => [
        'array' => ':attribute tidak boleh memiliki lebih dari :max item.',
        'file' => 'Ukuran :attribute tidak boleh lebih dari :max kilobita.',
        'numeric' => ':attribute tidak boleh lebih dari :max.',
        'string' => ':attribute tidak boleh lebih dari :max karakter.',
    ],
    'mimes' => ':attribute harus berupa berkas dengan tipe: :values.',
    'missing' => ':attribute tidak boleh dikirim.',
    'min' => [
        'array' => ':attribute harus memiliki minimal :min item.',
        'file' => 'Ukuran :attribute minimal :min kilobita.',
        'numeric' => ':attribute minimal bernilai :min.',
        'string' => ':attribute minimal terdiri dari :min karakter.',
    ],
    'numeric' => ':attribute harus berupa angka.',
    'regex' => 'Format :attribute tidak valid.',
    'required' => ':attribute wajib diisi.',
    'string' => ':attribute harus berupa teks.',
    'unique' => ':attribute sudah digunakan.',
    'uploaded' => ':attribute gagal diunggah.',
    // Localize URL validation used by the send-notification form.
    'url' => ':attribute harus berupa URL yang valid.',

    'attributes' => [
        'name' => 'nama',
        'email' => 'email',
        'password' => 'kata sandi',
        'password_confirmation' => 'konfirmasi kata sandi',
        // Use Indonesian profile field names in validation feedback.
        'current_password' => 'kata sandi saat ini',
        'phone' => 'nomor telepon / ponsel',
        'company_name' => 'nama perusahaan',
        'contact_person' => 'narahubung',
        'contact_phone' => 'nomor telepon',
        // Show the Indonesian field name in vendor action comment validation errors.
        'comment' => 'komentar',
        // Localize contact-message status and internal-note validation attributes.
        'status' => 'status',
        'admin_notes' => 'catatan internal',
        // Localize send-notification validation attribute names.
        'title' => 'judul',
        'message' => 'pesan',
        'severity' => 'tingkat keparahan',
        'target' => 'tujuan pengiriman',
        'target_id' => 'penerima',
        'action_url' => 'URL tindakan',
        'address' => 'alamat',
        'city' => 'kabupaten atau kota',
        'state' => 'provinsi',
        'pincode' => 'kode pos',
        'bank_name' => 'nama bank',
        'bank_account_number' => 'nomor rekening',
        'bank_ifsc' => 'kode bank',
        'bank_branch' => 'nama cabang',
    ],
];
