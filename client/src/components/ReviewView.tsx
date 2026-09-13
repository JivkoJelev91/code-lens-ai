import '@/components/ReviewView.scss';

export type Severity = 'high' | 'medium' | 'low';

export type Issue = {
  severity: Severity;
  category: string;
  line: number | null;
  message: string;
  suggestion: string;
};

export type Review = {
  language: string;
  framework: string;
  score: number;
  summary: string;
  issues: Issue[];
  improvements: string[];
  refactoredCode: string;
};

const SEVERITY_META: Record<Severity, { icon: string; label: string }> = {
  high: { icon: '⛔', label: 'High' },
  medium: { icon: '⚠️', label: 'Medium' },
  low: { icon: '💡', label: 'Low' },
};

const ReviewView = ({ review }: { review: Review }) => {
  const badge = [review.language, review.framework].filter(Boolean).join(' · ');

  return (
    <div className="review-view">
      {badge && <p className="review-view__badge">{badge}</p>}

      <div className="review-view__score">
        <span className="review-view__score-label">Score</span>
        <span className="review-view__score-value">
          {review.score.toFixed(1)} <span>/ 10</span>
        </span>
      </div>

      <section className="review-view__section">
        <h2 className="review-view__heading">Summary</h2>
        <p className="review-view__summary">{review.summary}</p>
      </section>

      <section className="review-view__section">
        <h2 className="review-view__heading">Issues</h2>
        {review.issues.length === 0 ? (
          <p className="review-view__empty">No issues found.</p>
        ) : (
          <ul className="review-view__issues">
            {review.issues.map((issue, index) => {
              const meta = SEVERITY_META[issue.severity] ?? SEVERITY_META.low;
              return (
                <li
                  key={index}
                  className={`review-view__issue review-view__issue--${issue.severity}`}
                >
                  <p className="review-view__issue-head">
                    <span className="review-view__issue-severity">
                      {meta.icon} {meta.label}
                    </span>
                    <span className="review-view__issue-category">{issue.category}</span>
                    {issue.line != null && (
                      <span className="review-view__issue-line">Line {issue.line}</span>
                    )}
                  </p>
                  <p className="review-view__issue-message">{issue.message}</p>
                  {issue.suggestion && (
                    <p className="review-view__issue-suggestion">{issue.suggestion}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default ReviewView;