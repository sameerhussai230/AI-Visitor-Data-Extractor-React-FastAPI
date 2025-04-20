// frontend/src/UploadTab.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataPreview from './DataPreview'; // Ensure this component exists and is correct

// --- Configuration ---
const BACKEND_URL = 'http://127.0.0.1:8000';

function UploadTab() {
  // State Variables
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [extractedData, setExtractedData] = useState(null); // Stores { type, data } from backend
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showLanding, setShowLanding] = useState(true); // Start by showing the landing info

  // --- Effects ---

  // Clean up object URL for image preview
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // Auto-hide success popup
  useEffect(() => {
    let timer;
    if (showSuccessPopup) {
      timer = setTimeout(() => {
        setShowSuccessPopup(false);
        setSuccessMessage('');
      }, 3000); // Hide after 3 seconds
    }
    return () => clearTimeout(timer);
  }, [showSuccessPopup]);

  // --- Handlers ---

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);

    // Reset states for new upload
    setExtractedData(null);
    setError('');
    setSuccessMessage('');
    setShowSuccessPopup(false);
    setShowLanding(!file); // Hide landing only if a file is actually selected

    // Manage image preview URL
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl); // Clean up previous
    }
    if (file) {
      setImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setImagePreviewUrl(null);
    }
  };

  const handleExtract = async () => {
    if (!selectedFile) {
      setError('Please select an image file first.');
      return;
    }
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    setShowSuccessPopup(false);
    setExtractedData(null); // Clear previous results before new extraction

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      console.log('Sending request to /extract_validate/ ...');
      const response = await axios.post(`${BACKEND_URL}/extract_validate/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('Received response from /extract_validate/:', response.data);
      setExtractedData(response.data); // Set data for validation step
    } catch (err) {
      handleApiError(err, 'Extraction failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!extractedData || !extractedData.type || extractedData.type === 'unknown') {
      setError('No valid data available to save.');
      return;
    }
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    setShowSuccessPopup(false);

    try {
      console.log('Sending request to /store_data/ with payload:', extractedData);
      const response = await axios.post(`${BACKEND_URL}/store_data/`, extractedData, {
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('Received response from /store_data/:', response.data);

      // Determine table name for success message
      let tableName = '';
      if (extractedData.type === 'business_card') tableName = 'business_visting_cards';
      else if (extractedData.type === 'visitor_register') tableName = 'visitor_log_book';

      const message = `Data successfully saved to '${tableName}' table. ${response.data.message || ''}`;
      setSuccessMessage(message.trim());
      setShowSuccessPopup(true); // Show the success popup
      resetState(false); // Reset form but keep success message state temporarily

    } catch (err) {
      handleApiError(err, 'Save failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    resetState(true); // Reset form fully, including messages, show landing
  };

  // --- Helper Functions ---

  const resetState = (clearMessages = true) => {
     setExtractedData(null);
     setSelectedFile(null);
     if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
     }
     setImagePreviewUrl(null);
     if (clearMessages) {
        setError('');
        setSuccessMessage('');
        setShowSuccessPopup(false);
     }
     // Clear the file input visually if it exists
     const fileInput = document.getElementById('fileInput');
     if(fileInput) {
        fileInput.value = null;
     }
     setShowLanding(true); // Go back to landing view
  }

  const handleApiError = (err, prefix) => {
      let message = '';
      if (err.response) {
        message = `${prefix}: ${err.response.data?.detail || err.response.statusText || `Server responded with status ${err.response.status}`}`;
      } else if (err.request) {
        message = `${prefix}: No response from server. Check connection and backend URL (${BACKEND_URL}).`;
      } else {
        message = `${prefix}: ${err.message}`;
      }
      setError(message);
      console.error(message, err); // Log detailed error
  }

  // --- Render Logic ---
  return (
    <div className="upload-tab-container">
      {/* Success Popup Overlay */}
      {showSuccessPopup && (
        <div className="success-popup-overlay">
            <div className="success-popup-content">
                <h3>Success!</h3>
                <p>{successMessage}</p>
                <button onClick={() => setShowSuccessPopup(false)}>Close</button>
            </div>
        </div>
      )}

      {/* Landing Page Section - Show initially or after reset */}
      {showLanding && (
          <div className="landing-section">
              {/* Re-using the title from App.js header for consistency */}
              {/* <h1 className="landing-title">Visitor Data Management</h1> */}
              <h2>Welcome!</h2>
              <p className="landing-description">
                  Streamline your visitor and contact management. Upload images of visitor registers or business cards,
                  and let our AI-powered backend (FastAPI & Groq) extract the data automatically.
                  The React frontend allows easy upload, validation, and storage into a structured database,
                  simplifying record-keeping and data retrieval.
              </p>
              <div className="landing-features">
                  <div className="feature-item">
                      <span className="feature-icon">📄</span> {/* Placeholder Icon */}
                      <h4>AI Extraction</h4>
                      <p>Leverages advanced AI to accurately pull information from images.</p>
                  </div>
                  <div className="feature-item">
                      <span className="feature-icon">✅</span> {/* Placeholder Icon */}
                      <h4>User Validation</h4>
                      <p>Review extracted data side-by-side with the image before saving.</p>
                  </div>
                  <div className="feature-item">
                      <span className="feature-icon">💾</span> {/* Placeholder Icon */}
                      <h4>Database Storage</h4>
                      <p>Securely stores structured data in an easily accessible database.</p>
                  </div>
              </div>
               {/* Add the upload input here as well for convenience */}
               <div className="upload-section" style={{border: 'none', background: 'transparent', padding: '20px 0 0 0', marginTop: '20px'}}>
                    <label htmlFor="fileInput" style={{fontSize: '1.2em'}}>Get Started: Upload an Image</label>
                    <input
                        type="file"
                        id="fileInput"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleFileChange}
                        disabled={isLoading || showSuccessPopup}
                    />
                </div>
          </div>
      )}

      {/* Upload Section - Show only when file is selected but not extracted yet */}
      {selectedFile && !extractedData && !showLanding && (
          <div className="upload-section">
            <label htmlFor="fileInput">Selected Image:</label>
             {/* Show small preview */}
             {imagePreviewUrl && (
                <div style={{margin: '10px 0 20px 0'}}>
                    <img src={imagePreviewUrl} alt="Selected preview" style={{maxHeight: '150px', border: '1px solid #eee', borderRadius: '4px'}}/>
                </div>
             )}
            {/* Re-show input to allow changing file */}
             <input
                type="file"
                id="fileInput"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
                disabled={isLoading || showSuccessPopup}
                style={{ display: 'block', margin: '10px auto' }} // Adjust style as needed
            />
            <button onClick={handleExtract} disabled={isLoading || showSuccessPopup}>
              {isLoading ? 'Extracting...' : 'Extract Data from Image'}
            </button>
          </div>
      )}

      {/* Loading/Error Messages - Show when relevant, hide during success popup */}
      {isLoading && <div className="loading">Processing... Please wait.</div>}
      {error && !showSuccessPopup && <div className="error">{error}</div>}

      {/* --- Validation Section --- */}
      {extractedData && extractedData.type !== 'unknown' && !isLoading && !showSuccessPopup && (
        <div className="preview-section">
          <h2>Validation Step</h2>
          <p>Review the extracted data and image. Confirm to save or cancel.</p>
          <div className="validation-container">
            <div className="validation-image-column">
              {imagePreviewUrl && (
                <div className="image-preview-container-large">
                  <img src={imagePreviewUrl} alt="Uploaded Document Preview" className="preview-image-large"/>
                </div>
              )}
            </div>
            <div className="validation-data-column">
              <DataPreview type={extractedData.type} data={extractedData.data} />
            </div>
          </div>
           <div className="preview-actions">
               <button onClick={handleConfirmSave} disabled={isLoading}>
                   Confirm & Save
               </button>
               <button onClick={handleCancel} className="cancel-button" disabled={isLoading}>
                   Cancel
               </button>
           </div>
        </div>
      )}

      {/* --- Unknown Type Section --- */}
      {extractedData && extractedData.type === 'unknown' && !isLoading && !showSuccessPopup && (
          <div className="result-section">
              <h2>Extraction Result</h2>
               {imagePreviewUrl && (
                <div className="image-preview-container">
                  <img src={imagePreviewUrl} alt="Uploaded Document Preview" className="preview-image"/>
                </div>
               )}
               <DataPreview type={extractedData.type} data={extractedData.data} />
               <button onClick={handleCancel} className="cancel-button" disabled={isLoading}>
                   Clear
               </button>
          </div>
      )}
    </div>
  );
}

export default UploadTab;