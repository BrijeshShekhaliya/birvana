import styles from "./loading.module.css";

export default function AppLoading() {
  return (
    <div className={styles.page} aria-hidden="true">
      <div className={styles.hero} />
      <div className={styles.row} />
      <div className={styles.panelGrid}>
        <div className={styles.card} />
        <div className={styles.card} />
      </div>
      <div className={styles.list} />
    </div>
  );
}
