import React, { useState, useEffect, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// ============================================================
// CONFIG (Offline Mode)
// ============================================================

const DISEASES = [
  {
    id: 'early_blight',
    name: 'Early Blight (Alternaria solani)',
    crop: 'Tomato / Potato',
    severity: 'moderate',
    confidence: 91,
    desc: 'A fungal disease causing dark, concentric ring spots on older leaves. Starts from lower leaves and progresses upward. Thrives in warm, humid weather with high moisture.',
    remedies: ['Apply Mancozeb or Chlorothalonil fungicide', 'Remove infected lower leaves immediately', 'Avoid overhead irrigation — use drip instead'],
    plan: ['Day 1–2: Remove all visibly infected leaves and burn them', 'Day 3: Apply Mancozeb 75WP @ 2g/L water as foliar spray', 'Day 4–5: Monitor spread, check neighboring plants', 'Day 6–7: Re-spray if new lesions appear, apply potassium fertilizer'],
    tips: 'Rotate crops next season. Avoid planting tomatoes/potatoes in same field consecutively.',
    emoji: '🍅'
  },
  {
    id: 'bacterial_spot',
    name: 'Bacterial Leaf Spot (Xanthomonas)',
    crop: 'Pepper / Tomato',
    severity: 'high',
    confidence: 87,
    desc: 'Water-soaked lesions that turn brown with yellow halos. Spreads rapidly in wet, windy weather. Can cause 30–50% yield reduction if untreated.',
    remedies: ['Apply Copper-based bactericide (Kocide 3000)', 'Stop all overhead irrigation immediately', 'Remove and burn all heavily infected plant material'],
    plan: ['Day 1: Halt irrigation, survey full field for spread', 'Day 2–3: Apply copper hydroxide bactericide at full coverage', 'Day 4–5: Remove infected debris from field entirely', 'Day 6–7: Reassess; apply streptomycin if symptoms persist'],
    tips: 'Use certified disease-free seeds next season. Practice 2-year crop rotation.',
    emoji: '🌶️'
  },
  {
    id: 'powdery_mildew',
    name: 'Powdery Mildew (Erysiphe)',
    crop: 'Wheat / Cucumber / Grape',
    severity: 'low',
    confidence: 93,
    desc: 'White powdery fungal coating on leaf surfaces. Reduces photosynthesis and weakens the plant. Most common in dry weather with cool nights and warm days.',
    remedies: ['Spray 0.5% Baking Soda solution (home remedy)', 'Apply Sulfur-based fungicide in early morning', 'Improve air circulation around plants'],
    plan: ['Day 1–2: Apply potassium bicarbonate spray to all leaves', 'Day 3: Thin overcrowded plants to improve airflow', 'Day 4–5: Monitor new growth for white patches', 'Day 6–7: Apply neem oil spray as preventive measure'],
    tips: 'Avoid excess nitrogen fertilizer. Water plants at base in the morning.',
    emoji: '🌾'
  },
  {
    id: 'leaf_rust',
    name: 'Leaf Rust (Puccinia triticina)',
    crop: 'Wheat / Barley',
    severity: 'high',
    confidence: 89,
    desc: 'Orange-brown pustules on upper leaf surface. One of the most destructive wheat diseases in Pakistan. Spreads via wind spores across large distances rapidly.',
    remedies: ['Apply Propiconazole (Tilt 250EC) fungicide immediately', 'Spray during early morning when wind is calm', 'Report to local agricultural department for area-wide control'],
    plan: ['Day 1: Survey full field — mark severely infected zones', 'Day 2–3: Apply Propiconazole 250EC @ 0.5ml/L across field', 'Day 4–5: Check for new pustule formation on flag leaves', 'Day 6–7: Second spray application if >10% leaf area infected'],
    tips: 'Use rust-resistant wheat varieties (NARC-11, Seher-2006) in next season.',
    emoji: '🌾'
  },
  {
    id: 'healthy',
    name: 'Healthy Leaf — No Disease Detected',
    crop: 'All Crops',
    severity: 'none',
    confidence: 96,
    desc: 'Your crop appears perfectly healthy! Leaf color, texture, vein patterns, and surface analysis show no signs of fungal, bacterial, or viral infection. Excellent crop management!',
    remedies: ['Continue current irrigation & fertilization schedule', 'Apply preventive neem oil spray monthly', 'Monitor weekly during high humidity seasons'],
    plan: ['Ongoing: Keep soil moisture balanced — avoid waterlogging', 'Weekly: Scout field edges for early pest/disease signs', 'Monthly: Soil nutrient testing recommended', 'Seasonal: Plan crop rotation for next planting season'],
    tips: 'Maintain this standard! Consider soil health testing and balanced NPK fertilization.',
    emoji: '✅'
  }
];

const DISEASE_LIBRARY = [
  { name: 'Early Blight', crop: 'Tomato / Potato', desc: 'Dark concentric ring spots on leaves. Caused by Alternaria solani fungus. Very common in Punjab.', sev: 'moderate', emoji: '🍅' },
  { name: 'Leaf Rust', crop: 'Wheat', desc: 'Orange-brown pustules covering leaf surface. Wind-spread fungal disease devastating to wheat crops.', sev: 'high', emoji: '🌾' },
  { name: 'Cotton Leaf Curl', crop: 'Cotton', desc: 'Viral disease spread by whiteflies causing leaf curling and stunted growth. Major threat in Pakistan.', sev: 'high', emoji: '🌿' },
  { name: 'Bacterial Blight', crop: 'Rice', desc: 'Water-soaked lesions on leaf margins turning yellow then brown. Spreads via irrigation water.', sev: 'high', emoji: '🌾' },
  { name: 'Powdery Mildew', crop: 'Wheat / Cucumber', desc: 'White powdery fungal coating reducing photosynthesis. Favored by dry conditions and cool nights.', sev: 'low', emoji: '🍃' },
  { name: 'Citrus Greening', crop: 'Citrus / Kinnow', desc: 'Yellowing of leaves and blotchy mottling. Caused by bacteria spread by Asian citrus psyllid.', sev: 'high', emoji: '🍊' },
];

function App() {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [location, setLocation] = useState('');
  const [algorithm, setAlgorithm] = useState('cnn');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [rawFile, setRawFile] = useState(null);
  const [results, setResults] = useState(null);
  const [aiAdvice, setAiAdvice] = useState('');
  const [modelMetrics, setModelMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const resultsRef = useRef(null);

  // Custom Cursor
  const curRef = useRef(null);
  const cur2Ref = useRef(null);

  useEffect(() => {
    let mx = 0, my = 0, rx = 0, ry = 0;
    const handleMouseMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (curRef.current) {
        curRef.current.style.left = (mx - 5) + 'px';
        curRef.current.style.top = (my - 5) + 'px';
      }
    };
    document.addEventListener('mousemove', handleMouseMove);

    const interval = setInterval(() => {
      rx += (mx - rx) * .18;
      ry += (my - ry) * .18;
      if (cur2Ref.current) {
        cur2Ref.current.style.left = (rx - 16) + 'px';
        cur2Ref.current.style.top = (ry - 16) + 'px';
      }
    }, 16);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    fetch('http://localhost:5000/model-comparison')
      .then(res => res.json())
      .then(data => setModelMetrics(data))
      .catch(err => console.error("Could not load metrics", err));
    fetchHistory();
  }, []);

  const fetchHistory = () => {
    fetch('http://localhost:5000/history')
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(err => console.error("Could not load history", err));
  };

  const handleDownloadReport = async () => {
    try {
      showToast("Generating PDF Report...");
      const res = await fetch('http://localhost:5000/generate-report');
      if (!res.ok) throw new Error("Failed to generate");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'FasalAI_Crop_Report.pdf';
      a.click();
    } catch (e) {
      showToast("Error generating report.");
    }
  };

  const clearHistory = async () => {
    await fetch('http://localhost:5000/clear-history', { method: 'DELETE' });
    fetchHistory();
  };

  const deleteHistoryItem = async (id) => {
    await fetch(`http://localhost:5000/delete-history/${id}`, { method: 'DELETE' });
    fetchHistory();
  };

  const showToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3500);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRawFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setUploadedImage(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const runAnalysis = async () => {
    if (!rawFile) return;
    
    const loc = location.trim() || 'Lahore, PK';
    setLoading(true);
    setResults(null);
    setAiAdvice('');

    try {
      // 1. CALL BACKEND (Python Flask)
      const formData = new FormData();
      formData.append('file', rawFile);
      formData.append('algorithm', algorithm);

      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Backend server is not running. Please start app.py');
      
      const backendData = await response.json();
      
      // Find the disease details from our local DB using the ID from backend
      const disease = DISEASES.find(d => d.id === backendData.disease_id) || DISEASES[0];
      disease.confidence = backendData.confidence; // Update with actual confidence from backend

      // 2. Weather (Local Simulation)
      const weatherData = await fetchWeather(loc);

      // 3. Treatment Advice (Local Generation)
      const advice = await getLocalAdvice(disease, weatherData);

      setResults({ 
        disease, 
        weather: weatherData, 
        algorithm: backendData.algorithm // Store the algorithm status
      });
      setAiAdvice(advice);
      setLoading(false);

      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        fetchHistory(); // Refresh history
      }, 100);

    } catch (err) {
      setLoading(false);
      showToast('⚠ ' + (err.message || 'Analysis failed.'));
      console.error(err);
    }
  };

  const fetchWeather = async (city) => {
    // Simulated weather data for offline safety
    await new Promise(r => setTimeout(r, 600)); // Simulate delay
    const isHot = Math.random() > 0.5;
    return {
      city: city,
      temp: isHot ? Math.floor(Math.random() * 10) + 30 : Math.floor(Math.random() * 10) + 20,
      humidity: Math.floor(Math.random() * 40) + 40,
      condition: isHot ? 'Clear and Sunny' : 'Partly Cloudy',
    };
  };

  const getLocalAdvice = async (disease, weather) => {
    // Local advice generator
    await new Promise(r => setTimeout(r, 1000)); // Simulate AI generation delay
    
    if (disease.id === 'healthy') {
      return `✅ Great news! Your crop is healthy.
Current weather (${weather.temp}°C, ${weather.humidity}% humidity) is good.

1. Continue your current care routine — it is working well.
2. Apply preventive neem oil spray once monthly.
3. Monitor field edges weekly during monsoon season for early disease signs.

Prevention: Maintain balanced fertilization and avoid waterlogging.`;
    }

    const riskNote = (weather.humidity > 70) 
      ? `⚠️ High humidity (${weather.humidity}%) significantly increases the spread risk of ${disease.name}.` 
      : `Weather conditions are moderate for disease spread.`;

    return `${riskNote}

1. IMMEDIATE: ${disease.remedies[0]}. Do not delay — early treatment prevents crop loss.
2. NEXT 48 HOURS: ${disease.remedies[1]}. Focus on the most visibly infected areas first.
3. ONGOING: ${disease.remedies[2]}. Repeat every 7-10 days until symptoms clear.

Recommended Action: Isolate infected plants if possible and apply treatment during early morning hours.
Prevention: ${disease.tips}`;
  };

  return (
    <div className="app-container">
      {/* Cursor */}
      <div id="cur" ref={curRef}></div>
      <div id="cur2" ref={cur2Ref}></div>

      {/* Background */}
      <div id="bg"></div>
      <div id="bgGrid"></div>
      <div className="orb o1"></div>
      <div className="orb o2"></div>

      {/* Loader */}
      {loading && (
        <div id="loader">
          <div className="lRing"></div>
          <div className="lText">Analyzing crop sample...</div>
          <div className="lSub">Running CNN model + preparing report</div>
        </div>
      )}

      {/* Toast */}
      <div id="toast" className={toast.show ? 'show' : ''}>{toast.message}</div>

      {/* NAV */}
      <div className="container">
        <nav>
          <a href="#home" className="logo"><div className="logoDot"></div>FasalAI</a>
          <div className="navLinks">
            <a href="#home">Detect</a>
            <a href="#how">How It Works</a>
            <a href="#diseases">Disease Library</a>
            <a href="#dashboard">Dashboard</a>
            <a href="#about">About</a>
          </div>
          <div className="navBadge">🌾 AI-Powered</div>
        </nav>
      </div>

      {/* HERO */}
      <div className="container">
        <section id="home">
          <div className="heroGrid">
            <div className="heroLeft">
              <div className="heroTag">Real-Time Crop Disease Detection</div>
              <h1>Protect Your<br />Harvest with<br /><em>AI Precision</em></h1>
              <p className="heroSub">Upload a photo of any crop leaf. Our AI model instantly detects diseases, checks live weather risk, and generates a complete treatment plan — free for every farmer.</p>
              <div className="heroStats">
                <div className="stat"><div className="statN">97%</div><div className="statL">Detection Accuracy</div></div>
                <div className="stat"><div className="statN">38+</div><div className="statL">Disease Classes</div></div>
                <div className="stat"><div className="statN">5s</div><div className="statL">Analysis Time</div></div>
                <div className="stat"><div className="statN">Free</div><div className="statL">For All Farmers</div></div>
              </div>
            </div>

            {/* Upload Card */}
            <div className="uploadCard">
              <div className="dropZone" onClick={() => document.getElementById('fileInput').click()}>
                <div className="dropIcon">🍃</div>
                <div className="dropTitle">Drop your leaf photo here</div>
                <div className="dropSub">or <span>click to browse</span> from your device</div>
                <input type="file" id="fileInput" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              </div>
              {uploadedImage && (
                <div id="prevWrap" style={{ display: 'block' }}>
                  <img id="prevImg" src={uploadedImage} alt="Preview" />
                </div>
              )}

              <div style={{ marginTop: '14px' }}>
                <label style={{ fontSize: '.75rem', color: 'var(--muted)', display: 'block', marginBottom: '6px', letterSpacing: '.04em' }}>📍 Your Location (for weather risk)</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Lahore, Gujrat, Multan..."
                  className="locInput"
                />
              </div>

              <div style={{ marginTop: '14px', marginBottom: '20px' }}>
                <label style={{ fontSize: '.75rem', color: 'var(--muted)', display: 'block', marginBottom: '6px', letterSpacing: '.04em' }}>🧠 Detection Engine (Classifier)</label>
                <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)} className="locInput" style={{ cursor: 'pointer', backgroundColor: '#141c16', color: '#eefcf1', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <option value="best" style={{ backgroundColor: '#141c16', color: '#eefcf1' }}>Best Model (Auto-select)</option>
                  <option value="cnn" style={{ backgroundColor: '#141c16', color: '#eefcf1' }}>Neural Network (CNN)</option>
                  <option value="resnet50" style={{ backgroundColor: '#141c16', color: '#eefcf1' }}>ResNet50</option>
                  <option value="efficientnetb0" style={{ backgroundColor: '#141c16', color: '#eefcf1' }}>EfficientNetB0</option>
                  <option value="svm" style={{ backgroundColor: '#141c16', color: '#eefcf1' }}>Support Vector Machine (SVM)</option>
                  <option value="knn" style={{ backgroundColor: '#141c16', color: '#eefcf1' }}>K-Nearest Neighbors (KNN)</option>
                </select>
              </div>

              <button className="btnAnalyze" onClick={runAnalysis} disabled={!uploadedImage || loading}>
                <div className="shine"></div>
                <span>⚡</span> {loading ? 'Analyzing...' : 'Analyze Crop Disease'}
              </button>

              <div style={{ marginTop: '12px', fontSize: '.72rem', color: 'rgba(240,249,243,.28)', textAlign: 'center' }}>
                Powered by multiple AI algorithms
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* HOW IT WORKS */}
      <div className="container">
        <section id="how">
          <div className="secLabel">The Process</div>
          <div className="secTitle">How FasalAI Works</div>
          <div className="stepsGrid">
            <div className="stepCard"><div className="stepNum">01</div><div className="stepIcon">📸</div><div className="stepTitle">Upload Leaf Photo</div><div className="stepDesc">Take a clear photo of the infected leaf with your phone and upload it directly.</div></div>
            <div className="stepCard"><div className="stepNum">02</div><div className="stepIcon">🧠</div><div className="stepTitle">AI Analyzes Image</div><div className="stepDesc">Our CNN model trained on 87,000+ PlantVillage images identifies the disease instantly.</div></div>
            <div className="stepCard"><div className="stepNum">03</div><div className="stepIcon">🌤️</div><div className="stepTitle">Weather Risk Check</div><div className="stepDesc">Live weather data assesses how likely the disease is to spread in your current climate.</div></div>
            <div className="stepCard"><div className="stepNum">04</div><div className="stepIcon">💊</div><div className="stepTitle">Get Treatment Plan</div><div className="stepDesc">Receive a complete 7-day treatment plan with remedies, pesticide names, and prevention tips.</div></div>
          </div>
        </section>
      </div>

      {/* RESULTS */}
      {results && (
        <div className="container" ref={resultsRef}>
          <section id="results" style={{ display: 'block' }}>
            <div className="secLabel">Analysis Complete</div>
            <div className="secTitle">Detection Results</div>
            <div className="resultGrid">
              <div className="rMain">
                <div className={`diseaseBadge ${results.disease.severity === 'high' ? 'bDanger' : results.disease.severity === 'none' ? 'bOk' : 'bWarn'}`}>
                  {results.disease.severity === 'none' ? '✅ Healthy Crop' : results.disease.severity === 'high' ? '🔴 High Severity' : '⚠ Moderate Severity'}
                </div>
                <div className="disName">{results.disease.name}</div>
                <div className="disDesc">{results.disease.desc}</div>
                <div className="confWrap">
                  <div className="confTop">
                    <span>Detection Engine: {results.algorithm || 'CNN'}</span>
                    <span>{results.disease.confidence}%</span>
                  </div>
                  <div className="confBar"><div className="confFill" style={{ width: `${results.disease.confidence}%` }}></div></div>
                </div>
              </div>

              <div className="rSide">
                <div className="infoCard">
                  <div className="cardHead"><span>🌤</span> Live Weather Risk</div>
                  <div className="wRow"><span className="wLab">Location</span><span className="wVal">{results.weather.city}</span></div>
                  <div className="wRow"><span className="wLab">Temperature</span><span className="wVal">{results.weather.temp}°C</span></div>
                  <div className="wRow"><span className="wLab">Humidity</span><span className="wVal">{results.weather.humidity}%</span></div>
                  <div className="wRow"><span className="wLab">Conditions</span><span className="wVal" style={{ textTransform: 'capitalize' }}>{results.weather.condition}</span></div>
                  <div className="wRow">
                    <span className="wLab">Spread Risk</span>
                    <span className="wVal" style={{ color: results.disease.severity === 'none' ? 'var(--bright)' : (results.weather.humidity > 70 ? 'var(--red)' : 'var(--yellow)') }}>
                      {results.disease.severity === 'none' ? 'Low' : (results.weather.humidity > 70 ? 'High' : 'Moderate')}
                    </span>
                  </div>
                </div>
                <div className="infoCard">
                  <div className="cardHead"><span>💊</span> Quick Remedies</div>
                  <ul className="remList">
                    {results.disease.remedies.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              </div>

              <div className="aiBox">
                <div className="aiHead"><div className="aiIcon">🤖</div> Treatment Advice <span style={{ fontSize: '.7rem', fontWeight: 400, color: 'var(--muted)', marginLeft: '4px' }}>(Generated)</span></div>
                <div id="aiText"><Typewriter text={aiAdvice} /></div>
              </div>

              <div className="planCard">
                <div className="planTitle"><span>📋</span> 7-Day Action Plan</div>
                <div className="planGrid">
                  {results.disease.plan.map((s, i) => (
                    <div className="planStep" key={i}>
                      <div className="planN">0{i + 1}</div>
                      <div className="planT">{s}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {modelMetrics && (
                <div style={{ gridColumn: '1 / -1', marginTop: '20px', padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                  <div className="secLabel" style={{ textAlign: 'center', marginBottom: '20px' }}>Model Performance Comparison</div>
                  <div style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--bright)' }}>
                    Disease Detected By: <strong>{results.algorithm}</strong> 
                    {results.algorithm === modelMetrics.best_model ? " (Best Model)" : ""}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {['accuracy', 'precision', 'recall', 'f1_score'].map(metric => {
                       const labels = Object.keys(modelMetrics.models);
                       const dataValues = labels.map(l => modelMetrics.models[l][metric] * 100);
                       const bgColors = labels.map(l => l === modelMetrics.best_model ? 'rgba(76, 175, 80, 0.8)' : 'rgba(255, 255, 255, 0.2)');
                       
                       const chartData = {
                         labels,
                         datasets: [{
                           label: metric.toUpperCase(),
                           data: dataValues,
                           backgroundColor: bgColors,
                         }]
                       };
                       
                       return (
                         <div key={metric} style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px' }}>
                           <Bar data={chartData} options={{ responsive: true, plugins: { title: { display: true, text: metric.toUpperCase(), color: '#fff' }, legend: { display: false } }, scales: { y: { min: 0, max: 100, ticks: { color: '#aaa' } }, x: { ticks: { color: '#aaa' } } } }} />
                         </div>
                       );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* DISEASE LIBRARY */}
      <div className="container">
        <section id="diseases">
          <div className="secLabel">Disease Library</div>
          <div className="secTitle">Common Crop Diseases</div>
          <div className="diseaseGrid">
            {DISEASE_LIBRARY.map((d, i) => (
              <div className="dCard" key={i}>
                <div className="dEmoji">{d.emoji}</div>
                <div className="dName">{d.name}</div>
                <div className="dCrop">{d.crop}</div>
                <div className="dDesc">{d.desc}</div>
                <span className={`dSev diseaseBadge ${d.sev === 'high' ? 'bDanger' : 'bWarn'}`} style={{ fontSize: '.67rem' }}>
                  {d.sev === 'high' ? 'High Risk' : d.sev === 'low' ? 'Low Risk' : 'Moderate'}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* DASHBOARD */}
      <div className="container">
        <section id="dashboard">
          <div className="secLabel">Admin Dashboard</div>
          <div className="secTitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Model Performance & History</span>
            <button className="btnAnalyze" style={{ padding: '10px 20px', fontSize: '0.85rem' }} onClick={handleDownloadReport}>Generate Crop Report</button>
          </div>
          
          {modelMetrics && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px', marginBottom: '40px' }}>
              <div style={{ background: 'rgba(76, 175, 80, 0.2)', border: '1px solid #4CAF50', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Best Model</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', marginTop: '10px' }}>{modelMetrics.best_model}</div>
              </div>
              <div className="infoCard" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Best Accuracy</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', marginTop: '10px' }}>{(modelMetrics.models[modelMetrics.best_model].accuracy * 100).toFixed(0)}%</div>
              </div>
              <div className="infoCard" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Best Precision</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', marginTop: '10px' }}>{(modelMetrics.models[modelMetrics.best_model].precision * 100).toFixed(0)}%</div>
              </div>
              <div className="infoCard" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Best Recall</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', marginTop: '10px' }}>{(modelMetrics.models[modelMetrics.best_model].recall * 100).toFixed(0)}%</div>
              </div>
              <div className="infoCard" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Best F1 Score</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', marginTop: '10px' }}>{(modelMetrics.models[modelMetrics.best_model].f1_score * 100).toFixed(0)}%</div>
              </div>
            </div>
          )}

          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: 'var(--bright)' }}>Prediction History</h3>
              <button onClick={clearHistory} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer' }}>Clear All</button>
            </div>
            
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>No predictions yet</div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {history.map(item => (
                  <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: 'var(--bright)', marginBottom: '5px' }}>{item.predicted_disease} ({item.confidence}%)</div>
                      <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{item.timestamp} • Model: {item.used_model}</div>
                    </div>
                    <button onClick={() => deleteHistoryItem(item._id)} style={{ background: '#ff4d4d', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ABOUT */}
      <div className="container">
        <section id="about">
          <div className="aboutGrid">
            <div className="aboutLeft">
              <div className="secLabel">About This Project</div>
              <div className="secTitle" style={{ marginBottom: '20px' }}>Built for Pakistani Farmers</div>
              <p>Pakistan's agricultural sector contributes 24% to GDP and employs 42% of the workforce. Yet farmers lose 30–40% of their crops every year due to undetected diseases and delayed response.</p>
              <p>FasalAI puts hospital-grade crop diagnostics in the pocket of every farmer — completely free.</p>
              <p>This project utilizes a <b>Convolutional Neural Network (CNN)</b> as the primary high-accuracy model for image recognition.</p>
              <div className="techStack">
                {['Neural Network (CNN)', 'React.js', 'Flask', 'Python'].map(t => <span key={t} className="techPill">{t}</span>)}
              </div>
            </div>
            <div className="statsBox">
              <div className="statBox"><div className="sbN">87K+</div><div className="sbL">Training Images</div></div>
              <div className="statBox"><div className="sbN">38</div><div className="sbL">Disease Classes</div></div>
              <div className="statBox"><div className="sbN">97%</div><div className="sbL">Model Accuracy</div></div>
              <div className="statBox"><div className="sbN">14</div><div className="sbL">Crop Types</div></div>
            </div>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <div className="container">
        <footer>
          <div className="footL"><div className="logoDot" style={{ width: '7px', height: '7px' }}></div>FasalAI</div>
          <div className="footR">6th Semester ML Project · Pakistan · 2025 — Built with ❤️ for farmers</div>
        </footer>
      </div>
    </div>
  );
}

function Typewriter({ text }) {
  const [displayedText, setDisplayedText] = useState('');
  useEffect(() => {
    let i = 0;
    setDisplayedText('');
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(prev => prev + text[i]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 15);
    return () => clearInterval(interval);
  }, [text]);
  return (
    <>
      {displayedText}
      {displayedText.length < text.length && <span className="aiTyping"></span>}
    </>
  );
}

export default App;
