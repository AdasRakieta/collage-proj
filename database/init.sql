-- Journey Planner Database Schema - Simplified MVP (Faza 1)
-- PostgreSQL initialization script

-- Journeys table
CREATE TABLE IF NOT EXISTS journeys (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    currency VARCHAR(3) DEFAULT 'PLN',
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
    arrival_date DATE NOT NULL,
    departure_date DATE NOT NULL,
    accommodation_name VARCHAR(255),
    accommodation_link TEXT,
    accommodation_price DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    currency VARCHAR(3) DEFAULT 'PLN',
    booking_link TEXT,
    flight_number VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attractions table
CREATE TABLE IF NOT EXISTS attractions (
    id SERIAL PRIMARY KEY,
    stop_id INTEGER NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_cost DECIMAL(10, 2),
    duration_hours INTEGER,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stops_journey_id ON stops(journey_id);
CREATE INDEX IF NOT EXISTS idx_transports_journey_id ON transports(journey_id);
CREATE INDEX IF NOT EXISTS idx_attractions_stop_id ON attractions(stop_id);
CREATE INDEX IF NOT EXISTS idx_journeys_dates ON journeys(start_date, end_date);
