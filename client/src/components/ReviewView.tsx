import styles from '@/components/ReviewView.module.scss';
import { useTypewriter } from '@/hooks/useTypewriter';

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
};

const SEVERITY_META: Record<Severity, { icon: string; label: string }> = {
  high: { icon: '▲', label: 'High' },
  medium: { icon: '■', label: 'Medium' },
  low: { icon: '●', label: 'Low' },
};

const buildReview = (review: Review) => {
  const lines: string[] = [];
  const issuesIndex: number[] = [];

  const push = (text: string) => lines.push(text);

  push([review.language, review.framework].filter(Boolean).join(' · '));
  push('Score');
  push(`${review.score.toFixed(1)} / 10`);
  push('Summary');
  push(review.summary);

  if (review.issues.length === 0) {
    push('No issues found.');
    return { lines, issuesIndex };
  }

  push('Issues');
  review.issues.forEach((issue) => {
    const { icon, label } = SEVERITY_META[issue.severity] ?? SEVERITY_META.low;
    issuesIndex.push(lines.length);
    push(`${icon} ${label}`);
    push(issue.category);
    push(issue.line != null ? `Line ${issue.line}` : '');
    push(issue.message);
    push(issue.suggestion);
  });

  return { lines, issuesIndex };
};

const ReviewView = ({ review }: { review: Review }) => {
  const { lines, issuesIndex } = buildReview(review);
  const { typedAt, activeLine, line, skip } = useTypewriter(lines);

  const segment = (slot: { text: string; active: boolean }) => (
    <>
      {slot.text}
      {slot.active && <span className={styles.reviewViewCursor} />}
    </>
  );
  const seg = (index: number) =>
    segment({ text: typedAt(index), active: index === activeLine });

  return (
    <div className={styles.reviewView} onClick={skip}>
      {typedAt(0) && <p className={styles.reviewViewBadge}>{seg(0)}</p>}

      <div className={styles.reviewViewScore}>
        <span className={styles.reviewViewScoreLabel}>{seg(1)}</span>
        <span className={styles.reviewViewScoreValue}>{seg(2)}</span>
      </div>

      <section className={styles.reviewViewSection}>
        <h2 className={styles.reviewViewHeading}>{seg(3)}</h2>
        <p className={styles.reviewViewSummary}>{seg(4)}</p>
      </section>

      <section className={styles.reviewViewSection}>
        {review.issues.length === 0 ? (
          <p className={styles.reviewViewEmpty}>{seg(5)}</p>
        ) : (
          <>
            <h2 className={styles.reviewViewHeading}>{seg(5)}</h2>
            <ul className={styles.reviewViewIssues}>
              {review.issues
                .map((issue, index) => ({
                  issue,
                  index,
                  base: issuesIndex[index],
                }))
                .filter(({ base }) => line >= base)
                .map(({ issue, index, base }) => (
                  <li
                    key={index}
                    className={`${styles.reviewViewIssue} ${styles[`reviewViewIssue${issue.severity[0].toUpperCase()}${issue.severity.slice(1)}`]}`}
                  >
                    <p className={styles.reviewViewIssueHead}>
                      <span className={styles.reviewViewIssueSeverity}>
                        {seg(base)}
                      </span>
                      <span className={styles.reviewViewIssueCategory}>
                        {seg(base + 1)}
                      </span>
                      {typedAt(base + 2) && (
                        <span className={styles.reviewViewIssueLine}>
                          {seg(base + 2)}
                        </span>
                      )}
                    </p>
                    <p className={styles.reviewViewIssueMessage}>
                      {seg(base + 3)}
                    </p>
                    {typedAt(base + 4) && (
                      <p className={styles.reviewViewIssueSuggestion}>
                        {seg(base + 4)}
                      </p>
                    )}
                  </li>
                ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
};

export default ReviewView;