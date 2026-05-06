import Link from "next/link";
import styles from "./AppFooter.module.css";

const footerLinks = [
  { href: "/discover", label: "Discover" },
  { href: "/library", label: "Library" },
  { href: "/artists", label: "Artists" },
];

export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.brandRow}>
        <div>
          <p className={styles.brand}>BIRVANA</p>
          <p className={styles.caption}>Listen, collect, and publish from one clean music space.</p>
        </div>
        <div className={styles.links}>
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className={styles.link}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
