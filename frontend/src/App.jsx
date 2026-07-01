import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

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
    id: 'late_blight',
    name: 'Late Blight (Phytophthora infestans)',
    crop: 'Tomato / Potato',
    severity: 'high',
    confidence: 88,
    desc: 'A highly destructive oomycete disease causing rapid leaf browning, dark water-soaked lesions, and fuzzy white mold growth under wet leaves. Thrives in cool, damp conditions.',
    remedies: ['Apply Metalaxyl or Mancozeb fungicide spray immediately', 'Prune infected branches to increase airflow', 'Discard infected plants safely away from the field'],
    plan: ['Day 1: Prune infected shoots and clear ground debris', 'Day 2–3: Spray Metalaxyl-M or Chlorothalonil fungicide', 'Day 4–5: Reduce irrigation, ensure foliage stays completely dry', 'Day 6–7: Monitor closely; repeat spray application if humidity remains high'],
    tips: 'Avoid overhead watering. Plant certified blight-resistant seeds and rotate crops annually.',
    emoji: '🍂'
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
    id: 'leaf_mold',
    name: 'Leaf Mold (Passalora fulva)',
    crop: 'Tomato',
    severity: 'moderate',
    confidence: 84,
    desc: 'Fungal infection causing pale green or yellow spots on upper leaf surfaces, with olive-green to purple velvety mold on corresponding undersides. Thrives in high humidity.',
    remedies: ['Spray copper-based fungicides or chlorothalonil', 'Increase greenhouse ventilation or plant spacing', 'Remove lower leaves to improve soil-level aeration'],
    plan: ['Day 1–2: Prune bottom 30cm of foliage to maximize airflow', 'Day 3: Apply copper fungicide thoroughly to leaf undersides', 'Day 4–5: Control greenhouse humidity (keep under 85%)', 'Day 6–7: Apply preventive neem oil spray to new leaf growth'],
    tips: 'Ensure wide row spacing when planting. Grow tomatoes in well-drained soil.',
    emoji: '🍃'
  },
  {
    id: 'septoria_leaf_spot',
    name: 'Septoria Leaf Spot (Septoria lycopersici)',
    crop: 'Tomato',
    severity: 'moderate',
    confidence: 86,
    desc: 'Common fungal disease characterized by numerous small, circular grey spots with dark borders, often developing tiny black fruiting bodies in the centers.',
    remedies: ['Apply copper hydroxide or mancozeb fungicides', 'Mulch soil surface to prevent spore splash-back', 'Prune lower leaves that touch the ground'],
    plan: ['Day 1: Apply organic straw or plastic mulch around plant bases', 'Day 2–3: Foliar spray of Chlorothalonil or Copper Fungicide', 'Day 4–5: Prune and safely destroy lower infected leaves', 'Day 6–7: Water early in morning so foliage dries before sunset'],
    tips: 'Rotate crops for at least two years. Keep plants well-staked and off the ground.',
    emoji: '🍅'
  },
  {
    id: 'spider_mites',
    name: 'Spider Mites (Tetranychus urticae)',
    crop: 'Tomato / Pepper',
    severity: 'moderate',
    confidence: 89,
    desc: 'Tiny arachnid pests causing fine pale stippling (yellow dots), bronzing of leaves, and delicate silk webbing on leaf undersides. Severe infestation leads to leaf drop.',
    remedies: ['Spray Abamectin or Bifenthrin acaricide', 'Apply insecticidal soap or horticultural neem oil', 'Use overhead water pressure to dislodge mite webbing'],
    plan: ['Day 1: Blast leaf undersides with strong water spray to remove webbing', 'Day 2–3: Spray Abamectin or neem-based acaricide', 'Day 4–5: Introduce predatory mites or green lacewings if organic', 'Day 6–7: Re-apply acaricide to target newly hatched mite eggs'],
    tips: 'Keep plants well-watered. Dry, dusty conditions cause rapid mite reproduction.',
    emoji: '🕷️'
  },
  {
    id: 'target_spot',
    name: 'Target Spot (Corynespora cassiicola)',
    crop: 'Tomato / Cucumber',
    severity: 'moderate',
    confidence: 83,
    desc: 'Fungal pathogen causing circular brown lesions with distinct concentric rings, mimicking early blight but with larger, more target-like patterns.',
    remedies: ['Spray Chlorothalonil or azoxystrobin fungicides', 'Maintain clean field borders to remove weed hosts', 'Provide proper structural support to keep crop upright'],
    plan: ['Day 1–2: Prune heavily spotted leaves to limit spore production', 'Day 3: Thoroughly spray azoxystrobin fungicide', 'Day 4–5: Check staking ties, adjust to keep canopy off the soil', 'Day 6–7: Ensure soil has proper calcium/nitrogen balance'],
    tips: 'Avoid planting near cucumber or squash crops. Clean stakes and cages thoroughly.',
    emoji: '🎯'
  },
  {
    id: 'yellow_leaf_curl_virus',
    name: 'Yellow Leaf Curl Virus (TYLCV)',
    crop: 'Tomato',
    severity: 'high',
    confidence: 95,
    desc: 'Devastating viral disease transmitted by whiteflies. Causes severe stunting, leaf cupping (rolling upward), yellow margins, and complete cessation of fruit set.',
    remedies: ['Control whitefly vector using Imidacloprid insecticide', 'Apply yellow sticky traps to catch whiteflies', 'Remove and destroy virus-infected plants immediately'],
    plan: ['Day 1: Uproot infected plants, bag them immediately to trap whiteflies', 'Day 2–3: Apply whitefly-targeting insecticide (Imidacloprid or Acetamiprid)', 'Day 4–5: Place yellow sticky traps around remaining plants', 'Day 6–7: Inspect neighboring weeds; spray borders to control vector habitat'],
    tips: 'Use whitefly-proof net barriers. Plant virus-resistant hybrids.',
    emoji: '🌀'
  },
  {
    id: 'tomato_mosaic_virus',
    name: 'Tomato Mosaic Virus (ToMV)',
    crop: 'Tomato / Pepper',
    severity: 'high',
    confidence: 92,
    desc: 'Highly infectious virus causing mottled green/yellow mosaic patterns on leaves, leaf distortion (shoestring appearance), and internal browning of fruit.',
    remedies: ['Strict sanitation: wash hands/tools with milk or bleach', 'Remove and burn all infected plants immediately', 'Avoid touching healthy plants after handling infected ones'],
    plan: ['Day 1: Identify infected plants, carefully bag and remove them', 'Day 2: Disinfect all shears, stakes, and cages in 10% bleach solution', 'Day 3–4: Wash hands with non-fat dry milk to neutralize viral proteins', 'Day 5–7: Monitor field daily; avoid smoking near crops (tobacco virus risk)'],
    tips: 'Use certified virus-free seeds. Do not smoke or use tobacco products near tomato crops.',
    emoji: '🧩'
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

// ============================================================
// GEMINI API CONFIGURATION
// Paste your new Google Gemini API key from AI Studio here!
// ============================================================
const GEMINI_API_KEY = "AIzaSyA9DqIWuJeNlUbXRz2J7SG27u_gPtpfnrM";

const getDiseaseDisplayName = (diseaseId) => {
  if (!diseaseId) return 'Unknown';
  const disease = DISEASES.find(d => d.id === diseaseId);
  return disease ? disease.name : diseaseId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const fileToGenerativePart = (base64Str, mimeType) => {
  return {
    inlineData: {
      data: base64Str.split(',')[1],
      mimeType
    },
  };
};

const validateIsLeaf = async (base64Image, fileType) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const imagePart = fileToGenerativePart(base64Image, fileType);
    const prompt = "Analyze this image and identify if it is a crop leaf or plant leaf. Answer with 'YES' if the image is a leaf (healthy or diseased), or 'NO' if it is any other object (like a human face, a vehicle, clothes, a whole room, text, or a completely unrelated item). Your answer MUST be exactly 'YES' or 'NO' with no punctuation.";

    const result = await model.generateContent([prompt, imagePart]);
    const text = result.response.text().trim().toUpperCase();
    console.log("Leaf Validation Result:", text);
    return text.includes("YES");
  } catch (err) {
    console.warn("Leaf validation failed, bypassing checks:", err);
    return true; // Bypass on API error so standard function is not broken
  }
};

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [location, setLocation] = useState('');
  const [algorithm, setAlgorithm] = useState('best');
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

  const handleDownloadSingleReport = async (id) => {
    try {
      showToast("Generating Individual PDF...");
      const res = await fetch(`http://localhost:5000/generate-single-report/${id}`);
      if (!res.ok) throw new Error("Failed to generate");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Diagnostic_Report_${id}.pdf`;
      a.click();
    } catch (e) {
      showToast("Error generating individual report.");
    }
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
      // 0. Leaf Image Validation using Gemini Vision
      showToast("Verifying leaf sample quality...");
      const isLeaf = await validateIsLeaf(uploadedImage, rawFile.type);
      if (!isLeaf) {
        setLoading(false);
        showToast("⚠️ Invalid Image! Please upload a valid crop leaf photo.");
        return;
      }

      // 1. CALL BACKEND (Python Flask)
      const formData = new FormData();
      formData.append('file', rawFile);
      formData.append('algorithm', algorithm);

      // 2. Weather (Get real data first)
      const weatherData = await fetchWeather(loc);
      formData.append('city', weatherData.city);
      formData.append('temp', weatherData.temp);
      formData.append('humidity', weatherData.humidity);
      formData.append('condition', weatherData.condition);

      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Backend server is not running. Please start app.py');

      const backendData = await response.json();

      // Find the disease details from our local DB using the ID from backend
      const disease = DISEASES.find(d => d.id === backendData.disease_id) || DISEASES[0];
      disease.confidence = backendData.confidence;

      // 3. Treatment Advice (Google Gemini AI)
      const advice = await getAIAdvice(disease, weatherData);

      setResults({
        disease,
        weather: weatherData,
        algorithm: backendData.algorithm
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
    try {
      // Use your OpenWeatherMap API Key here
      const API_KEY = "5387ce95ec79c697ce00474e7289fe84";
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`);

      if (!res.ok) throw new Error("Weather location not found");

      const data = await res.json();
      return {
        city: data.name,
        temp: Math.round(data.main.temp),
        humidity: data.main.humidity,
        condition: data.weather[0].description,
      };
    } catch (err) {
      console.warn("Weather API failed, using fallback:", err.message);
      // Fallback if API fails or location is invalid
      return {
        city: city + " (Simulated)",
        temp: 28,
        humidity: 65,
        condition: 'Partly Cloudy',
      };
    }
  };

  const getAIAdvice = async (disease, weather) => {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `You are a professional agricultural expert. A farmer has detected ${disease.name} on their ${disease.crop} crop. 
      Current weather conditions in their city are: ${weather.temp}°C, ${weather.humidity}% humidity, and ${weather.condition}.
      
      Please provide:
      1. A short analysis of the current disease spread risk based on the weather.
      2. 3 specific immediate actions (organic or chemical remedies).
      3. A concise 7-day action plan.
      4. A prevention tip for the future.
      
      Format the response beautifully with bullet points. Keep it clear, practical, and encouraging for a farmer.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (err) {
      console.error("Gemini AI failed, using local fallback", err);
      return getLocalFallbackAdvice(disease, weather);
    }
  };

  const getLocalFallbackAdvice = async (disease, weather) => {
    // Local advice generator (Fallback)
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

1. IMMEDIATE: ${disease.remedies[0]}.
2. NEXT 48 HOURS: ${disease.remedies[1]}.
3. ONGOING: ${disease.remedies[2]}.

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
        <nav style={{ borderBottom: '1px solid var(--border)', padding: '20px 0' }}>
          <a href="#home" className="logo" onClick={(e) => { e.preventDefault(); setCurrentPage('home'); }}>
            <div className="logoDot"></div>FasalAI
          </a>
          <div className="navLinks" style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
            <a 
              href="#home" 
              onClick={(e) => { e.preventDefault(); setCurrentPage('home'); }}
              style={currentPage === 'home' ? { color: 'var(--bright)', fontWeight: 700 } : {}}
            >
              Home
            </a>
            <a 
              href="#detect" 
              onClick={(e) => { e.preventDefault(); setCurrentPage('detect'); }}
              style={currentPage === 'detect' ? { color: 'var(--bright)', fontWeight: 700 } : {}}
            >
              Detect Disease
            </a>
            <a 
              href="#dashboard" 
              onClick={(e) => { e.preventDefault(); setCurrentPage('dashboard'); }}
              style={currentPage === 'dashboard' ? { color: 'var(--bright)', fontWeight: 700 } : {}}
            >
              Analytics Dashboard
            </a>
            <a 
              href="#history" 
              onClick={(e) => { e.preventDefault(); setCurrentPage('history'); }}
              style={currentPage === 'history' ? { color: 'var(--bright)', fontWeight: 700 } : {}}
            >
              Prediction History
            </a>
          </div>
          <div className="navBadge">🌾 AI-Powered</div>
        </nav>
      </div>

      {/* PAGE CONTENT */}
      
      {/* 1. HOME PAGE */}
      {currentPage === 'home' && (
        <div style={{ animation: 'fadeUp .4s ease both' }}>
          {/* HERO */}
          <div className="container" style={{ padding: '60px 28px' }}>
            <section id="home" style={{ padding: 0 }}>
              <div className="heroGrid" style={{ gridTemplateColumns: '1.2fr 0.8fr', gap: '50px' }}>
                <div className="heroLeft">
                  <div className="heroTag">Real-Time Crop Disease Detection</div>
                  <h1>Protect Your<br />Harvest with<br /><em>AI Precision</em></h1>
                  <p className="heroSub">Upload a photo of any crop leaf. Our AI model instantly detects diseases, checks live weather risk, and generates a complete treatment plan — free for every farmer.</p>
                  
                  <button 
                    className="btnAnalyze" 
                    style={{ width: 'fit-content', padding: '14px 32px', fontSize: '0.95rem', borderRadius: '12px' }}
                    onClick={() => setCurrentPage('detect')}
                  >
                    <span>⚡</span> Get Started (Analyze Now)
                  </button>

                  <div className="heroStats" style={{ marginTop: '40px', gap: '30px' }}>
                    <div className="stat"><div className="statN">97%</div><div className="statL">Detection Accuracy</div></div>
                    <div className="stat"><div className="statN">38+</div><div className="statL">Disease Classes</div></div>
                    <div className="stat"><div className="statN">5s</div><div className="statL">Analysis Time</div></div>
                    <div className="stat"><div className="statN">Free</div><div className="statL">For All Farmers</div></div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center' }}>
                  <div className="stepCard" style={{ padding: '24px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '18px' }}>
                    <div className="stepIcon" style={{ fontSize: '2rem' }}>🌿</div>
                    <div className="stepTitle" style={{ fontSize: '1rem', fontWeight: 700, marginTop: '10px', marginBottom: '8px' }}>Fast & Reliable</div>
                    <div className="stepDesc" style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.65 }}>Get crop disease diagnostics instantly using CNN, SVM, or KNN classifiers.</div>
                  </div>
                  <div className="stepCard" style={{ padding: '24px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '18px' }}>
                    <div className="stepIcon" style={{ fontSize: '2rem' }}>🌤️</div>
                    <div className="stepTitle" style={{ fontSize: '1rem', fontWeight: 700, marginTop: '10px', marginBottom: '8px' }}>Weather-Aware</div>
                    <div className="stepDesc" style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.65 }}>Combines real-time microclimate observations to assess disease spread hazard.</div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* HOW IT WORKS */}
          <div className="container" style={{ paddingBottom: '60px' }}>
            <section id="how" style={{ paddingTop: '60px' }}>
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

          {/* ABOUT */}
          <div className="container" style={{ paddingBottom: '60px' }}>
            <section id="about" style={{ borderTop: '1px solid var(--border)', paddingTop: '60px' }}>
              <div className="aboutGrid">
                <div className="aboutLeft">
                  <div className="secLabel">About This Project</div>
                  <div className="secTitle" style={{ marginBottom: '20px' }}>Built for Pakistani Farmers</div>
                  <p>Pakistan's agricultural sector contributes 24% to GDP and employs 42% of the workforce. Yet farmers lose 30–40% of their crops every year due to undetected diseases and delayed response.</p>
                  <p>FasalAI puts hospital-grade crop diagnostics in the pocket of every farmer — completely free.</p>
                  <p>This project utilizes a <b>Convolutional Neural Network (CNN)</b> as the primary high-accuracy model for image recognition.</p>
                  <div className="techStack" style={{ marginTop: '20px' }}>
                    {['Neural Network (CNN)', 'React.js', 'Flask', 'Python'].map(t => <span key={t} className="techPill" style={{ marginRight: '8px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', fontSize: '0.8rem' }}>{t}</span>)}
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
        </div>
      )}

      {/* 2. DETECT PAGE */}
      {currentPage === 'detect' && (
        <div className="container" style={{ paddingTop: '40px', paddingBottom: '60px', animation: 'fadeUp .4s ease both' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div className="secLabel">Leaf Diagnostics</div>
            <div className="secTitle" style={{ marginBottom: '10px' }}>Crop Disease Detection</div>
            <p style={{ color: 'var(--muted)', maxWidth: '600px', margin: '0 auto', fontSize: '0.9rem' }}>
              Select your diagnostic engine, upload a clear photo of an infected leaf, and receive live treatment actions!
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr', gap: '30px', alignItems: 'start' }}>
            {/* Upload Selector */}
            <div className="uploadCard" style={{ margin: 0 }}>
              <div className="dropZone" onClick={() => document.getElementById('fileInput').click()}>
                <div className="dropIcon">🍃</div>
                <div className="dropTitle">Drop your leaf photo here</div>
                <div className="dropSub">or <span>click to browse</span> from your device</div>
                <input type="file" id="fileInput" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              </div>
              {uploadedImage && (
                <div id="prevWrap" style={{ display: 'block', marginTop: '15px' }}>
                  <img id="prevImg" src={uploadedImage} alt="Preview" style={{ borderRadius: '10px' }} />
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
                  <option value="best">Best Model (Auto-select)</option>
                  <option value="cnn">Neural Network (CNN)</option>
                  <option value="svm">Support Vector Machine (SVM)</option>
                  <option value="knn">K-Nearest Neighbors (KNN)</option>
                </select>
              </div>

              <button className="btnAnalyze" onClick={runAnalysis} disabled={!uploadedImage || loading}>
                <div className="shine"></div>
                <span>⚡</span> {loading ? 'Analyzing...' : 'Analyze Crop Disease'}
              </button>
            </div>

            {/* Quick Database Preview in case no active prediction */}
            {!results && (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '22px', padding: '28px', height: '100%' }}>
                <div className="secLabel">Database Preview</div>
                <div className="secTitle" style={{ fontSize: '1.25rem', marginBottom: '15px' }}>Common Supported Conditions</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '20px', lineHeight: 1.65 }}>
                  FasalAI is fully trained to identify and generate remedial schedules for:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {DISEASES.slice(0, 6).map((d, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>{d.emoji}</span>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--white)' }}>{d.name.split('(')[0]}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '2px' }}>{d.crop}</div>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => setCurrentPage('dashboard')} 
                  style={{ background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.25)', color: 'var(--bright)', padding: '12px 16px', borderRadius: '10px', width: '100%', marginTop: '25px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  📊 View Full Classifier Diagnostics & Charts
                </button>
              </div>
            )}

            {/* RESULTS */}
            {results && (
              <div className="resultGrid" style={{ display: 'flex', flexDirection: 'column', gap: '18px', gridColumn: 'span 1', width: '100%', marginTop: 0 }}>
                <div className="rMain" style={{ width: '100%' }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
              </div>
            )}
          </div>

          {/* DISEASE LIBRARY */}
          <div style={{ marginTop: '50px', borderTop: '1px solid var(--border)', paddingTop: '50px' }}>
            <div className="secLabel">Disease Library</div>
            <div className="secTitle" style={{ marginBottom: '25px' }}>Common Crop Diseases</div>
            <div className="diseaseGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {DISEASES.slice(0, 9).map((d, i) => (
                <div className="dCard" key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '18px', padding: '24px', position: 'relative' }}>
                  <div className="dEmoji" style={{ fontSize: '2rem', marginBottom: '10px' }}>{d.emoji}</div>
                  <div className="dName" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', marginBottom: '5px' }}>{d.name.split('(')[0]}</div>
                  <div className="dCrop" style={{ color: 'var(--bright)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '10px' }}>{d.crop}</div>
                  <div className="dDesc" style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '14px' }}>{d.desc}</div>
                  <span className={`dSev diseaseBadge ${d.severity === 'high' ? 'bDanger' : d.severity === 'none' ? 'bOk' : 'bWarn'}`} style={{ fontSize: '.67rem', marginBottom: 0 }}>
                    {d.severity === 'high' ? 'High Risk' : d.severity === 'none' ? 'Low Risk' : 'Moderate'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. ANALYTICS DASHBOARD PAGE */}
      {currentPage === 'dashboard' && (
        <div className="container" style={{ paddingTop: '40px', paddingBottom: '60px', animation: 'fadeUp .4s ease both' }}>
          <section id="dashboard" style={{ display: 'block' }}>
            <div className="secLabel">Analytics Dashboard</div>
            <div className="secTitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <span>Model Performance Comparisons</span>
              <button className="btnAnalyze" style={{ padding: '12px 24px', fontSize: '0.85rem', width: 'auto', marginTop: 0 }} onClick={handleDownloadReport}>
                Generate Crop Report
              </button>
            </div>

            {modelMetrics && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px', marginBottom: '40px' }}>
                <div style={{ background: 'rgba(46, 204, 113, 0.15)', border: '1px solid var(--bright)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Best Model</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', marginTop: '10px' }}>{modelMetrics.best_model}</div>
                </div>
                <div className="infoCard" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Best Accuracy</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', marginTop: '10px' }}>{(modelMetrics.models[modelMetrics.best_model].accuracy * 100).toFixed(1)}%</div>
                </div>
                <div className="infoCard" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Best Precision</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', marginTop: '10px' }}>{(modelMetrics.models[modelMetrics.best_model].precision * 100).toFixed(1)}%</div>
                </div>
                <div className="infoCard" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Best Recall</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', marginTop: '10px' }}>{(modelMetrics.models[modelMetrics.best_model].recall * 100).toFixed(1)}%</div>
                </div>
                <div className="infoCard" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Best F1 Score</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', marginTop: '10px' }}>{(modelMetrics.models[modelMetrics.best_model].f1_score * 100).toFixed(1)}%</div>
                </div>
              </div>
            )}

            {/* Performance Visualizations */}
            {modelMetrics && (() => {
              const currentModelKey = results?.algorithm ? (results.algorithm.toLowerCase().includes('svm') ? 'SVM' : results.algorithm.toLowerCase().includes('knn') ? 'KNN' : 'CNN') : 'CNN';
              return (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '25px' }}>
                  <div className="secLabel" style={{ textAlign: 'center', marginBottom: '20px' }}>Comparative Classifier Performance</div>
                  
                  {/* Line Graph comparing overall trends */}
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '0.82rem', fontWeight: 700, color: 'var(--white)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '15px', textAlign: 'center' }}>
                      📈 Multi-Classifier Signature Trend
                    </div>
                    <Line 
                      data={{
                        labels: ['Accuracy', 'Precision', 'Recall', 'F1-Score'],
                        datasets: [
                          {
                            label: 'Neural Network (CNN)' + (currentModelKey === 'CNN' ? ' [Selected]' : ''),
                            data: [
                              modelMetrics.models.CNN.accuracy * 100,
                              modelMetrics.models.CNN.precision * 100,
                              modelMetrics.models.CNN.recall * 100,
                              modelMetrics.models.CNN.f1_score * 100
                            ],
                            borderColor: 'rgba(46, 204, 113, 1)',
                            backgroundColor: 'rgba(46, 204, 113, 0.03)',
                            borderWidth: currentModelKey === 'CNN' ? 4 : 2,
                            pointRadius: currentModelKey === 'CNN' ? 6 : 4,
                            pointBackgroundColor: 'rgba(46, 204, 113, 1)',
                            tension: 0.35,
                            fill: true
                          },
                          {
                            label: 'Support Vector Machine (SVM)' + (currentModelKey === 'SVM' ? ' [Selected]' : ''),
                            data: [
                              modelMetrics.models.SVM.accuracy * 100,
                              modelMetrics.models.SVM.precision * 100,
                              modelMetrics.models.SVM.recall * 100,
                              modelMetrics.models.SVM.f1_score * 100
                            ],
                            borderColor: 'rgba(200, 169, 110, 1)',
                            backgroundColor: 'rgba(200, 169, 110, 0.03)',
                            borderWidth: currentModelKey === 'SVM' ? 4 : 2,
                            pointRadius: currentModelKey === 'SVM' ? 6 : 4,
                            pointBackgroundColor: 'rgba(200, 169, 110, 1)',
                            tension: 0.35,
                            fill: true
                          },
                          {
                            label: 'K-Nearest Neighbors (KNN)' + (currentModelKey === 'KNN' ? ' [Selected]' : ''),
                            data: [
                              modelMetrics.models.KNN.accuracy * 100,
                              modelMetrics.models.KNN.precision * 100,
                              modelMetrics.models.KNN.recall * 100,
                              modelMetrics.models.KNN.f1_score * 100
                            ],
                            borderColor: 'rgba(52, 152, 219, 1)',
                            backgroundColor: 'rgba(52, 152, 219, 0.03)',
                            borderWidth: currentModelKey === 'KNN' ? 4 : 2,
                            pointRadius: currentModelKey === 'KNN' ? 6 : 4,
                            pointBackgroundColor: 'rgba(52, 152, 219, 1)',
                            tension: 0.35,
                            fill: true
                          }
                        ]
                      }} 
                      options={{
                        responsive: true,
                        plugins: {
                          legend: {
                            display: true,
                            position: 'top',
                            labels: {
                              color: '#aaa',
                              font: {
                                family: "'DM Sans', sans-serif",
                                size: 11
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            min: 0,
                            max: 100,
                            ticks: {
                              color: '#aaa',
                              callback: function(value) { return value + '%'; }
                            },
                            grid: {
                              color: 'rgba(255, 255, 255, 0.04)'
                            }
                          },
                          x: {
                            ticks: {
                              color: '#aaa'
                            },
                            grid: {
                              color: 'rgba(255, 255, 255, 0.04)'
                            }
                          }
                        }
                      }}
                    />
                  </div>

                  {/* Detailed Bar Graphs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {['accuracy', 'precision', 'recall', 'f1_score'].map(metric => {
                      const labels = Object.keys(modelMetrics.models);
                      const dataValues = labels.map(l => modelMetrics.models[l][metric] * 100);
                      const bgColors = labels.map(l => {
                        if (l === currentModelKey) return 'rgba(46, 204, 113, 0.9)'; // Active classifier in theme bright green!
                        if (l === modelMetrics.best_model) return 'rgba(200, 169, 110, 0.8)'; // Best model in theme gold
                        return 'rgba(255, 255, 255, 0.15)'; // Others dimmed
                      });

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
              );
            })()}
          </section>
        </div>
      )}

      {/* 4. PREDICTION HISTORY PAGE */}
      {currentPage === 'history' && (
        <div className="container" style={{ paddingTop: '40px', paddingBottom: '60px', animation: 'fadeUp .4s ease both' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div className="secLabel">Logs & Auditing</div>
            <div className="secTitle" style={{ marginBottom: '10px' }}>Diagnostic History</div>
            <p style={{ color: 'var(--muted)', maxWidth: '600px', margin: '0 auto', fontSize: '0.9rem' }}>
              Access full historical archives of all leaf diagnostic predictions, complete weather records, and download or review pdf-generated advice lists!
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '22px', padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '15px' }}>
              <h3 style={{ margin: 0, color: 'var(--bright)', fontFamily: "'Syne', sans-serif", fontSize: '1.25rem' }}>Prediction Archives</h3>
              <button 
                onClick={clearHistory} 
                style={{ background: 'rgba(231, 76, 60, 0.1)', border: '1px solid rgba(231, 76, 60, 0.25)', color: 'var(--red)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s' }}
              >
                Clear All History
              </button>
            </div>

            {history.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#888', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                <div style={{ fontSize: '3rem' }}>📂</div>
                <div style={{ fontWeight: 'bold' }}>No predictions yet</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', maxWidth: '300px', lineHeight: 1.6 }}>Go to the Detect page to analyze crop leaves and populate this database.</p>
                <button 
                  onClick={() => setCurrentPage('detect')} 
                  style={{ marginTop: '10px', background: 'var(--bright)', color: '#030a05', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
                >
                  Analyze Leaf Now
                </button>
              </div>
            ) : (
              <div className="history-list" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {history.map(item => (
                  <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', gap: '20px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: 'var(--bright)', marginBottom: '5px', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🍂</span> {getDiseaseDisplayName(item.predicted_disease)}
                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', color: 'var(--white)' }}>{item.confidence}% Confidence</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#aaa', display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '6px' }}>
                        <span>📅 {item.timestamp}</span>
                        <span>🧠 Model: {item.used_model}</span>
                        {item.weather_data && (
                          <span>🌤 {item.weather_data.temperature}°C, {item.weather_data.condition} ({item.weather_data.city})</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={() => handleDownloadSingleReport(item._id)} 
                        style={{ background: 'rgba(46, 204, 113, 0.1)', border: '1px solid rgba(46, 204, 113, 0.25)', color: 'var(--bright)', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        📄 Download PDF
                      </button>
                      <button 
                        onClick={() => deleteHistoryItem(item._id)} 
                        style={{ background: 'rgba(231, 76, 60, 0.1)', border: '1px solid rgba(231, 76, 60, 0.25)', color: 'var(--red)', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
