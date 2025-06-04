from flask import Flask, request, send_file
from PIL import Image, ImageDraw
from inference_sdk import InferenceHTTPClient
import io
import os

app = Flask(__name__)

# Roboflow setup
CLIENT = InferenceHTTPClient(
    api_url="https://detect.roboflow.com",
    api_key="YRHI7Ivt30Cx12DXyHfx"
)

MODEL_ID = "my-first-project-hqotd/1" 

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

@app.route('/bounding-box-corners', methods=['POST'])
def bounding_box_corners():
    image_file = request.files['image']
    confidence = float(request.form.get('confidence', 0.5))
    iou = float(request.form.get('iou', 0.3))

    temp_path = "/tmp/uploaded.png"
    image_file.save(temp_path)

    result = CLIENT.infer(temp_path, model_id=MODEL_ID)
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

if __name__ == '__main__':
    app.run(port=5001)
