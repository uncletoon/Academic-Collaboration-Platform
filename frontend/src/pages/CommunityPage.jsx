import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Edit3, Globe2, LockKeyhole, Mail, MailPlus, MessageSquareText,
  Plus, ShieldCheck, Trash2, Users, UserRoundPlus
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EmptyState, Modal, PageIntro, SearchField, StatPill } from '../components/PortalPrimitives';

const categories = ['All', 'Research', 'Technology', 'Science', 'Humanities', 'Education'];

const CommunityPage = () => {
  const { user } = useAuth();
  const [communities, setCommunities] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: 'Research', privacy_type: 'public' });
  const [editForm, setEditForm] = useState({ name: '', description: '', category: 'Research', privacy_type: 'public' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [post, setPost] = useState({ title: '', content: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadList = async () => {
    setLoading(true);
    try {
      const [communityRes, inviteRes] = await Promise.all([api.getCommunities(), api.getInvitations()]);
      setCommunities(communityRes.communities || []);
      setInvitations(inviteRes.invitations || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadList(); }, []);

  const openCommunity = async (community) => {
    setError('');
    setSuccess('');
    setDescriptionExpanded(false);
    try {
      const [details, communityPosts] = await Promise.all([
        api.getCommunityDetails(community.id),
        community.is_member ? api.getCommunityPosts(community.id) : Promise.resolve({ posts: [] })
      ]);
      setSelected(details.community);
      setMembers(details.members || []);
      setPosts(communityPosts.posts || []);
      window.history.replaceState(null, '', `/communities?id=${community.id}`);
    } catch (err) { setError(err.message); }
  };

  const toggleJoin = async () => {
    try {
      const result = await api.toggleJoinCommunity(selected.id);
      const updated = { ...selected, is_member: result.isMember };
      setSelected(updated);
      await loadList();
      await openCommunity(updated);
    } catch (err) { setError(err.message); }
  };

  const createCommunity = async (event) => {
    event.preventDefault();
    try {
      await api.createCommunity(form);
      setShowCreate(false);
      setForm({ name: '', description: '', category: 'Research', privacy_type: 'public' });
      await loadList();
    } catch (err) { setError(err.message); }
  };

  const createPost = async (event) => {
    event.preventDefault();
    try {
      await api.createPost(selected.id, post);
      setPost({ title: '', content: '' });
      const result = await api.getCommunityPosts(selected.id);
      setPosts(result.posts || []);
    } catch (err) { setError(err.message); }
  };

  const openEdit = () => {
    setEditForm({
      name: selected.name || '',
      description: selected.description || '',
      category: selected.category || 'Research',
      privacy_type: selected.privacy_type || 'public',
    });
    setShowEdit(true);
  };

  const updateCommunity = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const result = await api.updateCommunity(selected.id, editForm);
      const updated = { ...selected, ...result.community, is_member: true };
      setSelected(updated);
      setShowEdit(false);
      setSuccess('Community details updated successfully.');
      await loadList();
    } catch (err) { setError(err.message); }
  };

  const deleteCommunity = async () => {
    if (!window.confirm(`Delete "${selected.name}"? This permanently removes its posts, invitations, and membership data.`)) return;
    setError('');
    try {
      await api.deleteCommunity(selected.id);
      setSelected(null);
      await loadList();
      window.history.replaceState(null, '', '/communities');
    } catch (err) { setError(err.message); }
  };

  const inviteMember = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      const result = await api.inviteUser(selected.id, inviteEmail.trim());
      setInviteEmail('');
      setSuccess(result.message || 'Invitation sent successfully.');
    } catch (err) { setError(err.message); }
  };

  const respond = async (id, action) => {
    try {
      await api.respondToInvitation(id, action);
      await loadList();
    } catch (err) { setError(err.message); }
  };

  const filtered = useMemo(() => communities.filter((community) => {
    const matchesSearch = `${community.name} ${community.description} ${community.category}`.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || community.category === category;
    return matchesSearch && matchesCategory;
  }), [communities, search, category]);

  const groupedCommunities = useMemo(() => ({
    created: filtered.filter((community) => Number(community.created_by) === Number(user?.id)),
    joined: filtered.filter(
      (community) => community.is_member && Number(community.created_by) !== Number(user?.id)
    ),
    available: filtered.filter((community) => !community.is_member),
  }), [filtered, user?.id]);

  const renderCommunityCard = (community) => {
    const PrivacyIcon = community.privacy_type === 'public' ? Globe2 : LockKeyhole;
    const ownershipLabel = Number(community.created_by) === Number(user?.id)
      ? 'Owner'
      : community.is_member
        ? 'Joined'
        : community.category;

    return (
      <button className="portal-resource-card" key={community.id} onClick={() => openCommunity(community)}>
        <span className="portal-resource-card__head">
          <span className="portal-resource-icon"><Users /></span>
          <span className={community.is_member ? 'portal-badge portal-badge--joined' : 'portal-badge'}>
            {ownershipLabel}
          </span>
        </span>
        <strong>{community.name}</strong>
        <span className="portal-resource-card__copy portal-resource-card__copy--clamped">
          {community.description || 'A focused place for academic exchange and collaboration.'}
        </span>
        <span className="portal-resource-card__footer">
          <span><Users /> {community.member_count || 0}</span>
          <span><PrivacyIcon /> {community.privacy_type || 'public'}</span>
        </span>
      </button>
    );
  };

  if (selected) {
    const PrivacyIcon = selected.privacy_type === 'public' ? Globe2 : LockKeyhole;
    const isOwner = Number(selected.created_by) === Number(user?.id);
    const isPrivate = selected.privacy_type === 'private';
    const isInstitutionOnly = selected.privacy_type === 'institution';
    const isDifferentInstitution = isInstitutionOnly
      && Number(selected.institution_id) !== Number(user?.institution_id);
    const joinBlocked = !selected.is_member && (isPrivate || isDifferentInstitution);
    const description = selected.description || 'This community has not added a description yet.';
    const descriptionNeedsToggle = description.length > 220;
    const visibleDescription = descriptionExpanded || !descriptionNeedsToggle
      ? description
      : `${description.slice(0, 220).trim()}…`;

    return (
      <div className="portal-page space-y-6 pb-16">
        <button className="portal-back" onClick={() => { setSelected(null); setDescriptionExpanded(false); window.history.replaceState(null, '', '/communities'); }}>
          <ArrowLeft /> All communities
        </button>
        <section className="portal-detail-hero">
          <div>
            <span className="portal-detail-icon"><Users /></span>
            <p className="portal-eyebrow">{selected.category || 'Academic community'}</p>
            <h1>{selected.name}</h1>
            <p className="portal-detail-description">{visibleDescription}</p>
            {descriptionNeedsToggle && (
              <button
                type="button"
                className="portal-description-toggle"
                onClick={() => setDescriptionExpanded((expanded) => !expanded)}
                aria-expanded={descriptionExpanded}
              >
                {descriptionExpanded ? 'Read less' : 'Read more'}
              </button>
            )}
            <div className="portal-detail-meta">
              <span><PrivacyIcon /> {selected.privacy_type || 'public'}</span>
              <span><Users /> {members.length || selected.member_count || 0} members</span>
              <span><ShieldCheck /> Led by {selected.creator_name || 'community lead'}</span>
            </div>
          </div>
          {isOwner ? (
            <div className="portal-owner-actions">
              <button className="portal-secondary-button" onClick={openEdit}><Edit3 /> Edit community</button>
              <button className="portal-danger-button" onClick={deleteCommunity}><Trash2 /> Delete</button>
            </div>
          ) : (
            <button
              className={selected.is_member ? 'portal-secondary-button' : 'portal-primary-button'}
              onClick={toggleJoin}
              disabled={joinBlocked}
              title={isPrivate ? 'Private communities require an email invitation' : isDifferentInstitution ? 'Only users from the hosting institution can join' : ''}
            >
              {selected.is_member
                ? 'Leave community'
                : isPrivate
                  ? <><LockKeyhole /> Invitation required</>
                  : isDifferentInstitution
                    ? <><ShieldCheck /> Institution members only</>
                    : <><UserRoundPlus /> Join community</>}
            </button>
          )}
        </section>

        {error && <div className="portal-alert">{error}</div>}
        {success && <div className="portal-success">{success}</div>}
        <div className="portal-detail-grid">
          <main className="space-y-5">
            {selected.is_member && (
              <form className="portal-composer" onSubmit={createPost}>
                <div><p className="portal-eyebrow">Start a conversation</p><h2>Share with the community</h2></div>
                <input aria-label="Post title" placeholder="A clear topic or question" value={post.title} onChange={(e) => setPost({ ...post, title: e.target.value })} required />
                <textarea aria-label="Post content" placeholder="Add context, an idea, or a resource…" rows="3" value={post.content} onChange={(e) => setPost({ ...post, content: e.target.value })} required />
                <button className="portal-primary-button" type="submit">Publish post</button>
              </form>
            )}
            <section className="portal-panel">
              <div className="portal-panel__head"><div><p className="portal-eyebrow">Community feed</p><h2>Recent conversations</h2></div><span>{posts.length} posts</span></div>
              {!selected.is_member ? (
                <EmptyState icon={LockKeyhole} title="Join to enter the conversation" description="Community posts are available to members." />
              ) : posts.length ? posts.map((item) => (
                <article className="portal-post" key={item.id}>
                  <div className="portal-avatar">{item.author_name?.slice(0, 1) || 'A'}</div>
                  <div><p className="portal-post__by">{item.author_name || 'Community member'} · {new Date(item.created_at).toLocaleDateString()}</p><h3>{item.title}</h3><p>{item.content}</p><span><MessageSquareText /> {item.comment_count || 0} replies</span></div>
                </article>
              )) : <EmptyState icon={MessageSquareText} title="No conversations yet" description="Be the first member to start a thoughtful discussion." />}
            </section>
          </main>
          <aside className="portal-panel portal-members">
            {isOwner && isPrivate && (
              <form className="portal-invite-form" onSubmit={inviteMember}>
                <span className="portal-resource-icon"><MailPlus /></span>
                <div>
                  <p className="portal-eyebrow">Private access</p>
                  <h2>Invite by email</h2>
                  <p>Only invited people can join this community.</p>
                </div>
                <label>
                  <span className="sr-only">Member email address</span>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="name@institution.edu"
                    required
                  />
                </label>
                <button className="portal-primary-button" type="submit"><MailPlus /> Send invitation</button>
              </form>
            )}
            <div className="portal-panel__head"><div><p className="portal-eyebrow">People</p><h2>Community members</h2></div></div>
            {members.slice(0, 8).map((member) => (
              <div key={member.id} className="portal-person"><span className="portal-avatar">{member.full_name?.slice(0, 1)}</span><span><strong>{member.full_name}</strong><small>{member.role}</small></span></div>
            ))}
            {!members.length && <p className="portal-muted">{selected.is_member ? 'Member details will appear here.' : 'Join to meet the members.'}</p>}
          </aside>
        </div>

        {showEdit && (
          <Modal title="Edit community" description="Update the community identity and access rules." onClose={() => setShowEdit(false)}>
            <form className="portal-form" onSubmit={updateCommunity}>
              <label>Name<input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required /></label>
              <label>Description<textarea rows="5" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>Category<select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>{categories.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Access<select value={editForm.privacy_type} onChange={(e) => setEditForm({ ...editForm, privacy_type: e.target.value })}><option value="public">Public</option><option value="private">Private — invite only</option><option value="institution">Institution only</option></select></label>
              </div>
              <div className="portal-form__actions"><button type="button" className="portal-secondary-button" onClick={() => setShowEdit(false)}>Cancel</button><button className="portal-primary-button"><Edit3 /> Save changes</button></div>
            </form>
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div className="portal-page space-y-8 pb-16">
      <PageIntro
        className="portal-hero--compact"
        eyebrow="Community directory"
        title={<>Find the room where your <em>ideas belong.</em></>}
        action={<button className="portal-primary-button" onClick={() => setShowCreate(true)}><Plus /> Create community</button>}
      >
        <div className="portal-hero__stats">
          <StatPill icon={ShieldCheck} value={communities.filter((item) => Number(item.created_by) === Number(user?.id)).length} label="Created by you" />
          <StatPill icon={Users} value={communities.filter((item) => item.is_member && Number(item.created_by) !== Number(user?.id)).length} label="Joined communities" />
          <StatPill icon={Mail} value={invitations.length} label="Pending invites" tone="amber" />
        </div>
      </PageIntro>

      {invitations.length > 0 && (
        <section className="portal-invitations">
          <div><p className="portal-eyebrow">You’re invited</p><h2>New communities are waiting for you</h2></div>
          {invitations.map((invite) => (
            <div key={invite.id}><span><strong>{invite.community_name}</strong><small>Invited by {invite.inviter_name}</small></span><button onClick={() => respond(invite.id, 'reject')}>Decline</button><button onClick={() => respond(invite.id, 'accept')}>Accept</button></div>
          ))}
        </section>
      )}

      <section>
        <div className="portal-toolbar">
          <SearchField value={search} onChange={setSearch} placeholder="Search by name, topic, or description" label="Search communities" />
          <div className="portal-filter-row" aria-label="Community categories">
            {categories.map((item) => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
          </div>
        </div>
        {error && <div className="portal-alert">{error}</div>}
        {loading ? <div className="portal-loading">Gathering communities…</div> : filtered.length ? (
          <div className="portal-community-groups">
            <section className="portal-community-group" aria-labelledby="created-communities-heading">
              <div className="portal-group-heading">
                <div><p className="portal-eyebrow">Owned by you</p><h2 id="created-communities-heading">My communities</h2></div>
                <span>{groupedCommunities.created.length}</span>
              </div>
              {groupedCommunities.created.length
                ? <div className="portal-card-grid">{groupedCommunities.created.map(renderCommunityCard)}</div>
                : <div className="portal-group-empty">You haven’t created a community yet.</div>}
            </section>

            <section className="portal-community-group" aria-labelledby="joined-communities-heading">
              <div className="portal-group-heading">
                <div><p className="portal-eyebrow">Your network</p><h2 id="joined-communities-heading">Joined communities</h2></div>
                <span>{groupedCommunities.joined.length}</span>
              </div>
              {groupedCommunities.joined.length
                ? <div className="portal-card-grid">{groupedCommunities.joined.map(renderCommunityCard)}</div>
                : <div className="portal-group-empty">Communities you join will appear here.</div>}
            </section>

            <section className="portal-community-group" aria-labelledby="available-communities-heading">
              <div className="portal-group-heading">
                <div><p className="portal-eyebrow">Discover more</p><h2 id="available-communities-heading">Available communities</h2></div>
                <span>{groupedCommunities.available.length}</span>
              </div>
              {groupedCommunities.available.length
                ? <div className="portal-card-grid">{groupedCommunities.available.map(renderCommunityCard)}</div>
                : <div className="portal-group-empty">There are no other communities available right now.</div>}
            </section>
          </div>
        ) : <EmptyState icon={Users} title="No communities found" description="Try a different search or create a new community around this topic." />}
      </section>

      {showCreate && (
        <Modal title="Create a community" description="Give people a clear reason to gather." onClose={() => setShowCreate(false)}>
          <form className="portal-form" onSubmit={createCommunity}>
            <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Responsible AI Lab" required /></label>
            <label>Description<textarea rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What will members discuss or build together?" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Access<select value={form.privacy_type} onChange={(e) => setForm({ ...form, privacy_type: e.target.value })}><option value="public">Public</option><option value="private">Private</option><option value="institution">Institution only</option></select></label>
            </div>
            <div className="portal-form__actions"><button type="button" className="portal-secondary-button" onClick={() => setShowCreate(false)}>Cancel</button><button className="portal-primary-button">Create community</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default CommunityPage;
