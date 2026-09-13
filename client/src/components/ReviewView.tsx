import styles from '@/components/ReviewView.module.scss';

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
  high: { icon: '▲', label: 'High' },
  medium: { icon: '■', label: 'Medium' },
  low: { icon: '●', label: 'Low' },
};

const ReviewView = ({ review }: { review: Review }) => {
  const badge = [review.language, review.framework].filter(Boolean).join(' · ');

  return (
    <div className={styles.reviewView}>
      {badge && <p className={styles.reviewViewBadge}>{badge}</p>}

      <div className={styles.reviewViewScore}>
        <span className={styles.reviewViewScoreLabel}>Score</span>
        <span className={styles.reviewViewScoreValue}>
          {review.score.toFixed(1)} <span>/ 10</span>
        </span>
      </div>

      <section className={styles.reviewViewSection}>
        <h2 className={styles.reviewViewHeading}>Summary</h2>
        <p className={styles.reviewViewSummary}>{review.summary}</p>
      </section>

      <section className={styles.reviewViewSection}>
        <h2 className={styles.reviewViewHeading}>Issues</h2>
        {review.issues.length === 0 ? (
          <p className={styles.reviewViewEmpty}>No issues found.</p>
        ) : (
          <ul className={styles.reviewViewIssues}>
            {review.issues.map((issue, index) => {
              const meta = SEVERITY_META[issue.severity] ?? SEVERITY_META.low;
              const severityClass = `reviewViewIssue${issue.severity[0].toUpperCase()}${issue.severity.slice(1)}`;
              return (
                <li
                  key={index}
                  className={`${styles.reviewViewIssue} ${styles[severityClass]}`}
                >
                  <p className={styles.reviewViewIssueHead}>
                    <span className={styles.reviewViewIssueSeverity}>
                      {meta.icon} {meta.label}
                    </span>
                    <span className={styles.reviewViewIssueCategory}>
                      {issue.category}
                    </span>
                    {issue.line != null && (
                      <span className={styles.reviewViewIssueLine}>
                        Line {issue.line}
                      </span>
                    )}
                  </p>
                  <p className={styles.reviewViewIssueMessage}>{issue.message}</p>
                  {issue.suggestion && (
                    <p className={styles.reviewViewIssueSuggestion}>
                      {issue.suggestion}
                    </p>
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