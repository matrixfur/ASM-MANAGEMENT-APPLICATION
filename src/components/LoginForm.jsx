import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitLogin } from '../services/sheetApi';
import logo from '../assets/logo.jpg';
import './LoginForm.css';

const LoginForm = () => {
    const [formData, setFormData] = useState({ Username: '', Password: '' });
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        // Array of valid users - Add new users here
        const VALID_USERS = [
            { username: "a.ansarhussain2004@gmail.com", password: "93441226" },
            { username: "ajmal@gmail.com", password: "7092983982" },
            { username: "arshad@gmail.com", password: "7092983986" },

            // Add more users below:
            // { username: "user2@example.com", password: "Password123" },
            // { username: "user3@example.com", password: "SecurePass456" },
        ];

        // Check if credentials match any valid user
        const validUser = VALID_USERS.find(
            user => user.username === formData.Username && user.password === formData.Password
        );

        if (!validUser) {
            setStatus('error');
            setMessage('Invalid username or password');
            return;
        }

        try {
            await submitLogin(formData);
            setStatus('success');
            setMessage('Login successful! Redirecting...');
            setFormData({ Username: '', Password: '' });
            setTimeout(() => navigate('/dashboard'), 1500); // Redirect after small delay
        } catch (error) {
            console.error('Login Error:', error);
            setStatus('error');
            setMessage('Failed to submit. Check console/network.');
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="card-header">
                    <img src={logo} alt="ASM Interiors" className="company-logo" />
                    <h2>Welcome Back</h2>
                    <p>Please enter your details to sign in.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="Username">Username</label>
                        <input
                            type="text"
                            id="Username"
                            name="Username"
                            value={formData.Username}
                            onChange={handleChange}
                            placeholder="Enter your username"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="Password">Password</label>
                        <input
                            type="password"
                            id="Password"
                            name="Password"
                            value={formData.Password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <button type="submit" disabled={status === 'loading'}>
                        {status === 'loading' ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                {message && (
                    <div className={`message ${status}`}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoginForm;
