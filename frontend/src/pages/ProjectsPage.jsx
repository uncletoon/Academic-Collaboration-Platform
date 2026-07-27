import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, CalendarClock, FileText, FolderKanban, Plus, Search,
  Upload, Users, Workflow
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EmptyState, Modal, PageIntro, SearchField, StatPill } from '../components/PortalPrimitives';

const statusStyles = { planning: 'portal-badge', active: 'portal-badge portal-badge--joined', completed: 'portal-badge portal-badge--done', archived: 'portal-badge' };

const ProjectsPage = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [members, setMembers] = useState([]);
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try { const result = await api.getProjects(); setProjects(result.projects || []); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openProject = async (project) => {
    try {
      const result = await api.getProjectDetails(project.id);
      setSelected(result.project); setMembers(result.members || []); setFiles(result.files || []);
      window.history.replaceState(null, '', `/projects?id=${project.id}`);
    } catch (err) { setError(err.message); }
  };

  const create = async (event) => {
    event.preventDefault();
    try { await api.createProject(form); setShowCreate(false); setForm({ title: '', description: '' }); await load(); }
    catch (err) { setError(err.message); }
  };

  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const body = new FormData(); body.append('projectFile', file);
    try { await api.uploadProjectFile(selected.id, body); await openProject(selected); }
    catch (err) { setError(err.message); }
    event.target.value = '';
  };

  const filtered = useMemo(() => projects.filter((project) => {
    const found = `${project.title} ${project.description}`.toLowerCase().includes(search.toLowerCase());
    return found && (status === 'all' || project.status === status);
  }), [projects, search, status]);

  const groupedProjects = useMemo(() => ({
    created: filtered.filter((project) => Number(project.created_by) === Number(user?.id)),
    joined: filtered.filter(
      (project) => Number(project.created_by) !== Number(user?.id) && project.status !== 'completed'
    ),
    completed: filtered.filter(
      (project) => Number(project.created_by) !== Number(user?.id) && project.status === 'completed'
    ),
  }), [filtered, user?.id]);

  const renderProjectCard = (project) => (
    <button key={project.id} className="portal-resource-card portal-resource-card--project" onClick={() => openProject(project)}>
      <span className="portal-resource-card__head">
        <span className="portal-resource-icon"><FolderKanban /></span>
        <span className={statusStyles[project.status] || 'portal-badge'}>{project.status}</span>
      </span>
      <strong>{project.title}</strong>
      <span className="portal-resource-card__copy portal-resource-card__copy--clamped">
        {project.description || 'A collaborative academic project workspace.'}
      </span>
      <span className="portal-resource-card__footer">
        <span><Users /> {project.member_count || 1} collaborators</span>
        <span><Workflow /> {project.user_role || 'lead'}</span>
      </span>
    </button>
  );

  if (selected) return (
    <div className="portal-page space-y-6 pb-16">
      <button className="portal-back" onClick={() => { setSelected(null); window.history.replaceState(null, '', '/projects'); }}><ArrowLeft /> All projects</button>
      <section className="portal-detail-hero portal-detail-hero--cyan">
        <div>
          <span className="portal-detail-icon"><FolderKanban /></span>
          <p className="portal-eyebrow">Project workspace</p>
          <h1>{selected.title}</h1>
          <p>{selected.description || 'This project has not added a description yet.'}</p>
          <div className="portal-detail-meta"><span><Workflow /> {selected.status}</span><span><Users /> {members.length} collaborators</span><span><CalendarClock /> Started {new Date(selected.created_at).toLocaleDateString()}</span></div>
        </div>
        <span className={statusStyles[selected.status] || 'portal-badge'}>{selected.status}</span>
      </section>
      {error && <div className="portal-alert">{error}</div>}
      <div className="portal-detail-grid">
        <main className="portal-panel">
          <div className="portal-panel__head"><div><p className="portal-eyebrow">Shared assets</p><h2>Project files</h2></div><label className="portal-primary-button cursor-pointer"><Upload /> Upload file<input className="sr-only" type="file" onChange={upload} /></label></div>
          {files.length ? <div className="portal-file-list">{files.map((file) => (
            <a key={file.id} href={`http://127.0.0.1:5000${file.filepath}`} target="_blank" rel="noreferrer"><span className="portal-resource-icon"><FileText /></span><span><strong>{file.filename}</strong><small>Added by {file.uploaded_by_name || 'a collaborator'} · {new Date(file.uploaded_at).toLocaleDateString()}</small></span></a>
          ))}</div> : <EmptyState icon={FileText} title="No shared files yet" description="Upload a brief, dataset, notes, or another project resource." />}
        </main>
        <aside className="portal-panel portal-members">
          <div className="portal-panel__head"><div><p className="portal-eyebrow">Project team</p><h2>Collaborators</h2></div></div>
          {members.map((member) => <div key={member.id} className="portal-person"><span className="portal-avatar">{member.full_name?.slice(0, 1)}</span><span><strong>{member.full_name}</strong><small>{member.project_role} · {member.user_role}</small></span></div>)}
        </aside>
      </div>
    </div>
  );

  const createdCount = projects.filter((project) => Number(project.created_by) === Number(user?.id)).length;
  const joinedCount = projects.filter((project) => Number(project.created_by) !== Number(user?.id) && project.status !== 'completed').length;
  const completedCount = projects.filter((project) => Number(project.created_by) !== Number(user?.id) && project.status === 'completed').length;
  return (
    <div className="portal-page space-y-8 pb-16">
      <PageIntro className="portal-hero--compact" eyebrow="Project workspaces" title={<>Give promising ideas a place to <em>become real.</em></>} action={<button className="portal-primary-button" onClick={() => setShowCreate(true)}><Plus /> Start a project</button>}>
        <div className="portal-hero__stats"><StatPill icon={FolderKanban} value={createdCount} label="Created by you" tone="cyan" /><StatPill icon={Users} value={joinedCount} label="Joined projects" /><StatPill icon={Workflow} value={completedCount} label="Completed" tone="violet" /></div>
      </PageIntro>
      <section>
        <div className="portal-toolbar">
          <SearchField value={search} onChange={setSearch} placeholder="Search your project workspaces" label="Search projects" />
          <div className="portal-filter-row">{['all', 'planning', 'active', 'completed'].map((item) => <button key={item} aria-pressed={status === item} onClick={() => setStatus(item)}>{item}</button>)}</div>
        </div>
        {error && <div className="portal-alert">{error}</div>}
        {loading ? <div className="portal-loading">Opening your workspaces…</div> : filtered.length ? <div className="portal-community-groups">
          <section className="portal-community-group" aria-labelledby="created-projects-heading">
            <div className="portal-group-heading"><div><p className="portal-eyebrow">Led by you</p><h2 id="created-projects-heading">My projects</h2></div><span>{groupedProjects.created.length}</span></div>
            {groupedProjects.created.length ? <div className="portal-card-grid">{groupedProjects.created.map(renderProjectCard)}</div> : <div className="portal-group-empty">You haven’t created a project yet.</div>}
          </section>
          <section className="portal-community-group" aria-labelledby="joined-projects-heading">
            <div className="portal-group-heading"><div><p className="portal-eyebrow">Team workspaces</p><h2 id="joined-projects-heading">Joined projects</h2></div><span>{groupedProjects.joined.length}</span></div>
            {groupedProjects.joined.length ? <div className="portal-card-grid">{groupedProjects.joined.map(renderProjectCard)}</div> : <div className="portal-group-empty">Projects where you collaborate will appear here.</div>}
          </section>
          <section className="portal-community-group" aria-labelledby="completed-projects-heading">
            <div className="portal-group-heading"><div><p className="portal-eyebrow">Finished work</p><h2 id="completed-projects-heading">Completed collaborations</h2></div><span>{groupedProjects.completed.length}</span></div>
            {groupedProjects.completed.length ? <div className="portal-card-grid">{groupedProjects.completed.map(renderProjectCard)}</div> : <div className="portal-group-empty">Completed collaborations will be kept here.</div>}
          </section>
        </div> : <EmptyState icon={Search} title="No matching projects" description="Adjust the search or start a project for your next research direction." />}
      </section>
      {showCreate && <Modal title="Start a project" description="Define the shared purpose first; collaborators and files can follow." onClose={() => setShowCreate(false)}>
        <form className="portal-form" onSubmit={create}><label>Project title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Climate resilience mapping" /></label><label>Description<textarea rows="5" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What question will the team answer, and what outcome are you working toward?" /></label><div className="portal-form__actions"><button type="button" className="portal-secondary-button" onClick={() => setShowCreate(false)}>Cancel</button><button className="portal-primary-button">Create workspace</button></div></form>
      </Modal>}
    </div>
  );
};
export default ProjectsPage;
