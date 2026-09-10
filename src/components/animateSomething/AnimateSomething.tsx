import styles from './animateSomething.module.css'

const AnimateSomething = () => {
  const openNoice = () => {
    window.history.pushState({}, '', `${import.meta.env.BASE_URL}noice`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <button type="button" className={styles.animateSomething} onClick={openNoice}>
      <span className={styles.animateSomething__label}>Animate</span>
      <div className={styles.animateSomething__element}/>
      <span className={styles.animateSomething__arrow}>↗</span>
    </button>
  )
}

export default AnimateSomething
