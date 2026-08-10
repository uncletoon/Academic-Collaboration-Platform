-- Table definitions for Cross-Institutional Academic Collaboration and Real-Time Event Notification System

-- 1. Institutions
CREATE TABLE IF NOT EXISTS institutions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(100) NOT NULL, -- e.g., 'University', 'Research Institute'
    location VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Departments
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    institution_id INT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_dept_per_inst UNIQUE (name, institution_id)
);

-- Administrative role catalogue. A custom role inherits one of the platform's
-- established access levels so existing authorization rules remain predictable.
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role_key VARCHAR(100) NOT NULL,
    description TEXT,
    base_role VARCHAR(50) NOT NULL CHECK (base_role IN ('student', 'lecturer', 'institution_admin', 'admin')),
    color VARCHAR(20) NOT NULL DEFAULT '#2563EB',
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    institution_id INT REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='user_roles' AND column_name='institution_id') THEN
        ALTER TABLE user_roles ADD COLUMN institution_id INT REFERENCES institutions(id) ON DELETE CASCADE;
    END IF;
END
$$;

ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_name_key;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_key_key;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_base_role_check;
UPDATE user_roles SET base_role = 'lecturer', is_system = FALSE WHERE base_role = 'researcher' OR role_key = 'researcher';
UPDATE user_roles
SET name = 'Institution Administrator', role_key = 'institution_admin', base_role = 'institution_admin', is_system = TRUE
WHERE role_key IN ('institution_admin', 'institution-admin')
   OR (LOWER(name) = 'institution administrator' AND institution_id IS NULL);
UPDATE user_roles SET name = 'System Administrator' WHERE role_key = 'admin' AND institution_id IS NULL;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_base_role_check
    CHECK (base_role IN ('student', 'lecturer', 'institution_admin', 'admin'));

CREATE UNIQUE INDEX IF NOT EXISTS unique_global_role_name
    ON user_roles (LOWER(name)) WHERE institution_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS unique_institution_role_name
    ON user_roles (institution_id, LOWER(name)) WHERE institution_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS unique_global_role_key
    ON user_roles (role_key) WHERE institution_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS unique_institution_role_key
    ON user_roles (institution_id, role_key) WHERE institution_id IS NOT NULL;

INSERT INTO user_roles (name, role_key, description, base_role, color, is_system, institution_id)
SELECT seed.name, seed.role_key, seed.description, seed.base_role, seed.color, seed.is_system, NULL
FROM (VALUES
    ('Student', 'student', 'Learns, joins communities, and collaborates on academic work.', 'student', '#2563EB', TRUE),
    ('Lecturer', 'lecturer', 'Teaches and leads academic collaboration activities.', 'lecturer', '#D97706', TRUE),
    ('Institution Administrator', 'institution_admin', 'Administrative access restricted to one institution.', 'institution_admin', '#7C3AED', TRUE),
    ('System Administrator', 'admin', 'Unrestricted system administration and moderation access.', 'admin', '#DC2626', TRUE)
) AS seed(name, role_key, description, base_role, color, is_system)
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles existing
    WHERE existing.role_key = seed.role_key AND existing.institution_id IS NULL
);

-- 3. Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'lecturer', 'institution_admin', 'admin')),
    role_id INT REFERENCES user_roles(id) ON DELETE SET NULL,
    institution_id INT REFERENCES institutions(id) ON DELETE SET NULL,
    department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    student_id VARCHAR(30),
    staff_id VARCHAR(50),
    job_title VARCHAR(120),
    qualification VARCHAR(255),
    expertise TEXT,
    phone_number VARCHAR(30),
    bio TEXT,
    avatar_url VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    approval_status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by INT REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='role_id') THEN
        ALTER TABLE users ADD COLUMN role_id INT REFERENCES user_roles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='student_id') THEN
        ALTER TABLE users ADD COLUMN student_id VARCHAR(30);
    ELSE
        ALTER TABLE users ALTER COLUMN student_id TYPE VARCHAR(30);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='staff_id') THEN
        ALTER TABLE users ADD COLUMN staff_id VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='job_title') THEN
        ALTER TABLE users ADD COLUMN job_title VARCHAR(120);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='qualification') THEN
        ALTER TABLE users ADD COLUMN qualification VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='expertise') THEN
        ALTER TABLE users ADD COLUMN expertise TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone_number') THEN
        ALTER TABLE users ADD COLUMN phone_number VARCHAR(30);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='approval_status') THEN
        ALTER TABLE users ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'approved';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='approved_by') THEN
        ALTER TABLE users ADD COLUMN approved_by INT REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='approved_at') THEN
        ALTER TABLE users ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='approval_notes') THEN
        ALTER TABLE users ADD COLUMN approval_notes TEXT;
    END IF;
END
$$;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_student_id_format_check;
ALTER TABLE users ADD CONSTRAINT users_student_id_format_check
    CHECK (student_id IS NULL OR student_id ~ '^[A-Za-z0-9][A-Za-z0-9/-]{0,29}$');

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_approval_status_check;
ALTER TABLE users ADD CONSTRAINT users_approval_status_check
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));

CREATE UNIQUE INDEX IF NOT EXISTS unique_staff_id_per_institution
    ON users (institution_id, LOWER(staff_id))
    WHERE institution_id IS NOT NULL AND staff_id IS NOT NULL AND staff_id <> '';

UPDATE users u
SET role_id = r.id
FROM user_roles r
WHERE u.role_id IS NULL AND r.role_key = u.role AND r.institution_id IS NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
UPDATE users u SET role = 'institution_admin'
FROM user_roles r
WHERE u.role_id = r.id AND r.base_role = 'institution_admin';
UPDATE users SET role = 'lecturer' WHERE role = 'researcher';
UPDATE users u
SET role_id = lecturer.id
FROM user_roles previous, user_roles lecturer
WHERE u.role_id = previous.id
  AND previous.role_key = 'researcher'
  AND lecturer.role_key = 'lecturer'
  AND lecturer.institution_id IS NULL;
DELETE FROM user_roles WHERE role_key = 'researcher';
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('student', 'lecturer', 'institution_admin', 'admin'));

-- Immutable accountability trail for sensitive administrator actions.
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id VARCHAR(80),
    summary TEXT NOT NULL,
    institution_id INT REFERENCES institutions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='admin_audit_logs' AND column_name='institution_id') THEN
        ALTER TABLE admin_audit_logs ADD COLUMN institution_id INT REFERENCES institutions(id) ON DELETE SET NULL;
    END IF;
END
$$;

UPDATE admin_audit_logs logs
SET institution_id = actor.institution_id
FROM users actor
WHERE logs.institution_id IS NULL
  AND logs.actor_id = actor.id
  AND actor.role = 'institution_admin'
  AND actor.institution_id IS NOT NULL;

-- 4. Academic Communities
CREATE TABLE IF NOT EXISTS academic_communities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    institution_id INT REFERENCES institutions(id) ON DELETE SET NULL, -- optional: if null, it's cross-institutional
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='academic_communities' AND column_name='privacy_type') THEN
        ALTER TABLE academic_communities ADD COLUMN privacy_type VARCHAR(50) DEFAULT 'public' CHECK (privacy_type IN ('public', 'private', 'institution'));
    END IF;
END
$$;

-- 5. Community Members
CREATE TABLE IF NOT EXISTS community_members (
    community_id INT REFERENCES academic_communities(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (community_id, user_id)
);

-- 5b. Community Invitations
CREATE TABLE IF NOT EXISTS community_invitations (
    id SERIAL PRIMARY KEY,
    community_id INT REFERENCES academic_communities(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(community_id, user_id)
);

-- 6. Posts
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    community_id INT NOT NULL REFERENCES academic_communities(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Comments
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Likes
CREATE TABLE IF NOT EXISTS likes (
    post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id)
);

-- 9. Projects
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed')),
    requirements JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(requirements) = 'array'),
    privacy_type VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (privacy_type = 'private'),
    access_scope VARCHAR(50) NOT NULL DEFAULT 'everyone' CHECK (access_scope IN ('everyone', 'institution')),
    institution_id INT REFERENCES institutions(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='requirements') THEN
        ALTER TABLE projects ADD COLUMN requirements JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='access_scope') THEN
        ALTER TABLE projects ADD COLUMN access_scope VARCHAR(50) NOT NULL DEFAULT 'everyone'
            CHECK (access_scope IN ('everyone', 'institution'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='privacy_type') THEN
        ALTER TABLE projects ADD COLUMN privacy_type VARCHAR(20) NOT NULL DEFAULT 'private'
            CHECK (privacy_type = 'private');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='institution_id') THEN
        ALTER TABLE projects ADD COLUMN institution_id INT REFERENCES institutions(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='updated_at') THEN
        ALTER TABLE projects ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END
$$;

-- 10. Project Members
CREATE TABLE IF NOT EXISTS project_members (
    project_id INT REFERENCES projects(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'contributor' CHECK (role IN ('lead', 'contributor', 'observer')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, user_id)
);

-- 10b. Project Join Requests
CREATE TABLE IF NOT EXISTS project_join_requests (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP WITH TIME ZONE,
    responded_by INT REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(project_id, user_id)
);

-- 11. Project Files
CREATE TABLE IF NOT EXISTS project_files (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(255) NOT NULL,
    mime_type VARCHAR(255),
    file_size BIGINT,
    uploaded_by INT REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_files' AND column_name='mime_type') THEN
        ALTER TABLE project_files ADD COLUMN mime_type VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_files' AND column_name='file_size') THEN
        ALTER TABLE project_files ADD COLUMN file_size BIGINT;
    END IF;
END
$$;

-- 12. Events
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255) NOT NULL,
    meeting_link VARCHAR(1000),
    organizer_id INT REFERENCES users(id) ON DELETE SET NULL,
    institution_id INT REFERENCES institutions(id) ON DELETE SET NULL, -- null means open to all institutions
    capacity INT DEFAULT 100,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='meeting_link') THEN
        ALTER TABLE events ADD COLUMN meeting_link VARCHAR(1000);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='updated_at') THEN
        ALTER TABLE events ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END
$$;

-- 13. Event Registrations
CREATE TABLE IF NOT EXISTS event_registrations (
    event_id INT REFERENCES events(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, user_id)
);

-- 14. Public News
CREATE TABLE IF NOT EXISTS news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Other',
    feature_image VARCHAR(500) NOT NULL,
    external_link VARCHAR(1000),
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    institution_id INT REFERENCES institutions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='news' AND column_name='institution_id') THEN
        ALTER TABLE news ADD COLUMN institution_id INT REFERENCES institutions(id) ON DELETE SET NULL;
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS news_documents (
    id SERIAL PRIMARY KEY,
    news_id INT NOT NULL REFERENCES news(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    mime_type VARCHAR(150),
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Chat Rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255), -- NULL for 1-to-1 chats
    is_group BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Chat Members
CREATE TABLE IF NOT EXISTS chat_members (
    room_id INT REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id)
);

-- 17. Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    room_id INT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'chat', 'event', 'project', 'community', 'system'
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seeding some baseline institutions and departments if not present
INSERT INTO institutions (name, type, location) VALUES 
('Global Tech University (GTU)', 'University', 'New York, USA'),
('Alliance Research Center (ARC)', 'Research Institute', 'Geneva, Switzerland'),
('Pacific Institute of Sciences (PIS)', 'University', 'Tokyo, Japan')
ON CONFLICT (name) DO NOTHING;

-- Seed departments for GTU (ID 1)
INSERT INTO departments (name, institution_id) VALUES 
('Computer Science & Engineering', 1),
('Quantum Physics Department', 1),
('Bio-Medical Engineering', 1)
ON CONFLICT ON CONSTRAINT unique_dept_per_inst DO NOTHING;

-- Seed departments for ARC (ID 2)
INSERT INTO departments (name, institution_id) VALUES 
('High-Energy Physics Lab', 2),
('Artificial Intelligence Lab', 2)
ON CONFLICT ON CONSTRAINT unique_dept_per_inst DO NOTHING;

-- Seed departments for PIS (ID 3)
INSERT INTO departments (name, institution_id) VALUES 
('Department of Informatics', 3),
('Molecular Chemistry Research Group', 3)
ON CONFLICT ON CONSTRAINT unique_dept_per_inst DO NOTHING;
