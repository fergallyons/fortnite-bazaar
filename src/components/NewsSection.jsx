export default function NewsSection({ items }) {
  if (!items.length) return null
  return (
    <section className="news-section">
      <h2 className="section-title">Fortnite News</h2>
      <div className="news-scroll">
        {items.map(item => (
          <div key={item.id} className="news-card">
            {item.image && (
              <div className="news-img">
                <img src={item.image} alt={item.title} loading="lazy" />
              </div>
            )}
            <div className="news-body">
              <h3 className="news-title">{item.title}</h3>
              <p className="news-text">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
