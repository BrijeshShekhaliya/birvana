import styles from "./loading.module.css";

export default function ProfileLoading() {
  return (
    <div className={styles.page}>
      <section className={styles.hero} />
      <section className={styles.stats}>
        <span />
        <span />
        <span />
        <span />
      </section>
      <section className={styles.panel} />
    </div>
  );
}
