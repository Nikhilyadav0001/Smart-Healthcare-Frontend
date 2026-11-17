import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Pulse, ArrowRight, Bell, CalendarBlank, CaretDown, Check, ChatCircleDots,
  ClipboardText, Clock, CloudArrowUp, FileText, Gear, Heartbeat, House,
  MagnifyingGlass, MapPin, Moon, PaperPlaneTilt, Plus, ShieldCheck,
  SignOut, Stethoscope, Sun, UserCircle, UsersThree, WarningCircle, X,
  Key, Lock, Fingerprint, Code, Eye
} from '@phosphor-icons/react';
import './styles.css';

const demoUser = {
  name: 'Maya Shah',
  firstName: 'Maya',
  email: 'maya.shah@example.com',
  initials: 'MS',
  roles: ['PATIENT'],
  uid: 'fb2f16a0-7888-4c12-a840-4bddc10525d6'
};

const navItems = [
  { id: 'home', label: 'Overview', icon: House },
  { id: 'appointments', label: 'Appointments', icon: CalendarBlank, count: 2 },
  { id: 'records', label: 'Health records', icon: ClipboardText },
  { id: 'predictions', label: 'AI Health Predictor', icon: Pulse },
  { id: 'care-team', label: 'Care team', icon: UsersThree },
  { id: 'messages', label: 'Messages', icon: ChatCircleDots, count: 3 },
  { id: 'tokens', label: 'OAuth2 & Tokens', icon: Key },
];

const appointments = [
  { date: 'Today', time: '10:30 AM', title: 'Annual wellness review', clinician: 'Dr. Amelia Morgan', kind: 'Primary care', color: 'coral' },
  { date: 'Thu, 24 Oct', time: '2:00 PM', title: 'Nutrition follow-up', clinician: 'Priya Nair, RD', kind: 'Nutrition', color: 'teal' },
  { date: 'Tue, 05 Nov', time: '9:15 AM', title: 'Physiotherapy check-in', clinician: 'Jon Bell, PT', kind: 'Physiotherapy', color: 'gold' },
];

const records = [
  { title: 'Complete blood count', meta: 'Dr. Amelia Morgan · 12 Sep 2024', type: 'Lab result', icon: Pulse },
  { title: 'Annual wellness notes', meta: 'Dr. Amelia Morgan · 28 Aug 2024', type: 'Visit summary', icon: FileText },
  { title: 'Nutrition plan', meta: 'Priya Nair, RD · 16 Aug 2024', type: 'Care plan', icon: ClipboardText },
  { title: 'Immunization history', meta: 'Smart Healthcare · 08 Jul 2024', type: 'Document', icon: ShieldCheck },
];

function App() {
  const [session, setSession] = useState({ state: 'loading', user: null, error: null });
  const [activePage, setActivePage] = useState('home');
  const [demoMode, setDemoMode] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const loadSession = async () => {
    setSession({ state: 'loading', user: null, error: null });
    try {
      const response = await fetch('/api/me', { credentials: 'include' });
      if (response.status === 401 || response.status === 403) {
        setSession({ state: 'unauthenticated', user: null, error: null });
        return;
      }
      if (!response.ok) throw new Error('The care gateway is not responding right now.');
      const user = await response.json();
      const initials = user.fullName
        ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : (user.email ? user.email.slice(0, 2).toUpperCase() : 'SH');

      setSession({
        state: 'authenticated',
        user: {
          ...demoUser,
          ...user,
          name: user.fullName || user.email || demoUser.name,
          firstName: (user.fullName ? user.fullName.split(' ')[0] : (user.email ? user.email.split('@')[0] : 'Patient')),
          initials
        },
        error: null
      });
    } catch (error) {
      setSession({ state: 'unauthenticated', user: null, error: null });
    }
  };

  useEffect(() => { loadSession(); }, []);

  if (session.state === 'loading') return <LoadingScreen />;

  if (session.state === 'unauthenticated' && !demoMode) {
    return (
      <AccessScreen
        onDemo={() => {
          setDemoMode(true);
          setSession({ state: 'authenticated', user: demoUser, error: null });
        }}
        onSessionReload={loadSession}
      />
    );
  }

  if (session.state === 'error' && !demoMode) {
    return (
      <ErrorScreen
        message={session.error}
        onRetry={loadSession}
        onDemo={() => {
          setDemoMode(true);
          setSession({ state: 'authenticated', user: demoUser, error: null });
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><Heartbeat size={19} weight="bold" /></div>
          <span>smart<span className="brand-dot">.</span>health</span>
          <button className="icon-button mobile-close" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <div className="workspace-switcher">
          <div className="avatar avatar-small">{session.user?.initials || 'MS'}</div>
          <div>
            <strong>{session.user?.firstName || 'Maya'}'s care</strong>
            <span>{demoMode ? 'Demo Workspace' : 'BFF Session Active'}</span>
          </div>
          <CaretDown size={16} className="muted-icon" />
        </div>
        <nav className="primary-nav" aria-label="Main navigation">
          <span className="nav-label">Workspace</span>
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              active={activePage === item.id}
              onClick={() => { setActivePage(item.id); setMobileNavOpen(false); }}
            />
          ))}
          <span className="nav-label nav-label-spaced">Account</span>
          <NavItem
            item={{ id: 'profile', label: 'Profile & settings', icon: Gear }}
            active={activePage === 'profile'}
            onClick={() => { setActivePage('profile'); setMobileNavOpen(false); }}
          />
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <ShieldCheck size={19} />
            <span>
              <strong>Your care, kept private.</strong>
              <small>Protected by the Gateway session.</small>
            </span>
          </div>
          <button
            className="signout-button"
            onClick={async () => {
              try {
                await fetch('/logout', { method: 'POST', credentials: 'include' });
              } catch (e) {
                // ignore
              }
              window.location.href = 'http://localhost:8081/logout?redirect_uri=' + encodeURIComponent(window.location.origin + '/');
            }}
          >
            <SignOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      {mobileNavOpen && <button className="scrim" aria-label="Close menu" onClick={() => setMobileNavOpen(false)} />}

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}>
            <span></span><span></span>
          </button>
          <div className="breadcrumbs">
            <span>Workspace</span>
            <ArrowRight size={14} />
            <strong>{navItems.find((item) => item.id === activePage)?.label || 'Profile & settings'}</strong>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Search"><MagnifyingGlass size={20} /></button>
            <button className="notification-button" aria-label="Notifications"><Bell size={20} /><i></i></button>
            <div className="top-avatar">{session.user?.initials || 'MS'}</div>
          </div>
        </header>

        {demoMode && (
          <div className="demo-banner">
            <span><WarningCircle size={17} /> Demo workspace — connected backend data will appear when the Gateway is available.</span>
            <button onClick={() => setDemoMode(false)} aria-label="Dismiss demo banner"><X size={16} /></button>
          </div>
        )}

        <div className="page-wrap">{renderPage(activePage, session.user, setActivePage, demoMode)}</div>
      </main>
    </div>
  );
}

function renderPage(page, user, setActivePage, demoMode) {
  switch (page) {
    case 'appointments': return <AppointmentsPage setActivePage={setActivePage} />;
    case 'records': return <RecordsPage />;
    case 'predictions': return <PredictionsPage user={user} />;
    case 'care-team': return <CareTeamPage setActivePage={setActivePage} />;
    case 'messages': return <MessagesPage />;
    case 'tokens': return <TokensPage user={user} demoMode={demoMode} />;
    case 'profile': return <ProfilePage user={user} />;
    default: return <HomePage user={user} setActivePage={setActivePage} />;
  }
}

function NavItem({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <Icon size={20} weight={active ? 'fill' : 'regular'} />
      <span>{item.label}</span>
      {item.count && <em>{item.count}</em>}
    </button>
  );
}

function HomePage({ user, setActivePage }) {
  return (
    <>
      <section className="welcome-row">
        <div>
          <p className="eyebrow">Friday, 18 October 2024 <span className="eyebrow-dot"></span> Good morning</p>
          <h1>Good morning, {user?.firstName || 'Maya'}.</h1>
          <p className="lede">A clear view of your health, with the next right step always close by.</p>
        </div>
        <button className="primary-button" onClick={() => setActivePage('appointments')}>
          <Plus size={18} weight="bold" /> Book an appointment
        </button>
      </section>

      <section className="hero-panel">
        <div className="hero-copy">
          <div className="status-chip"><span></span> Care plan on track</div>
          <h2>Small steps.<br /><em>Meaningful change.</em></h2>
          <p>Your latest check-in shows steady progress. Keep your routine simple this week and stay hydrated before your appointment.</p>
          <button className="text-button" onClick={() => setActivePage('records')}>
            View latest care plan <ArrowRight size={17} />
          </button>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orbit orbit-one"></div>
          <div className="orbit orbit-two"></div>
          <div className="health-spark"><Heartbeat size={31} weight="bold" /></div>
          <div className="spark spark-a"></div>
          <div className="spark spark-b"></div>
          <div className="spark spark-c"></div>
        </div>
      </section>

      <section className="section-heading">
        <div>
          <p className="eyebrow">Your snapshot</p>
          <h2>Right now</h2>
        </div>
        <button className="quiet-button" onClick={() => setActivePage('predictions')}>
          Run AI Health Predictor <ArrowRight size={16} />
        </button>
      </section>

      <div className="metric-grid">
        <MetricCard icon={Heartbeat} label="Wellness score" value="82" unit="/ 100" trend="+4 this month" tone="teal" />
        <MetricCard icon={Moon} label="Sleep average" value="7h 42m" trend="On your usual rhythm" tone="navy" />
        <MetricCard icon={Pulse} label="Next check-in" value="Today" trend="10:30 AM · Primary care" tone="coral" />
      </div>

      <div className="content-grid">
        <section className="surface-card appointments-card">
          <CardHeading title="Upcoming appointments" action="See all" onClick={() => setActivePage('appointments')} />
          <div className="appointment-list">
            {appointments.slice(0, 2).map((item) => <AppointmentRow key={item.title} item={item} />)}
          </div>
        </section>
        <section className="surface-card message-card">
          <CardHeading title="From your care team" action="Open messages" onClick={() => setActivePage('messages')} />
          <div className="message-preview">
            <div className="doctor-avatar">AN</div>
            <div>
              <strong>Alex Nguyen, RN</strong>
              <span>“Your lab results are looking good. I’ve left a note in your records with the full context.”</span>
              <small>Yesterday at 4:18 PM</small>
            </div>
          </div>
          <button className="reply-row" onClick={() => setActivePage('messages')}>
            <span>Reply to Alex</span><PaperPlaneTilt size={17} />
          </button>
        </section>
      </div>
    </>
  );
}

function TokensPage({ user, demoMode }) {
  const [tokensData, setTokensData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDevTokens = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/dev/tokens', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Gateway token endpoint unavailable`);
      const data = await res.json();
      setTokensData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!demoMode) {
      fetchDevTokens();
    }
  }, [demoMode]);

  return (
    <PageIntro
      eyebrow="OAuth2 Authorization & BFF Inspection"
      title="Tokens & Active Session"
      lede="Live inspection of OAuth2 tokens issued by auth-service and relayed by the Gateway BFF."
    >
      <div className="token-viewer-grid">
        <div className="token-card">
          <h3><Fingerprint size={20} /> Current User Identity (`/api/me`)</h3>
          <table className="claims-table">
            <tbody>
              <tr><td>User ID / Subject</td><td>{user?.id || user?.uid || 'fb2f16a0-7888-4c12-a840-4bddc10525d6'}</td></tr>
              <tr><td>Email Address</td><td>{user?.email || 'maya.shah@example.com'}</td></tr>
              <tr><td>Full Name</td><td>{user?.name || 'Maya Shah'}</td></tr>
              <tr>
                <td>Assigned Roles</td>
                <td>
                  <span className="badge-tag">PATIENT</span>
                  {' '}
                  <span className="badge-tag">USER</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="token-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}><Key size={20} /> Gateway BFF Stored Tokens (`/dev/tokens`)</h3>
            <button className="secondary-button" onClick={fetchDevTokens} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh Tokens'}
            </button>
          </div>

          {error && (
            <div style={{ color: '#b9381e', fontSize: 13, background: '#fbeee9', padding: 12, borderRadius: 8 }}>
              {error} — (Note: Gateway `/dev/tokens` is active when running through the gateway BFF).
            </div>
          )}

          {tokensData ? (
            <table className="claims-table">
              <tbody>
                <tr><td>Client ID</td><td>{tokensData.client_id}</td></tr>
                <tr><td>Access Token (JWT)</td><td>{tokensData.access_token}</td></tr>
                <tr><td>Refresh Token (Opaque)</td><td>{tokensData.refresh_token}</td></tr>
                <tr><td>Expires At</td><td>{tokensData.expires_at}</td></tr>
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '10px 0 0' }}>
              {demoMode ? 'In Demo Mode: Mock token inspection active.' : 'Click "Refresh Tokens" to inspect current session tokens.'}
            </p>
          )}
        </div>
      </div>
    </PageIntro>
  );
}

function PredictionsPage({ user }) {
  const [features, setFeatures] = useState({
    age: 52,
    sex: 'Female',
    height_cm: 165,
    weight_kg: 78,
    systolic_bp: 142,
    diastolic_bp: 92,
    glucose_mg_dl: 135,
    cholesterol_mg_dl: 225,
    resting_heart_rate: 78,
    physical_activity: 'Low',
    smoking: 0,
    family_history_diabetes: 1,
    family_history_heart_disease: 1,
    fatigue: 1,
    shortness_of_breath: 1,
    chest_pain: 0,
    frequent_urination: 0,
    excessive_thirst: 0,
    dizziness: 0,
    palpitations: 0,
    blurred_vision: 0
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const computedBmi = (features.height_cm > 0 && features.weight_kg > 0)
    ? (features.weight_kg / Math.pow(features.height_cm / 100, 2)).toFixed(1)
    : '28.6';

  const handleChange = (field, value) => {
    setFeatures(prev => ({ ...prev, [field]: value }));
  };

  const toggleSymptom = (key) => {
    setFeatures(prev => ({ ...prev, [key]: prev[key] === 1 ? 0 : 1 }));
  };

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        patient_name: user?.name || user?.fullName || 'Maya Shah',
        patient_email: user?.email || 'maya.shah@example.com',
        features: {
          ...features,
          age: Number(features.age),
          height_cm: Number(features.height_cm),
          weight_kg: Number(features.weight_kg),
          systolic_bp: Number(features.systolic_bp),
          diastolic_bp: Number(features.diastolic_bp),
          glucose_mg_dl: Number(features.glucose_mg_dl),
          cholesterol_mg_dl: Number(features.cholesterol_mg_dl),
          resting_heart_rate: Number(features.resting_heart_rate),
          smoking: Number(features.smoking),
          family_history_diabetes: Number(features.family_history_diabetes),
          family_history_heart_disease: Number(features.family_history_heart_disease),
        }
      };

      const res = await fetch('/api/predictions/predict/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Prediction failed (HTTP ${res.status})`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handlePredict();
  }, []);

  return (
    <PageIntro
      eyebrow="Clinical AI Engine"
      title="Cardiometabolic Risk Predictor"
      lede="Trained machine learning models evaluating real-time multi-disease risk profiles, clinical biomarker anomalies, and automated interventions."
    >
      <div className="prediction-container">
        <div className="prediction-grid">
          {/* Left Column: Form */}
          <div className="prediction-form-card">
            <div className="form-section-title">
              <Pulse size={17} /> Patient Vitals & Demographics
            </div>
            
            <div className="form-row-3">
              <div className="form-field">
                <label>Age (years)</label>
                <input
                  type="number"
                  value={features.age}
                  onChange={e => handleChange('age', e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>Sex</label>
                <select
                  value={features.sex}
                  onChange={e => handleChange('sex', e.target.value)}
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-field">
                <label>Activity Level</label>
                <select
                  value={features.physical_activity}
                  onChange={e => handleChange('physical_activity', e.target.value)}
                >
                  <option value="Low">Low (Sedentary)</option>
                  <option value="Moderate">Moderate</option>
                  <option value="High">High (Active)</option>
                </select>
              </div>
            </div>

            <div className="form-row-3">
              <div className="form-field">
                <label>Height (cm)</label>
                <input
                  type="number"
                  value={features.height_cm}
                  onChange={e => handleChange('height_cm', e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>Weight (kg)</label>
                <input
                  type="number"
                  value={features.weight_kg}
                  onChange={e => handleChange('weight_kg', e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>Calculated BMI</label>
                <input
                  type="text"
                  disabled
                  value={`${computedBmi} kg/m²`}
                  style={{ background: '#f0f4f1', fontWeight: 600, color: 'var(--teal-dark)' }}
                />
              </div>
            </div>

            <div className="form-section-title">
              <Heartbeat size={17} /> Clinical Biomarkers
            </div>

            <div className="form-row-2">
              <div className="form-field">
                <label>Systolic BP (mmHg)</label>
                <input
                  type="number"
                  value={features.systolic_bp}
                  onChange={e => handleChange('systolic_bp', e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>Diastolic BP (mmHg)</label>
                <input
                  type="number"
                  value={features.diastolic_bp}
                  onChange={e => handleChange('diastolic_bp', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row-3">
              <div className="form-field">
                <label>Fasting Glucose (mg/dL)</label>
                <input
                  type="number"
                  value={features.glucose_mg_dl}
                  onChange={e => handleChange('glucose_mg_dl', e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>Total Cholesterol (mg/dL)</label>
                <input
                  type="number"
                  value={features.cholesterol_mg_dl}
                  onChange={e => handleChange('cholesterol_mg_dl', e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>Resting HR (bpm)</label>
                <input
                  type="number"
                  value={features.resting_heart_rate}
                  onChange={e => handleChange('resting_heart_rate', e.target.value)}
                />
              </div>
            </div>

            <div className="form-section-title">
              <ClipboardText size={17} /> Medical History & Habits
            </div>

            <div className="form-row-3">
              <div className="form-field">
                <label>Tobacco Smoking</label>
                <select
                  value={features.smoking}
                  onChange={e => handleChange('smoking', Number(e.target.value))}
                >
                  <option value={0}>Non-smoker</option>
                  <option value={1}>Active smoker</option>
                </select>
              </div>
              <div className="form-field">
                <label>Family Diabetes</label>
                <select
                  value={features.family_history_diabetes}
                  onChange={e => handleChange('family_history_diabetes', Number(e.target.value))}
                >
                  <option value={0}>No history</option>
                  <option value={1}>Yes (Parents/Siblings)</option>
                </select>
              </div>
              <div className="form-field">
                <label>Family Heart Disease</label>
                <select
                  value={features.family_history_heart_disease}
                  onChange={e => handleChange('family_history_heart_disease', Number(e.target.value))}
                >
                  <option value={0}>No history</option>
                  <option value={1}>Yes (Early CAD)</option>
                </select>
              </div>
            </div>

            <div className="form-section-title">
              <Stethoscope size={17} /> Presenting Symptoms (Click to toggle)
            </div>

            <div className="symptoms-chip-grid">
              {[
                { key: 'fatigue', label: 'Fatigue' },
                { key: 'shortness_of_breath', label: 'Shortness of breath' },
                { key: 'chest_pain', label: 'Chest pain' },
                { key: 'frequent_urination', label: 'Frequent urination' },
                { key: 'excessive_thirst', label: 'Excessive thirst' },
                { key: 'dizziness', label: 'Dizziness' },
                { key: 'palpitations', label: 'Palpitations' },
                { key: 'blurred_vision', label: 'Blurred vision' }
              ].map(s => (
                <div
                  key={s.key}
                  className={`symptom-chip ${features[s.key] === 1 ? 'active' : ''}`}
                  onClick={() => toggleSymptom(s.key)}
                >
                  {features[s.key] === 1 ? '✓ ' : '+ '} {s.label}
                </div>
              ))}
            </div>

            <button
              className="primary-button full-width"
              style={{ padding: '13px', fontSize: 13 }}
              onClick={handlePredict}
              disabled={loading}
            >
              {loading ? 'Evaluating AI Pipelines...' : 'Run Clinical Risk Assessment'} <ArrowRight size={17} weight="bold" />
            </button>
          </div>

          {/* Right Column: AI Risk Report */}
          <div>
            {error && (
              <div style={{ color: '#b9381e', background: '#fbeee9', padding: 16, borderRadius: 12, marginBottom: 16 }}>
                <strong>Assessment Error:</strong> {error}
              </div>
            )}

            {result && (
              <>
                <div className="results-score-banner">
                  <div>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85 }}>
                      Composite Cardiometabolic Score
                    </span>
                    <div className="score-display">
                      <span className="score-number">{result.overall_health_score}</span>
                      <span className="score-denom">/ 100</span>
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: 12, opacity: 0.9, maxWidth: 360 }}>
                      {result.summary}
                    </p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.15)', padding: 12, borderRadius: 12, textAlign: 'center' }}>
                    <ShieldCheck size={32} />
                    <div style={{ fontSize: 10, marginTop: 4, fontWeight: 700 }}>ML CERTIFIED</div>
                  </div>
                </div>

                {/* 3 Model Cards */}
                {Object.entries(result.predictions).map(([key, item]) => {
                  const diseaseNames = {
                    diabetes_risk: 'Type 2 Diabetes Risk',
                    heart_disease_risk: 'Cardiovascular Disease Risk',
                    hypertension_risk: 'Essential Hypertension Risk'
                  };

                  const riskClass = item.risk_level.toLowerCase();
                  const pct = (item.probability * 100).toFixed(1);
                  const threshPct = (item.threshold * 100).toFixed(1);

                  return (
                    <div className="disease-card" key={key}>
                      <div className="disease-header">
                        <span className="disease-title">
                          <Heartbeat size={18} weight="bold" color="var(--teal)" />
                          {diseaseNames[key] || key}
                        </span>
                        <span className={`risk-badge ${riskClass}`}>
                          {item.risk_level} RISK
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
                        <span>Predicted Probability: <strong style={{ color: 'var(--ink)' }}>{pct}%</strong></span>
                        <span>Clinical Alert Threshold: {threshPct}%</span>
                      </div>

                      <div className="progress-track">
                        <div
                          className={`progress-fill ${riskClass}`}
                          style={{ width: `${Math.min(item.probability * 100, 100)}%` }}
                        />
                      </div>

                      {item.top_factors && item.top_factors.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <strong style={{ fontSize: 11, color: 'var(--ink)' }}>Primary Contributing Factors:</strong>
                          <ul className="factors-list">
                            {item.top_factors.map((factor, i) => (
                              <li key={i}>{factor}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {item.recommendations && item.recommendations.length > 0 && (
                        <div className="recommendations-box">
                          <strong style={{ fontSize: 11, color: 'var(--teal-dark)' }}>Evidence-Based Recommendations:</strong>
                          <ul className="recommendations-list">
                            {item.recommendations.map((rec, i) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div style={{ padding: '12px 16px', background: '#eef3ef', borderRadius: 10, fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <ShieldCheck size={20} color="var(--teal)" />
                  <span>
                    Inferences generated by scikit-learn models & persisted to PostgreSQL table <code>prediction_db.ml_predictions</code>.
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </PageIntro>
  );
}

function AppointmentsPage({ setActivePage }) {
  return (
    <PageIntro eyebrow="Your schedule" title="Appointments" lede="Stay oriented with every visit, from the next check-in to the follow-up already on your radar.">
      <div className="page-actions">
        <button className="primary-button"><Plus size={18} weight="bold" /> Book an appointment</button>
        <button className="secondary-button"><CalendarBlank size={18} /> Add to calendar</button>
      </div>
      <section className="surface-card full-card">
        <div className="list-header">
          <div><p className="eyebrow">October 2024</p><h2>Upcoming visits</h2></div>
          <button className="filter-button">All appointments <CaretDown size={16} /></button>
        </div>
        <div className="appointment-list appointment-list-large">
          {appointments.map((item) => <AppointmentRow key={item.title} item={item} detailed />)}
        </div>
      </section>
      <div className="inline-callout">
        <ShieldCheck size={22} />
        <div>
          <strong>Need to change a visit?</strong>
          <span>Message your care team and we’ll help find a time that works.</span>
        </div>
        <button className="text-button" onClick={() => setActivePage('messages')}>Message team <ArrowRight size={16} /></button>
      </div>
    </PageIntro>
  );
}

function RecordsPage() {
  return (
    <PageIntro eyebrow="Your information" title="Health records" lede="One place for the notes, results, and plans that help you make sense of your care.">
      <div className="records-toolbar">
        <label className="search-field">
          <MagnifyingGlass size={18} />
          <input placeholder="Search your records" aria-label="Search your records" />
        </label>
        <button className="secondary-button"><CloudArrowUp size={18} /> Upload document</button>
      </div>
      <section className="surface-card full-card">
        <div className="list-header">
          <div><p className="eyebrow">All records</p><h2>Recently updated</h2></div>
          <button className="filter-button">All types <CaretDown size={16} /></button>
        </div>
        <div className="records-list">
          {records.map((record) => {
            const Icon = record.icon;
            return (
              <button className="record-row" key={record.title}>
                <div className="record-icon"><Icon size={21} /></div>
                <div className="record-copy"><strong>{record.title}</strong><span>{record.meta}</span></div>
                <span className="record-type">{record.type}</span>
                <ArrowRight size={18} className="row-arrow" />
              </button>
            );
          })}
        </div>
      </section>
    </PageIntro>
  );
}

function CareTeamPage({ setActivePage }) {
  const team = [
    { initials: 'AM', name: 'Dr. Amelia Morgan', role: 'Primary care physician', color: 'coral' },
    { initials: 'PN', name: 'Priya Nair, RD', role: 'Registered dietitian', color: 'teal' },
    { initials: 'JB', name: 'Jon Bell, PT', role: 'Physiotherapist', color: 'gold' }
  ];
  return (
    <PageIntro eyebrow="People around you" title="Care team" lede="The right people, connected around your goals and your everyday wellbeing.">
      <section className="team-grid">
        {team.map((person) => (
          <article className="team-card" key={person.name}>
            <div className={`team-avatar ${person.color}`}>{person.initials}</div>
            <div><h2>{person.name}</h2><p>{person.role}</p></div>
            <div className="team-card-footer">
              <span><MapPin size={15} /> Riverside Clinic</span>
              <button className="icon-button" aria-label={`Message ${person.name}`} onClick={() => setActivePage('messages')}>
                <ChatCircleDots size={19} />
              </button>
            </div>
          </article>
        ))}
      </section>
      <div className="inline-callout">
        <UsersThree size={22} />
        <div>
          <strong>Looking for a specialist?</strong>
          <span>We can help coordinate a referral with your primary care team.</span>
        </div>
        <button className="text-button" onClick={() => setActivePage('messages')}>Ask the team <ArrowRight size={16} /></button>
      </div>
    </PageIntro>
  );
}

function MessagesPage() {
  const [sent, setSent] = useState(false);
  return (
    <PageIntro eyebrow="Stay connected" title="Messages" lede="A direct line to the people helping you feel your best.">
      <div className="messages-layout">
        <section className="surface-card conversation-card">
          <div className="conversation-head">
            <div className="doctor-avatar">AN</div>
            <div><h2>Alex Nguyen, RN</h2><span>Care coordinator <i className="online-dot"></i> Usually replies within a day</span></div>
            <button className="icon-button" aria-label="Conversation details"><Gear size={19} /></button>
          </div>
          <div className="conversation-body">
            <div className="message-bubble received">
              <p>Hi Maya — your recent blood work is looking good. I’ve added a short note to your records so you can see what each result means.</p>
              <small>Yesterday · 4:18 PM</small>
            </div>
            <div className="message-bubble sent">
              <p>Thanks Alex, that’s helpful. I’ll read through it before my appointment.</p>
              <small>Yesterday · 4:25 PM</small>
            </div>
            {sent && <div className="message-bubble sent"><p>Could we also talk about keeping my sleep routine consistent?</p><small>Just now</small></div>}
          </div>
          <form className="composer" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
            <input placeholder="Write a message…" aria-label="Write a message" />
            <button className="primary-button" type="submit" aria-label="Send message"><PaperPlaneTilt size={18} weight="fill" /></button>
          </form>
        </section>
        <aside className="message-side">
          <div className="side-note">
            <ShieldCheck size={21} />
            <strong>Your conversations are private.</strong>
            <p>Messages are shared only with your care team through the secure Gateway session.</p>
          </div>
          <div className="side-note warm">
            <Clock size={21} />
            <strong>Response times</strong>
            <p>For urgent concerns, please call your clinic directly.</p>
          </div>
        </aside>
      </div>
    </PageIntro>
  );
}

function ProfilePage({ user }) {
  return (
    <PageIntro eyebrow="Your account" title="Profile & settings" lede="Keep your details current and choose how Smart Healthcare supports your routine.">
      <section className="surface-card profile-card">
        <div className="profile-identity">
          <div className="profile-avatar">{user?.initials || 'MS'}</div>
          <div>
            <h2>{user?.name || 'Maya Shah'}</h2>
            <p>{user?.email || 'maya.shah@example.com'}</p>
            <button className="text-button">Change photo <ArrowRight size={16} /></button>
          </div>
        </div>
        <div className="settings-list">
          <SettingRow icon={UserCircle} title="Personal details" description="Name, date of birth, and contact details" />
          <SettingRow icon={Bell} title="Notifications" description="Choose when we should reach out" toggle />
          <SettingRow icon={ShieldCheck} title="Privacy & security" description="Manage your secure Gateway session" />
          <SettingRow icon={Moon} title="Appearance" description="System default" toggle />
        </div>
      </section>
    </PageIntro>
  );
}

function SettingRow({ icon: Icon, title, description, toggle }) {
  return (
    <button className="setting-row">
      <div className="setting-icon"><Icon size={20} /></div>
      <span><strong>{title}</strong><small>{description}</small></span>
      {toggle ? <span className="toggle on"><i></i></span> : <ArrowRight size={18} className="row-arrow" />}
    </button>
  );
}

function PageIntro({ eyebrow, title, lede, children }) {
  return (
    <>
      <section className="page-intro">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="lede">{lede}</p>
      </section>
      {children}
    </>
  );
}

function CardHeading({ title, action, onClick }) {
  return (
    <div className="card-heading">
      <h2>{title}</h2>
      <button className="quiet-button" onClick={onClick}>{action} <ArrowRight size={15} /></button>
    </div>
  );
}

function AppointmentRow({ item, detailed }) {
  return (
    <div className={`appointment-row ${detailed ? 'detailed' : ''}`}>
      <div className={`date-block ${item.color}`}>
        <strong>{item.date.split(',')[0]}</strong>
        <span>{item.date.includes(',') ? item.date.split(',')[1] : '18 Oct'}</span>
      </div>
      <div className="appointment-copy">
        <strong>{item.title}</strong>
        <span>{item.clinician} · {item.kind}</span>
      </div>
      <div className="time-block"><Clock size={15} />{item.time}</div>
      <button className="icon-button row-more" aria-label={`View ${item.title}`}><ArrowRight size={17} /></button>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, unit, trend, tone }) {
  return (
    <div className={`metric-card ${tone}`}>
      <div className="metric-top">
        <div className="metric-icon"><Icon size={20} weight="bold" /></div>
        <span>{label}</span>
      </div>
      <div className="metric-value">{value}<small>{unit}</small></div>
      <div className="metric-trend"><Check size={14} weight="bold" /> {trend}</div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="state-screen">
      <div className="state-brand">
        <div className="brand-mark"><Heartbeat size={19} weight="bold" /></div> smart<span>.</span>health
      </div>
      <div className="loading-panel">
        <div className="skeleton-line short"></div>
        <div className="skeleton-line long"></div>
        <div className="skeleton-block"></div>
        <p>Connecting to your secure care workspace…</p>
      </div>
    </div>
  );
}

/**
 * AccessScreen — Interactive Testing Console for Auth Service & Gateway BFF
 */
function AccessScreen({ onDemo, onSessionReload }) {
  const [activeTab, setActiveTab] = useState('signin');
  const [authHealth, setAuthHealth] = useState('checking');
  const [gatewayHealth, setGatewayHealth] = useState('checking');

  // Registration state
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regResult, setRegResult] = useState(null);
  const [regError, setRegError] = useState(null);

  // Verification state
  const [verifyToken, setVerifyToken] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyError, setVerifyError] = useState(null);

  // Discovery / JWKS state
  const [discoveryData, setDiscoveryData] = useState(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);

  // Check health of Auth Service (:8081) and Gateway (:8080)
  useEffect(() => {
    fetch('/auth-health')
      .then(r => r.ok ? setAuthHealth('online') : setAuthHealth('offline'))
      .catch(() => setAuthHealth('offline'));

    fetch('/actuator/health')
      .then(r => r.ok ? setGatewayHealth('online') : setGatewayHealth('offline'))
      .catch(() => setGatewayHealth('offline'));
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError(null);
    setRegResult(null);

    try {
      const res = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, password: regPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}: Registration failed`);

      setRegResult(data);
    } catch (err) {
      setRegError(err.message);
    } finally {
      setRegLoading(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyError(null);
    setVerifyResult(null);

    try {
      const res = await fetch(`/auth/verify-email?token=${encodeURIComponent(verifyToken.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}: Verification failed`);
      setVerifyResult(data);
    } catch (err) {
      setVerifyError(err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleLoadDiscovery = async (endpoint) => {
    setDiscoveryLoading(true);
    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      setDiscoveryData({ endpoint, data });
    } catch (err) {
      setDiscoveryData({ endpoint, error: err.message });
    } finally {
      setDiscoveryLoading(false);
    }
  };

  return (
    <div className="state-screen">
      <div className="state-brand">
        <div className="brand-mark"><Heartbeat size={19} weight="bold" /></div> smart<span>.</span>health
      </div>

      <div className="access-panel access-panel-wide">
        <div className="access-header-row">
          <div>
            <p className="eyebrow">Smart Healthcare OAuth2 / BFF Platform</p>
            <h1 style={{ marginBottom: 4 }}>Care Workspace & Auth Test Hub</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="service-status-pill">
              <span className={`status-dot ${authHealth === 'online' ? '' : 'offline'}`}></span>
              Auth :8081
            </span>
            <span className="service-status-pill">
              <span className={`status-dot ${gatewayHealth === 'online' ? '' : 'offline'}`}></span>
              Gateway :8080
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="auth-tabs">
          <button
            className={`auth-tab-btn ${activeTab === 'signin' ? 'active' : ''}`}
            onClick={() => setActiveTab('signin')}
          >
            <Lock size={16} /> Sign In & SSO
          </button>
          <button
            className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            <Plus size={16} /> Register Patient
          </button>
          <button
            className={`auth-tab-btn ${activeTab === 'verify' ? 'active' : ''}`}
            onClick={() => setActiveTab('verify')}
          >
            <Check size={16} /> Verify Email
          </button>
          <button
            className={`auth-tab-btn ${activeTab === 'discovery' ? 'active' : ''}`}
            onClick={() => setActiveTab('discovery')}
          >
            <Code size={16} /> OAuth2 Discovery
          </button>
        </div>

        {/* Tab 1: Sign In & OAuth2 */}
        {activeTab === 'signin' && (
          <div className="auth-test-card">
            <p style={{ margin: '0 0 16px', color: 'var(--muted)', fontSize: 13, lineHeight: 1.5 }}>
              Choose your authentication route. The <strong>Gateway BFF</strong> flow exchanges an authorization code for HttpOnly session cookies, keeping access tokens protected from JavaScript.
            </p>

            <div className="auth-action-grid">
              <div className="action-box">
                <h3>Gateway BFF Login (Recommended)</h3>
                <p>Redirects to Gateway OAuth2 client (`healthapp`), invoking Spring Authorization Server with PKCE.</p>
                <button
                  className="primary-button"
                  onClick={() => {
                    window.location.href = 'http://localhost:8080/oauth2/authorization/healthapp';
                  }}
                >
                  Sign in via Gateway BFF <ArrowRight size={16} />
                </button>
              </div>

              <div className="action-box">
                <h3>Direct Auth Server Login</h3>
                <p>Opens the auth-service Thymeleaf login page (`/login`) with Email, Password, Google, and GitHub login.</p>
                <button
                  className="secondary-button"
                  onClick={() => {
                    window.location.href = 'http://localhost:8081/login';
                  }}
                >
                  Direct Login Page <ArrowRight size={16} />
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="text-button" onClick={onSessionReload}>
                Check Active Session (`/api/me`) <ArrowRight size={14} />
              </button>
              <button className="text-button demo-link" style={{ margin: 0 }} onClick={onDemo}>
                Explore demo workspace without signing in <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Register New Patient */}
        {activeTab === 'register' && (
          <div className="auth-test-card">
            <p style={{ margin: '0 0 14px', color: 'var(--muted)', fontSize: 13 }}>
              Create a new patient account (`POST /auth/register`). This runs the registration saga: creates a `PENDING` user, generates an email verification token, and inserts a `user.registered` event into the transactional outbox.
            </p>

            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-row">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="patient@example.com"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
              </div>

              <div className="form-row">
                <label>Password (min 8 chars)</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                />
              </div>

              <button className="primary-button" type="submit" disabled={regLoading}>
                {regLoading ? 'Registering user…' : 'Register Patient'} <ArrowRight size={16} />
              </button>
            </form>

            {regError && (
              <div style={{ padding: 12, background: '#fbeee9', color: '#b9381e', borderRadius: 8, fontSize: 13 }}>
                {regError}
              </div>
            )}

            {regResult && (
              <div style={{ marginTop: 12 }}>
                <span className="badge-tag" style={{ background: '#dbefe8', color: '#195e55', marginBottom: 8 }}>
                  ✓ Registration Succeeded (User Created)
                </span>
                <pre className="code-output">{JSON.stringify(regResult, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Verify Email */}
        {activeTab === 'verify' && (
          <div className="auth-test-card">
            <p style={{ margin: '0 0 14px', color: 'var(--muted)', fontSize: 13 }}>
              Verify an email address (`GET /auth/verify-email?token=...`). Once verified, the user account transitions to `ACTIVE`, enabling OAuth2 / Form authentication.
            </p>

            <form onSubmit={handleVerifyEmail} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-row">
                <label>Email Verification Token (Raw Token)</label>
                <input
                  type="text"
                  placeholder="Paste verification token here…"
                  required
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                />
              </div>

              <button className="primary-button" type="submit" disabled={verifyLoading}>
                {verifyLoading ? 'Verifying token…' : 'Verify Email'} <ArrowRight size={16} />
              </button>
            </form>

            {verifyError && (
              <div style={{ padding: 12, background: '#fbeee9', color: '#b9381e', borderRadius: 8, fontSize: 13 }}>
                {verifyError}
              </div>
            )}

            {verifyResult && (
              <div style={{ marginTop: 12 }}>
                <span className="badge-tag" style={{ background: '#dbefe8', color: '#195e55', marginBottom: 8 }}>
                  ✓ Email Verified! Account is now ACTIVE
                </span>
                <pre className="code-output">{JSON.stringify(verifyResult, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: OAuth2 Discovery */}
        {activeTab === 'discovery' && (
          <div className="auth-test-card">
            <p style={{ margin: '0 0 14px', color: 'var(--muted)', fontSize: 13 }}>
              Live verification of the Spring Authorization Server OIDC Discovery and JWKS public keys endpoints.
            </p>

            <div className="btn-group">
              <button
                className="secondary-button"
                onClick={() => handleLoadDiscovery('/.well-known/openid-configuration')}
              >
                /.well-known/openid-configuration
              </button>
              <button
                className="secondary-button"
                onClick={() => handleLoadDiscovery('/oauth2/jwks')}
              >
                /oauth2/jwks (Public Keys)
              </button>
              <button
                className="secondary-button"
                onClick={() => handleLoadDiscovery('/dev/tokens')}
              >
                /dev/tokens (Gateway BFF)
              </button>
            </div>

            {discoveryLoading && (
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '14px 0 0' }}>Querying authorization server…</p>
            )}

            {discoveryData && (
              <div style={{ marginTop: 12 }}>
                <strong style={{ fontSize: 12, color: 'var(--ink)' }}>Response from {discoveryData.endpoint}:</strong>
                <pre className="code-output">{JSON.stringify(discoveryData.data || discoveryData.error, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorScreen({ message, onRetry, onDemo }) {
  return (
    <div className="state-screen">
      <div className="state-brand">
        <div className="brand-mark"><Heartbeat size={19} weight="bold" /></div> smart<span>.</span>health
      </div>
      <div className="access-panel">
        <div className="state-icon error"><WarningCircle size={30} /></div>
        <p className="eyebrow">Connection paused</p>
        <h1>We couldn’t connect.</h1>
        <p>{message || 'The care gateway is taking a moment. Your workspace is safe, and we can try again.'}</p>
        <button className="primary-button full-width" onClick={onRetry}>Try again <ArrowRight size={18} /></button>
        <button className="text-button demo-link" onClick={onDemo}>Continue with demo data <ArrowRight size={16} /></button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
