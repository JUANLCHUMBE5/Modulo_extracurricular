export default function PortalBadge({ children, tone = "green" }) {
  return <span className={`padres-flow-badge is-${tone}`}>{children}</span>;
}
