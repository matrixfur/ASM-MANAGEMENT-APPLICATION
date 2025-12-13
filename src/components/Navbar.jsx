import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/logo.jpg';
import './Navbar.css';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        navigate('/');
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <div className="navbar-brand" onClick={() => navigate('/dashboard')}>
                    <img src={logo} alt="ASM Interiors" className="navbar-logo" />
                    <span className="navbar-title">ASM INTERIORS</span>
                </div>

                <div className="navbar-links">
                    <button
                        className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
                        onClick={() => navigate('/dashboard')}
                    >
                        Dashboard
                    </button>
                    <button
                        className={`nav-link ${location.pathname === '/assets' ? 'active' : ''}`}
                        onClick={() => navigate('/assets')}
                    >
                        Assets Management
                    </button>
                </div>

                <button className="logout-btn" onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
