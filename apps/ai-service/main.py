"""
AI Detection Microservice
Simulates object detection inference for traffic camera feeds.
In production: would load YOLOv8/SAM models and run real inference.
Exposes REST API that the Node backend calls for detection results.
"""

import random
import time
import asyncio
from typing import Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="GEOINT AI Detection Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DETECTION_CLASSES = [
    {"name": "vehicle", "weight": 40},
    {"name": "person", "weight": 25},
    {"name": "truck", "weight": 15},
    {"name": "bus", "weight": 8},
    {"name": "bicycle", "weight": 5},
    {"name": "motorcycle", "weight": 4},
    {"name": "emergency_vehicle", "weight": 2},
    {"name": "suspicious_object", "weight": 1},
]

TOTAL_WEIGHT = sum(c["weight"] for c in DETECTION_CLASSES)


def pick_class() -> str:
    r = random.random() * TOTAL_WEIGHT
    for cls in DETECTION_CLASSES:
        r -= cls["weight"]
        if r <= 0:
            return cls["name"]
    return "vehicle"


class DetectionRequest(BaseModel):
    camera_id: str
    latitude: float
    longitude: float
    frame_id: Optional[str] = None


class Detection(BaseModel):
    class_name: str
    confidence: float
    bbox: dict
    latitude: float
    longitude: float


class DetectionResponse(BaseModel):
    camera_id: str
    detections: list[Detection]
    inference_time_ms: float
    model: str
    timestamp: float


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": "yolov8n-sim",
        "device": "cpu",
        "uptime": time.time(),
    }


@app.post("/detect", response_model=DetectionResponse)
async def detect(req: DetectionRequest):
    """
    Simulate object detection on a camera frame.
    In production: would receive frame data and run YOLOv8 inference.
    """
    start = time.time()

    # Simulate inference delay (10-50ms)
    await asyncio.sleep(random.uniform(0.01, 0.05))

    num_detections = random.randint(0, 12)
    detections = []

    for _ in range(num_detections):
        class_name = pick_class()
        confidence = round(random.uniform(0.45, 0.99), 3)

        # Only include high-confidence detections
        if confidence < 0.5:
            continue

        offset_lat = (random.random() - 0.5) * 0.002
        offset_lon = (random.random() - 0.5) * 0.002

        detections.append(Detection(
            class_name=class_name,
            confidence=confidence,
            bbox={
                "x": round(random.random() * 1920),
                "y": round(random.random() * 1080),
                "width": round(30 + random.random() * 300),
                "height": round(30 + random.random() * 300),
            },
            latitude=req.latitude + offset_lat,
            longitude=req.longitude + offset_lon,
        ))

    inference_time = (time.time() - start) * 1000

    return DetectionResponse(
        camera_id=req.camera_id,
        detections=detections,
        inference_time_ms=round(inference_time, 2),
        model="yolov8n-sim",
        timestamp=time.time(),
    )


@app.post("/segment")
async def segment(req: DetectionRequest):
    """
    Simulate segmentation (SAM-style).
    In production: would run Segment Anything Model.
    """
    await asyncio.sleep(random.uniform(0.05, 0.15))

    num_segments = random.randint(1, 5)
    segments = []

    for i in range(num_segments):
        # Generate a simple polygon around the camera location
        center_lat = req.latitude + (random.random() - 0.5) * 0.003
        center_lon = req.longitude + (random.random() - 0.5) * 0.003
        radius = random.uniform(0.0002, 0.001)

        points = []
        for angle_step in range(6):
            angle = (angle_step / 6) * 2 * 3.14159
            import math
            lat = center_lat + radius * math.cos(angle)
            lon = center_lon + radius * math.sin(angle)
            points.append([lon, lat])
        points.append(points[0])  # close polygon

        segments.append({
            "id": f"seg-{i}",
            "class": pick_class(),
            "confidence": round(random.uniform(0.6, 0.98), 3),
            "geometry": {
                "type": "Polygon",
                "coordinates": [points],
            },
        })

    return {
        "camera_id": req.camera_id,
        "segments": segments,
        "model": "sam-vit-b-sim",
        "timestamp": time.time(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8500)
