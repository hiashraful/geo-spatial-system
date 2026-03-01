-- Enable PostGIS extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Aircraft positions table
CREATE TABLE IF NOT EXISTS aircraft_positions (
    id SERIAL PRIMARY KEY,
    icao24 VARCHAR(6) NOT NULL,
    callsign VARCHAR(8),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    altitude DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    velocity DOUBLE PRECISION,
    vertical_rate DOUBLE PRECISION,
    on_ground BOOLEAN DEFAULT FALSE,
    squawk VARCHAR(4),
    category VARCHAR(2),
    geom GEOMETRY(Point, 4326),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index
CREATE INDEX idx_aircraft_positions_geom ON aircraft_positions USING GIST(geom);
CREATE INDEX idx_aircraft_positions_icao24 ON aircraft_positions(icao24);
CREATE INDEX idx_aircraft_positions_timestamp ON aircraft_positions(timestamp DESC);

-- Geofence zones table
CREATE TABLE IF NOT EXISTS geofence_zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    zone_type VARCHAR(50) NOT NULL DEFAULT 'restricted',
    geom GEOMETRY(Polygon, 4326) NOT NULL,
    altitude_min DOUBLE PRECISION DEFAULT 0,
    altitude_max DOUBLE PRECISION DEFAULT 60000,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_geofence_zones_geom ON geofence_zones USING GIST(geom);

-- Detection results table
CREATE TABLE IF NOT EXISTS detection_results (
    id SERIAL PRIMARY KEY,
    source_type VARCHAR(50) NOT NULL,
    source_id VARCHAR(255),
    class_name VARCHAR(100) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    bbox_geojson JSONB,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    geom GEOMETRY(Point, 4326),
    metadata JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_detection_results_geom ON detection_results USING GIST(geom);

-- Traffic cameras table
CREATE TABLE IF NOT EXISTS traffic_cameras (
    id SERIAL PRIMARY KEY,
    camera_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),
    status VARCHAR(20) DEFAULT 'active',
    stream_url VARCHAR(500),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_traffic_cameras_geom ON traffic_cameras USING GIST(geom);

-- Trigger to auto-set geometry from lat/lon on aircraft positions
CREATE OR REPLACE FUNCTION set_aircraft_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_aircraft_geom
    BEFORE INSERT OR UPDATE ON aircraft_positions
    FOR EACH ROW EXECUTE FUNCTION set_aircraft_geom();

-- Trigger for traffic cameras
CREATE OR REPLACE FUNCTION set_camera_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_camera_geom
    BEFORE INSERT OR UPDATE ON traffic_cameras
    FOR EACH ROW EXECUTE FUNCTION set_camera_geom();

-- Insert sample geofence zones
INSERT INTO geofence_zones (name, zone_type, geom) VALUES
('JFK Airport Zone', 'restricted', ST_GeomFromText('POLYGON((-73.82 40.62, -73.74 40.62, -73.74 40.67, -73.82 40.67, -73.82 40.62))', 4326)),
('Manhattan No-Fly Zone', 'no_fly', ST_GeomFromText('POLYGON((-74.02 40.70, -73.97 40.70, -73.97 40.78, -74.02 40.78, -74.02 40.70))', 4326)),
('LaGuardia Approach', 'caution', ST_GeomFromText('POLYGON((-73.90 40.76, -73.85 40.76, -73.85 40.79, -73.90 40.79, -73.90 40.76))', 4326));

-- Insert sample traffic cameras (NYC area)
INSERT INTO traffic_cameras (camera_id, name, latitude, longitude, status, stream_url) VALUES
('NYC-CAM-001', 'Times Square North', 40.7580, -73.9855, 'active', 'rtsp://stream.example.com/nyc-001'),
('NYC-CAM-002', 'Brooklyn Bridge', 40.7061, -73.9969, 'active', 'rtsp://stream.example.com/nyc-002'),
('NYC-CAM-003', 'Central Park South', 40.7649, -73.9730, 'active', 'rtsp://stream.example.com/nyc-003'),
('NYC-CAM-004', 'JFK Terminal 4', 40.6413, -73.7781, 'active', 'rtsp://stream.example.com/nyc-004'),
('NYC-CAM-005', 'FDR Drive & 42nd', 40.7488, -73.9680, 'active', 'rtsp://stream.example.com/nyc-005'),
('NYC-CAM-006', 'Holland Tunnel Entry', 40.7268, -74.0115, 'active', 'rtsp://stream.example.com/nyc-006'),
('NYC-CAM-007', 'Williamsburg Bridge', 40.7133, -73.9726, 'active', 'rtsp://stream.example.com/nyc-007'),
('NYC-CAM-008', 'Lincoln Tunnel', 40.7632, -73.9991, 'active', 'rtsp://stream.example.com/nyc-008');
