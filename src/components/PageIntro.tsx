import styles from './PageIntro.module.css'

type PageIntroProps = {
  id: string
  title: string
  description: string
}

export function PageIntro({ id, title, description }: PageIntroProps) {
  return (
    <div className={styles.intro}>
      <h1 id={id} className={styles.title}>
        {title}
      </h1>
      <p className={styles.description}>{description}</p>
    </div>
  )
}
