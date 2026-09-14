export default function Panel({ title, action, children, style, className = '' }) {
  return (
    <section className={`panel ${className}`} style={style}>
      {(title || action) && (
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          {title && (
            <h3 className="card-title" style={{ margin: 0 }}>
              {title}
            </h3>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
