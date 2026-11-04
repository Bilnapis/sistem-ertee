type PageIntroProps = {
  id: string
  title: string
  description: string
}

export function PageIntro({ id, title, description }: PageIntroProps) {
  return (
    <div className="min-w-0">
      <h1
        id={id}
        className="text-[2rem] leading-tight font-bold tracking-[-0.02em] wrap-anywhere @max-[33rem]/page:text-[1.75rem]"
      >
        {title}
      </h1>
      <p className="mt-1.5 max-w-[65ch] text-sm leading-normal text-pretty wrap-anywhere text-muted">
        {description}
      </p>
    </div>
  )
}
