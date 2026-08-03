import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Download,
  Eye,
  FilePlus2,
  FileText,
  FolderLock,
  Globe2,
  LogOut,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
  title: '',
  description: '',
  requirements: [''],
  accessScope: 'everyone',
  status: 'planning',
  files: [],
};

const formatDate = (value) =>
  new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));

const formatBytes = (bytes) => {
  const value = Number(bytes);
  if (!value) return 'Document';
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const Modal = ({ eyebrow, title, description, onClose, wide = false, children }) => {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const onKeyDown = (event) => event.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);
  return (
    <div className="collab-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`collab-modal ${wide ? 'collab-modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="collab-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="collab-modal__head">
          <div>
            <p className="collab-kicker">{eyebrow}</p>
            <h2 id="collab-modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="collab-icon-button" onClick={onClose} aria-label="Close dialog">
            <X aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
};

const ProjectsPage = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [members, setMembers] = useState([]);
  const [files, setFiles] = useState([]);
  const [requests, setRequests] = useState([]);
  const [access, setAccess] = useState({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const notify = (text, tone = 'success') => {
    setMessage({ text, tone });
    window.setTimeout(() => setMessage(null), 4500);
  };

  const loadProjects = async () => {
    setLoading(true);
    try {
      const result = await api.getProjects();
      setProjects(result.projects || []);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const openProject = async (projectOrId, updateUrl = true) => {
    const id = typeof projectOrId === 'object' ? projectOrId.id : projectOrId;
    setDetailLoading(true);
    try {
      const result = await api.getProjectDetails(id);
      setSelected(result.project);
      setMembers(result.members || []);
      setFiles(result.files || []);
      setRequests(result.requests || []);
      setAccess(result.access || {});
      if (updateUrl) window.history.replaceState(null, '', `/projects?id=${id}`);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    const projectId = new URLSearchParams(window.location.search).get('id');
    if (projectId) openProject(projectId, false);
  }, []);

  const visibleProjects = useMemo(
    () =>
      projects.filter((project) => {
        const matchesSearch = `${project.title} ${project.description} ${project.creator_name || ''}`
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchesFilter =
          filter === 'all' ||
          (filter === 'mine' && project.membership_status === 'owner') ||
          (filter === 'joined' && project.membership_status === 'member') ||
          (filter === 'available' && ['available', 'pending', 'rejected'].includes(project.membership_status));
        return matchesSearch && matchesFilter;
      }),
    [projects, search, filter],
  );

  const resetAndClose = () => {
    setForm(emptyForm);
    setShowCreate(false);
    setShowEdit(false);
  };

  const changeRequirement = (index, value) => {
    setForm((current) => ({
      ...current,
      requirements: current.requirements.map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  };

  const removeRequirement = (index) => {
    setForm((current) => ({
      ...current,
      requirements: current.requirements.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const createProject = async (event) => {
    event.preventDefault();
    const body = new FormData();
    body.append('title', form.title);
    body.append('description', form.description);
    body.append('requirements', JSON.stringify(form.requirements.filter((item) => item.trim())));
    body.append('accessScope', form.accessScope);
    form.files.forEach((file) => body.append('supportiveDocuments', file));
    setBusy(true);
    try {
      const result = await api.createProject(body);
      resetAndClose();
      await loadProjects();
      notify(result.message);
      await openProject(result.project.id);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const beginEdit = () => {
    setForm({
      title: selected.title,
      description: selected.description,
      requirements: selected.requirements?.length ? selected.requirements : [''],
      accessScope: selected.access_scope,
      status: selected.status,
      files: [],
    });
    setShowEdit(true);
  };

  const updateProject = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api.updateProject(selected.id, {
        title: form.title,
        description: form.description,
        requirements: form.requirements.filter((item) => item.trim()),
        accessScope: form.accessScope,
        status: form.status,
      });
      setShowEdit(false);
      await Promise.all([openProject(selected.id), loadProjects()]);
      notify(result.message);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const requestAccess = async () => {
    setBusy(true);
    try {
      const result = await api.requestToJoinProject(selected.id);
      await Promise.all([openProject(selected.id), loadProjects()]);
      notify(result.message);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const respondToRequest = async (requestId, action) => {
    setBusy(true);
    try {
      const result = await api.respondToProjectRequest(selected.id, requestId, action);
      await Promise.all([openProject(selected.id), loadProjects()]);
      notify(result.message);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const leaveProject = async () => {
    if (!window.confirm('Leave this collaboration? You will lose access to its members and documents.')) return;
    setBusy(true);
    try {
      const result = await api.leaveProject(selected.id);
      await Promise.all([openProject(selected.id), loadProjects()]);
      notify(result.message);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (memberId) => {
    if (!window.confirm('Remove this member from the collaboration?')) return;
    try {
      const result = await api.removeProjectMember(selected.id, memberId);
      await openProject(selected.id);
      notify(result.message);
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const uploadDocument = async (event) => {
    const document = event.target.files?.[0];
    event.target.value = '';
    if (!document) return;
    const body = new FormData();
    body.append('projectFile', document);
    setBusy(true);
    try {
      const result = await api.uploadProjectFile(selected.id, body);
      await openProject(selected.id);
      notify(result.message);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const accessDocument = async (file, mode) => {
    try {
      if (mode === 'read') await api.readProjectFile(selected.id, file);
      else await api.downloadProjectFile(selected.id, file);
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const deleteDocument = async (fileId) => {
    if (!window.confirm('Delete this supportive document permanently?')) return;
    try {
      const result = await api.deleteProjectFile(selected.id, fileId);
      await openProject(selected.id);
      notify(result.message);
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const deleteProject = async () => {
    if (!window.confirm(`Delete "${selected.title}" and all of its documents? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const result = await api.deleteProject(selected.id);
      setSelected(null);
      window.history.replaceState(null, '', '/projects');
      await loadProjects();
      notify(result.message);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setShowMembers(false);
    setShowRequests(false);
    window.history.replaceState(null, '', '/projects');
  };

  const createdCount = projects.filter((project) => project.membership_status === 'owner').length;
  const joinedCount = projects.filter((project) => project.membership_status === 'member').length;
  const availableCount = projects.filter((project) =>
    ['available', 'pending', 'rejected'].includes(project.membership_status),
  ).length;

  const projectForm = (onSubmit, editing = false) => (
    <form className="collab-form" onSubmit={onSubmit}>
      <label>
        <span>Project title</span>
        <input
          autoFocus
          required
          maxLength="255"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          placeholder="A clear, specific topic"
        />
      </label>
      <label>
        <span>Description</span>
        <textarea
          required
          rows="5"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          placeholder="Describe the purpose, context, and intended outcome."
        />
      </label>
      <fieldset className="collab-requirement-editor">
        <legend>Requirements</legend>
        <p>Add the conditions a prospective collaborator must meet.</p>
        {form.requirements.map((requirement, index) => (
          <div key={index}>
            <CheckCircle2 aria-hidden="true" />
            <input
              required
              value={requirement}
              onChange={(event) => changeRequirement(index, event.target.value)}
              placeholder={`Requirement ${index + 1}`}
            />
            {form.requirements.length > 1 && (
              <button type="button" onClick={() => removeRequirement(index)} aria-label={`Remove requirement ${index + 1}`}>
                <X aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="collab-inline-action"
          onClick={() => setForm({ ...form, requirements: [...form.requirements, ''] })}
        >
          <Plus aria-hidden="true" /> Add requirement
        </button>
      </fieldset>
      <fieldset className="collab-access-picker">
        <legend>Who may request to join?</legend>
        <p className="collab-field-note">
          Every project stays private. This setting only controls who may send a join request.
        </p>
        <label className={form.accessScope === 'everyone' ? 'is-selected' : ''}>
          <input
            type="radio"
            name="accessScope"
            value="everyone"
            checked={form.accessScope === 'everyone'}
            onChange={(event) => setForm({ ...form, accessScope: event.target.value })}
          />
          <Globe2 aria-hidden="true" />
          <span><strong>Everyone</strong><small>Any active user can send a request.</small></span>
          <Check aria-hidden="true" />
        </label>
        <label className={form.accessScope === 'institution' ? 'is-selected' : ''}>
          <input
            type="radio"
            name="accessScope"
            value="institution"
            checked={form.accessScope === 'institution'}
            onChange={(event) => setForm({ ...form, accessScope: event.target.value })}
            disabled={!user?.institution_id}
          />
          <Building2 aria-hidden="true" />
          <span>
            <strong>My institution only</strong>
            <small>{user?.institution_name || 'Add an institution to your profile first.'}</small>
          </span>
          <Check aria-hidden="true" />
        </label>
      </fieldset>
      {editing ? (
        <label>
          <span>Project status</span>
          <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </label>
      ) : (
        <label className="collab-file-drop">
          <FilePlus2 aria-hidden="true" />
          <span>
            <strong>Supportive documents <em>Optional</em></strong>
            <small>{form.files.length ? `${form.files.length} file${form.files.length === 1 ? '' : 's'} selected` : 'You can add briefs, papers, datasets, or references now or later.'}</small>
          </span>
          <input
            type="file"
            multiple
            onChange={(event) => setForm({ ...form, files: Array.from(event.target.files || []) })}
          />
        </label>
      )}
      <div className={`collab-form__actions ${editing ? 'collab-form__actions--editing' : ''}`}>
        {editing && (
          <button type="button" className="collab-button collab-button--danger" onClick={deleteProject} disabled={busy}>
            <Trash2 aria-hidden="true" /> Delete project
          </button>
        )}
        <button type="button" className="collab-button collab-button--quiet" onClick={resetAndClose}>Cancel</button>
        <button className="collab-button collab-button--primary" disabled={busy}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Create collaboration'}
        </button>
      </div>
    </form>
  );

  if (selected || detailLoading) {
    if (!selected) return <div className="collab-loading">Opening collaboration…</div>;
    const canRequest = !access.isMember && !access.canManage && access.requestStatus !== 'pending';
    return (
      <div className="collab-page collab-detail">
        {message && <div className={`collab-toast collab-toast--${message.tone}`} role="status">{message.text}</div>}
        <button className="collab-back" onClick={closeDetail}><ArrowLeft aria-hidden="true" /> Collaboration directory</button>

        <header className="collab-detail-hero">
          <div className="collab-detail-hero__main">
            <div className="collab-breadcrumb"><FolderLock aria-hidden="true" /> Private project workspace</div>
            <h1>{selected.title}</h1>
            <p>{selected.description}</p>
            <div className="collab-detail-meta">
              <span><UserRoundCheck aria-hidden="true" /> Led by {selected.creator_name}</span>
              <span>
                {selected.access_scope === 'institution' ? <Building2 aria-hidden="true" /> : <Globe2 aria-hidden="true" />}
                {selected.access_scope === 'institution' ? selected.institution_name : 'Requests open to everyone'}
              </span>
              <span><Clock3 aria-hidden="true" /> Started {formatDate(selected.created_at)}</span>
              <span className={`collab-status collab-status--${selected.status}`}>{selected.status}</span>
              {access.isMember && (
                <button className="collab-detail-members" onClick={() => setShowMembers(true)}>
                  <Users aria-hidden="true" />
                  {members.length} {members.length === 1 ? 'member' : 'members'}
                  <ChevronRight aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="collab-hero-access">
              <div>
                <ShieldCheck aria-hidden="true" />
                <span>
                  <strong>{access.isMember ? 'Private access granted' : 'Private overview'}</strong>
                  <small>{access.isMember ? 'You can view the team and supportive documents.' : 'Join requests are reviewed by the project owner.'}</small>
                </span>
              </div>
              <div>
                {access.canManage && requests.length > 0 && (
                  <button className="collab-button collab-button--request" onClick={() => setShowRequests(true)}>
                    <Users aria-hidden="true" /> {requests.length} pending
                  </button>
                )}
                {access.canManage && <button className="collab-button collab-button--quiet" onClick={beginEdit}><Pencil aria-hidden="true" /> Edit</button>}
                {access.isMember && !access.isOwner && !access.isAdmin && (
                  <button className="collab-button collab-button--quiet" onClick={leaveProject}><LogOut aria-hidden="true" /> Leave</button>
                )}
                {access.requestStatus === 'pending' && (
                  <button className="collab-button collab-button--pending" disabled><Clock3 aria-hidden="true" /> Request pending</button>
                )}
                {canRequest && (
                  <button className="collab-button collab-button--primary" onClick={requestAccess} disabled={busy}>
                    <UserRoundCheck aria-hidden="true" /> Request to join
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="collab-detail-grid">
          <section className="collab-paper">
            <div className="collab-section-title">
              <span>01</span>
              <div><p className="collab-kicker">Before you request</p><h2>Project requirements</h2></div>
            </div>
            <ul className="collab-checklist">
              {(selected.requirements || []).map((requirement, index) => (
                <li key={`${requirement}-${index}`}><span><Check aria-hidden="true" /></span><p>{requirement}</p></li>
              ))}
            </ul>
          </section>

          <section className={`collab-paper ${!access.isMember ? 'collab-paper--locked' : ''}`}>
            <div className="collab-section-title">
              <span>02</span>
              <div><p className="collab-kicker">Supportive material</p><h2>Project documents</h2></div>
              {access.canManage && (
                <label className="collab-button collab-button--quiet collab-upload">
                  <FilePlus2 aria-hidden="true" /> Add document
                  <input type="file" onChange={uploadDocument} />
                </label>
              )}
            </div>
            {!access.isMember ? (
              <div className="collab-locked-state">
                <FolderLock aria-hidden="true" />
                <div><strong>Documents are private</strong><p>Become a member to read or download supportive files.</p></div>
              </div>
            ) : files.length ? (
              <div className="collab-document-list">
                {files.map((file) => (
                  <article key={file.id}>
                    <span className="collab-document-icon"><FileText aria-hidden="true" /></span>
                    <div>
                      <strong>{file.filename}</strong>
                      <small>{formatBytes(file.file_size)} · Added {formatDate(file.uploaded_at)}</small>
                    </div>
                    <div>
                      <button onClick={() => accessDocument(file, 'read')}><Eye aria-hidden="true" /> Read</button>
                      <button onClick={() => accessDocument(file, 'download')}><Download aria-hidden="true" /> Download</button>
                      {access.canManage && (
                        <button className="is-danger" onClick={() => deleteDocument(file.id)} aria-label={`Delete ${file.filename}`}>
                          <Trash2 aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="collab-empty-inline"><FileText aria-hidden="true" /><p>No supportive documents have been added.</p></div>
            )}
          </section>
        </main>

        {showMembers && (
          <Modal eyebrow="Private team" title={`${members.length} project members`} description="Membership is visible only inside this collaboration." onClose={() => setShowMembers(false)}>
            <div className="collab-people-list">
              {members.map((member) => (
                <article key={member.id}>
                  <span className="collab-avatar">{member.avatar_url ? <img src={`http://127.0.0.1:5000${member.avatar_url}`} alt="" /> : member.full_name?.slice(0, 1)}</span>
                  <div><strong>{member.full_name}</strong><small>{member.institution_name || 'Independent'} · {member.project_role}</small></div>
                  {Number(member.id) === Number(selected.created_by) ? (
                    <span className="collab-owner-label">Owner</span>
                  ) : access.canManage ? (
                    <button className="collab-icon-button collab-icon-button--danger" onClick={() => removeMember(member.id)} aria-label={`Remove ${member.full_name}`}>
                      <X aria-hidden="true" />
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          </Modal>
        )}

        {showRequests && (
          <Modal eyebrow="Owner review" title="Pending join requests" description="Accept only collaborators who meet the listed project requirements." onClose={() => setShowRequests(false)} wide>
            <div className="collab-request-list">
              {requests.length ? requests.map((request) => (
                <article key={request.id}>
                  <span className="collab-avatar">{request.full_name?.slice(0, 1)}</span>
                  <div><strong>{request.full_name}</strong><small>{request.institution_name || 'Independent'} · Requested {formatDate(request.requested_at)}</small></div>
                  <button className="collab-button collab-button--quiet" disabled={busy} onClick={() => respondToRequest(request.id, 'reject')}><XCircle aria-hidden="true" /> Reject</button>
                  <button className="collab-button collab-button--primary" disabled={busy} onClick={() => respondToRequest(request.id, 'accept')}><CheckCircle2 aria-hidden="true" /> Accept</button>
                </article>
              )) : <div className="collab-empty-inline"><CheckCircle2 aria-hidden="true" /><p>All requests have been reviewed.</p></div>}
            </div>
          </Modal>
        )}

        {showEdit && (
          <Modal eyebrow="Project management" title="Edit collaboration" description="Update the project overview, requirements, access rule, or status." onClose={resetAndClose} wide>
            {projectForm(updateProject, true)}
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div className="collab-page">
      {message && <div className={`collab-toast collab-toast--${message.tone}`} role="status">{message.text}</div>}
      <header className="collab-overview-header">
        <div className="collab-overview-header__top">
          <div>
            <p className="collab-kicker">Private project directory</p>
            <h1>Projects</h1>
            <p>Find structured projects, review their requirements, and request to join the right team.</p>
          </div>
          <button className="collab-button collab-button--primary" onClick={() => setShowCreate(true)}>
            <Plus aria-hidden="true" /> Create project
          </button>
        </div>
        <div className="collab-summary-grid" aria-label="Project summary">
          <button onClick={() => setFilter('available')} aria-label={`Show ${availableCount} available projects`}>
            <span className="collab-summary-icon collab-summary-icon--blue"><Globe2 aria-hidden="true" /></span>
            <span><strong>{availableCount}</strong><small>Available</small></span>
            <ChevronRight aria-hidden="true" />
          </button>
          <button onClick={() => setFilter('joined')} aria-label={`Show ${joinedCount} joined projects`}>
            <span className="collab-summary-icon collab-summary-icon--cyan"><Users aria-hidden="true" /></span>
            <span><strong>{joinedCount}</strong><small>Joined</small></span>
            <ChevronRight aria-hidden="true" />
          </button>
          <button onClick={() => setFilter('mine')} aria-label={`Show ${createdCount} projects created by you`}>
            <span className="collab-summary-icon collab-summary-icon--violet"><FolderLock aria-hidden="true" /></span>
            <span><strong>{createdCount}</strong><small>Created by you</small></span>
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="collab-directory">
        <div className="collab-directory__heading">
          <div><p className="collab-kicker">Explore projects</p><h2>Collaboration opportunities</h2></div>
          <div className="collab-search">
            <Search aria-hidden="true" />
            <label className="sr-only" htmlFor="collab-search">Search collaborations</label>
            <input id="collab-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, topic, or owner" />
          </div>
        </div>
        <div className="collab-filter-row" aria-label="Filter collaborations">
          {[
            ['all', 'All eligible'],
            ['mine', 'Owned by me'],
            ['joined', 'Joined'],
            ['available', 'Available'],
          ].map(([value, label]) => (
            <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div className="collab-loading">Loading collaboration opportunities…</div>
        ) : visibleProjects.length ? (
          <div className="collab-project-list">
            {visibleProjects.map((project) => (
              <button key={project.id} className="collab-project-row" onClick={() => openProject(project)}>
                <span className="collab-project-row__body">
                  <span className="collab-project-row__meta">
                    <span className={`collab-status collab-status--${project.status}`}>{project.status}</span>
                    <span>{project.access_scope === 'institution' ? <Building2 aria-hidden="true" /> : <Globe2 aria-hidden="true" />}{project.access_scope === 'institution' ? project.institution_name : 'All users may request'}</span>
                  </span>
                  <strong>{project.title}</strong>
                  <span className="collab-project-row__description">{project.description}</span>
                </span>
                <span className="collab-project-row__side">
                  <span><Users aria-hidden="true" /> {project.member_count} members</span>
                  <span className={`collab-membership collab-membership--${project.membership_status}`}>
                    {project.membership_status === 'owner' ? 'Owned by you' :
                      project.membership_status === 'member' ? 'Joined' :
                        project.membership_status === 'pending' ? 'Request pending' : 'View overview'}
                  </span>
                  <ChevronRight aria-hidden="true" />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="collab-empty">
            <Circle aria-hidden="true" />
            <h3>No projects match this view</h3>
            <p>Try another search or create a structured collaboration of your own.</p>
          </div>
        )}
      </section>

      {showCreate && (
          <Modal eyebrow="New private project" title="Create collaboration" description="Define the topic, purpose, and requirements. Supportive documents can be added now or later." onClose={resetAndClose} wide>
          {projectForm(createProject)}
        </Modal>
      )}
    </div>
  );
};

export default ProjectsPage;
