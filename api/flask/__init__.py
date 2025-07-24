from flask import Flask, request, send_file, jsonify, send_from_directory
from PIL import Image, ImageDraw
from inference_sdk import InferenceHTTPClient
import io
import os
from update_satellites import update_satellites
from get_user_satellites import update as update_user_satellites
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.schedulers import SchedulerNotRunningError
import json

app = Flask(__name__)

# Roboflow setup
CLIENT = InferenceHTTPClient(
    api_url="https://detect.roboflow.com",
    api_key="YRHI7Ivt30Cx12DXyHfx"
)

MODEL_ID = "my-first-project-hqotd/1" 

# === Scheduler setup ===
scheduler = BackgroundScheduler()
scheduler.add_job(func=update_satellites, trigger='interval', minutes=2)
scheduler.start()
scheduler.add_job(lambda: print("[Test] scheduler is working", flush=True), trigger='interval', seconds=30)
print("🚀 Flask app started, scheduler running", flush=True)

@app.teardown_appcontext
def shutdown_scheduler(exception=None):
    try:
        scheduler.shutdown(wait=False)
    except SchedulerNotRunningError:
        pass

# === IoU helper
def compute_iou(box1, box2):
    x1_min, y1_min, x1_max, y1_max = box1
    x2_min, y2_min, x2_max, y2_max = box2
    inter_x_min = max(x1_min, x2_min)
    inter_y_min = max(y1_min, y2_min)
    inter_x_max = min(x1_max, x2_max)
    inter_y_max = min(y1_max, y2_max)
    inter_area = max(0, inter_x_max - inter_x_min) * max(0, inter_y_max - inter_y_min)
    area1 = (x1_max - x1_min) * (y1_max - y1_min)
    area2 = (x2_max - x2_min) * (y2_max - y2_min)
    union_area = area1 + area2 - inter_area
    return inter_area / union_area if union_area else 0

def non_max_suppression(preds, iou_thresh):
    preds.sort(key=lambda x: -x['confidence'])
    final = []
    while preds:
        current = preds.pop(0)
        final.append(current)
        preds = [p for p in preds if compute_iou(
            [current['x'] - current['width']/2, current['y'] - current['height']/2,
             current['x'] + current['width']/2, current['y'] + current['height']/2],
            [p['x'] - p['width']/2, p['y'] - p['height']/2,
             p['x'] + p['width']/2, p['y'] + p['height']/2]
        ) < iou_thresh]
    return final

@app.route('/detect-and-annotate', methods=['POST'])
def detect_and_annotate():
    image_file = request.files['image']
    confidence = float(request.form.get('confidence', 0.5))
    iou = float(request.form.get('iou', 0.3))

    temp_path = "/tmp/uploaded.png"
    image_file.save(temp_path)

    result = CLIENT.infer(temp_path, model_id=MODEL_ID)
    predictions = result.get('predictions', [])
    predictions = [p for p in predictions if p['confidence'] >= confidence]
    predictions = non_max_suppression(predictions, iou)

    image = Image.open(temp_path).convert("RGB")
    draw = ImageDraw.Draw(image)

    for pred in predictions:
        x0 = pred['x'] - pred['width'] / 2
        y0 = pred['y'] - pred['height'] / 2
        x1 = pred['x'] + pred['width'] / 2
        y1 = pred['y'] + pred['height'] / 2
        label = f"{pred['class']} {int(pred['confidence'] * 100)}%"
        draw.rectangle([x0, y0, x1, y1], outline="magenta", width=3)
        draw.text((x0, y0 - 10), label, fill="magenta")

    buf = io.BytesIO()
    image.save(buf, format="JPEG")
    buf.seek(0)

    os.remove(temp_path)

    return send_file(buf, mimetype='image/jpeg')

@app.route('/detect-and-annotate-resized', methods=['POST'])
def detect_and_annotate_resized():
    image_file = request.files['image']
    confidence = float(request.form.get('confidence', 0.5))
    iou = float(request.form.get('iou', 0.3))

    temp_path = "/tmp/uploaded.png"
    image_file.save(temp_path)

    # Load original image and store original size
    img = Image.open(temp_path).convert("RGB")
    original_width, original_height = img.size

    # Resize image for inference
    img.thumbnail((1024, 1024))

    # Save compressed image
    temp_path_compressed = "/tmp/uploaded_compressed.jpg"
    img.save(temp_path_compressed, format="JPEG", quality=85)

    # Ensure it fits under 4MB
    max_size = 1024
    quality = 100
    size_limit_mb = 4
    while True:
        img.thumbnail((max_size, max_size))
        img.save(temp_path_compressed, format="JPEG", quality=quality)
        file_size_mb = os.path.getsize(temp_path_compressed) / (1024 * 1024)
        if file_size_mb <= size_limit_mb:
            break
        max_size = int(max_size * 0.9)
        quality = max(50, quality - 5)
        if max_size < 200:
            os.remove(temp_path)
            os.remove(temp_path_compressed)
            return jsonify({"error": "Cannot compress image below size limit"}), 400

    # Inference
    result = CLIENT.infer(temp_path_compressed, model_id=MODEL_ID)
    predictions = result.get('predictions', [])
    predictions = [p for p in predictions if p['confidence'] >= confidence]
    predictions = non_max_suppression(predictions, iou)

    # Draw predictions on resized image
    draw = ImageDraw.Draw(img)
    for pred in predictions:
        x0 = pred['x'] - pred['width'] / 2
        y0 = pred['y'] - pred['height'] / 2
        x1 = pred['x'] + pred['width'] / 2
        y1 = pred['y'] + pred['height'] / 2
        label = f"{pred['class']} {int(pred['confidence'] * 100)}%"
        draw.rectangle([x0, y0, x1, y1], outline="magenta", width=3)
        draw.text((x0, y0 - 10), label, fill="magenta")

    # Return image as response
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    os.remove(temp_path)
    os.remove(temp_path_compressed)

    return send_file(buf, mimetype='image/jpeg')

@app.route('/bounding-box-corners-old', methods=['POST'])
def bounding_box_corners_old():
    image_file = request.files['image']
    confidence = float(request.form.get('confidence', 0.5))
    iou = float(request.form.get('iou', 0.3))

    temp_path = "/tmp/uploaded.png"
    image_file.save(temp_path)

    temp_path_compressed = "/tmp/uploaded_compressed.jpg"
    img = Image.open(temp_path)
    img.thumbnail((1024, 1024))  
    img.save(temp_path_compressed, format="JPEG", quality=85)  

    max_size = 1024
    quality = 100
    size_limit_mb = 4
    count = 1

    while True:
        width, height = img.size
        print(f"Image size {count}: width {width}, height {height}")
        img.thumbnail((max_size, max_size))

        img.save(temp_path_compressed, format="JPEG", quality=quality)

        file_size_mb = os.path.getsize(temp_path_compressed) / (1024 * 1024)

        print(f"{count}: {file_size_mb:.2f} MB")
        count = count + 1

        if file_size_mb <= size_limit_mb:
            break

        max_size = int(max_size * 0.9) 
        quality = max(50, quality - 5) 

        if max_size < 200:
            os.remove(temp_path)
            os.remove(temp_path_compressed)
            return jsonify({"error": "Cannot compress image below size limit"}), 400



    result = CLIENT.infer(temp_path_compressed, model_id=MODEL_ID)
    predictions = result.get('predictions', [])
    predictions = [p for p in predictions if p['confidence'] >= confidence]
    predictions = non_max_suppression(predictions, iou)

    os.remove(temp_path)

    corner_data = []
    for pred in predictions:
        x0 = pred['x'] - pred['width'] / 2
        y0 = pred['y'] - pred['height'] / 2
        x1 = pred['x'] + pred['width'] / 2
        y1 = pred['y'] + pred['height'] / 2
        corners = {
            "class": pred["class"],
            "confidence": pred["confidence"],
            "top_left": [x0, y0],
            "top_right": [x1, y0],
            "bottom_left": [x0, y1],
            "bottom_right": [x1, y1]
        }
        corner_data.append(corners)

    return jsonify(corner_data)

@app.route('/bounding-box-corners', methods=['POST'])
def bounding_box_corners_new():
    image_file = request.files['image']
    confidence = float(request.form.get('confidence', 0.5))
    iou = float(request.form.get('iou', 0.3))

    temp_path = "/tmp/uploaded.png"
    image_file.save(temp_path)

    img = Image.open(temp_path).convert("RGB")

    # Save original image for debugging
    original_path = "/tmp/original_debug.jpg"
    img.save(original_path)
    print(f"Original image saved to: {original_path}")

    temp_path_compressed = "/tmp/uploaded_compressed.jpg"

    # Start with high quality
    quality = 100
    size_limit_mb = 4
    count = 1

    while True:
        img.save(temp_path_compressed, format="JPEG", quality=quality)
        file_size_mb = os.path.getsize(temp_path_compressed) / (1024 * 1024)
        width, height = img.size
        print(f"Image size {count}: width {width}, height {height}")
        print(f"{count}: {file_size_mb:.2f} MB at quality {quality}")

        if file_size_mb <= size_limit_mb:
            break

        quality = max(50, quality - 5)
        count += 1

        if quality <= 50:
            os.remove(temp_path)
            os.remove(temp_path_compressed)
            return jsonify({"error": "Cannot compress image below size limit"}), 400

    # Run inference
    result = CLIENT.infer(temp_path_compressed, model_id=MODEL_ID)
    predictions = result.get('predictions', [])
    predictions = [p for p in predictions if p['confidence'] >= confidence]
    predictions = non_max_suppression(predictions, iou)

    if os.path.exists(temp_path):
        os.remove(temp_path)
    if os.path.exists(temp_path_compressed):
        os.remove(temp_path_compressed)

    # Annotate
    draw = ImageDraw.Draw(img)
    corner_data = []
    for pred in predictions:
        x0 = pred['x'] - pred['width'] / 2
        y0 = pred['y'] - pred['height'] / 2
        x1 = pred['x'] + pred['width'] / 2
        y1 = pred['y'] + pred['height'] / 2

        draw.rectangle([x0, y0, x1, y1], outline="red", width=3)
        label = f"{pred['class']} {int(pred['confidence'] * 100)}%"
        draw.text((x0, y0 - 10), label, fill="red")

        corners = {
            "class": pred["class"],
            "confidence": pred["confidence"],
            "top_left": [x0, y0],
            "top_right": [x1, y0],
            "bottom_left": [x0, y1],
            "bottom_right": [x1, y1]
        }
        corner_data.append(corners)

    # Save annotated image
    annotated_path = "/tmp/annotated_debug.jpg"
    img.save(annotated_path)
    print(f"Annotated image saved to: {annotated_path}")

    print(f"data: {corner_data}")
    return jsonify(corner_data)

@app.route('/annotated/<filename>', methods=['GET'])
def serve_debug_image(filename):
    return send_from_directory('/tmp', filename)

@app.route('/update-user-satellites', methods=['POST'])
def trigger_update_user_satellites():
    data = request.get_json()
    
    if not data or "user_location" not in data or "max_distance_km" not in data:
        return jsonify({"error": "Missing required parameters"}), 400

    user_location = data["user_location"] 
    max_distance_km = float(data["max_distance_km"])

    result = update_user_satellites(user_location, max_distance_km)
    return jsonify(json.loads(result)) 


if __name__ == '__main__':
    # app.run(port=5001)
    app.run(host="0.0.0.0", port=5001)
