import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Edit3,
  Globe2,
  Heart,
  LockKeyhole,
  Mail,
  MailPlus,
  MessageSquareText,
  Plus,
  ShieldCheck,
  Send,
  Trash2,
  Users,
  UserRoundPlus,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  EmptyState,
  Modal,
  PageIntro,
  SearchField,
  StatPill,
} from "../components/PortalPrimitives";

const categories = [
  "All",
  "Research",
  "Technology",
  "Science",
  "Humanities",
  "Education",
];

const CommunityPage = () => {
  const { user } = useAuth();
  const [communities, setCommunities] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [submittingComments, setSubmittingComments] = useState({});
  const [deletingComments, setDeletingComments] = useState({});
  const [likingPosts, setLikingPosts] = useState({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "Research",
    privacy_type: "public",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    category: "Research",
    privacy_type: "public",
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [post, setPost] = useState({ title: "", content: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadList = async () => {
    setLoading(true);
    try {
      const [communityRes, inviteRes] = await Promise.all([
        api.getCommunities(),
        api.getInvitations(),
      ]);
      setCommunities(communityRes.communities || []);
      setInvitations(inviteRes.invitations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const openCommunity = async (community) => {
    setError("");
    setSuccess("");
    setDescriptionExpanded(false);
    try {
      const [details, communityPosts] = await Promise.all([
        api.getCommunityDetails(community.id),
        community.is_member
          ? api.getCommunityPosts(community.id)
          : Promise.resolve({ posts: [] }),
      ]);
      setSelected(details.community);
      setMembers(details.members || []);
      setPosts(communityPosts.posts || []);
      setCommentsByPost({});
      setExpandedComments({});
      setCommentDrafts({});
      window.history.replaceState(null, "", `/communities?id=${community.id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleJoin = async () => {
    try {
      const result = await api.toggleJoinCommunity(selected.id);
      const updated = { ...selected, is_member: result.isMember };
      setSelected(updated);
      await loadList();
      await openCommunity(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const createCommunity = async (event) => {
    event.preventDefault();
    try {
      await api.createCommunity(form);
      setShowCreate(false);
      setForm({
        name: "",
        description: "",
        category: "Research",
        privacy_type: "public",
      });
      await loadList();
    } catch (err) {
      setError(err.message);
    }
  };

  const createPost = async (event) => {
    event.preventDefault();
    try {
      await api.createPost(selected.id, post);
      setPost({ title: "", content: "" });
      const result = await api.getCommunityPosts(selected.id);
      setPosts(result.posts || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (loading || selected) return;
    const communityId = new URLSearchParams(window.location.search).get("id");
    if (!communityId) return;

    const requestedCommunity = communities.find(
      (community) => Number(community.id) === Number(communityId),
    );
    if (requestedCommunity) openCommunity(requestedCommunity);
  }, [communities, loading, selected]);

  const toggleLike = async (item) => {
    if (likingPosts[item.id]) return;

    const wasLiked = Boolean(item.is_liked);
    const previousCount = Number(item.like_count) || 0;
    setError("");
    setLikingPosts((current) => ({ ...current, [item.id]: true }));
    setPosts((current) =>
      current.map((currentPost) =>
        currentPost.id === item.id
          ? {
              ...currentPost,
              is_liked: !wasLiked,
              like_count: Math.max(0, previousCount + (wasLiked ? -1 : 1)),
            }
          : currentPost,
      ),
    );

    try {
      const result = await api.toggleLikePost(item.id);
      setPosts((current) =>
        current.map((currentPost) =>
          currentPost.id === item.id
            ? {
                ...currentPost,
                is_liked: result.isLiked,
                like_count: result.likeCount,
              }
            : currentPost,
        ),
      );
    } catch (err) {
      setPosts((current) =>
        current.map((currentPost) =>
          currentPost.id === item.id
            ? {
                ...currentPost,
                is_liked: wasLiked,
                like_count: previousCount,
              }
            : currentPost,
        ),
      );
      setError(err.message);
    } finally {
      setLikingPosts((current) => ({ ...current, [item.id]: false }));
    }
  };

  const toggleComments = async (postId) => {
    if (expandedComments[postId]) {
      setExpandedComments((current) => ({ ...current, [postId]: false }));
      return;
    }

    setExpandedComments((current) => ({ ...current, [postId]: true }));
    if (Object.prototype.hasOwnProperty.call(commentsByPost, postId)) return;

    setError("");
    setLoadingComments((current) => ({ ...current, [postId]: true }));
    try {
      const result = await api.getPostComments(postId);
      setCommentsByPost((current) => ({
        ...current,
        [postId]: result.comments || [],
      }));
    } catch (err) {
      setExpandedComments((current) => ({ ...current, [postId]: false }));
      setError(err.message);
    } finally {
      setLoadingComments((current) => ({ ...current, [postId]: false }));
    }
  };

  const addComment = async (event, postId) => {
    event.preventDefault();
    const content = (commentDrafts[postId] || "").trim();
    if (!content || submittingComments[postId]) return;

    setError("");
    setSubmittingComments((current) => ({ ...current, [postId]: true }));
    try {
      const result = await api.addComment(postId, { content });
      setCommentsByPost((current) => ({
        ...current,
        [postId]: [...(current[postId] || []), result.comment],
      }));
      setCommentDrafts((current) => ({ ...current, [postId]: "" }));
      setPosts((current) =>
        current.map((currentPost) =>
          currentPost.id === postId
            ? {
                ...currentPost,
                comment_count: (Number(currentPost.comment_count) || 0) + 1,
              }
            : currentPost,
        ),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingComments((current) => ({ ...current, [postId]: false }));
    }
  };

  const deleteComment = async (postId, commentId) => {
    if (deletingComments[commentId] || !window.confirm("Delete this reply?")) {
      return;
    }

    setError("");
    setDeletingComments((current) => ({ ...current, [commentId]: true }));
    try {
      await api.deleteComment(commentId);
      setCommentsByPost((current) => ({
        ...current,
        [postId]: (current[postId] || []).filter(
          (comment) => comment.id !== commentId,
        ),
      }));
      setPosts((current) =>
        current.map((currentPost) =>
          currentPost.id === postId
            ? {
                ...currentPost,
                comment_count: Math.max(
                  0,
                  (Number(currentPost.comment_count) || 0) - 1,
                ),
              }
            : currentPost,
        ),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingComments((current) => ({
        ...current,
        [commentId]: false,
      }));
    }
  };

  const openEdit = () => {
    setEditForm({
      name: selected.name || "",
      description: selected.description || "",
      category: selected.category || "Research",
      privacy_type: selected.privacy_type || "public",
    });
    setShowEdit(true);
  };

  const updateCommunity = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const result = await api.updateCommunity(selected.id, editForm);
      const updated = { ...selected, ...result.community, is_member: true };
      setSelected(updated);
      setShowEdit(false);
      setSuccess("Community details updated successfully.");
      await loadList();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteCommunity = async () => {
    if (
      !window.confirm(
        `Delete "${selected.name}"? This permanently removes its posts, invitations, and membership data.`,
      )
    )
      return;
    setError("");
    try {
      await api.deleteCommunity(selected.id);
      setSelected(null);
      await loadList();
      window.history.replaceState(null, "", "/communities");
    } catch (err) {
      setError(err.message);
    }
  };

  const inviteMember = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      const result = await api.inviteUser(selected.id, inviteEmail.trim());
      setInviteEmail("");
      setSuccess(result.message || "Invitation sent successfully.");
    } catch (err) {
      setError(err.message);
    }
  };

  const respond = async (id, action) => {
    try {
      await api.respondToInvitation(id, action);
      await loadList();
    } catch (err) {
      setError(err.message);
    }
  };

  const filtered = useMemo(
    () =>
      communities.filter((community) => {
        const matchesSearch =
          `${community.name} ${community.description} ${community.category}`
            .toLowerCase()
            .includes(search.toLowerCase());
        const matchesCategory =
          category === "All" || community.category === category;
        return matchesSearch && matchesCategory;
      }),
    [communities, search, category],
  );

  const groupedCommunities = useMemo(
    () => ({
      created: filtered.filter(
        (community) => Number(community.created_by) === Number(user?.id),
      ),
      joined: filtered.filter(
        (community) =>
          community.is_member &&
          Number(community.created_by) !== Number(user?.id),
      ),
      available: filtered.filter((community) => !community.is_member),
    }),
    [filtered, user?.id],
  );

  const renderCommunityCard = (community) => {
    const PrivacyIcon =
      community.privacy_type === "public" ? Globe2 : LockKeyhole;
    const isOwner = Number(community.created_by) === Number(user?.id);
    const membershipState = isOwner
      ? "owner"
      : community.is_member
        ? "joined"
        : "available";
    const membershipLabel = isOwner
      ? "Owned by you"
      : community.is_member
        ? "Joined"
        : "View community";
    const accessLabel =
      community.privacy_type === "institution"
        ? "Institution only"
        : community.privacy_type === "private"
          ? "Private"
          : "Public";
    const memberCount = Number(community.member_count) || 0;

    return (
      <button
        className="community-directory-card"
        key={community.id}
        onClick={() => openCommunity(community)}
      >
        <span className="community-directory-card__body">
          <span className="community-directory-card__meta">
            <span className="community-category">
              {community.category || "Community"}
            </span>
            <span>
              <PrivacyIcon /> {accessLabel}
            </span>
          </span>
          <strong>{community.name}</strong>
          <span className="community-directory-card__description">
            {community.description ||
              "A focused place for academic exchange and collaboration."}
          </span>
        </span>
        <span className="community-directory-card__footer">
          <span>
            <Users /> {memberCount} {memberCount === 1 ? "member" : "members"}
          </span>
          <span
            className={`community-membership community-membership--${membershipState}`}
          >
            {membershipLabel}
          </span>
          <ChevronRight />
        </span>
      </button>
    );
  };

  if (selected) {
    const PrivacyIcon =
      selected.privacy_type === "public" ? Globe2 : LockKeyhole;
    const isOwner = Number(selected.created_by) === Number(user?.id);
    const isPrivate = selected.privacy_type === "private";
    const isInstitutionOnly = selected.privacy_type === "institution";
    const isDifferentInstitution =
      isInstitutionOnly &&
      Number(selected.institution_id) !== Number(user?.institution_id);
    const joinBlocked =
      !selected.is_member && (isPrivate || isDifferentInstitution);
    const description =
      selected.description || "This community has not added a description yet.";
    const descriptionNeedsToggle = description.length > 220;
    const visibleDescription =
      descriptionExpanded || !descriptionNeedsToggle
        ? description
        : `${description.slice(0, 220).trim()}…`;

    return (
      <div className="portal-page space-y-6 pb-16">
        <button
          className="portal-back"
          onClick={() => {
            setSelected(null);
            setDescriptionExpanded(false);
            window.history.replaceState(null, "", "/communities");
          }}
        >
          <ArrowLeft /> All communities
        </button>
        <section className="portal-detail-hero">
          <div>
            <p className="portal-eyebrow">
              {selected.category || "Academic community"}
            </p>
            <h1>{selected.name}</h1>
            <p className="portal-detail-description">{visibleDescription}</p>
            {descriptionNeedsToggle && (
              <button
                type="button"
                className="portal-description-toggle"
                onClick={() => setDescriptionExpanded((expanded) => !expanded)}
                aria-expanded={descriptionExpanded}
              >
                {descriptionExpanded ? "Read less" : "Read more"}
              </button>
            )}
            <div className="portal-detail-meta">
              <span>
                <PrivacyIcon /> {selected.privacy_type || "public"}
              </span>
              <span>
                <Users /> {members.length || selected.member_count || 0} members
              </span>
              <span>
                <ShieldCheck /> Led by{" "}
                {selected.creator_name || "community lead"}
              </span>
            </div>
          </div>
          {isOwner ? (
            <div className="portal-owner-actions">
              <button className="portal-secondary-button" onClick={openEdit}>
                <Edit3 /> Edit
              </button>
              <button
                className="portal-danger-button"
                onClick={deleteCommunity}
              >
                <Trash2 /> Delete
              </button>
            </div>
          ) : (
            <button
              className={
                selected.is_member
                  ? "portal-secondary-button"
                  : "portal-primary-button"
              }
              onClick={toggleJoin}
              disabled={joinBlocked}
              title={
                isPrivate
                  ? "Private communities require an email invitation"
                  : isDifferentInstitution
                    ? "Only users from the hosting institution can join"
                    : ""
              }
            >
              {selected.is_member ? (
                "Leave"
              ) : isPrivate ? (
                <>
                  <LockKeyhole /> Invitation required
                </>
              ) : isDifferentInstitution ? (
                <>
                  <ShieldCheck /> Institution members only
                </>
              ) : (
                <>
                  <UserRoundPlus /> Join
                </>
              )}
            </button>
          )}
        </section>

        {error && <div className="portal-alert">{error}</div>}
        {success && <div className="portal-success">{success}</div>}
        <div className="portal-detail-grid">
          <main className="space-y-5">
            {selected.is_member && (
              <form className="portal-composer" onSubmit={createPost}>
                <div>
                  <p className="portal-eyebrow">Start a conversation</p>
                  <h2>Share with the community</h2>
                </div>
                <input
                  aria-label="Post title"
                  placeholder="A clear topic or question"
                  value={post.title}
                  onChange={(e) => setPost({ ...post, title: e.target.value })}
                  required
                />
                <textarea
                  aria-label="Post content"
                  placeholder="Add context, an idea, or a resource…"
                  rows="3"
                  value={post.content}
                  onChange={(e) =>
                    setPost({ ...post, content: e.target.value })
                  }
                  required
                />
                <button className="portal-primary-button" type="submit">
                  Publish post
                </button>
              </form>
            )}
            <section className="portal-panel">
              <div className="portal-panel__head">
                <div>
                  <p className="portal-eyebrow">Community feed</p>
                  <h2>Recent conversations</h2>
                </div>
                <span>{posts.length} posts</span>
              </div>
              {!selected.is_member ? (
                <EmptyState
                  icon={LockKeyhole}
                  title="Join to enter the conversation"
                  description="Community posts are available to members."
                />
              ) : posts.length ? (
                posts.map((item) => (
                  <article className="portal-post" key={item.id}>
                    <div className="portal-avatar">
                      {item.author_name?.slice(0, 1) || "A"}
                    </div>
                    <div className="portal-post__body">
                      <p className="portal-post__by">
                        {item.author_name || "Community member"} ·{" "}
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                      <h3>{item.title}</h3>
                      <p>{item.content}</p>
                      <div className="portal-post__actions">
                        <button
                          type="button"
                          className={item.is_liked ? "is-active" : ""}
                          onClick={() => toggleLike(item)}
                          disabled={likingPosts[item.id]}
                          aria-pressed={Boolean(item.is_liked)}
                          aria-label={`${item.is_liked ? "Unlike" : "Like"} ${item.title}`}
                        >
                          <Heart fill={item.is_liked ? "currentColor" : "none"} />
                          {item.like_count || 0} {Number(item.like_count) === 1 ? "like" : "likes"}
                        </button>
                        <button
                          type="button"
                          className={expandedComments[item.id] ? "is-active" : ""}
                          onClick={() => toggleComments(item.id)}
                          aria-expanded={Boolean(expandedComments[item.id])}
                          aria-controls={`post-${item.id}-comments`}
                        >
                          <MessageSquareText /> {item.comment_count || 0}{" "}
                          {Number(item.comment_count) === 1 ? "reply" : "replies"}
                        </button>
                      </div>
                      {expandedComments[item.id] && (
                        <section
                          className="portal-comments"
                          id={`post-${item.id}-comments`}
                          aria-label={`Comments on ${item.title}`}
                        >
                          {loadingComments[item.id] ? (
                            <p className="portal-comments__status">Loading replies…</p>
                          ) : (commentsByPost[item.id] || []).length ? (
                            <div className="portal-comments__list">
                              {(commentsByPost[item.id] || []).map((comment) => (
                                <article className="portal-comment" key={comment.id}>
                                  <span className="portal-avatar">
                                    {comment.author_name?.slice(0, 1) || "A"}
                                  </span>
                                  <div>
                                    <div className="portal-comment__header">
                                      <p className="portal-comment__by">
                                        <strong>{comment.author_name || "Community member"}</strong>
                                        <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                                      </p>
                                      {isOwner && (
                                        <button
                                          type="button"
                                          className="portal-comment__delete"
                                          onClick={() => deleteComment(item.id, comment.id)}
                                          disabled={deletingComments[comment.id]}
                                          aria-label={`Delete reply from ${comment.author_name || "community member"}`}
                                          title="Delete reply"
                                        >
                                          <Trash2 />
                                        </button>
                                      )}
                                    </div>
                                    <p>{comment.content}</p>
                                  </div>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <p className="portal-comments__status">No replies yet. Start the conversation.</p>
                          )}
                          <form
                            className="portal-comment-form"
                            onSubmit={(event) => addComment(event, item.id)}
                          >
                            <label className="sr-only" htmlFor={`post-${item.id}-comment-input`}>
                              Add a reply to {item.title}
                            </label>
                            <textarea
                              id={`post-${item.id}-comment-input`}
                              rows="2"
                              maxLength="2000"
                              placeholder="Write a thoughtful reply…"
                              value={commentDrafts[item.id] || ""}
                              onChange={(event) =>
                                setCommentDrafts((current) => ({
                                  ...current,
                                  [item.id]: event.target.value,
                                }))
                              }
                              required
                            />
                            <button
                              type="submit"
                              disabled={
                                submittingComments[item.id] ||
                                !(commentDrafts[item.id] || "").trim()
                              }
                            >
                              <Send />
                              {submittingComments[item.id] ? "Posting…" : "Reply"}
                            </button>
                          </form>
                        </section>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState
                  icon={MessageSquareText}
                  title="No conversations yet"
                  description="Be the first member to start a thoughtful discussion."
                />
              )}
            </section>
          </main>
          <aside className="portal-panel portal-members">
            {isOwner && isPrivate && (
              <form className="portal-invite-form" onSubmit={inviteMember}>
                <span className="portal-resource-icon">
                  <MailPlus />
                </span>
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
                <button className="portal-primary-button" type="submit">
                  <MailPlus /> Send invitation
                </button>
              </form>
            )}
            <div className="portal-panel__head">
              <div>
                <p className="portal-eyebrow">People</p>
                <h2>Community members</h2>
              </div>
            </div>
            {members.slice(0, 8).map((member) => (
              <div key={member.id} className="portal-person">
                <span className="portal-avatar">
                  {member.full_name?.slice(0, 1)}
                </span>
                <span>
                  <strong>{member.full_name}</strong>
                  <small>{member.role}</small>
                </span>
              </div>
            ))}
            {!members.length && (
              <p className="portal-muted">
                {selected.is_member
                  ? "Member details will appear here."
                  : "Join to meet the members."}
              </p>
            )}
          </aside>
        </div>

        {showEdit && (
          <Modal
            title="Edit community"
            description="Update the community identity and access rules."
            onClose={() => setShowEdit(false)}
          >
            <form className="portal-form" onSubmit={updateCommunity}>
              <label>
                Name
                <input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                Description
                <textarea
                  rows="5"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  Category
                  <select
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm({ ...editForm, category: e.target.value })
                    }
                  >
                    {categories.slice(1).map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Access
                  <select
                    value={editForm.privacy_type}
                    onChange={(e) =>
                      setEditForm({ ...editForm, privacy_type: e.target.value })
                    }
                  >
                    <option value="public">Public</option>
                    <option value="private">Private — invite only</option>
                    <option value="institution">Institution only</option>
                  </select>
                </label>
              </div>
              <div className="portal-form__actions">
                <button
                  type="button"
                  className="portal-secondary-button"
                  onClick={() => setShowEdit(false)}
                >
                  Cancel
                </button>
                <button className="portal-primary-button">
                  <Edit3 /> Save changes
                </button>
              </div>
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
        title={
          <>
            Find the room where your <em>ideas belong.</em>
          </>
        }
        action={
          <button
            className="portal-primary-button"
            onClick={() => setShowCreate(true)}
          >
            <Plus /> Create community
          </button>
        }
      >
        <div className="portal-hero__stats">
          <StatPill
            icon={ShieldCheck}
            value={
              communities.filter(
                (item) => Number(item.created_by) === Number(user?.id),
              ).length
            }
            label="Created by you"
          />
          <StatPill
            icon={Users}
            value={
              communities.filter(
                (item) =>
                  item.is_member &&
                  Number(item.created_by) !== Number(user?.id),
              ).length
            }
            label="Joined communities"
          />
          <StatPill
            icon={Mail}
            value={invitations.length}
            label="Pending invites"
            tone="amber"
          />
        </div>
      </PageIntro>

      {invitations.length > 0 && (
        <section className="portal-invitations">
          <div className="portal-invitations__intro">
            <p className="portal-eyebrow">You’re invited</p>
            <h2>New communities are waiting for you</h2>
          </div>
          <div className="portal-invitations__list">
            {invitations.map((invite) => (
              <article className="portal-invitation-row" key={invite.id}>
                <span className="portal-invitation-row__details">
                  <strong>{invite.community_name}</strong>
                  <small>Invited by {invite.inviter_name}</small>
                </span>
                <span className="portal-invitation-row__actions">
                  <button onClick={() => respond(invite.id, "reject")}>
                    Decline
                  </button>
                  <button onClick={() => respond(invite.id, "accept")}>
                    Accept
                  </button>
                </span>
              </article>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="portal-toolbar">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search by name, topic, or description"
            label="Search communities"
          />
          <div
            className="community-filter-row"
            aria-label="Community categories"
          >
            {categories.map((item) => (
              <button
                key={item}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        {error && <div className="portal-alert">{error}</div>}
        {loading ? (
          <div className="portal-loading">Gathering communities…</div>
        ) : filtered.length ? (
          <div className="portal-community-groups">
            <section
              className="portal-community-group"
              aria-labelledby="created-communities-heading"
            >
              <div className="portal-group-heading">
                <div>
                  <h2 id="created-communities-heading">My communities</h2>
                </div>
                <span>{groupedCommunities.created.length}</span>
              </div>
              {groupedCommunities.created.length ? (
                <div className="community-card-grid">
                  {groupedCommunities.created.map(renderCommunityCard)}
                </div>
              ) : (
                <div className="portal-group-empty">
                  You haven’t created a community yet.
                </div>
              )}
            </section>

            <section
              className="portal-community-group"
              aria-labelledby="joined-communities-heading"
            >
              <div className="portal-group-heading">
                <div>
                  <h2 id="joined-communities-heading">Joined communities</h2>
                </div>
                <span>{groupedCommunities.joined.length}</span>
              </div>
              {groupedCommunities.joined.length ? (
                <div className="community-card-grid">
                  {groupedCommunities.joined.map(renderCommunityCard)}
                </div>
              ) : (
                <div className="portal-group-empty">
                  Communities you join will appear here.
                </div>
              )}
            </section>

            <section
              className="portal-community-group"
              aria-labelledby="available-communities-heading"
            >
              <div className="portal-group-heading">
                <div>
                  <h2 id="available-communities-heading">
                    Available communities
                  </h2>
                </div>
                <span>{groupedCommunities.available.length}</span>
              </div>
              {groupedCommunities.available.length ? (
                <div className="community-card-grid">
                  {groupedCommunities.available.map(renderCommunityCard)}
                </div>
              ) : (
                <div className="portal-group-empty">
                  There are no other communities available right now.
                </div>
              )}
            </section>
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No communities found"
            description="Try a different search or create a new community around this topic."
          />
        )}
      </section>

      {showCreate && (
        <Modal
          title="Create a community"
          description="Give people a clear reason to gather."
          onClose={() => setShowCreate(false)}
        >
          <form className="portal-form" onSubmit={createCommunity}>
            <label>
              Name
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Responsible AI Lab"
                required
              />
            </label>
            <label>
              Description
              <textarea
                rows="4"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="What will members discuss or build together?"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                Category
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                >
                  {categories.slice(1).map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                Access
                <select
                  value={form.privacy_type}
                  onChange={(e) =>
                    setForm({ ...form, privacy_type: e.target.value })
                  }
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="institution">Institution only</option>
                </select>
              </label>
            </div>
            <div className="portal-form__actions">
              <button
                type="button"
                className="portal-secondary-button"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
              <button className="portal-primary-button">
                Create community
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default CommunityPage;
