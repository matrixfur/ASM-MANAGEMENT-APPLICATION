import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './Dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const user = "a.ansarhussain2004@gmail.com"; // In a real app, this would come from Context/Auth

    const handleLogout = () => {
        // Implement logout logic here (clear tokens, etc.)
        navigate('/');
    };

    return (
        <div className="dashboard-container">
            <Navbar />

            <main className="dashboard-content">
                <div className="welcome-card">
                    <h2>Welcome to Dashboard</h2>
                    <p>You have successfully logged in.</p>
                </div>

                <div className="action-buttons">
                    <button className="action-btn" onClick={() => navigate('/assets')}>
                        <span className="btn-icon">📦</span>
                        <div>
                            <h3>Assets Management</h3>
                            <p>Manage plywood stock inventory</p>
                        </div>
                    </button>

                    <button className="action-btn" onClick={() => navigate('/employees')}>
                        <span className="btn-icon">👥</span>
                        <div>
                            <h3>Employees Management</h3>
                            <p>Manage staff, attendance and payroll</p>
                        </div>
                    </button>
                </div>


            </main>
        </div>
    );
};

export default Dashboard;
