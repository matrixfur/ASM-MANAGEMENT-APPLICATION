import React, { useState } from 'react';
import './AddColorModal.css';

const AddColorModal = ({ isOpen, onClose, onAdd }) => {
    const [colorName, setColorName] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }

            // Validate file size (max 500KB)
            if (file.size > 500000) {
                alert('Image size should be less than 500KB');
                return;
            }

            setImageFile(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (colorName.trim()) {
            onAdd(colorName.trim(), imagePreview);
            setColorName('');
            setImageFile(null);
            setImagePreview(null);
            onClose();
        }
    };

    const handleClose = () => {
        setColorName('');
        setImageFile(null);
        setImagePreview(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Add New Color</h3>
                    <button className="close-btn" onClick={handleClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="colorName">Color Name</label>
                        <input
                            type="text"
                            id="colorName"
                            value={colorName}
                            onChange={(e) => setColorName(e.target.value)}
                            placeholder="e.g., Walnut Brown, Oak White"
                            autoFocus
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="colorImage">Color Reference Image (optional)</label>
                        <input
                            type="file"
                            id="colorImage"
                            accept="image/*"
                            onChange={handleImageChange}
                        />
                        {imagePreview && (
                            <div className="image-preview">
                                <img src={imagePreview} alt="Preview" />
                            </div>
                        )}
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={handleClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            Add Color
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddColorModal;
