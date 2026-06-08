export function StatCard({ icon: Icon, label, value, detail, tone = "green" }) {
  return (
    <article className={`dir-stat is-${tone}`}>
      <div className="dir-stat-icon">
        <Icon size={18} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </article>
  );
}

export function EmptyChart({ text }) {
  return <div className="dir-empty-chart">{text}</div>;
}
