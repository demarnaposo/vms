import { Link, useForm } from '@inertiajs/react';
import { AdminLayout, PageHeader, Card, Button } from '@/Components';
// Start Update 13 September 2026, by @WNP: Translate rating controls while keeping metric records and typed notes unchanged.
import { useLanguage } from '@/Contexts/LanguageContext';
// Start Update 15 September 2026, by @WNP: Localize fixed performance metric master records in the rating form.
import { translateSystemMasterDataField } from '@/i18n/systemMasterData';

export default function RateVendor({ vendor, metrics = [] }) {
    // Start Update 13 September 2026, by @WNP: Resolve only fixed rating copy through the current UI language.
    // Start Update 15 September 2026, by @WNP: Read the selected language for metric labels and descriptions.
    const { language, t } = useLanguage();
    const form = useForm({
        ratings: metrics.map((m) => ({
            metric_id: m.id,
            score: Math.round((Number(m.max_score || 10) * 70) / 100),
            notes: '',
        })),
        period_start: new Date().toISOString().split('T')[0].slice(0, 7) + '-01',
        period_end: new Date().toISOString().split('T')[0],
    });

    const updateRating = (metricId, field, value) => {
        form.setData(
            'ratings',
            form.data.ratings.map((r) => (r.metric_id === metricId ? { ...r, [field]: value } : r))
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        form.post(`/admin/performance/${vendor.id}/rate`);
    };

    // Start Update 13 September 2026, by @WNP: Keep the database company name outside the translator.
    const header = (
        <PageHeader
            title="Rate Performance"
            subtitle={<>{vendor?.company_name}</>}
            backLink="/admin/performance"
        />
    );

    return (
        <AdminLayout title="Rate Performance" activeNav="Performance" header={header}>
            <form onSubmit={handleSubmit} className="max-w-4xl space-y-8">
                {/* Validation Errors */}
                {(form.errors.period_start || form.errors.period_end || form.errors.ratings) && (
                    <div className="p-4 rounded-xl bg-(--color-danger-light) border border-(--color-danger) text-(--color-danger-dark) text-sm space-y-1">
                        {form.errors.period_start && <p>{form.errors.period_start}</p>}
                        {form.errors.period_end && <p>{form.errors.period_end}</p>}
                        {form.errors.ratings && <p>{form.errors.ratings}</p>}
                    </div>
                )}

                {/* Period Selection */}
                <Card title="Rating Period">
                    <div className="p-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-(--color-text-secondary) mb-2 block">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={form.data.period_start}
                                    onChange={(e) => form.setData('period_start', e.target.value)}
                                    className="input-field w-full"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-(--color-text-secondary) mb-2 block">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={form.data.period_end}
                                    onChange={(e) => form.setData('period_end', e.target.value)}
                                    className="input-field w-full"
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Metrics Rating */}
                <Card title="Performance Ratings">
                    <div className="p-6">
                        <p className="text-sm text-(--color-text-secondary) mb-6">
                            {/* Start Update 13 September 2026, by @WNP: Translate fixed guidance, not scored metric values. */}
                            {t(
                                'Rate each metric from 0 up to that metric max score. Scores are immutable once submitted.'
                            )}
                        </p>
                        <div className="space-y-6">
                            {metrics.map((metric) => {
                                const rating = form.data.ratings.find(
                                    (r) => r.metric_id === metric.id
                                );
                                return (
                                    <div
                                        key={metric.id}
                                        className="p-4 rounded-lg bg-(--color-bg-secondary) border border-(--color-border-secondary)"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <div className="text-(--color-text-primary) font-medium">
                                                    {/* Start Update 15 September 2026, by @WNP: Preserve custom metric labels and translate fixed ones. */}
                                                    {translateSystemMasterDataField(
                                                        language,
                                                        'performance_metrics',
                                                        metric,
                                                        'display_name'
                                                    )}
                                                </div>
                                                <div className="text-sm text-(--color-text-secondary)">
                                                    {/* Start Update 15 September 2026, by @WNP: Translate only the recognized master description. */}
                                                    {translateSystemMasterDataField(
                                                        language,
                                                        'performance_metrics',
                                                        metric,
                                                        'description'
                                                    )}
                                                </div>
                                                <span className="text-xs text-(--color-brand-primary) mt-1 inline-block">
                                                    {/* Start Update 13 September 2026, by @WNP: Translate the fixed weight label only. */}
                                                    {t('Weight: :weight%', {
                                                        weight: (metric.weight * 100).toFixed(0),
                                                    })}
                                                </span>
                                            </div>
                                            <div className="text-3xl font-bold text-(--color-text-primary)">
                                                {rating?.score || 0}/{metric.max_score}
                                            </div>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max={metric.max_score}
                                            value={rating?.score || 0}
                                            onChange={(e) =>
                                                updateRating(
                                                    metric.id,
                                                    'score',
                                                    parseInt(e.target.value)
                                                )
                                            }
                                            className="w-full h-2 bg-(--color-bg-tertiary) rounded-lg appearance-none cursor-pointer accent-(--color-brand-primary) mb-2"
                                        />
                                        {/* Start Update 13 September 2026, by @WNP: Localize placeholder without modifying typed notes. */}
                                        <input
                                            type="text"
                                            value={rating?.notes || ''}
                                            onChange={(e) =>
                                                updateRating(metric.id, 'notes', e.target.value)
                                            }
                                            className="input-field w-full text-sm"
                                            placeholder={t('Optional notes...')}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Card>

                {/* Submit */}
                <div className="flex justify-end gap-3">
                    <Link href="/admin/performance">
                        <Button variant="outline">Cancel</Button>
                    </Link>
                    <Button type="submit" disabled={form.processing}>
                        {form.processing ? 'Submitting...' : 'Submit Ratings'}
                    </Button>
                </div>
            </form>
        </AdminLayout>
    );
}
