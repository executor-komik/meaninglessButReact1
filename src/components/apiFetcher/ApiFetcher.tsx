import type { FC } from 'react';
import styles from './apiFetcher.module.css';

const ApiFetcher: FC = () => {

    const openDailyChallenge = () => {
      window.open('https://leetcode.com/problemset/', '_blank', 'noopener,noreferrer');
    };


  return (
    <button type="button" className={styles.apiFetcher} onClick={openDailyChallenge}>
      <span className={styles.apiFetcher__icon}>↯</span>
      <span>Daily Challenge</span>
      <span className={styles.apiFetcher__arrow}>↗</span>
    </button>
  )
};

export default ApiFetcher;
