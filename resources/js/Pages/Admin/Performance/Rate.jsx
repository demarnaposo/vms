import { useForm } from '@inertiajs/react';
import { AdminLayout, PageHeader, Card, Button } from '@/Components';
import { ActionLink } from '@/Components/ActionControls';
// Translate rating controls while keeping metric records and typed notes unchanged.
import { useLanguage } from '@/Contexts/LanguageContext';
// Localize fixed performance metric master records in the rating form.
import { translateSystemMasterDataField } from '@/i18n/systemMasterData';

export default function RateVendor({ vendor, metrics = [] }) {
    // Resolve only fixed rating copy through the current UI language.
    // Read the selected language for metric labels and descriptions.
    const { language, t } = useLanguage();
    const form = useForm({
        ratings: metrics.map((m) => ({
            metric_id: m.id,
            score: 3,
            notes: '',
        })),
        period_start: new Date().toISOString().split('T')[0].slice(0, 7) + '-01',
        period_end: new Date().toISOString().split('T')[0],
    });
    // Surface localized nested rating errors without duplicating messages.
    const visibleIndices = new Set(
        metrics.map((metric) =>
            form.data.ratings.findIndex((rating) => rating.metric_id === metric.id)
        )
    );
    const ratingGroupErrors = Object.entries(form.errors)
        .filter(([key]) => {
            const match = key.match(/^ratings\.(\d+)\./);
            return key === 'ratings' || (match && !visibleIndices.has(Number(match[1])));
        })
        .map(([, message]) => message);

    const updateRating = (metricId, field, value) => {
        form.setData(
            'ratings',
            form.data.ratings.map((r) => (r.metric_id === metricId ? { ...r, [field]: value } : r))
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (form.processing) return;
        form.post(`/admin/performance/${vendor.id}/rate`);
    };

    // Keep the database company name outside the translator.
    const header = (
        <PageHeader
            title="Rate Performance"
            subtitle={<span className="[overflow-wrap:anywhere]">{vendor?.company_name}</span>}
            actions={
                <ActionLink href="/admin/performance" variant="outline" className="min-h-9">
                    {t('Back')}
                </ActionLink>
            }
        />
    );

    return (
        <AdminLayout title="Rate Performance" activeNav="Performance" header={header}>
            <form noValidate onSubmit={handleSubmit} className="min-w-0 max-w-4xl space-y-6">
                {/* Period Selection */}
                <Card title="Rating Period">
                    <div className="min-w-0">
                        <div className="grid min-w-0 grid-cols-1 md:grid-cols-2 gap-4 [&>div]:min-w-0">
                            <div>
                                <label
                                    htmlFor="rating-period_start"
                                    className="text-sm font-medium text-(--color-text-secondary) mb-2 block"
                                >
                                    {/* Localize the performance period start label. */}
                                    {t('Start Date')}
                                </label>
                                <input
                                    type="date"
                                    id="rating-period_start"
                                    aria-invalid={!!form.errors.period_start}
                                    aria-describedby={
                                        form.errors.period_start
                                            ? 'rating-period_start-error'
                                            : undefined
                                    }
                                    value={form.data.period_start}
                                    onChange={(e) => form.setData('period_start', e.target.value)}
                                    className="input-field w-full min-w-0"
                                />
                                {form.errors.period_start && (
                                    <p
                                        id="rating-period_start-error"
                                        role="alert"
                                        className="text-sm text-(--color-danger)"
                                    >
                                        {form.errors.period_start}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label
                                    htmlFor="rating-period_end"
                                    className="text-sm font-medium text-(--color-text-secondary) mb-2 block"
                                >
                                    {/* Localize the performance period end label. */}
                                    {t('End Date')}
                                </label>
                                <input
                                    type="date"
                                    id="rating-period_end"
                                    aria-invalid={!!form.errors.period_end}
                                    aria-describedby={
                                        form.errors.period_end
                                            ? 'rating-period_end-error'
                                            : undefined
                                    }
                                    value={form.data.period_end}
                                    onChange={(e) => form.setData('period_end', e.target.value)}
                                    className="input-field w-full min-w-0"
                                />
                                {form.errors.period_end && (
                                    <p
                                        id="rating-period_end-error"
                                        role="alert"
                                        className="text-sm text-(--color-danger)"
                                    >
                                        {form.errors.period_end}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Metrics Rating */}
                <Card title="Performance Ratings">
                    <div className="min-w-0">
                        <p className="text-sm text-(--color-text-secondary) mb-6">
                            {/* Translate fixed guidance, not scored metric values. */}
                            {t(
                                'Rate each metric from 1 to 4. Scores are immutable once submitted.'
                            )}
                        </p>
                        <div className="min-w-0 space-y-6">
                            {metrics.length === 0 && <p>{t('No active performance metrics.')}</p>}
                            {ratingGroupErrors.map((message, index) => (
                                <p
                                    key={index}
                                    role="alert"
                                    className="text-sm text-(--color-danger)"
                                >
                                    {message}
                                </p>
                            ))}
                            {metrics.map((metric) => {
                                const ratingIndex = form.data.ratings.findIndex(
                                    (rating) => rating.metric_id === metric.id
                                );
                                const metricErrors = ['metric_id', 'score', 'notes']
                                    .map((field) => form.errors[`ratings.${ratingIndex}.${field}`])
                                    .filter(Boolean);
                                const rating = form.data.ratings.find(
                                    (r) => r.metric_id === metric.id
                                );
                                return (
                                    <div
                                        key={metric.id}
                                        className="p-4 rounded-lg bg-(--color-bg-secondary) border border-(--color-border-secondary)"
                                    >
                                        <div className="flex min-w-0 flex-col items-start justify-between gap-3 mb-3 sm:flex-row">
                                            <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                                                <div className="min-w-0 [overflow-wrap:anywhere] text-(--color-text-primary) font-medium">
                                                    {/* Preserve custom metric labels and translate fixed ones. */}
                                                    {translateSystemMasterDataField(
                                                        language,
                                                        'performance_metrics',
                                                        metric,
                                                        'display_name'
                                                    )}
                                                </div>
                                                <div className="text-sm text-(--color-text-secondary)">
                                                    {/* Translate only the recognized master description. */}
                                                    {translateSystemMasterDataField(
                                                        language,
                                                        'performance_metrics',
                                                        metric,
                                                        'description'
                                                    )}
                                                </div>
                                                <span className="text-xs text-(--color-brand-primary) mt-1 inline-block">
                                                    {/* Translate the fixed weight label only. */}
                                                    {t('Weight: :weight%', {
                                                        weight: new Intl.NumberFormat(
                                                            language === 'id' ? 'id-ID' : 'en-US'
                                                        ).format(Number(metric.weight)),
                                                    })}
                                                </span>
                                            </div>
                                            <div className="shrink-0 text-2xl sm:text-3xl font-bold text-(--color-text-primary)">
                                                {rating?.score ?? 3}/4
                                            </div>
                                        </div>
                                        <input
                                            id={`rating-${metric.id}-score`}
                                            type="range"
                                            min="1"
                                            max="4"
                                            step="1"
                                            value={rating?.score ?? 3}
                                            onChange={(event) =>
                                                updateRating(
                                                    metric.id,
                                                    'score',
                                                    Number(event.target.value)
                                                )
                                            }
                                            disabled={form.processing}
                                            aria-label={`${translateSystemMasterDataField(language, 'performance_metrics', metric, 'display_name')} - ${t('Score')}`}
                                            aria-required="true"
                                            aria-invalid={
                                                !!form.errors[`ratings.${ratingIndex}.score`]
                                            }
                                            aria-describedby={
                                                metricErrors.length
                                                    ? `rating-${metric.id}-errors`
                                                    : undefined
                                            }
                                            className="w-full h-2 bg-(--color-bg-tertiary) rounded-lg appearance-none cursor-pointer accent-(--color-brand-primary) mb-2"
                                        />
                                        {/* Localize placeholder without modifying typed notes. */}
                                        <input
                                            type="text"
                                            aria-label={`${translateSystemMasterDataField(language, 'performance_metrics', metric, 'display_name')} - ${t('Notes')}`}
                                            aria-invalid={
                                                !!form.errors[`ratings.${ratingIndex}.notes`]
                                            }
                                            aria-describedby={
                                                metricErrors.length
                                                    ? `rating-${metric.id}-errors`
                                                    : undefined
                                            }
                                            value={rating?.notes || ''}
                                            onChange={(e) =>
                                                updateRating(metric.id, 'notes', e.target.value)
                                            }
                                            className="input-field w-full min-w-0 text-sm"
                                            placeholder={t('Optional notes...')}
                                        />
                                        <div id={`rating-${metric.id}-errors`}>
                                            {metricErrors.map((message, index) => (
                                                <p
                                                    key={index}
                                                    role="alert"
                                                    className="text-sm text-(--color-danger)"
                                                >
                                                    {message}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Card>

                {/* Submit */}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end [&>button]:min-h-9 [&>a]:min-h-9">
                    <ActionLink
                        href="/admin/performance"
                        variant="outline"
                        className="justify-center"
                    >
                        {t('Cancel')}
                    </ActionLink>
                    <Button
                        type="submit"
                        disabled={form.processing || metrics.length === 0}
                        disabledReason={
                            form.processing
                                ? 'A request is in progress. Please wait.'
                                : 'No active performance metrics are available for rating.'
                        }
                    >
                        {form.processing ? 'Submitting...' : 'Submit Ratings'}
                    </Button>
                </div>
            </form>
        </AdminLayout>
    );
}
