import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  MessageSquare, 
  ThumbsUp, 
  Trash2, 
  Plus, 
  Globe, 
  CornerDownRight, 
  ArrowLeft,
  GraduationCap,
  Settings,
  Mail,
  Check,
  X,
  Lock
} from 'lucide-react';

const Communities = () => {
  const { user } = useAuth();
  
  // Tab states
  const [communities, setCommunities] = useState([]);
  const [selectedComm, setSelectedComm] = useState(null); // Active community details
  const [communityMembers, setCommunityMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [invitations, setInvitations] = useState([]);
  
  // Post/Comment expansions
  const [activePostComments, setActivePostComments] = useState({}); // postId -> commentArray
  const [commentInputs, setCommentInputs] = useState({}); // postId -> commentText

  // Loading/Forms
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Form fields for Create/Edit
  const [isEditingComm, setIsEditingComm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Research');
  const [newPrivacy, setNewPrivacy] = useState('public'); // public, private, institution
  
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  
  // Expandable description
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  const loadCommunities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getCommunities();
      setCommunities(res.communities || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInvitations = useCallback(async () => {
    try {
      const res = await api.getInvitations();
      setInvitations(res.invitations || []);
    } catch (err) {
      console.error('Failed to load invitations', err);
    }
  }, []);

  const loadCommunityPosts = useCallback(async (commId) => {
    try {
      const res = await api.getCommunityPosts(commId);
      setPosts(res.posts || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadCommunityDetails = useCallback(async (commId) => {
    try {
      const res = await api.getCommunityDetails(commId);
      setSelectedComm(res.community);
      setCommunityMembers(res.members || []);
      loadCommunityPosts(commId);
    } catch (err) {
      alert(err.message || 'Failed to load community details');
      setSelectedComm(null);
      window.history.pushState(null, '', '/communities');
    }
  }, [loadCommunityPosts]);

  useEffect(() => {
    loadCommunities();
    loadInvitations();
    
    const params = new URLSearchParams(window.location.search);
    const commId = params.get('id');
    if (commId) {
      loadCommunityDetails(commId);
    }
  }, [loadCommunities, loadInvitations, loadCommunityDetails]);

  const selectCommunity = async (comm) => {
    setIsDescExpanded(false);
    window.history.pushState(null, '', `/communities?id=${comm.id}`);
    loadCommunityDetails(comm.id);
  };

  const openCreateModal = () => {
    setIsEditingComm(false);
    setNewName('');
    setNewDesc('');
    setNewCategory('Research');
    setNewPrivacy('public');
    setShowCreateModal(true);
  };

  const openEditModal = () => {
    if (!selectedComm) return;
    setIsEditingComm(true);
    setNewName(selectedComm.name);
    setNewDesc(selectedComm.description || '');
    setNewCategory(selectedComm.category || 'Research');
    setNewPrivacy(selectedComm.privacy_type || 'public');
    setShowCreateModal(true);
  };

  const handleSaveCommunity = async (e) => {
    e.preventDefault();
    if (!newName || !newCategory) return;
    try {
      if (isEditingComm && selectedComm) {
         await api.updateCommunity(selectedComm.id, {
           name: newName,
           description: newDesc,
           category: newCategory,
           privacy_type: newPrivacy
         });
         setShowCreateModal(false);
         loadCommunityDetails(selectedComm.id);
         loadCommunities();
      } else {
         await api.createCommunity({
           name: newName,
           description: newDesc,
           category: newCategory,
           privacy_type: newPrivacy
         });
         setShowCreateModal(false);
         loadCommunities();
      }
    } catch (err) {
      alert(err.message || 'Failed to save community');
    }
  };

  const handleDeleteCommunity = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this community?')) return;
    try {
       await api.deleteCommunity(selectedComm.id);
       setSelectedComm(null);
       loadCommunities();
    } catch (err) {
       alert(err.message);
    }
  };

  const handleToggleJoin = async (e, commId) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.toggleJoinCommunity(commId);
      
      // Update local state
      setCommunities(prev => prev.map(c => 
        c.id === commId ? { ...c, is_member: res.isMember, member_count: res.isMember ? c.member_count + 1 : c.member_count - 1 } : c
      ));

      if (selectedComm && selectedComm.id === commId) {
        loadCommunityDetails(commId);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRespondInvitation = async (invitationId, action) => {
    try {
      await api.respondToInvitation(invitationId, action);
      loadInvitations();
      loadCommunities(); // Refresh list to show newly joined communities
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostTitle || !newPostContent) return;
    try {
      const res = await api.createPost(selectedComm.id, {
        title: newPostTitle,
        content: newPostContent
      });
      setPosts(prev => [res.post, ...prev]);
      setNewPostTitle('');
      setNewPostContent('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLikePost = async (postId) => {
    if (!selectedComm.is_member && user.role !== 'admin') {
       alert('You must be a member to like posts.');
       return;
    }
    try {
      const res = await api.toggleLikePost(postId);
      setPosts(prev => prev.map(p => 
        p.id === postId ? { 
          ...p, 
          is_liked: res.isLiked, 
          like_count: res.isLiked ? p.like_count + 1 : p.like_count - 1 
        } : p
      ));
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleFetchComments = async (postId) => {
    // Toggle comments collapse
    if (activePostComments[postId]) {
      setActivePostComments(prev => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      return;
    }

    try {
      const res = await api.getPostComments(postId);
      setActivePostComments(prev => ({ ...prev, [postId]: res.comments }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e, postId) => {
    e.preventDefault();
    const commentText = commentInputs[postId];
    if (!commentText || !commentText.trim()) return;

    try {
      const res = await api.addComment(postId, { content: commentText });
      setActivePostComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), res.comment]
      }));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: parseInt(p.comment_count) + 1 } : p));
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await api.deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await api.deleteComment(commentId);
      setActivePostComments(prev => ({
        ...prev,
        [postId]: prev[postId].filter(c => c.id !== commentId)
      }));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: Math.max(0, parseInt(p.comment_count) - 1) } : p));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member from the community?')) return;
    try {
      await api.removeMember(selectedComm.id, userId);
      setCommunityMembers(prev => prev.filter(m => m.id !== userId));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    try {
      await api.inviteUser(selectedComm.id, inviteEmail);
      alert('Invitation sent!');
      setInviteEmail('');
    } catch (err) {
      alert(err.message || 'Failed to send invitation');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Invitations Alert */}
      {!selectedComm && invitations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
          <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
            <Mail className="h-4 w-4" /> Pending Invitations ({invitations.length})
          </h3>
          <div className="space-y-2">
            {invitations.map(inv => (
              <div key={inv.id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-blue-100">
                <div>
                  <p className="text-xs font-semibold text-canvas-900">{inv.community_name}</p>
                  <p className="text-[10px] text-slate-500">Invited by: {inv.inviter_name}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleRespondInvitation(inv.id, 'accept')} className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleRespondInvitation(inv.id, 'reject')} className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1. Main Directory Listing */}
      {!selectedComm ? (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-lg mb-8">
            <div>
              <h3 className="text-2xl font-bold tracking-tight">Academic Communities</h3>
              <p className="text-sm mt-2 text-blue-100 font-medium">Explore institutional and cross-institutional forums</p>
            </div>
            <button
              onClick={openCreateModal}
              className="mt-4 sm:mt-0 px-5 py-2.5 bg-white text-blue-700 hover:bg-blue-50 hover:scale-105 transition-all duration-300 text-sm font-bold rounded-xl shadow-sm flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              <span>Create Forum</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center p-12 text-slate-700 text-xs">Loading academic communities...</div>
          ) : communities.length === 0 ? (
            <div className="bg-canvas-50 border border-slate-200 rounded-xl p-12 text-center text-slate-600 text-xs">
              No academic communities found. Be the first to build a community!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {communities.map((comm) => (
                <div
                  key={comm.id}
                  onClick={() => selectCommunity(comm)}
                  className="bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-xl p-6 pb-6 rounded-3xl transition-all duration-300 cursor-pointer flex flex-col justify-between h-full min-h-[14rem] group hover:-translate-y-1 relative overflow-hidden"
                >
                  {/* Decorative background circle */}
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-gradient-to-br from-indigo-50 to-blue-50 opacity-50 group-hover:scale-150 transition-transform duration-700 ease-out" />
                  
                  <div className="relative z-10">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
                          {comm.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                          {comm.category}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {comm.privacy_type === 'institution' && (
                          <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border border-amber-100 shadow-sm">
                            <Lock className="w-3 h-3" /> Inst
                          </span>
                        )}
                        {comm.privacy_type === 'private' && (
                          <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border border-red-100 shadow-sm">
                            <Lock className="w-3 h-3" /> Private
                          </span>
                        )}
                      </div>
                    </div>
                    <h4 className="text-lg font-bold text-slate-800 mt-5 truncate group-hover:text-indigo-600 transition-colors">{comm.name}</h4>
                    <p className="text-sm mt-1.5 line-clamp-2 leading-relaxed text-slate-500 font-medium">{comm.description}</p>
                  </div>
                  
                  <div className="relative z-10 flex justify-between items-center pt-4 border-t border-slate-100 mt-4">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                      <Users className="w-4 h-4 text-slate-400" />
                      {comm.member_count} members
                    </div>
                    {(!comm.is_member && comm.privacy_type !== 'private') || comm.is_member || user.role === 'admin' ? (
                       <button
                         onClick={(e) => handleToggleJoin(e, comm.id)}
                         className={`px-4 py-1.5 text-[11px] font-bold rounded-xl transition-all ${
                           comm.is_member
                             ? 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-transparent'
                             : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm hover:shadow group-hover:scale-105'
                         }`}
                       >
                         {comm.is_member ? 'Leave' : 'Join Forum'}
                       </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium italic bg-slate-50 px-2 py-1 rounded-md border border-slate-100">Invite Only</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* 2. Specific Community Feed View */
        <div className="space-y-6">
          {/* Header row */}
          <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-900 rounded-3xl p-8 mb-8 text-white shadow-xl">
            {/* Decorative background circle */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-500/20 to-blue-500/20 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
              <button
                onClick={() => { 
                  setSelectedComm(null); 
                  window.history.pushState(null, '', '/communities');
                  loadCommunities(); 
                }}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all duration-300 shadow-sm"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              
              <div className="flex-1 overflow-hidden w-full">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h3 className="text-3xl font-bold tracking-tight text-white">{selectedComm.name}</h3>
                  <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-white/20 backdrop-blur-md text-blue-100 border border-white/10">
                    {selectedComm.category}
                  </span>
                  <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-white/10 backdrop-blur-md text-slate-200 border border-white/10">
                    {selectedComm.privacy_type}
                  </span>
                </div>
                <div className="text-sm mt-2 text-indigo-100/90 max-w-3xl">
                  <p className={`whitespace-pre-wrap leading-relaxed ${!isDescExpanded ? 'line-clamp-2' : ''}`}>
                    {selectedComm.description}
                  </p>
                  {selectedComm.description && selectedComm.description.length > 100 && (
                    <button onClick={() => setIsDescExpanded(!isDescExpanded)} className="text-white font-bold hover:underline mt-1 text-xs tracking-wide">
                      {isDescExpanded ? 'Read less' : 'Read more'}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3 mt-4 md:mt-0">
                {(selectedComm.created_by === user.id || user.role === 'admin') && (
                  <>
                    <button onClick={openEditModal} className="p-2.5 text-white/80 hover:text-white bg-white/5 hover:bg-white/20 rounded-xl backdrop-blur-sm transition-all shadow-sm">
                      <Settings className="h-5 w-5" />
                    </button>
                    <button onClick={handleDeleteCommunity} className="p-2.5 text-red-200 hover:text-white bg-red-500/10 hover:bg-red-500/80 rounded-xl backdrop-blur-sm transition-all shadow-sm">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </>
                )}

                {((selectedComm.privacy_type !== 'private' || selectedComm.is_member) || user.role === 'admin') && (
                  <button
                    onClick={(e) => handleToggleJoin(e, selectedComm.id)}
                    className={`px-6 py-2.5 text-sm font-bold rounded-xl transition-all shadow-sm ${
                      selectedComm.is_member
                        ? 'bg-white/10 text-white hover:bg-red-500/80 hover:text-white border border-white/10'
                        : 'bg-blue-500 hover:bg-blue-400 text-white border border-blue-400/50 hover:scale-105'
                    }`}
                  >
                    {selectedComm.is_member ? 'Leave Community' : 'Join Community'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left/Middle feed (Posts) */}
            <div className="lg:col-span-2 space-y-6">
              {selectedComm.is_member || user.role === 'admin' ? (
                <form onSubmit={handleCreatePost} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4 transition-all focus-within:shadow-md focus-within:border-indigo-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">Start a Discussion</h4>
                  </div>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Give your topic a descriptive title..."
                      value={newPostTitle}
                      onChange={(e) => setNewPostTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-indigo-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                      required
                    />
                    <textarea
                      placeholder="Share updates, research discoveries, or ask a question..."
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      rows="3"
                      className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-indigo-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                      required
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow hover:-translate-y-0.5"
                    >
                      Publish Post
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl text-center flex flex-col items-center justify-center gap-2">
                  <div className="p-3 bg-white rounded-full shadow-sm">
                    <Lock className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">Join this community to start a discussion.</p>
                </div>
              )}

              {/* Posts feed */}
              {selectedComm.is_member || user.role === 'admin' ? (
                <div className="space-y-6">
                {posts.length === 0 ? (
                  <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium">No posts published yet. Be the first to start a discussion!</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <div key={post.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-5 transition-all hover:shadow-md">
                      {/* Author Header */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={post.author_avatar ? `http://localhost:5000${post.author_avatar}` : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'}
                            alt={post.author_name}
                            className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
                          />
                          <div>
                            <span className="text-sm font-bold text-slate-900 block">{post.author_name}</span>
                            <span className="text-[11px] text-slate-500 font-medium capitalize block">
                              {post.author_role} • {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        {/* Delete option for creator, owner, or admin */}
                        {(post.user_id === user.id || selectedComm.created_by === user.id || user.role === 'admin') && (
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Content */}
                      <div className="space-y-2 pl-1">
                        <h4 className="text-lg font-bold text-slate-800">{post.title}</h4>
                        <p className="text-sm leading-relaxed text-slate-600 break-words whitespace-pre-line">{post.content}</p>
                      </div>

                      {/* Engagement Bar */}
                      <div className="flex items-center gap-2 pt-4 border-t border-slate-100 text-slate-600">
                        <button
                          onClick={() => handleLikePost(post.id)}
                          disabled={!selectedComm.is_member && user.role !== 'admin'}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            post.is_liked ? 'text-blue-600 bg-blue-50' : 'hover:bg-slate-100 hover:text-slate-800'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <ThumbsUp className={`h-4 w-4 ${post.is_liked ? 'fill-blue-600' : ''}`} />
                          <span>{post.like_count}</span>
                        </button>

                        <button
                          onClick={() => handleFetchComments(post.id)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-100 hover:text-slate-800 transition-all"
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span>{post.comment_count}</span>
                        </button>
                      </div>

                      {/* Expanded Comments section */}
                      {activePostComments[post.id] && (
                        <div className="pt-4 border-t border-slate-100 space-y-4">
                          <div className="space-y-4 pl-2 md:pl-6">
                            {activePostComments[post.id].length === 0 ? (
                              <div className="bg-slate-50 rounded-xl p-4 text-center text-xs text-slate-500 font-medium">No comments yet.</div>
                            ) : (
                              activePostComments[post.id].map((comm) => (
                                <div key={comm.id} className="flex gap-3 items-start group">
                                  <img
                                    src={comm.author_avatar ? `http://localhost:5000${comm.author_avatar}` : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'}
                                    alt={comm.author_name}
                                    className="w-8 h-8 rounded-full border border-slate-200 mt-1 object-cover"
                                  />
                                  <div className="flex-grow">
                                    <div className="bg-slate-50 group-hover:bg-slate-100 transition-colors p-3.5 rounded-2xl rounded-tl-sm flex justify-between items-start border border-slate-100/50">
                                      <div>
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-xs font-bold text-slate-800">{comm.author_name}</span>
                                          <span className="text-[10px] text-slate-500 font-medium capitalize">• {comm.author_role}</span>
                                        </div>
                                        <p className="text-sm text-slate-700 break-words leading-relaxed">{comm.content}</p>
                                      </div>
                                      {(comm.user_id === user.id || selectedComm.created_by === user.id || user.role === 'admin') && (
                                         <button onClick={() => handleDeleteComment(post.id, comm.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-red-50 rounded-md">
                                            <Trash2 className="h-3.5 w-3.5" />
                                         </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Comment write field */}
                          {(selectedComm.is_member || user.role === 'admin') ? (
                            <form
                              onSubmit={(e) => handleAddComment(e, post.id)}
                              className="flex gap-3 pl-2 md:pl-6 pt-2"
                            >
                              <img src={user.avatar_url ? `http://localhost:5000${user.avatar_url}` : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'} className="w-8 h-8 rounded-full border border-slate-200 object-cover" alt="User" />
                              <div className="flex-1 relative">
                                <input
                                  type="text"
                                  placeholder="Write a comment..."
                                  value={commentInputs[post.id] || ''}
                                  onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                  className="w-full pl-4 pr-16 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-300 rounded-full text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                  required
                                />
                                <button
                                  type="submit"
                                  className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-full transition-all shadow-sm"
                                >
                                  Reply
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="pl-6 text-xs text-slate-500 italic font-medium">Join community to comment.</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 p-8 rounded-2xl text-center flex flex-col items-center justify-center gap-3 mt-4">
                  <div className="p-4 bg-white rounded-full shadow-sm">
                    <Lock className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-base font-bold text-slate-700 mt-2">Private Content</p>
                  <p className="text-sm font-medium text-slate-500">You must be a member to view posts, comments, and engagement.</p>
                </div>
              )}
            </div>

            {/* Right sidebar details (Metadata/Members list) */}
            <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
              {/* Invite User (Only if owner) */}
              {(selectedComm.created_by === user.id || user.role === 'admin') && selectedComm.privacy_type === 'private' && (
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-indigo-500" />
                    <h4 className="text-sm font-bold text-slate-800">Invite Users</h4>
                  </div>
                  <form onSubmit={handleInviteUser} className="flex flex-col gap-3">
                     <input
                        type="email"
                        placeholder="user@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-300 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        required
                     />
                     <button type="submit" className="w-full px-4 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white text-sm font-bold rounded-xl transition-all shadow-sm">
                       Send Invitation
                     </button>
                  </form>
                </div>
              )}

              {/* Members List */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-500" />
                    <h4 className="text-sm font-bold text-slate-800">Members</h4>
                  </div>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-xs font-bold">{communityMembers.length}</span>
                </div>
                
                <div className="space-y-3">
                  {(!selectedComm.is_member && selectedComm.created_by !== user.id && user.role !== 'admin') ? (
                    <div className="bg-slate-50 p-4 rounded-xl text-center">
                      <p className="text-xs font-medium text-slate-500">Join this community to inspect community member rosters.</p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                      {communityMembers.map(member => (
                        <div key={member.id} className="flex items-center justify-between gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors group">
                           <div className="flex items-center gap-3">
                             <img src={member.avatar_url ? `http://localhost:5000${member.avatar_url}` : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'} className="w-8 h-8 rounded-full border border-slate-200 object-cover" alt="avatar" />
                             <div>
                               <p className="text-sm font-bold text-slate-800 leading-tight">{member.full_name}</p>
                               <p className="text-[10px] text-slate-500 font-medium capitalize mt-0.5">{member.role}</p>
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                             {member.id === selectedComm.created_by && (
                               <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border border-indigo-100">Owner</span>
                             )}
                             {(selectedComm.created_by === user.id || user.role === 'admin') && member.id !== selectedComm.created_by && (
                               <button onClick={() => handleRemoveMember(member.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:bg-red-50 rounded-lg" title="Remove Member">
                                  <X className="h-3.5 w-3.5" />
                               </button>
                             )}
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Create/Edit Community Forum Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl p-8 space-y-6 animate-slide-up relative overflow-hidden">
            {/* Decorative element */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600" />
            
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">{isEditingComm ? 'Edit Community' : 'Create a New Forum'}</h3>
            
            <form onSubmit={handleSaveCommunity} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Forum Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g., Quantum Computing Group"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Description</label>
                <textarea
                  placeholder="Explain the purpose of this community..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-900 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-900 appearance-none"
                  >
                    <option value="Research">Research Group</option>
                    <option value="Departmental">Departmental Club</option>
                    <option value="Colloquium">Seminar / Colloquium</option>
                    <option value="General">General Academic Discussion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Privacy</label>
                  <select
                    value={newPrivacy}
                    onChange={(e) => setNewPrivacy(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-900 appearance-none"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    {user.institution_id && (
                       <option value="institution">Institution Only</option>
                    )}
                  </select>
                </div>
              </div>

              {newPrivacy === 'institution' && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2">
                  <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 font-medium leading-relaxed">
                    This forum will be strictly limited to verified members of <span className="font-bold">{user.institution_name || 'Your Institution'}</span>.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  {isEditingComm ? 'Save Changes' : 'Create Forum'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Communities;
