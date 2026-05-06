import Image from "next/image";
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
        <Image
          src="/brand/birvana-mark.png"
          alt=""
          width={44}
          height={44}
          sizes="(max-width: 640px) 36px, 41px"
          className={styles.markImage}
        />
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
