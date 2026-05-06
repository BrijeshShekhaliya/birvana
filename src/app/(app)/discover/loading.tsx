import styles from "./loading.module.css";

export default function DiscoverLoading() {
  return (
    <div className={styles.page} aria-hidden="true">
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow} />
          <span className={styles.title} />
          <span className={styles.text} />
        </div>
        <div className={styles.search} />
      </section>

      <section className={styles.categoryDeck}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className={styles.categoryCard} />
        ))}
      </section>

      <section className={styles.shelf}>
        <div className={styles.shelfHeader}>
          <div className={styles.shelfCopy}>
            <span className={styles.eyebrow} />
            <span className={styles.sectionTitle} />
          </div>
          <span className={styles.metaPill} />
        </div>

        <div className={styles.trackRail}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={styles.trackCard} />
          ))}
        </div>
      </section>

      <section className={styles.shelf}>
        <div className={styles.shelfHeader}>
          <div className={styles.shelfCopy}>
            <span className={styles.eyebrow} />
            <span className={styles.sectionTitle} />
          </div>
          <span className={styles.actionPill} />
        </div>

        <div className={styles.playlistRail}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className={styles.playlistCard} />
          ))}
        </div>
      </section>
    </div>
  );
}
