import styles from './sendHai.module.css'
const SendHai = ({ onWave }: { onWave: () => void }) => {
  return (
    <button type="button" className={styles.sendHai} onClick={onWave}>
      <span className={styles.sendHai__icon}>👋</span>
      <span>arrivederci</span>
      <span className={styles.sendHai__arrow}>↗</span>
    </button>
  )
}

export default SendHai
