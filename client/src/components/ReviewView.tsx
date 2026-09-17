import type { Severity, Review } from '@code-lens-ai/shared';
import IssueCard from '@/components/IssueCard';
import styles from '@/components/ReviewView.module.scss';
import { useTypewriter } from '@/hooks/useTypewriter';

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

  const seg = (index: number) => {
    const text = typedAt(index);
    const active = index === activeLine;
    return (
      <>
        {text}
        {active && <span className={styles.reviewViewCursor} />}
      </>
    );
  };

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
                .map((issue, index) => ({ issue, base: issuesIndex[index] }))
                .filter(({ base }) => line >= base)
                .map(({ issue, base }) => (
                  <IssueCard
                    key={base}
                    severity={issue.severity}
                    base={base}
                    slot={seg}
                    typedAt={typedAt}
                  />
                ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
};

export default ReviewView;