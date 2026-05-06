import Link from "next/link";
import styles from "./EmptyState.module.css";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className={styles.card}>
      <p className={styles.title}>{title}</p>
      <p className={styles.description}>{description}</p>
      {actionLabel && actionHref ? (
        <div className={styles.actions}>
          <Link href={actionHref} className={styles.linkButton}>
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
