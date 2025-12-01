import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";

function ResultBadge({ label }) {
  const colors = {
    Pzero: "bg-blue-200 text-blue-800",
    "MD Orig": "bg-green-200 text-green-800",
  };
  return (
    <Badge className={`p-2 rounded ${colors[label] || "bg-gray-200 text-gray-800"}`}>
      {label}
    </Badge>
  );
}

export default function SodaClassifierPage() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onFileChange = (e) => {
    setResult(null);
    setError(null);
    if (e.target.files.length) {
      setFile(e.target.files[0]);
    }
  };

  const classifyImage = () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onloadend = async () => {
      if (!reader.result) {
        setError("Failed to read file");
        setLoading(false);
        return;
      }
      const base64 = reader.result.split(",")[1];
      try {
        const response = await fetch(
          "https://apt3025-soda-inventory-production.up.railway.app/predict",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64 }),
          }
        );
        if (!response.ok) throw new Error("API error");
        const data = await response.json();
        setResult({ prediction: data.prediction, confidence: data.confidence });
      } catch {
        setError("Failed to classify the image.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-lg mx-auto p-4">
        <h1 className="text-3xl font-bold tracking-tight">Soda Bottle Classifier</h1>
        <p className="text-muted-foreground mb-4">Upload a soda bottle image to classify.</p>

        <Card>
          <CardHeader>
            <CardTitle>Image Upload</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <input type="file" accept="image/*" onChange={onFileChange} />
            <Button
              onClick={classifyImage}
              disabled={!file || loading}
              variant="primary"
              size="sm"
              className="flex items-center gap-2"
            >
              <UploadCloud className="h-4 w-4" />
              Classify
            </Button>
            {loading && <p>Classifying...</p>}
            {error && <p className="text-destructive">{error}</p>}
            {result && (
              <div className="mt-4 text-center">
                <ResultBadge label={result.prediction} />
                <p className="mt-2">Confidence: {(result.confidence * 100).toFixed(2)}%</p>
                {file && (
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Uploaded soda"
                    className="mt-2 rounded max-h-48 mx-auto"
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
