import styles from "./loading.module.css";

export default function LikedLoading() {
  return (
    <div className={styles.page} aria-hidden="true">
      <section className={styles.hero}>
        <div className={styles.copy}>
          <span className={styles.eyebrow} />
          <span className={styles.title} />
          <span className={styles.text} />
        </div>
        <div className={styles.stats}>
          <div className={styles.statCard} />
          <div className={styles.statCard} />
          <div className={styles.statCard} />
        </div>
      </section>

      <section className={styles.listSection}>
        <div className={styles.listHeader}>
          <div className={styles.copy}>
            <span className={styles.eyebrow} />
            <span className={styles.sectionTitle} />
          </div>
          <span className={styles.meta} />
        </div>

        <div className={styles.list}>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className={styles.row} />
          ))}
        </div>
      </section>
    </div>
  );
}
