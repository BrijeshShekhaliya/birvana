import Link from "next/link";
import styles from "./BrandLockup.module.css";

type BrandLockupProps = {
  badge?: string;
  className?: string;
  href?: string;
};

function buildClassName(className?: string) {
  return [styles.root, className].filter(Boolean).join(" ");
}

function Content({ badge }: Pick<BrandLockupProps, "badge">) {
  return (
    <>
      <span className={styles.mark} aria-hidden="true">
        <span className={styles.letter}>B</span>
      </span>
      <span className={styles.wordmark}>BIRVANA</span>
      {badge ? <span className={styles.badge}>{badge}</span> : null}
    </>
  );
}

export function BrandLockup({ badge, className, href }: BrandLockupProps) {
  const combinedClassName = buildClassName(className);

  if (href) {
    return (
      <Link href={href} className={combinedClassName}>
        <Content badge={badge} />
      </Link>
    );
  }

  return (
    <div className={combinedClassName}>
      <Content badge={badge} />
    </div>
  );
}
