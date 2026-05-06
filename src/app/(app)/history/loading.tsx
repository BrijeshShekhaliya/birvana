import styles from "./loading.module.css";

export default function HistoryLoading() {
  return (
    <div className={styles.page} aria-hidden="true">
      <section className={styles.hero}>
        <span className={styles.eyebrow} />
        <span className={styles.title} />
        <span className={styles.text} />
      </section>

      <section className={styles.list}>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className={styles.row} />
        ))}
      </section>
    </div>
  );
}
