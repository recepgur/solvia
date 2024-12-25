import React, { useState } from 'react';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Progress } from "../components/ui/progress";
import { Shield, AlertTriangle, Check } from "lucide-react";

interface AnalysisResult {
  target_id: string;
  status: string;
  vulnerabilities: Array<{
    id: string;
    severity: string;
    description: string;
  }>;
  network_analysis: {
    packets_analyzed: number;
    anomalies_detected: number;
    traffic_patterns: string[];
    potential_threats: string[];
    open_ports: number[];
    services: string[];
    risk_level: string;
  };
  timestamp: string;
}

const SecurityPanel: React.FC = () => {
  const [target, setTarget] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateTargetId = (url: string) => {
    // Generate a simple hash from URL + timestamp
    const timestamp = Date.now();
    return `target_${timestamp}`;
  };

  const startAnalysis = async () => {
    if (!target) {
      setError('Lütfen bir hedef URL veya sunucu adresi girin');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setProgress(0);

    try {
      const newTargetId = generateTargetId(target);
      console.log('Generated target ID:', newTargetId);
      
      const response = await fetch('http://localhost:8001/api/v1/analyze/target', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: newTargetId,
          url: target 
        }),
      });

      if (!response.ok) throw new Error('Analiz başlatılırken bir hata oluştu');

      const data = await response.json();
      const target_id = newTargetId; // Always use our generated ID
      console.log('Using target ID for progress checks:', target_id);
      
      const progressInterval = setInterval(async () => {
        try {
          console.log('Checking progress for target ID:', target_id);
          const progressResponse = await fetch(`http://localhost:8001/api/v1/analysis/progress/${encodeURIComponent(target_id)}`);
          if (!progressResponse.ok) {
            console.error('Progress check failed:', progressResponse.status);
            return;
          }
          const progressData = await progressResponse.json();
          console.log('Progress data received:', progressData);
          
          setProgress(progressData.progress || 0);

          if (progressData.status === 'completed') {
            clearInterval(progressInterval);
            setProgress(100);
            
            console.log('Analysis completed, fetching results for target ID:', target_id);
            const resultsResponse = await fetch(`http://localhost:8001/api/v1/analysis/results/${encodeURIComponent(target_id)}`);
            if (!resultsResponse.ok) {
              console.error('Results fetch failed:', resultsResponse.status);
              setError('Sonuçlar alınırken bir hata oluştu');
              setAnalyzing(false);
              return;
            }
            const resultsData = await resultsResponse.json();
            console.log('Results data received:', resultsData);
            setResults(resultsData);
            setAnalyzing(false);
          }
        } catch (error) {
          console.error('Error checking progress:', error);
          setError('İlerleme kontrolü sırasında bir hata oluştu');
          setAnalyzing(false);
          clearInterval(progressInterval);
        }
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
      setAnalyzing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Güvenlik Analiz Paneli</h1>
        </div>
        <p className="text-gray-600">Hedef URL veya sunucu adresini girerek güvenlik analizini başlatın</p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            className="flex-1"
            placeholder="https://example.com veya 192.168.1.1"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={analyzing}
          />
          <Button 
            onClick={startAnalysis} 
            disabled={analyzing}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {analyzing ? 'Analiz Ediliyor...' : 'Analizi Başlat'}
          </Button>
        </div>

        {analyzing && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-gray-600">
              Analiz İlerlemesi: %{progress}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {results && (
          <div className="space-y-4 mt-6">
            <div className="bg-green-50 border-l-4 border-green-500 p-4">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-2" />
                <p className="text-green-700">Analiz Tamamlandı</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Analiz Sonuçları</h2>
                
                <div className="grid gap-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Ağ Analizi</h3>
                    <ul className="space-y-2 text-sm">
                      <li>İncelenen Paket Sayısı: {results.network_analysis.packets_analyzed}</li>
                      <li>Tespit Edilen Anomali: {results.network_analysis.anomalies_detected}</li>
                      <li>Risk Seviyesi: {results.network_analysis.risk_level}</li>
                      <li>Açık Portlar: {results.network_analysis?.open_ports?.join(', ') || 'Yok'}</li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Güvenlik Açıkları</h3>
                    <div className="space-y-2">
                      {results.vulnerabilities?.map((vuln) => (
                        <div key={vuln.id} className="text-sm">
                          <span className="font-medium">Seviye: {vuln.severity}</span>
                          <p className="text-gray-600">{vuln.description}</p>
                        </div>
                      )) || <p>Güvenlik açığı bulunamadı</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityPanel;
