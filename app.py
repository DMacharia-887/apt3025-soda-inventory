import os
import torch
import torchvision.transforms as transforms
from torchvision.models import resnet18
import torch.nn as nn
import base64
import io
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = None
transform = None
model_error = None

def init_model():
    global model, transform, model_error
    if model is None:
        try:
            model = resnet18(weights=None)
            model.fc = nn.Linear(model.fc.in_features, 2)
            model_path = os.path.join(os.path.dirname(__file__), "soda_bottle_classifier_resnet18.pth")
            
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Model not found: {model_path}")
            
            checkpoint = torch.load(model_path, map_location=device)
            model.load_state_dict(checkpoint, strict=False)
            model.to(device)
            model.eval()
            
            transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
        except Exception as e:
            model_error = str(e)
            model = None
            raise

@app.route('/', methods=['GET'])
def health():
    return jsonify({"status": "Soda Bottle Classifier API ready", "model": "ResNet18"})

@app.route('/predict', methods=['POST'])
def predict():
    global model, transform, model_error
    try:
        init_model()
        
        data = request.get_json()
        img_data = base64.b64decode(data["image"])
        img = Image.open(io.BytesIO(img_data)).convert("RGB")
        img_t = transform(img).unsqueeze(0).to(device)
        
        with torch.no_grad():
            outputs = model(img_t)
            probs = torch.nn.functional.softmax(outputs[0], dim=0)
            pred = torch.argmax(probs).item()
        
        return jsonify({
            "prediction": int(pred),
            "confidence": float(probs[pred]),
            "probabilities": [float(probs[0]), float(probs[1])],
            "classes": ["Pepsi Zero", "Mountain Dew Original"]
        })
    except Exception as e:
        return jsonify({"error": str(e), "type": type(e).__name__}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=False)
