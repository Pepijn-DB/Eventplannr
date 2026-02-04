CREATE TYPE permission_type AS ENUM ('USER', 'GLOBAL_ADMIN', 'USER_ADMIN', 'EVENT_ADMIN');
CREATE TYPE event_status AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'CANCELLED');
CREATE TYPE user_role AS ENUM ('GUEST', 'DATE_PICKER', 'LOCATION_PICKER', 'ORGANISER');
CREATE TYPE response_state AS ENUM ('YES', 'NO', 'MAYBE', 'QUESTION', 'NO_RESPONSE');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_log INTEGER
);

CREATE TABLE user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    permission permission_type NOT NULL DEFAULT 'USER',
    enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_log INTEGER
);

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    creator_user INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_log INTEGER,
    status event_status NOT NULL DEFAULT 'DRAFT'
);

CREATE TABLE event_dates (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_log INTEGER
);

CREATE TABLE event_locations (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_log INTEGER
);

CREATE TABLE invitation (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    event_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_log INTEGER,
    role user_role NOT NULL DEFAULT 'GUEST'
);

CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    creator_user INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_log INTEGER
);

CREATE TABLE date_response (
    id SERIAL PRIMARY KEY,
    invitation_id INTEGER NOT NULL,
    date_id INTEGER NOT NULL,
    state response_state NOT NULL DEFAULT 'NO_RESPONSE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_log INTEGER
);

CREATE TABLE location_response (
    id SERIAL PRIMARY KEY,
    invitation_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    state response_state NOT NULL DEFAULT 'NO_RESPONSE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_log INTEGER
);

CREATE TABLE log (
    id SERIAL PRIMARY KEY,
   table_name VARCHAR(50),
   where_clause VARCHAR(250),
   action VARCHAR(50),
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   query TEXT,
   executioner_id INTEGER
);

ALTER TABLE users ADD FOREIGN KEY (updated_log) REFERENCES log (id);

ALTER TABLE user_permissions ADD FOREIGN KEY (user_id) REFERENCES users (id);
ALTER TABLE user_permissions ADD FOREIGN KEY (updated_log) REFERENCES log (id);

ALTER TABLE events ADD FOREIGN KEY (creator_user) REFERENCES users (id);
ALTER TABLE events ADD FOREIGN KEY (updated_log) REFERENCES log (id);

ALTER TABLE event_dates ADD FOREIGN KEY (event_id) REFERENCES events (id);
ALTER TABLE event_dates ADD FOREIGN KEY (updated_log) REFERENCES log (id);

ALTER TABLE event_locations ADD FOREIGN KEY (event_id) REFERENCES events (id);
ALTER TABLE event_locations ADD FOREIGN KEY (location_id) REFERENCES locations (id);
ALTER TABLE event_locations ADD FOREIGN KEY (updated_log) REFERENCES log (id);

ALTER TABLE invitation ADD FOREIGN KEY (user_id) REFERENCES users (id);
ALTER TABLE invitation ADD FOREIGN KEY (event_id) REFERENCES events (id);
ALTER TABLE invitation ADD FOREIGN KEY (updated_log) REFERENCES log (id);

ALTER TABLE locations ADD FOREIGN KEY (creator_user) REFERENCES users (id);
ALTER TABLE locations ADD FOREIGN KEY (updated_log) REFERENCES log (id);

ALTER TABLE date_response ADD FOREIGN KEY (invitation_id) REFERENCES invitation (id);
ALTER TABLE date_response ADD FOREIGN KEY (date_id) REFERENCES event_dates (id);
ALTER TABLE date_response ADD FOREIGN KEY (updated_log) REFERENCES log (id);

ALTER TABLE location_response ADD FOREIGN KEY (invitation_id) REFERENCES invitation (id);
ALTER TABLE location_response ADD FOREIGN KEY (location_id) REFERENCES event_locations (id);
ALTER TABLE location_response ADD FOREIGN KEY (updated_log) REFERENCES log (id);

ALTER TABLE log ADD FOREIGN KEY (executioner_id) REFERENCES users (id);

-- 4. ADD UNIQUE CONSTRAINTS
ALTER TABLE invitation ADD CONSTRAINT unique_invite UNIQUE (user_id, event_id);
ALTER TABLE date_response ADD CONSTRAINT unique_date_vote UNIQUE (invitation_id, date_id);
ALTER TABLE location_response ADD CONSTRAINT unique_loc_vote UNIQUE (invitation_id, location_id);
ALTER TABLE user_permissions ADD CONSTRAINT unique_perm UNIQUE (user_id, permission);