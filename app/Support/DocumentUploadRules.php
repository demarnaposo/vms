<?php

namespace App\Support;

use App\Models\DocumentType;

class DocumentUploadRules
{
    public const EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];

    public const MAX_MB = 10;

    public static function extensions(?DocumentType $type): array
    {
        $allowed = $type === null ? self::EXTENSIONS : ($type->allowed_extensions ?? self::EXTENSIONS);

        return array_values(array_intersect(self::EXTENSIONS, $allowed));
    }

    public static function file(?DocumentType $type): array
    {
        $extensions = self::extensions($type);
        $mimeTypes = array_values(array_unique(array_map(fn ($extension) => match ($extension) {
            'pdf' => 'application/pdf',
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            default => throw new \InvalidArgumentException('Unsupported document extension.'),
        }, $extensions)));
        $configuredMax = $type === null ? self::MAX_MB : ($type->max_file_size_mb ?? self::MAX_MB);
        $maxMb = max(1, min(self::MAX_MB, (int) $configuredMax));

        return ['bail', 'required', 'file', 'extensions:'.implode(',', $extensions), 'mimes:'.implode(',', $extensions), 'mimetypes:'.implode(',', $mimeTypes), 'max:'.($maxMb * 1024)];
    }

    public static function validate(int $id, \Illuminate\Http\UploadedFile $file, ?string $expiryDate): void
    {
        $type = DocumentType::active()->lockForUpdate()->find($id);
        if (! $type) {
            throw \Illuminate\Validation\ValidationException::withMessages(['document_type_id' => __('validation.exists', ['attribute' => 'document type'])]);
        }
        \Illuminate\Support\Facades\Validator::make(['file' => $file, 'expiry_date' => $expiryDate], ['file' => self::file($type), 'expiry_date' => self::expiry($type)])->validate();
    }

    public static function expiry(?DocumentType $type): array
    {
        return $type?->has_expiry
            ? ['required', 'date_format:Y-m-d', 'after_or_equal:today']
            : ['prohibited'];
    }
}
