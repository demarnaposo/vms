<?php

namespace App\Traits;

use App\Models\AuditLog;

trait Auditable
{
    /**
     * Fields to exclude from audit logging (sensitive data).
     */
    protected static array $auditExcludeFields = [
        'tax_id', 'pan_number', 'bank_account_number', 'bank_ifsc', 'password', 'remember_token',
    ];

    /**
     * Boot the Auditable trait.
     */
    public static function bootAuditable()
    {
        // Log creation
        static::created(function ($model) {
            $attributes = collect($model->getAttributes())
                ->except(static::$auditExcludeFields)
                ->toArray();

            AuditLog::log(
                AuditLog::EVENT_CREATED,
                $model,
                null,
                $attributes
            );
        });

        // Log updates
        static::updated(function ($model) {
            $changes = collect($model->getChanges())
                ->except(array_merge(static::$auditExcludeFields, ['updated_at']))
                ->toArray();

            $original = collect($model->getOriginal())
                ->only(array_keys($changes))
                ->except(static::$auditExcludeFields)
                ->toArray();

            if (! empty($changes)) {
                AuditLog::log(
                    AuditLog::EVENT_UPDATED,
                    $model,
                    $original,
                    $changes
                );
            }
        });

        // Log soft deletes
        static::deleted(function ($model) {
            $attributes = collect($model->getOriginal())
                ->except(static::$auditExcludeFields)
                ->toArray();

            AuditLog::log(
                AuditLog::EVENT_DELETED,
                $model,
                $attributes,
                null
            );
        });
    }

    /**
     * Get all audit logs for this model.
     */
    public function auditLogs()
    {
        return $this->morphMany(AuditLog::class, 'auditable');
    }

    /**
     * Log a custom event.
     */
    public function logEvent(string $event, ?array $data = null, ?string $reason = null)
    {
        return AuditLog::log($event, $this, null, $data, $reason);
    }
}
