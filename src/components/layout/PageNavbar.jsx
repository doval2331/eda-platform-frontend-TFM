export function PageNavbar({ breadcrumbParent, breadcrumbCurrent, title, description, rightSlot }) {
  return (
    <header className="page-navbar">
      <div className="page-navbar-inner">
        <div className="page-navbar-text">
          {breadcrumbParent || breadcrumbCurrent ? (
            <nav className="page-breadcrumb" aria-label="Breadcrumb">
              {breadcrumbParent ? <span>{breadcrumbParent}</span> : null}
              {breadcrumbParent && breadcrumbCurrent ? (
                <span className="page-breadcrumb-sep" aria-hidden>
                  /
                </span>
              ) : null}
              {breadcrumbCurrent ? <span>{breadcrumbCurrent}</span> : null}
            </nav>
          ) : null}
          <h1 className="page-navbar-title">{title}</h1>
          {description ? <p className="page-navbar-desc">{description}</p> : null}
        </div>
        {rightSlot ? <div className="page-navbar-actions">{rightSlot}</div> : null}
      </div>
    </header>
  )
}
