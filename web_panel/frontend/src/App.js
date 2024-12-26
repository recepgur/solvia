import React, { useState } from 'react';
import './App.css';

function App() {
  const [target, setTarget] = useState('');
  const [vulnerabilityInfo, setVulnerabilityInfo] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [exploitCode, setExploitCode] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyzeTarget = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ target }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }
      
      setAnalysis(data);
      
    } catch (err) {
      setError(err.message);
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const generateExploit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:5000/api/generate-exploit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vulnerability_info: vulnerabilityInfo,
          target,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Exploit generation failed');
      }
      
      setExploitCode(data.exploit_code);
      
    } catch (err) {
      setError(err.message);
      setExploitCode(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Security Analysis Panel</h1>
      </header>
      
      <main>
        <div className="input-section">
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Enter target URL or domain"
          />
          <button onClick={analyzeTarget} disabled={loading || !target}>
            Analyze Target
          </button>
        </div>

        {analysis && (
          <div className="analysis-section">
            <h2>Analysis Results</h2>
            <pre>{JSON.stringify(analysis, null, 2)}</pre>
          </div>
        )}

        <div className="exploit-section">
          <textarea
            value={vulnerabilityInfo}
            onChange={(e) => setVulnerabilityInfo(e.target.value)}
            placeholder="Enter vulnerability information"
          />
          <button onClick={generateExploit} disabled={loading || !vulnerabilityInfo}>
            Generate Exploit
          </button>
        </div>

        {exploitCode && (
          <div className="exploit-code-section">
            <h2>Generated Exploit</h2>
            <pre>{exploitCode}</pre>
          </div>
        )}

        {error && (
          <div className="error-section">
            <p className="error">{error}</p>
          </div>
        )}

        {loading && (
          <div className="loading-section">
            <p>Loading...</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
