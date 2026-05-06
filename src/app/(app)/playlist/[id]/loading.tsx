import styles from "./loading.module.css";

export default function PlaylistLoading() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.cover} />
        <div className={styles.copy}>
          <div className={styles.lineShort} />
          <div className={styles.lineTitle} />
          <div className={styles.lineMedium} />
          <div className={styles.lineShort} />
          <div className={styles.buttonRow}>
            <div className={styles.button} />
            <div className={styles.button} />
          </div>
          <div className={styles.stats}>
            <div className={styles.stat} />
            <div className={styles.stat} />
            <div className={styles.stat} />
          </div>
        </div>
      </section>

      <section className={styles.list}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className={styles.row} />
        ))}
      </section>
    </div>
  );
}
