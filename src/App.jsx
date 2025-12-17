import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginForm from './components/LoginForm'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import Employees from './pages/Employees'
import './index.css'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LoginForm />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/employees" element={<Employees />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
