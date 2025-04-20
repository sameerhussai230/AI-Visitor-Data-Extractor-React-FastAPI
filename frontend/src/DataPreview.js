// frontend/src/DataPreview.js
import React from 'react';

function DataPreview({ type, data }) {
  if (!type || data === undefined) {
    return null; // Don't render if no data or type
  }

  const renderValue = (value) => {
    if (value === null || value === undefined) {
      return <i>null</i>;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return <i>empty list</i>;
      return (
        <ul>
          {value.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );
    }
    return String(value);
  };

  return (
    <div className="data-preview">
      <h4>Preview: {type === 'business_card' ? 'Business Card' : 'Visitor Register'}</h4>
      {type === 'business_card' && data && (
        <table>
          <tbody>
            <tr><th>Name</th><td>{renderValue(data.name)}</td></tr>
            <tr><th>Title</th><td>{renderValue(data.title)}</td></tr>
            <tr><th>Phone</th><td>{renderValue(data.phone)}</td></tr>
            <tr><th>Email</th><td>{renderValue(data.email)}</td></tr>
            <tr><th>Website</th><td>{renderValue(data.website)}</td></tr>
            <tr><th>Address</th><td>{renderValue(data.address)}</td></tr>
          </tbody>
        </table>
      )}

      {type === 'visitor_register' && Array.isArray(data) && data.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Visitor Name</th>
              <th>Address</th>
              <th>Time In</th>
              <th>Time Out</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry, index) => (
              <tr key={index}>
                <td>{renderValue(entry.date)}</td>
                <td>{renderValue(entry.visitor_name)}</td>
                <td>{renderValue(entry.address)}</td>
                <td>{renderValue(entry.time_in)}</td>
                <td>{renderValue(entry.time_out)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
       {type === 'visitor_register' && Array.isArray(data) && data.length === 0 && (
           <p><i>No visitor entries found in the register.</i></p>
       )}
       {type === 'unknown' && (
           <p><i>The document type could not be determined or is not supported.</i></p>
       )}
    </div>
  );
}

export default DataPreview;