import { Routes, Route, Link } from 'react-router-dom';
import { DemoFlow } from './pages/DemoFlow';
import { SessionDetails } from './pages/SessionDetails';

export function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <nav style={{ marginBottom: 24, display: 'flex', gap: 16 }}>
        <Link to="/">Demo flow</Link>
        <Link to="/session">My session</Link>
      </nav>
      <Routes>
        <Route path="/" element={<DemoFlow />} />
        <Route path="/session" element={<SessionDetails />} />
      </Routes>
    </div>
  );
}
