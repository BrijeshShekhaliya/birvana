import Link from "next/link";
import styles from "./SectionTitle.module.css";

export function SectionTitle({
  eyebrow,
  title,
  meta,
  actionLabel,
  actionHref,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className={styles.wrap}>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.title}>{title}</h2>
      </div>
      <div className={styles.side}>
        {meta ? <p className={styles.meta}>{meta}</p> : null}
        {actionLabel && actionHref ? (
          <Link href={actionHref} className={styles.action}>
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
