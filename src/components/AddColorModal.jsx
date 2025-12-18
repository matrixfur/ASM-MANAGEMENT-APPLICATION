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

            // Create preview and compress
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Resize to max 150px (thumbnail size)
                    // This ensures the base64 string stays under Google Sheets 50k char limit
                    const MAX_SIZE = 150;
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Compress to JPEG 0.7 quality
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

                    // Check size limit (approx 37KB safety margin for 50k chars)
                    if (dataUrl.length > 45000) {
                        alert('Image is too complex. Please choose a simpler image.');
                        return;
                    }

                    setImagePreview(dataUrl);
                    setImageFile(file); // Keep just in case, though unused in submit
                };
                img.src = event.target.result;
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
                            onChange={(e) => setColorName(e.target.value.toUpperCase())}
                            placeholder="e.g., WALNUT BROWN"
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
