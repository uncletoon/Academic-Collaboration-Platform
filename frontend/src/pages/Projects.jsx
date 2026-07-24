import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  FolderGit2, 
  Plus, 
  UserPlus, 
  Trash2, 
  Download, 
  FileText, 
  ArrowLeft,
  Settings,
  ShieldCheck,
  UserCheck,
  Users
} from 'lucide-react';

const Projects = () => {
  const { user } = useAuth();
  
  // List views state
  const [projects, setProjects] = useState([]);
  const [selectedProj, setSelectedProj] = useState(null); // Active project details
  const [projMembers, setProjMembers] = useState([]);
  const [projFiles, setProjFiles] = useState([]);

  // Selections
  const [systemUsers, setSystemUsers] = useState([]); // List for adding members
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Forms
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteRole, setInviteRole] = useState('contributor');
  const [projectStatus, setProjectStatus] = useState('planning');

  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getProjects();
      setProjects(res.projects || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const loadProjectDetails = async (projId) => {
    try {
      const res = await api.getProjectDetails(projId);
      setSelectedProj(res.project);
      setProjMembers(res.members || []);
      setProjFiles(res.files || []);
      setProjectStatus(res.project.status);
    } catch (err) {
      alert(err.message || 'Access denied to this project.');
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newTitle) return;
    try {
      await api.createProject({ title: newTitle, description: newDesc });
      setNewTitle('');
      setNewDesc('');
      setShowCreateModal(false);
      loadProjects();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (e) => {
    const nextStatus = e.target.value;
    try {
      await api.updateProject(selectedProj.id, { status: nextStatus });
      setProjectStatus(nextStatus);
      setSelectedProj(prev => ({ ...prev, status: nextStatus }));
    } catch (err) {
      alert(err.message);
    }
  };

  const openInvitePanel = async () => {
    setShowInviteModal(true);
    try {
      const res = await api.getUsers();
      setSystemUsers(res.users || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!inviteUserId || !inviteRole) return;
    try {
      await api.addProjectMember(selectedProj.id, {
        targetUserId: inviteUserId,
        projectRole: inviteRole
      });
      setShowInviteModal(false);
      setInviteUserId('');
      loadProjectDetails(selectedProj.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member from the project?')) return;
    try {
      await api.removeProjectMember(selectedProj.id, memberId);
      loadProjectDetails(selectedProj.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('projectFile', uploadFile);

    try {
      await api.uploadProjectFile(selectedProj.id, formData);
      setUploadFile(null);
      // Reset input element
      document.getElementById('projFileInput').value = '';
      loadProjectDetails(selectedProj.id);
    } catch (err) {
      alert(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Delete this file? This action is permanent.')) return;
    try {
      await api.deleteProjectFile(selectedProj.id, fileId);
      loadProjectDetails(selectedProj.id);
    } catch (err) {
      alert(err.message);
    }
  };

  // Check if current user is project Lead
  const isLead = projMembers.some(m => m.id === user.id && m.project_role === 'lead') || user.role === 'admin';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Projects Directory */}
      {!selectedProj ? (
        <>
          <div className="flex justify-between items-center bg-canvas-50 border border-slate-300 p-6 rounded-2xl">
            <div>
              <h3 className="text-base font-bold text-canvas-900">Collaborative Research Projects</h3>
              <p className="text-xs mt-0.5">Manage shared files, tasks, and cross-institutional project teams</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>New Collaboration</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center p-12 text-slate-700 text-xs">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="bg-canvas-50 border border-slate-200 rounded-xl p-12 text-center text-slate-600 text-xs">
              No collaborative projects found. Click "New Collaboration" to initialize a project workspace.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => loadProjectDetails(proj.id)}
                  className="bg-canvas-50 border border-slate-300 hover:border-slate-300 p-5 rounded-xl transition-all cursor-pointer flex flex-col justify-between h-44 hover:translate-y-[-2px]"
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-sm font-bold text-canvas-900 truncate max-w-sm">{proj.title}</h4>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider ${
                        proj.status === 'active' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 
                        proj.status === 'completed' ? 'bg-slate-100 text-slate-700 border border-slate-200' : 
                        'bg-canvas-200 text-slate-700 border border-slate-300'
                      }`}>
                        {proj.status}
                      </span>
                    </div>
                    <p className="text-xs line-clamp-2 leading-relaxed mt-1.5">{proj.description}</p>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-[10px] text-slate-600">
                    <span>Manager: {proj.creator_name}</span>
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {proj.member_count} team members</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* 2. Detailed Workspace View */
        <div className="space-y-6">
          {/* Header row */}
          <div className="flex items-center gap-4 bg-canvas-50 border border-slate-300 p-5 rounded-2xl">
            <button
              onClick={() => { setSelectedProj(null); loadProjects(); }}
              className="p-2 rounded-lg bg-canvas-100 hover:bg-canvas-300 text-slate-700 hover:text-canvas-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 overflow-hidden">
              <h3 className="text-base font-bold text-canvas-900 truncate">{selectedProj.title}</h3>
              <p className="text-xs mt-0.5 truncate">{selectedProj.description}</p>
            </div>

            {/* Status switcher for Lead */}
            {isLead ? (
              <div className="flex items-center gap-2">
                <Settings className="h-4.5 w-4.5 text-slate-700" />
                <select
                  value={projectStatus}
                  onChange={handleStatusChange}
                  className="bg-canvas-100 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-canvas-900 focus:outline-none"
                >
                  <option value="planning">Status: Planning</option>
                  <option value="active">Status: Active</option>
                  <option value="completed">Status: Completed</option>
                </select>
              </div>
            ) : (
              <span className="px-3 py-1.5 text-xs bg-canvas-300 text-slate-800 rounded-xl">
                Status: <span className="capitalize font-semibold">{projectStatus}</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left section: Files workspace */}
            <div className="lg:col-span-2 space-y-6">
              {/* File upload drawer */}
              <div className="bg-canvas-50 border border-slate-300 p-5 rounded-xl space-y-4">
                <h4 className="text-xs font-semibold text-canvas-900 uppercase tracking-wider">Project Files Shared</h4>
                
                <form onSubmit={handleFileUpload} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="file"
                    id="projFileInput"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="flex-grow text-xs text-slate-700 bg-canvas-100 p-2 border border-slate-200 rounded-lg cursor-pointer file:mr-4 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-canvas-300 file:text-canvas-900 file:cursor-pointer focus:outline-none"
                    required
                  />
                  <button
                    type="submit"
                    disabled={uploading || !uploadFile}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    {uploading ? 'Uploading...' : 'Upload File'}
                  </button>
                </form>
              </div>

              {/* Files list */}
              <div className="bg-canvas-50 border border-slate-300 p-5 rounded-xl space-y-3">
                {projFiles.length === 0 ? (
                  <div className="text-center p-8 text-xs text-slate-600 italic">No files shared in this project workspace yet.</div>
                ) : (
                  <div className="space-y-3">
                    {projFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between gap-4 p-3 bg-canvas-100 border border-slate-200/60 rounded-xl hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                          <div className="overflow-hidden">
                            <span className="text-xs font-bold text-canvas-900 block truncate max-w-sm md:max-w-md">{file.filename}</span>
                            <span className="text-[10px] text-slate-600 block">
                              Uploaded by {file.uploaded_by_name} • {new Date(file.uploaded_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* File Action buttons */}
                        <div className="flex gap-2">
                          <a
                            href={`http://localhost:5000${file.filepath}`}
                            download={file.filename}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-canvas-300 hover:bg-canvas-300 text-slate-800 hover:text-canvas-900 rounded-lg transition-colors"
                          >
                            <Download className="h-4.5 w-4.5" />
                          </a>

                          {(file.uploaded_by === user.id || isLead) && (
                            <button
                              onClick={() => handleDeleteFile(file.id)}
                              className="p-1.5 bg-canvas-300 hover:bg-red-950/30 text-slate-600 hover:text-red-400 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right section: Team Members */}
            <div className="bg-canvas-50 border border-slate-300 p-5 rounded-xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-300 pb-3">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Project Team</h4>
                {isLead && (
                  <button
                    onClick={openInvitePanel}
                    className="p-1.5 text-blue-600 hover:bg-canvas-200 hover:text-blue-300 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <UserPlus className="h-4.5 w-4.5" />
                  </button>
                )}
              </div>

              <div className="space-y-3.5">
                {projMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={member.avatar_url ? `http://localhost:5000${member.avatar_url}` : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'}
                        alt={member.full_name}
                        className="w-8.5 h-8.5 rounded-full object-cover"
                      />
                      <div>
                        <span className="text-xs font-bold text-canvas-900 block">{member.full_name}</span>
                        <span className="text-[10px] text-slate-600 capitalize block">({member.project_role})</span>
                      </div>
                    </div>

                    {/* Manager deletion control for leads */}
                    {isLead && member.id !== user.id && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-[10px] font-semibold text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-canvas-900/50 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-canvas-50 border border-slate-300 shadow-2xl rounded-2xl p-6 space-y-4 animate-slide-up">
            <h3 className="text-sm font-bold text-canvas-900 uppercase tracking-wider">Initialize Project Collaboration</h3>
            
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Project Title *</label>
                <input
                  type="text"
                  placeholder="e.g., Deep Learning in Astro-Physics"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-canvas-100 border border-slate-300 rounded-xl text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 text-canvas-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Description</label>
                <textarea
                  placeholder="Outline the goals, dependencies, and timelines for this research team..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-2.5 bg-canvas-100 border border-slate-300 rounded-xl text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 text-canvas-900 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-canvas-300 hover:bg-canvas-300 text-canvas-900 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Team Member Invitation Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-canvas-900/50 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-canvas-50 border border-slate-300 shadow-2xl rounded-2xl p-6 space-y-4 animate-slide-up">
            <h3 className="text-sm font-bold text-canvas-900 uppercase tracking-wider">Invite Academic Collaborator</h3>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Select Academic</label>
                <select
                  value={inviteUserId}
                  onChange={(e) => setInviteUserId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-canvas-100 border border-slate-300 rounded-xl text-sm text-canvas-900 focus:outline-none"
                  required
                >
                  <option value="">Choose User...</option>
                  {systemUsers
                    .filter(u => !projMembers.some(m => m.id === u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.role} - {u.institution_name || 'Generic'})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Project Workspace Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2.5 bg-canvas-100 border border-slate-300 rounded-xl text-sm text-canvas-900 focus:outline-none"
                >
                  <option value="contributor">Contributor (Can upload/delete own files)</option>
                  <option value="observer">Observer (Read-only download access)</option>
                  <option value="lead">Co-Lead (Full settings authorization)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 bg-canvas-300 hover:bg-canvas-300 text-canvas-900 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
// 
