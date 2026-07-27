import React from 'react';
import { ArrowRight, Search } from 'lucide-react';

export const PageIntro = ({ eyebrow, title, description, action, children, className = '' }) => (
  <section className={`portal-hero ${className}`}>
    <div className="portal-hero__glow" />
    <div className="relative z-10 max-w-3xl">
      <p className="portal-eyebrow">{eyebrow}</p>
      <h1 className="portal-title">{title}</h1>
      {description && <p className="portal-lede">{description}</p>}
      {children}
    </div>
    {action && <div className="relative z-10 shrink-0">{action}</div>}
  </section>
);

export const StatPill = ({ icon: Icon, value, label, tone = 'blue' }) => (
  <div className={`portal-stat portal-stat--${tone}`}>
    <span className="portal-stat__icon"><Icon aria-hidden="true" /></span>
    <span><strong>{value}</strong><small>{label}</small></span>
  </div>
);

export const SearchField = ({ value, onChange, placeholder, label = 'Search' }) => (
  <label className="portal-search">
    <span className="sr-only">{label}</span>
    <Search aria-hidden="true" />
    <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
  </label>
);

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="portal-empty">
    <span className="portal-empty__icon"><Icon aria-hidden="true" /></span>
    <h2>{title}</h2>
    <p>{description}</p>
    {action}
  </div>
);

export const Modal = ({ title, description, onClose, children }) => (
  <div className="portal-modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section
      className="portal-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portal-modal-title"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="portal-modal__head">
        <div>
          <p className="portal-eyebrow">Create new</p>
          <h2 id="portal-modal-title">{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <button type="button" className="portal-icon-button" onClick={onClose} aria-label="Close dialog">×</button>
      </div>
      {children}
    </section>
  </div>
);

export const SectionLink = ({ children, onClick }) => (
  <button type="button" className="portal-text-link" onClick={onClick}>
    {children}<ArrowRight aria-hidden="true" />
  </button>
);
