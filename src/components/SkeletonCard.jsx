export default function SkeletonCard() {
  return (
    <div className="skin-card skeleton-card" aria-hidden="true">
      <div className="skel-img" />
      <div className="skin-info">
        <div className="skel-line" />
        <div className="skel-line skel-short" />
        <div className="skel-line" />
        <div className="skel-line skel-xshort" />
      </div>
    </div>
  )
}
