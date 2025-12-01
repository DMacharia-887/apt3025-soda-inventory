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
import numpy as np

app = Flask(__name__)
CORS(app)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = None
transform = None

def init_model():
    global model, transform
    if model is None:
        model = resnet18(weights=None)  # Fixes deprecation warning
        model.fc
