import { Link } from 'react-router-dom';
import { useLogoStyles } from './Logo.styles';

export function Logo() {
  const styles = useLogoStyles();

  return (
    <Link to="/" className={styles.root}>
      <img src="/logo.png" alt="Veidne" className={styles.icon} />
      <span className={styles.text}>VEIDNE</span>
    </Link>
  );
}
