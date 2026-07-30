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

-- 3. Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'lecturer', 'researcher', 'admin')),
    institution_id INT REFERENCES institutions(id) ON DELETE SET NULL,
    department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    bio TEXT,
    avatar_url VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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
