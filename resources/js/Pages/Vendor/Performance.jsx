import { AppIcon, Card, PageHeader, VendorLayout } from '@/Components';
import { formatDate } from '@/utils/dateFormatters';
// Localize fixed vendor performance guidance while preserving stored metric data.
import { useLanguage } from '@/Contexts/LanguageContext';
// Localize fixed performance metric master records for vendors.
import { translateSystemMasterDataField } from '@/i18n/systemMasterData';

export default function Performance({
    vendor,
    performanceScores = [],
    metrics = [],
    breakdown = [],
}) {
    // Use the selected UI locale for labels and score-period dates.
    const { language, t } = useLanguage();
    const dateLocale = language === 'id' ? 'id-ID' : 'en-IN';
    const overallScore = Number(vendor?.performance_score || 0);

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-(--color-success)';
        if (score >= 60) return 'text-(--color-warning)';
        return 'text-(--color-danger)';
    };

    const getScoreBgClass = (score) => {
        if (score >= 80) return 'bg-(--color-success)';
        if (score >= 60) return 'bg-(--color-warning)';
        return 'bg-(--color-danger)';
    };

    const getScoreLabel = (score) => {
        if (score >= 90) return 'Excellent';
        if (score >= 80) return 'Very Good';
        if (score >= 70) return 'Good';
        if (score >= 60) return 'Average';
        if (score >= 50) return 'Below Average';
        return 'Needs Improvement';
    };

    const toPercentage = (value, max) =>
        Math.round((Number(value || 0) / Math.max(1, Number(max || 1))) * 100);

    const header = (
        <PageHeader
            title="Performance"
            subtitle="Track your performance metrics and scores"
            actions={
                <div
                    className={`px-3 py-2 text-sm rounded-xl font-semibold ${
                        overallScore >= 80
                            ? 'bg-(--color-success-light) text-(--color-success-dark)'
                            : overallScore >= 60
                              ? 'bg-(--color-warning-light) text-(--color-warning-dark)'
                              : 'bg-(--color-danger-light) text-(--color-danger-dark)'
                    }`}
                >
                    {/* Translate the fixed score band label. */}
                    {t(getScoreLabel(overallScore))}
                </div>
            }
        />
    );

    const hasMetrics = metrics.length > 0;

    return (
        <VendorLayout title="Performance" activeNav="Performance" header={header} vendor={vendor}>
            <div className="min-w-0 space-y-6">
                <div className="bg-(--color-bg-primary) border border-(--color-border-primary) rounded-2xl overflow-hidden shadow-token-sm">
                    <div className="bg-gradient-primary min-w-0 p-4 sm:p-6 lg:p-8 text-white">
                        <div className="flex min-w-0 flex-col xl:flex-row items-center gap-6">
                            <div className="text-center">
                                <div className="text-7xl font-bold mb-2">{overallScore}</div>
                                {/* Translate the fixed score scale label. */}
                                <div className="text-lg opacity-90">{t('out of 100')}</div>
                            </div>

                            <div className="min-w-0 flex-1 w-full max-w-md">
                                <div className="relative h-4 bg-(--color-bg-primary)/20 rounded-full overflow-hidden">
                                    <div
                                        className="absolute left-0 top-0 h-full bg-(--color-bg-primary) rounded-full transition-all duration-1000"
                                        style={{ width: `${overallScore}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-sm mt-2 opacity-75">
                                    <span>0</span>
                                    <span>25</span>
                                    <span>50</span>
                                    <span>75</span>
                                    <span>100</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="min-w-0 p-4 sm:p-6">
                        <p className="text-(--color-text-tertiary)">
                            {/* Translate only system-generated score guidance. */}
                            {t(
                                overallScore >= 80
                                    ? 'Great job. Your performance is above average.'
                                    : overallScore >= 60
                                      ? 'Good performance. There is room for improvement in some areas.'
                                      : 'Your performance needs attention. Focus on improving the metrics below.'
                            )}
                        </p>
                    </div>
                </div>

                <Card title="Performance Metrics">
                    <div className="divide-y divide-(--color-border-secondary)">
                        {!hasMetrics ? (
                            <div className="p-8 text-center text-(--color-text-tertiary)">
                                <div className="text-4xl mb-4 inline-flex justify-center w-full">
                                    <AppIcon name="metrics" className="h-10 w-10" />
                                </div>
                                {/* Translate the fixed empty state. */}
                                <p>{t('No performance metrics defined yet.')}</p>
                                <p className="text-sm mt-2">
                                    {t(
                                        'Performance metrics will appear here once configured by admin.'
                                    )}
                                </p>
                            </div>
                        ) : (
                            metrics.map((metric) => {
                                const scoreData = performanceScores.find(
                                    (s) => s.performance_metric_id === metric.id
                                );
                                const maxScore = Number(metric.max_score || 4);
                                const current = breakdown.find(
                                    (entry) => entry.metric_id === metric.id
                                );
                                const score = Number(
                                    current?.current_score ?? scoreData?.score ?? 0
                                );
                                const hasScore = current ? current.score_count > 0 : !!scoreData;
                                const scorePercentage = toPercentage(score, maxScore);

                                return (
                                    <div
                                        key={metric.id}
                                        className="p-4 hover:bg-(--color-bg-hover) transition-colors"
                                    >
                                        <div className="flex min-w-0 flex-col items-start justify-between gap-3 mb-3 sm:flex-row">
                                            <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                                                <h3 className="font-semibold text-(--color-text-primary)">
                                                    {/* Translate known metric labels and retain custom values. */}
                                                    {translateSystemMasterDataField(
                                                        language,
                                                        'performance_metrics',
                                                        metric,
                                                        'display_name'
                                                    )}
                                                </h3>
                                                <p className="text-sm text-(--color-text-tertiary)">
                                                    {/* Translate only fixed master metric descriptions. */}
                                                    {translateSystemMasterDataField(
                                                        language,
                                                        'performance_metrics',
                                                        metric,
                                                        'description'
                                                    )}
                                                </p>
                                                <p className="mt-1 text-xs text-(--color-brand-primary)">
                                                    {t('Weight: :weight%', {
                                                        weight: new Intl.NumberFormat(
                                                            language === 'id' ? 'id-ID' : 'en-US'
                                                        ).format(Number(metric.weight)),
                                                    })}
                                                </p>
                                            </div>
                                            <div
                                                className={`shrink-0 text-2xl font-bold ${hasScore ? getScoreColor(scorePercentage) : 'text-(--color-text-muted)'}`}
                                            >
                                                {hasScore ? `${score}/${maxScore}` : 'N/A'}
                                            </div>
                                        </div>
                                        <div className="relative h-2 bg-(--color-bg-tertiary) rounded-full overflow-hidden">
                                            <div
                                                className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ${hasScore ? getScoreBgClass(scorePercentage) : 'bg-(--color-bg-muted)'}`}
                                                style={{ width: `${scorePercentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </Card>

                <Card title="Recent Performance">
                    <div className="min-w-0">
                        {performanceScores.length === 0 ? (
                            <div className="text-center text-(--color-text-tertiary) py-8">
                                <div className="text-4xl mb-4 inline-flex justify-center w-full">
                                    <AppIcon name="trend" className="h-10 w-10" />
                                </div>
                                {/* Translate the fixed empty history state. */}
                                <p>{t('No performance history available yet.')}</p>
                                <p className="text-sm mt-2">
                                    {t('Performance scores will appear here once evaluated.')}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {performanceScores.slice(0, 5).map((score) => {
                                    const maxScore = Number(score.metric?.max_score || 4);
                                    const normalizedScore = toPercentage(score.score, maxScore);

                                    return (
                                        <div
                                            key={score.id}
                                            className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-3 bg-(--color-bg-secondary) rounded-xl"
                                        >
                                            <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                                                <div className="font-medium text-(--color-text-primary)">
                                                    {/* Translate fixed master metrics in history and preserve custom names. */}
                                                    {translateSystemMasterDataField(
                                                        language,
                                                        'performance_metrics',
                                                        score.metric,
                                                        'display_name',
                                                        t('Performance Review')
                                                    )}
                                                </div>
                                                <div className="text-sm text-(--color-text-tertiary)">
                                                    {score.period_start && score.period_end
                                                        ? `${formatDate(score.period_start, dateLocale)} - ${formatDate(score.period_end, dateLocale)}`
                                                        : t('Recent evaluation')}
                                                </div>
                                            </div>
                                            <div
                                                className={`shrink-0 text-xl font-bold ${getScoreColor(normalizedScore)}`}
                                            >
                                                {score.score}/{maxScore}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </Card>

                <Card title="Improve Your Score">
                    <div className="min-w-0">
                        <div className="grid min-w-0 grid-cols-1 xl:grid-cols-2 gap-4 [&>div]:min-w-0">
                            {[
                                {
                                    icon: 'running',
                                    title: 'Deliver on Time',
                                    desc: 'Meeting deadlines consistently improves your reliability score',
                                },
                                {
                                    icon: 'messages',
                                    title: 'Communicate Clearly',
                                    desc: 'Prompt and clear communication builds trust',
                                },
                                {
                                    icon: 'success',
                                    title: 'Quality First',
                                    desc: 'High-quality work reduces revisions and increases satisfaction',
                                },
                                {
                                    icon: 'reports',
                                    title: 'Stay Compliant',
                                    desc: 'Keep all documents updated and follow policies',
                                },
                            ].map((tip, index) => (
                                <div
                                    key={index}
                                    className="flex items-start gap-3 p-4 bg-(--color-bg-secondary) rounded-xl"
                                >
                                    <span className="shrink-0 text-2xl inline-flex">
                                        <AppIcon name={tip.icon} className="h-6 w-6" />
                                    </span>
                                    <div className="min-w-0 [overflow-wrap:anywhere]">
                                        <h4 className="font-semibold text-(--color-text-primary)">
                                            {/* Tip copy is static application text. */}
                                            {t(tip.title)}
                                        </h4>
                                        <p className="text-sm text-(--color-text-tertiary)">
                                            {/* Tip descriptions are static application text. */}
                                            {t(tip.desc)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>
        </VendorLayout>
    );
}
