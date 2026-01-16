-- Journey Planner Database Schema
-- PostgreSQL initialization script

-- Create database (run as postgres user)
-- CREATE DATABASE journey_planner;
-- CREATE USER journey_user WITH PASSWORD 'your_secure_password';
-- GRANT ALL PRIVILEGES ON DATABASE journey_planner TO journey_user;

-- Connect to journey_planner database before running the following

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token TEXT,
    reset_token TEXT,
    reset_token_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Journeys table
CREATE TABLE IF NOT EXISTS journeys (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    total_estimated_cost DECIMAL(10, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'PLN',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stops table
CREATE TABLE IF NOT EXISTS stops (
    id SERIAL PRIMARY KEY,
    journey_id INTEGER NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    city VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    arrival_date TIMESTAMP NOT NULL,
    departure_date TIMESTAMP NOT NULL,
    accommodation_name VARCHAR(255),
    accommodation_url TEXT,
    accommodation_price DECIMAL(10, 2),
    accommodation_currency VARCHAR(3),
    notes TEXT,
    is_paid BOOLEAN DEFAULT FALSE
    , address_street VARCHAR(255),
    address_house_number VARCHAR(64),
    address_postal_code VARCHAR(32)
);

-- Transports table
CREATE TABLE IF NOT EXISTS transports (
    id SERIAL PRIMARY KEY,
    journey_id INTEGER NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('flight', 'train', 'bus', 'car', 'other')),
    from_location VARCHAR(255) NOT NULL,
    to_location VARCHAR(255) NOT NULL,
    departure_date TIMESTAMP NOT NULL,
    arrival_date TIMESTAMP NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    booking_url TEXT,
    notes TEXT,
    flight_number VARCHAR(50),
    train_number VARCHAR(50),
    is_paid BOOLEAN DEFAULT FALSE
);

-- Attractions table
CREATE TABLE IF NOT EXISTS attractions (
    id SERIAL PRIMARY KEY,
    stop_id INTEGER NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_cost DECIMAL(10, 2),
    currency VARCHAR(3),
    duration VARCHAR(50), -- e.g., "2 hours", "30 minutes"
    is_paid BOOLEAN DEFAULT FALSE,
    address TEXT, -- Full address (legacy field for backward compatibility)
    address_street VARCHAR(255), -- Street name and number
    address_city VARCHAR(255), -- City name
    address_postal_code VARCHAR(32), -- Postal/ZIP code
    address_country VARCHAR(255), -- Country name
    latitude DECIMAL(10, 8), -- Latitude coordinate for map marker
    longitude DECIMAL(11, 8), -- Longitude coordinate for map marker
    visit_time VARCHAR(5), -- HH:MM format for planned visit time
    order_index INTEGER DEFAULT 0, -- For sorting within stop
    priority VARCHAR(10) CHECK (priority IN ('must', 'should', 'could', 'skip')), -- Priority level for itinerary planning
    planned_date DATE, -- YYYY-MM-DD format for scheduled date
    planned_time VARCHAR(5), -- HH:MM format for scheduled time
    tag VARCHAR(20) CHECK (tag IN ('beauty', 'cafe', 'must_see', 'accommodation', 'nature', 'airport', 'food', 'attraction', 'train_station')) -- Category tag for attraction
);

-- Journey shares (sharing/collaboration on journeys)
-- Journey shares (new schema compatible with controllers)
CREATE TABLE IF NOT EXISTS journey_shares (
    id SERIAL PRIMARY KEY,
    journey_id INTEGER NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    -- Legacy column kept for backward compatibility
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    -- New columns used by API
    shared_with_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    shared_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    role VARCHAR(16) NOT NULL DEFAULT 'edit' CHECK (role IN ('view','edit','manage')),
    status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
    invited_email VARCHAR(255),
    invitation_token TEXT,
    accepted_at TIMESTAMP,
    rejected_at TIMESTAMP,
    -- Legacy flag kept (not used by new code)
    accepted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure columns exist if table was created with legacy schema
ALTER TABLE journey_shares
    ADD COLUMN IF NOT EXISTS shared_with_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS shared_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS role VARCHAR(16);
ALTER TABLE journey_shares
    ALTER COLUMN role SET DEFAULT 'edit',
    ADD CONSTRAINT IF NOT EXISTS journey_shares_role_chk CHECK (role IN ('view','edit','manage'));
ALTER TABLE journey_shares
    ADD COLUMN IF NOT EXISTS status VARCHAR(16) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS invited_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS invitation_token TEXT,
    ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
ALTER TABLE journey_shares
    ADD CONSTRAINT IF NOT EXISTS journey_shares_status_chk CHECK (status IN ('pending','accepted','rejected'));

-- Journey checklist items (per-journey todo/checklist)
CREATE TABLE IF NOT EXISTS journey_checklist (
    id SERIAL PRIMARY KEY,
    journey_id INTEGER NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    is_done BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transport attachments table
CREATE TABLE IF NOT EXISTS transport_attachments (
    id SERIAL PRIMARY KEY,
    transport_id INTEGER NOT NULL REFERENCES transports(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stops_journey_id ON stops(journey_id);
CREATE INDEX IF NOT EXISTS idx_transports_journey_id ON transports(journey_id);
CREATE INDEX IF NOT EXISTS idx_attractions_stop_id ON attractions(stop_id);
CREATE INDEX IF NOT EXISTS idx_attractions_planned_date ON attractions(planned_date);
CREATE INDEX IF NOT EXISTS idx_attractions_order_index ON attractions(order_index);
CREATE INDEX IF NOT EXISTS idx_transport_attachments_transport_id ON transport_attachments(transport_id);
CREATE INDEX IF NOT EXISTS idx_transport_attachments_uploaded_by ON transport_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_journey_shares_journey_id ON journey_shares(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_shares_shared_with_user_id ON journey_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_journey_shares_status ON journey_shares(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_journeys_created_at ON journeys(created_at);
CREATE INDEX IF NOT EXISTS idx_journeys_created_by ON journeys(created_by);

-- Invitation tokens for admin-invite flow
CREATE TABLE IF NOT EXISTS invitation_tokens (
    id SERIAL PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    invited_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invitation_tokens_token ON invitation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_email ON invitation_tokens(email);

-- Registration requests queue (pending approvals)
CREATE TABLE IF NOT EXISTS registration_requests (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    provider VARCHAR(50),
    profile JSONB,
    status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    password_hash TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_registration_requests_email ON registration_requests(email);
CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_registration_requests_created_at ON registration_requests(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for journeys table
DROP TRIGGER IF EXISTS update_journeys_updated_at ON journeys;
CREATE TRIGGER update_journeys_updated_at
    BEFORE UPDATE ON journeys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions to journey_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO journey_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO journey_user;

-- Insert sample data (optional, for testing)
-- Uncomment the following lines to insert sample data

/*
INSERT INTO journeys (title, description, start_date, end_date, currency) VALUES
('European Adventure', 'Exploring the best of Europe', '2024-06-01', '2024-06-15', 'EUR');

INSERT INTO stops (journey_id, city, country, latitude, longitude, arrival_date, departure_date, accommodation_name, accommodation_price, accommodation_currency) VALUES
(1, 'Paris', 'France', 48.8566, 2.3522, '2024-06-01', '2024-06-05', 'Hotel de Paris', 150, 'EUR'),
(1, 'Rome', 'Italy', 41.9028, 12.4964, '2024-06-05', '2024-06-10', 'Roman Holiday Inn', 120, 'EUR'),
(1, 'Barcelona', 'Spain', 41.3851, 2.1734, '2024-06-10', '2024-06-15', 'Barcelona Beach Hotel', 130, 'EUR');

INSERT INTO transports (journey_id, type, from_location, to_location, departure_date, arrival_date, price, currency) VALUES
(1, 'flight', 'New York', 'Paris', '2024-06-01 10:00:00', '2024-06-01 22:00:00', 450, 'EUR'),
(1, 'train', 'Paris', 'Rome', '2024-06-05 09:00:00', '2024-06-05 19:00:00', 200, 'EUR'),
(1, 'flight', 'Rome', 'Barcelona', '2024-06-10 14:00:00', '2024-06-10 16:00:00', 80, 'EUR');

INSERT INTO attractions (stop_id, name, description, estimated_cost, duration, currency) VALUES
(1, 'Eiffel Tower', 'Visit the iconic Eiffel Tower', 25, 3, 'EUR'),
(1, 'Louvre Museum', 'Explore the world-famous art museum', 17, 4, 'EUR'),
(2, 'Colosseum', 'Ancient Roman amphitheater', 16, 2, 'EUR'),
(2, 'Vatican Museums', 'Vatican art and history', 17, 4, 'EUR'),
(3, 'Sagrada Familia', 'Gaudi''s masterpiece', 26, 3, 'EUR'),
(3, 'Park Güell', 'Colorful park by Gaudi', 10, 2, 'EUR');
*/

-- Display table information
\dt
