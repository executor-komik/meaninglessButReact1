import styles from './apiFetcher.module.css';

const ApiFetcher = ({ label = 'Daily Challenge' }: { label?: string }) => {

    const openDailyChallenge = () => {
      window.open('https://leetcode.com/problemset/', '_blank', 'noopener,noreferrer');
    };


  return (
    <button type="button" className={styles.apiFetcher} onClick={openDailyChallenge}>
      <span className={styles.apiFetcher__icon}>↯</span>
      <span>{label}</span>
      <span className={styles.apiFetcher__arrow}>↗</span>
    </button>
  )
};

export default ApiFetcher;
