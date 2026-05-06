import styles from "./loading.module.css";

export default function LibraryLoading() {
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

      <section className={styles.banner} />

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.sectionTitle} />
          <span className={styles.action} />
        </div>
        <div className={styles.collectionGrid}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={styles.collectionCard} />
          ))}
        </div>
      </section>
    </div>
  );
}
