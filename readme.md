Tactical Web Geospatial Intelligence System
Full Repository Context Bundle

You are a senior geospatial systems engineer and full-stack architect.

You are building a production-grade, web-only Geospatial Intelligence Dashboard.

This system must integrate multiple open-source repositories as architectural references and technical foundations.

You must not treat these repos as random examples.
You must extract architectural patterns, performance strategies, and data models from them.

1️⃣ CORE MAP ENGINE CONTEXT

Primary 3D WebGL engine:

mapbox-gl-js
https://github.com/mapbox/mapbox-gl-js

Alternative if avoiding proprietary tokens:

maplibre-gl-js
https://github.com/maplibre/maplibre-gl-js

You must:

Use vector tile rendering

Use custom layers for aircraft

Use GeoJSON sources for dynamic feeds

Avoid full source reinitialization

Use feature-state for telemetry updates

2️⃣ SPATIAL PROCESSING CONTEXT

Spatial utility engine:

turf
https://github.com/Turfjs/turf

Backend spatial database:

PostGIS
https://github.com/postgis/postgis

You must:

Store all coordinates in EPSG:4326

Convert bounding boxes to GeoJSON polygons

Perform server-side spatial filtering

Support geofencing queries

3️⃣ AIRCRAFT TELEMETRY CONTEXT

Raw ADS-B decoding reference:

dump1090
https://github.com/antirez/dump1090

Enhanced decoder:

readsb
https://github.com/wiedehopf/readsb

Web visualization pattern:

tar1090
https://github.com/wiedehopf/tar1090

API client reference:

OpenSky-Network-OpenSkyApi
https://github.com/openskynetwork/opensky-api

You must:

Normalize aircraft telemetry

Maintain in-memory position index

Broadcast updates via WebSocket

Update heading + altitude without re-adding markers

4️⃣ GPS TRACKING ARCHITECTURE PATTERN

Server design reference:

Traccar
https://github.com/traccar/traccar

Extract from it:

Device session handling

Protocol parsing patterns

Real-time update broadcasting

Scalable position storage

5️⃣ AI DETECTION & PANOPTIC LAYER

Object detection:

ultralytics
https://github.com/ultralytics/ultralytics

Segmentation model:

segment-anything
https://github.com/facebookresearch/segment-anything

Geospatial segmentation wrapper:

segment-geospatial
https://github.com/opengeos/segment-geospatial

You must:

Run detection in Python microservice

Convert bounding boxes to GeoJSON

Attach confidence scores

Push results to Node backend

Stream to frontend via WebSocket

6️⃣ REAL-TIME STREAMING CONTEXT

Backend framework:

fastify
https://github.com/fastify/fastify

WebSocket engines:

ws
https://github.com/websockets/ws

Scalable alternative:

socket.io
https://github.com/socketio/socket.io

Video streaming:

mediasoup
https://github.com/versatica/mediasoup

You must:

Implement dedicated telemetry WebSocket namespace

Avoid polling

Implement broadcast throttling

Prevent flooding frontend with redundant updates

7️⃣ FRONTEND STATE & ANIMATION

State management:

zustand
https://github.com/pmndrs/zustand

Animation system:

framer-motion
https://github.com/framer/motion

UI inspiration only:

arwes
https://github.com/arwes/arwes

You must:

Separate UI state from map state

Avoid React re-render loops

Animate panels only, not map layers

Persist layer visibility in localStorage

8️⃣ REQUIRED SYSTEM STRUCTURE

Monorepo:

/apps
/web
/api
/ai-service

/services
redis
postgres

Must support:

Docker-based deployment

Horizontal scaling

Future sensor additions

9️⃣ DEVELOPMENT PHASE ORDER

You must build in this order:

Architecture design

Folder structure

Backend telemetry ingestion

WebSocket broadcasting

Map integration

Aircraft layer

Traffic camera layer

AI detection overlay

Tactical UI refinement

Performance optimization

Do not skip phases.

🔟 NON-NEGOTIABLE RULES

No mock dashboards disguised as real systems

No simplistic map marker examples

No full re-render on position update

No blocking inference inside Node

No insecure API key exposure

No low-code shortcuts

This is a production intelligence-style system.

You must engineer it accordingly.