import type { ReactNode } from 'react';
import type { Severity } from '@code-lens-ai/shared';
import styles from '@/components/IssueCard.module.scss';

const SEVERITY_CLASS: Record<Severity, string> = {
  high: styles.issueCardHigh,
  medium: styles.issueCardMedium,
  low: styles.issueCard,
};

type IssueCardProps = {
  severity: Severity;
  base: number;
  slot: (index: number) => ReactNode;
  typedAt: (index: number) => string;
};

const IssueCard = ({ severity, base, slot, typedAt }: IssueCardProps) => (
  <li className={SEVERITY_CLASS[severity]}>
    <p className={styles.issueCardHead}>
      <span className={styles.issueCardSeverity}>{slot(base)}</span>
      <span className={styles.issueCardCategory}>{slot(base + 1)}</span>
      {typedAt(base + 2) && (
        <span className={styles.issueCardLine}>{slot(base + 2)}</span>
      )}
    </p>
    <p className={styles.issueCardMessage}>{slot(base + 3)}</p>
    {typedAt(base + 4) && (
      <p className={styles.issueCardSuggestion}>{slot(base + 4)}</p>
    )}
  </li>
);

export default IssueCard;