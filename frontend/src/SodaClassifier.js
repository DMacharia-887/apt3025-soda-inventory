import React, { useState } from 'react';
import axios from 'axios';

function SodaClassifier() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const classifyImage = () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result.split(',')[1]; // Remove data:image part
      try {
        const response = await axios.post('https://apt3025-soda-inventory-production.up.railway.app/predict', {
          image: base64Image
        });
        setResult(response.data);
      } catch (err) {
        setError('Prediction failed. Do you have the correct API URL/config?');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', padding: '20px' }}>
      <h2>Soda Bottle Classifier</h2>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button onClick={classifyImage} disabled={!file || loading} style={{ marginLeft: '10px' }}>Classify</button>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {result && (
        <div style={{ marginTop: '20px' }}>
          <h3>Result</h3>
          <p>Prediction: {result.classes[result.prediction]}</p>
          <p>Confidence: {(result.confidence * 100).toFixed(1)}%</p>
          <img src={URL.createObjectURL(file)} alt="Uploaded soda" style={{ maxWidth: '100%' }} />
        </div>
      )}
    </div>
  );
}

export default SodaClassifier;