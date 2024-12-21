import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper,
  Grid,
  CircularProgress,
  Alert
} from '@mui/material';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [exploitCode, setExploitCode] = useState(null);
  const [generatingExploit, setGeneratingExploit] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [stealthOptions, setStealthOptions] = useState({
    antiForensics: true,
    sandboxDetection: true,
    kernelStealth: true,
    memoryProtection: true
  });

  useEffect(() => {
    // Check system status on load
    fetchSystemStatus();
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/status`);
      setSystemStatus(response.data);
    } catch (err) {
      setError('Failed to fetch system status');
    }
  };

  const handleAnalyze = async () => {
    if (!target) {
      setError('Please enter a target URL or server address');
      return;
    }

    setLoading(true);
    setError(null);
    setExploitCode(null);
    
    try {
      const response = await axios.post(`${API_URL}/analyze`, { target });
      setResults(response.data);
    } catch (err) {
      setError('Analysis failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateExploit = async (vulnerability) => {
    setGeneratingExploit(true);
    setError(null);
    
    // Include advanced options in the request
    const advancedOptions = advancedMode ? {
      stealthOptions: stealthOptions,
      useGPT: true,
      enablePolymorphic: true,
      autonomousLearning: true
    } : {};
    
    try {
      const response = await axios.post(`${API_URL}/generate_exploit`, {
        vulnerability_info: {
          target: target,  // Include target URL
          type: vulnerability.type,
          description: vulnerability.description,
          severity: vulnerability.severity,
          ...advancedOptions
        }
      });
      
      if (response.data.status === 'success') {
        setExploitCode({
          code: response.data.exploit_code,
          metrics: response.data.metrics
        });
      } else {
        setError('Failed to generate exploit: ' + response.data.error);
      }
    } catch (err) {
      setError('Exploit generation failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setGeneratingExploit(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Security Analysis Panel
        </Typography>
        
        {/* System Status */}
        {systemStatus && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6">System Status</Typography>
            <Grid container spacing={2}>
              {Object.entries(systemStatus).map(([key, value]) => (
                <Grid item xs={6} sm={4} key={key}>
                  <Typography variant="body2">
                    {key}: {value.toString()}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        {/* Advanced Options */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Advanced Options</Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12}>
              <Button
                variant={advancedMode ? "contained" : "outlined"}
                onClick={() => setAdvancedMode(!advancedMode)}
                color="primary"
                sx={{ mr: 2 }}
              >
                {advancedMode ? "Advanced Mode: ON" : "Advanced Mode: OFF"}
              </Button>
            </Grid>
            {advancedMode && (
              <>
                <Grid item xs={6} sm={3}>
                  <Button
                    variant={stealthOptions.antiForensics ? "contained" : "outlined"}
                    onClick={() => setStealthOptions(prev => ({...prev, antiForensics: !prev.antiForensics}))}
                    fullWidth
                  >
                    Anti-Forensics
                  </Button>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Button
                    variant={stealthOptions.sandboxDetection ? "contained" : "outlined"}
                    onClick={() => setStealthOptions(prev => ({...prev, sandboxDetection: !prev.sandboxDetection}))}
                    fullWidth
                  >
                    Sandbox Detection
                  </Button>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Button
                    variant={stealthOptions.kernelStealth ? "contained" : "outlined"}
                    onClick={() => setStealthOptions(prev => ({...prev, kernelStealth: !prev.kernelStealth}))}
                    fullWidth
                  >
                    Kernel Stealth
                  </Button>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Button
                    variant={stealthOptions.memoryProtection ? "contained" : "outlined"}
                    onClick={() => setStealthOptions(prev => ({...prev, memoryProtection: !prev.memoryProtection}))}
                    fullWidth
                  >
                    Memory Protection
                  </Button>
                </Grid>
              </>
            )}
          </Grid>
        </Paper>

        {/* Input Form */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Target URL or Server Address"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={loading}
            />
            <Button
              variant="contained"
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Analyze'}
            </Button>
          </Box>
        </Paper>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Results Display */}
        {results && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Analysis Results
            </Typography>
            
            {/* Risk Assessment */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1">Risk Assessment</Typography>
              <Grid container spacing={2}>
                {Object.entries(results.risk_assessment).map(([key, value]) => (
                  <Grid item xs={4} key={key}>
                    <Paper sx={{ p: 1, textAlign: 'center' }}>
                      <Typography variant="body2">{key}</Typography>
                      <Typography 
                        variant="h6"
                        color={value === 'high' ? 'error' : value === 'medium' ? 'warning.main' : 'success.main'}
                      >
                        {value}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Vulnerabilities */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1">Potential Vulnerabilities</Typography>
              <Grid container spacing={2}>
                {results.potential_vulnerabilities.map((vuln, index) => (
                  <Grid item xs={12} key={index}>
                    <Paper sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2">{vuln.type}</Typography>
                        <Button
                          variant="contained"
                          color="warning"
                          size="small"
                          onClick={() => handleGenerateExploit(vuln)}
                          disabled={generatingExploit}
                        >
                          {generatingExploit ? 'Generating...' : 'Generate Exploit'}
                        </Button>
                      </Box>
                      <Typography variant="body2">{vuln.description}</Typography>
                      <Typography variant="body2" color="error">
                        Severity: {vuln.severity}
                      </Typography>
                      <Typography variant="body2">
                        Mitigation: {vuln.mitigation}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Exploit Code Display */}
            {exploitCode && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1">Generated Exploit</Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.900' }}>
                  <Typography variant="body2" sx={{ color: 'grey.100', fontFamily: 'monospace' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{exploitCode.code}</pre>
                  </Typography>
                </Paper>
                
                {/* Exploit Metrics */}
                <Paper sx={{ p: 2, mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Generation Metrics</Typography>
                  <Grid container spacing={2}>
                    {Object.entries(exploitCode.metrics.success_metrics).map(([key, value]) => (
                      <Grid item xs={4} key={key}>
                        <Paper sx={{ p: 1, textAlign: 'center' }}>
                          <Typography variant="body2">{key}</Typography>
                          <Typography variant="h6">
                            {typeof value === 'number' ? value.toFixed(2) : value}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Box>
            )}

            {/* Autonomous Learning */}
            <Box>
              <Typography variant="subtitle1">Learning Progress</Typography>
              <Grid container spacing={2}>
                {Object.entries(results.autonomous_learning).map(([key, value]) => (
                  <Grid item xs={4} key={key}>
                    <Paper sx={{ p: 1, textAlign: 'center' }}>
                      <Typography variant="body2">{key}</Typography>
                      <Typography variant="h6">
                        {typeof value === 'number' ? value.toFixed(2) : value}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Paper>
        )}
      </Box>
    </Container>
  );
}

export default App;
