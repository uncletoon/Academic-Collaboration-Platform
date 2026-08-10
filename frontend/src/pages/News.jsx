import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  Download,
  Edit3,
  FileText,
  ImagePlus,
  Newspaper,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const categories = ['All', 'Students', 'Books', 'Opportunities', 'Campus', 'Other'];
const emptyForm = { title: '', description: '', category: 'Students', link: '' };

const News = () => {
  const { user } = useAuth();
  const canPublish = ['admin', 'institution_admin'].includes(user?.role);
  const canManageItem = (item) => user?.role === 'admin' || (
    user?.role === 'institution_admin'
    && Number(item.institution_id) === Number(user.institution_id)
  );
  const storyId = Number(window.location.pathname.match(/^\/news\/(\d+)\/?$/)?.[1]) || null;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [featureImage, setFeatureImage] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadNews = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getNews();
      setItems(response.news || []);
    } catch (err) {
      setError(err.message || 'Unable to load news.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNews(); }, [loadNews]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = category === 'All' || item.category === category;
      const matchesTerm = !term
        || item.title.toLowerCase().includes(term)
        || item.description.toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [items, query, category]);

  const openCreate = () => {
    setEditing({ mode: 'create' });
    setForm(emptyForm);
    setFeatureImage(null);
    setDocuments([]);
    setError('');
  };

  const openEdit = (item) => {
    setEditing({ mode: 'edit', item });
    setForm({
      title: item.title,
      description: item.description,
      category: item.category || 'Other',
      link: item.external_link || '',
    });
    setFeatureImage(null);
    setDocuments([]);
    setError('');
  };

  const closeEditor = () => {
    setEditing(null);
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.description.trim() || (editing.mode === 'create' && !featureImage)) {
      setError('Add a title, description, and feature image.');
      return;
    }
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    if (featureImage) data.append('featureImage', featureImage);
    documents.forEach((file) => data.append('supportiveDocuments', file));

    setSaving(true);
    setError('');
    try {
      if (editing.mode === 'create') await api.createNews(data);
      else await api.updateNews(editing.item.id, data);
      closeEditor();
      await loadNews();
    } catch (err) {
      setError(err.message || 'Unable to save news.');
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (item) => {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    try {
      await api.deleteNews(item.id);
      if (storyId === item.id) {
        window.location.assign('/news');
        return;
      }
      await loadNews();
    } catch (err) {
      setError(err.message || 'Unable to delete news.');
    }
  };

  const removeExistingDocument = async (documentId) => {
    try {
      await api.deleteNewsDocument(editing.item.id, documentId);
      setEditing((current) => ({
        ...current,
        item: {
          ...current.item,
          documents: current.item.documents.filter((document) => document.id !== documentId),
        },
      }));
      setItems((current) => current.map((item) => item.id === editing.item.id
        ? { ...item, documents: item.documents.filter((document) => document.id !== documentId) }
        : item));
    } catch (err) {
      setError(err.message || 'Unable to remove document.');
    }
  };

  const story = storyId ? items.find((item) => item.id === storyId) : null;

  const editorPanel = editing && (
    <div className="news-modal-backdrop">
      <section className="news-editor" role="dialog" aria-modal="true" aria-labelledby="news-editor-title">
        <header>
          <div>
            <p className="news-kicker">Institution newsroom</p>
            <h2 id="news-editor-title">{editing.mode === 'create' ? 'Publish a news story' : 'Edit news story'}</h2>
          </div>
          <button className="news-close news-close--static" onClick={closeEditor} aria-label="Close editor"><X /></button>
        </header>
        <form onSubmit={submit}>
          <label>Title <span>*</span>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength="255" required />
          </label>
          <label>Description <span>*</span>
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows="7" required />
          </label>
          <div className="news-form-grid">
            <label>Category
              <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                {categories.filter((name) => name !== 'All').map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>
            <label>Related link <em>Optional</em>
              <input type="url" placeholder="https://…" value={form.link} onChange={(event) => setForm({ ...form, link: event.target.value })} />
            </label>
          </div>
          <label className="news-upload">
            <ImagePlus />
            <span><strong>{featureImage?.name || (editing.mode === 'edit' ? 'Replace feature image' : 'Choose feature image *')}</strong><small>JPG, PNG, or WebP · Max 15 MB</small></span>
            <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(event) => setFeatureImage(event.target.files[0] || null)} required={editing.mode === 'create'} />
          </label>
          <label className="news-upload">
            <FileText />
            <span><strong>{documents.length ? `${documents.length} new document(s) selected` : 'Add supportive documents'}</strong><small>Optional · Up to 8 files</small></span>
            <input type="file" multiple onChange={(event) => setDocuments(Array.from(event.target.files).slice(0, 8))} />
          </label>
          {editing.item?.documents?.length > 0 && (
            <div className="news-existing-files">
              <small>Existing documents</small>
              {editing.item.documents.map((document) => (
                <div key={document.id}><FileText /><span>{document.filename}</span><button type="button" onClick={() => removeExistingDocument(document.id)} aria-label={`Remove ${document.filename}`}><X /></button></div>
              ))}
            </div>
          )}
          {error && <div className="news-alert" role="alert">{error}</div>}
          <footer>
            <button type="button" className="news-button news-button--quiet" onClick={closeEditor}>Cancel</button>
            <button type="submit" className="news-button news-button--primary" disabled={saving}>{saving ? 'Saving…' : editing.mode === 'create' ? 'Publish news' : 'Save changes'}</button>
          </footer>
        </form>
      </section>
    </div>
  );

  if (storyId) {
    return (
      <main className="news-page news-story-page news-standalone-page animate-fade-in">
        {loading ? (
          <div className="news-empty">Loading story…</div>
        ) : !story ? (
          <div className="news-empty">
            <Newspaper />
            <h1>News story not found</h1>
            <p>It may have been removed or the link is incorrect.</p>
          </div>
        ) : (
          <article className="news-reader news-reader--page" aria-labelledby="news-reader-title">
            <img className="news-reader__image" src={api.getAssetUrl(story.feature_image)} alt="" />
            <div className="news-reader__content">
              <div className="news-reader__meta">
                <span>{story.category}</span>
                <time>{new Date(story.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</time>
              </div>
              <h1 id="news-reader-title">{story.title}</h1>
              <p>{story.description}</p>
              {(story.documents?.length > 0 || story.external_link) && (
                <div className="news-resources">
                  <h2>Resources</h2>
                  {story.documents?.map((document) => (
                    <button key={document.id} onClick={() => api.downloadNewsDocument(story.id, document)}>
                      <FileText /> <span>{document.filename}</span> <Download />
                    </button>
                  ))}
                  {story.external_link && (
                    <a href={story.external_link} target="_blank" rel="noreferrer">
                      <ArrowUpRight /> Visit related link
                    </a>
                  )}
                </div>
              )}
            </div>
          </article>
        )}
      </main>
    );
  }

  return (
    <main className="news-page animate-fade-in">
      <section className="news-hero">
        <div>
          <p className="news-kicker"><Newspaper /> Newsroom</p>
          <h1>What’s happening in our academic community</h1>
          <p>Official updates for students, new books, opportunities, and everything that keeps our community moving.</p>
        </div>
        {canPublish && (
          <button className="news-button news-button--primary" onClick={openCreate}>
            <Plus /> Publish news
          </button>
        )}
      </section>

      <section className="news-controls" aria-label="News filters">
        <label className="news-search">
          <Search />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search news..."
            aria-label="Search news"
          />
        </label>
        <div className="news-categories">
          {categories.map((name) => (
            <button
              key={name}
              aria-pressed={category === name}
              onClick={() => setCategory(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </section>

      {error && !editing && <div className="news-alert" role="alert">{error}</div>}

      {loading ? (
        <div className="news-empty">Loading the latest updates…</div>
      ) : filtered.length === 0 ? (
        <div className="news-empty">
          <Newspaper />
          <h2>No news found</h2>
          <p>{query || category !== 'All' ? 'Try a different search or category.' : 'Published news will appear here.'}</p>
        </div>
      ) : (
        <section className="news-grid" aria-label="Available news">
          {filtered.map((item, index) => (
            <article className={`news-card ${index === 0 ? 'news-card--lead' : ''}`} key={item.id}>
              <a className="news-card__open" href={`/news/${item.id}`} target="_blank" rel="noopener noreferrer" aria-label={`Read ${item.title} in a new tab`}>
                <div className="news-card__image">
                  <img src={api.getAssetUrl(item.feature_image)} alt="" />
                  <span>{item.category}</span>
                </div>
                <div className="news-card__body">
                  <div className="news-date"><CalendarDays /> {new Date(item.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                  <span className="news-read">Read full story <ArrowUpRight /></span>
                </div>
              </a>
              {canManageItem(item) && (
                <div className="news-card__admin">
                  <button onClick={() => openEdit(item)}><Edit3 /> Edit</button>
                  <button className="is-danger" onClick={() => removeItem(item)}><Trash2 /> Delete</button>
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      {editorPanel}
    </main>
  );
};

export default News;
