import React, { useState, useEffect } from 'react';
import AddColorModal from '../components/AddColorModal';
import Navbar from '../components/Navbar';
import * as sheetApi from '../services/sheetApi';
import './Assets.css';

const Assets = () => {
    const [activeTab, setActiveTab] = useState('add');
    const [colors, setColors] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [inventory, setInventory] = useState([]);

    // Add Stock Form
    const [addForm, setAddForm] = useState({
        color: '',
        quantity: '',
        notes: ''
    });

    // Use Stock Form
    const [useForm, setUseForm] = useState({
        color: '',
        quantity: ''
    });

    // Load colors and inventory on mount
    useEffect(() => {
        loadColors();
        loadInventory();
    }, []);

    const loadColors = async () => {
        try {
            const fetchedColors = await sheetApi.getColors();
            if (fetchedColors.length > 0) {
                setColors(fetchedColors);
            } else {
                // Initialize default colors and save them to Google Sheets
                const defaultColors = [
                    { name: 'Walnut Brown', image: null },
                    { name: 'Oak White', image: null },
                    { name: 'Teak', image: null }
                ];

                // Save each default color to Google Sheets
                for (const color of defaultColors) {
                    try {
                        await sheetApi.addColor(color.name, color.image);
                    } catch (error) {
                        console.error(`Error saving default color ${color.name}:`, error);
                    }
                }

                setColors(defaultColors);
            }
        } catch (error) {
            console.error('Error loading colors:', error);
            // Set defaults locally even if sheet access fails
            setColors([
                { name: 'Walnut Brown', image: null },
                { name: 'Oak White', image: null },
                { name: 'Teak', image: null }
            ]);
        }
    };

    const loadInventory = async () => {
        try {
            const fetchedInventory = await sheetApi.getInventory();
            setInventory(fetchedInventory);
        } catch (error) {
            console.error('Error loading inventory:', error);
        }
    };

    const handleAddColor = async (colorName, imageData) => {
        const colorExists = colors.some(c => c.name === colorName);
        if (!colorExists) {
            try {
                await sheetApi.addColor(colorName, imageData);
                setColors([...colors, { name: colorName, image: imageData }]);
            } catch (error) {
                console.error('Error adding color:', error);
                alert('Failed to add color. Please try again.');
            }
        }
    };

    const handleAddStock = async (e) => {
        e.preventDefault();

        try {
            await sheetApi.addStock(addForm);
            await loadInventory();
            setAddForm({ color: '', quantity: '', notes: '' });
            alert('Stock added successfully!');
        } catch (error) {
            console.error('Error adding stock:', error);
            alert('Failed to add stock. Please try again.');
        }
    };

    const handleUseStock = async (e) => {
        e.preventDefault();

        try {
            await sheetApi.useStock(useForm);
            await loadInventory();
            setUseForm({ color: '', quantity: '' });
            alert('Stock usage recorded successfully!');
        } catch (error) {
            console.error('Error recording usage:', error);
            alert('Failed to record usage. Please try again.');
        }
    };

    return (
        <div className="assets-container">
            <Navbar />
            <header className="assets-header">
                <h1>Assets Management</h1>
                <p>Manage plywood stock inventory</p>
            </header>

            <div className="assets-tabs">
                <button
                    className={`tab ${activeTab === 'add' ? 'active' : ''}`}
                    onClick={() => setActiveTab('add')}
                >
                    Add Stock
                </button>
                <button
                    className={`tab ${activeTab === 'use' ? 'active' : ''}`}
                    onClick={() => setActiveTab('use')}
                >
                    Stock Used
                </button>
                <button
                    className={`tab ${activeTab === 'view' ? 'active' : ''}`}
                    onClick={() => setActiveTab('view')}
                >
                    Available Stock
                </button>
            </div>

            <div className={`assets-content ${activeTab === 'view' ? 'full-width' : ''}`}>
                {activeTab === 'add' && (
                    <div className="tab-panel">
                        <form onSubmit={handleAddStock} className="stock-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Color</label>
                                    <select
                                        value={addForm.color}
                                        onChange={(e) => {
                                            if (e.target.value === '__add_new__') {
                                                setIsModalOpen(true);
                                            } else {
                                                setAddForm({ ...addForm, color: e.target.value });
                                            }
                                        }}
                                        required
                                    >
                                        <option value="">Select Color</option>
                                        {colors.map(color => (
                                            <option key={color.name} value={color.name}>{color.name}</option>
                                        ))}
                                        <option value="__add_new__">+ Add New Color</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Quantity (sheets)</label>
                                    <input
                                        type="number"
                                        value={addForm.quantity}
                                        onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                                        min="1"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Notes (optional)</label>
                                <textarea
                                    value={addForm.notes}
                                    onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                                    rows="3"
                                    placeholder="Additional notes..."
                                />
                            </div>
                            <button type="submit" className="submit-btn">Add Stock</button>
                        </form>
                    </div>
                )}

                {activeTab === 'use' && (
                    <div className="tab-panel">
                        <form onSubmit={handleUseStock} className="stock-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Color</label>
                                    <select
                                        value={useForm.color}
                                        onChange={(e) => setUseForm({ ...useForm, color: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Color</option>
                                        {colors.map(color => (
                                            <option key={color.name} value={color.name}>{color.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Quantity Used (sheets)</label>
                                    <input
                                        type="number"
                                        value={useForm.quantity}
                                        onChange={(e) => setUseForm({ ...useForm, quantity: e.target.value })}
                                        min="1"
                                        required
                                    />
                                </div>
                            </div>
                            <button type="submit" className="submit-btn">Record Usage</button>
                        </form>
                    </div>
                )}

                {activeTab === 'view' && (
                    <div className="tab-panel">
                        <div className="total-stats">
                            <h2>Total Available Sheets: {inventory.reduce((sum, item) => sum + (parseInt(item.available) || 0), 0)}</h2>
                        </div>
                        <div className="inventory-grid">
                            {inventory.length === 0 ? (
                                <p className="empty-state">No stock data available. Add stock to get started.</p>
                            ) : (
                                inventory.map(item => {
                                    const colorData = colors.find(c => c.name === item.color);
                                    return (
                                        <div key={item.color} className="inventory-card">
                                            {colorData?.image && (
                                                <div className="color-image">
                                                    <img src={colorData.image} alt={item.color} />
                                                </div>
                                            )}
                                            <h3>{item.color}</h3>
                                            <p className="stock-count">{item.available} sheets</p>
                                            <span className={`status ${item.available < 10 ? 'low' : 'good'}`}>
                                                {item.available < 10 ? 'Low Stock' : 'In Stock'}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            <AddColorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddColor}
            />
        </div>
    );
};

export default Assets;
