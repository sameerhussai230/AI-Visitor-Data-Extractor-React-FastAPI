// frontend/src/VisualizeTab.js
import React, { useState, useEffect, useMemo, useCallback } from 'react'; // Added useCallback
import axios from 'axios';
import DatePicker from 'react-datepicker';
import { format, parseISO, startOfDay, endOfDay, isValid } from 'date-fns'; // Date utilities
// Removed unused Line import, kept Bar
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement, // Still needed as a dependency for Bar/Line elements potentially
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale, // Import TimeScale for date axes
} from 'chart.js';
import 'chartjs-adapter-date-fns'; // Import the date adapter
import 'react-datepicker/dist/react-datepicker.css'; // Styles for date picker

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale // Register TimeScale
);

// --- Configuration ---
const BACKEND_URL = 'http://127.0.0.1:8000';

function VisualizeTab() {
  const [businessCards, setBusinessCards] = useState([]);
  const [visitorLogs, setVisitorLogs] = useState([]);
  const [filteredCards, setFilteredCards] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(null); // Date object or null
  const [endDate, setEndDate] = useState(null);     // Date object or null

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []); // Empty dependency array means run once on mount

  // --- Filtering Logic ---
  // Wrap applyFilters in useCallback because it's in useEffect dependency array
  const applyFilters = useCallback(() => {
    console.log("Applying filters with dates:", startDate, endDate);
    const start = startDate ? startOfDay(startDate) : null;
    const end = endDate ? endOfDay(endDate) : null;

    const filterData = (data) => {
        if (!start && !end) return data; // No filters applied

        return data.filter(item => {
            if (!item.created_at) return false; // Skip items without a creation date
            try {
                const itemDate = parseISO(item.created_at); // Dates from backend are ISO strings
                if (!isValid(itemDate)) return false; // Skip invalid dates

                const itemDayStart = startOfDay(itemDate);
                const isAfterStart = start ? itemDayStart >= start : true;
                const isBeforeEnd = end ? itemDayStart <= end : true;
                return isAfterStart && isBeforeEnd;
            } catch (e) {
                console.error("Error parsing date:", item.created_at, e);
                return false; // Skip if date parsing fails
            }
        });
    };

    setFilteredCards(filterData(businessCards));
    setFilteredLogs(filterData(visitorLogs));
  }, [startDate, endDate, businessCards, visitorLogs]); // Dependencies for useCallback

  // Apply filtering whenever dates or source data change
   useEffect(() => {
    applyFilters();
  }, [applyFilters]); // Now depends on the memoized applyFilters


  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      console.log('Fetching data for visualization...');
      const [cardsResponse, logsResponse] = await Promise.all([
        axios.get(`${BACKEND_URL}/get_business_cards/`),
        axios.get(`${BACKEND_URL}/get_visitor_logs/`)
      ]);
      console.log('Business Cards:', cardsResponse.data.length);
      console.log('Visitor Logs:', logsResponse.data.length);
      setBusinessCards(cardsResponse.data || []);
      setVisitorLogs(logsResponse.data || []);
      // Note: Filtering will be triggered by the state update via the useEffect above
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(`Failed to fetch data: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Chart Data Preparation ---
  const chartData = useMemo(() => {
    const cardCounts = {};
    const logCounts = {};

    // Aggregate counts by date (YYYY-MM-DD)
    const aggregateCounts = (data, counts) => {
        data.forEach(item => {
            if (item.created_at) {
                try {
                    const dateStr = format(parseISO(item.created_at), 'yyyy-MM-dd');
                    counts[dateStr] = (counts[dateStr] || 0) + 1;
                } catch (e) {
                    console.error("Error processing date for chart:", item.created_at, e);
                }
            }
        });
    };

    aggregateCounts(filteredCards, cardCounts);
    aggregateCounts(filteredLogs, logCounts);

    // Combine dates and sort
    const allDates = [...new Set([...Object.keys(cardCounts), ...Object.keys(logCounts)])].sort();

    return {
      labels: allDates,
      datasets: [
        {
          label: 'Business Cards Added',
          data: allDates.map(date => cardCounts[date] || 0),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.6)', // Slightly less transparent for bars
          // tension: 0.1, // Not needed for Bar
          type: 'bar', // Make this one a bar
          yAxisID: 'y',
          order: 2 // Render bars behind line
        },
        {
          label: 'Visitor Logs Added',
          data: allDates.map(date => logCounts[date] || 0),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          tension: 0.2, // Smoother line
          type: 'line', // Make this one a line
          yAxisID: 'y',
          order: 1 // Render line on top
        }
      ]
    };
  }, [filteredCards, filteredLogs]); // Recalculate when filtered data changes

  // Chart Options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Allow chart to resize height
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Entries Added Over Time' },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: {
        type: 'time', // Use time scale for dates
        time: {
          unit: 'day', // Display unit
          tooltipFormat: 'PP', // Format for tooltip (e.g., Jan 1, 2023) - shorter
          displayFormats: {
             day: 'MMM d' // Format for axis labels
          }
        },
        title: { display: true, text: 'Date' },
        ticks: {
            autoSkip: true,
            maxTicksLimit: 15 // Limit number of date labels shown
        }
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Number of Entries' }
      }
    },
    interaction: { // For combined chart hover effects
        mode: 'index',
        intersect: false,
    },
  };


  // Helper to render list fields nicely in tables
  const renderListField = (jsonString) => {
      if (!jsonString) return <i>null</i>;
      try {
          // Check if it's already an object/array (might happen if backend changes)
          if (typeof jsonString !== 'string') {
              if (Array.isArray(jsonString)) {
                  if (jsonString.length === 0) return <i>empty list</i>;
                  return jsonString.map((item, index) => <span key={index} className="json-list">{item}</span>);
              }
              // Handle other non-string types if necessary, or return default
              return <i>invalid format</i>;
          }

          // Proceed with parsing if it's a string
          const list = JSON.parse(jsonString);
          if (Array.isArray(list) && list.length > 0) {
              return list.map((item, index) => <span key={index} className="json-list">{item}</span>);
          } else if (Array.isArray(list) && list.length === 0) {
              return <i>empty list</i>;
          }
      } catch (e) { /* Ignore parsing error, show raw */ }
      return jsonString; // Show raw string if not a valid list JSON
  };


  return (
    <div className="visualize-tab-container">
      <h2>Data Visualization & Records</h2>

      {/* --- Filters --- */}
      <div className="filters-container">
        <label htmlFor="startDate">Start Date:</label>
        <DatePicker
          selected={startDate}
          onChange={(date) => setStartDate(date)}
          selectsStart
          startDate={startDate}
          endDate={endDate}
          isClearable
          placeholderText="From..."
          dateFormat="yyyy-MM-dd"
          id="startDate"
        />
        <label htmlFor="endDate">End Date:</label>
        <DatePicker
          selected={endDate}
          onChange={(date) => setEndDate(date)}
          selectsEnd
          startDate={startDate}
          endDate={endDate}
          minDate={startDate}
          isClearable
          placeholderText="To..."
          dateFormat="yyyy-MM-dd"
          id="endDate"
        />
         <button onClick={fetchData} disabled={isLoading} className='filter-button' style={{marginLeft: 'auto'}}>
            {isLoading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {isLoading && <div className="loading">Loading data...</div>}
      {error && <div className="error">{error}</div>}

      {/* --- Charts --- */}
       {!isLoading && !error && (filteredCards.length > 0 || filteredLogs.length > 0) && (
        <div className="data-display-section">
            <h3>Charts</h3>
            <div className="charts-container">
                <div className="chart-wrapper" style={{ height: '400px' }}>
                    {/* Using Bar chart type directly */}
                    <Bar options={chartOptions} data={chartData} />
                </div>
                {/* Add more charts here if needed */}
            </div>
        </div>
       )}
        {!isLoading && !error && !(filteredCards.length > 0 || filteredLogs.length > 0) && (
            <p>No data available for the selected period to display charts.</p>
        )}


      {/* --- Data Tables --- */}
      {!isLoading && !error && (
        <>
          <div className="data-display-section">
            <h3>Business Card Records ({filteredCards.length})</h3>
            {filteredCards.length > 0 ? (
              <div className="data-table-container">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Title</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Website</th>
                      <th>Address</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCards.map(card => (
                      <tr key={card.id}>
                        <td>{card.id}</td>
                        <td>{card.name || <i>null</i>}</td>
                        <td>{card.title || <i>null</i>}</td>
                        {/* Render decoded lists */}
                        <td>{renderListField(card.phone)}</td>
                        <td>{renderListField(card.email)}</td>
                        <td>{renderListField(card.website)}</td>
                        <td>{card.address || <i>null</i>}</td>
                        <td>{card.created_at ? format(parseISO(card.created_at), 'PPp') : <i>null</i>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No business card records found{startDate || endDate ? ' matching the selected date range.' : '.'}</p>
            )}
          </div>

          <div className="data-display-section">
            <h3>Visitor Log Entries ({filteredLogs.length})</h3>
             {filteredLogs.length > 0 ? (
              <div className="data-table-container">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Batch ID</th>
                      <th>Date Str</th>
                      <th>Visitor Name</th>
                      <th>Address</th>
                      <th>Time In</th>
                      <th>Time Out</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map(log => (
                      <tr key={log.id}>
                        <td>{log.id}</td>
                        <td>{log.batch_id}</td>
                        <td>{log.date_str || <i>null</i>}</td>
                        <td>{log.visitor_name || <i>null</i>}</td>
                        <td>{log.address || <i>null</i>}</td>
                        <td>{log.time_in || <i>null</i>}</td>
                        <td>{log.time_out || <i>null</i>}</td>
                        <td>{log.created_at ? format(parseISO(log.created_at), 'PPp') : <i>null</i>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
             ) : (
                <p>No visitor log entries found{startDate || endDate ? ' matching the selected date range.' : '.'}</p>
             )}
          </div>
        </>
      )}
    </div>
  );
}

export default VisualizeTab;