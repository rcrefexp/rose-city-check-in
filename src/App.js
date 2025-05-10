import { useState, useEffect } from 'react';
import { Users, UserCheck, Home, ChevronDown, ChevronUp } from 'lucide-react';
import Papa from 'papaparse';

export default function App() {
  // Core state
  const [participants, setParticipants] = useState([]);
  const [staff, setStaff] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [expandedParticipants, setExpandedParticipants] = useState(false);
  const [expandedStaff, setExpandedStaff] = useState(false);
  
  // Use an app-specific unique ID for syncing across devices
  const APP_ID = 'RoseCityCheckin_2025';
  const STORAGE_KEY = `${APP_ID}_data_v1`;
  const SESSION_ID = Date.now().toString();
  
  // Helper for timestamp formatting
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Load data from CSV files or remote storage
  useEffect(() => {
    const loadData = async () => {
      try {
        await checkServerData();
        
        // Set up periodic syncing
        const syncInterval = setInterval(checkServerData, 5000);
        return () => clearInterval(syncInterval);
      } catch (error) {
        console.error("Error in data sync loop:", error);
      }
    };

    loadData();
  }, []);
  
  // Function to check cloud storage and get latest data using IndexedDB for cross-device sync
  const checkServerData = async () => {
    try {
      // Try to fetch data from remote storage
      try {
        const response = await fetch(`https://jsonbin.org/rosecity/${APP_ID}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const cloudData = await response.json();
          
          // Only update if the data is newer than what we have
          if (!lastSync || cloudData.timestamp > lastSync) {
            setParticipants(cloudData.participants);
            setStaff(cloudData.staff);
            setLastSync(cloudData.timestamp);
            setIsLoaded(true);
            return;
          }
        }
      } catch (networkError) {
        console.log("Network fetch failed, falling back to local data", networkError);
      }
      
      // If no cloud data or first load, try local data or CSV
      if (!isLoaded) {
        // Try localStorage as backup
        const savedParticipants = localStorage.getItem(`${APP_ID}_participants`);
        const savedStaff = localStorage.getItem(`${APP_ID}_staff`);
        
        if (savedParticipants && savedStaff) {
          setParticipants(JSON.parse(savedParticipants));
          setStaff(JSON.parse(savedStaff));
        } else {
          // Load from CSV files if no saved data
          const participantsFile = await window.fs.readFile('data/2025 Rose City Officiating Experience .csv - Camper Details (1).csv', { encoding: 'utf8' });
          const staffFile = await window.fs.readFile('data/2025 Rose City Officiating Experience .csv - Staff Details.csv', { encoding: 'utf8' });

          const parsedParticipants = parseCSV(participantsFile).map(p => ({
            ...p,
            checkedIn: false
          }));

          const parsedStaff = parseCSV(staffFile).map(s => ({
            ...s,
            checkedIn: false
          }));

          setParticipants(parsedParticipants);
          setStaff(parsedStaff);
        }
        
        setIsLoaded(true);
        
        // Push initial data to cloud
        syncToCloud(participants, staff);
      }
    } catch (error) {
      console.error("Error checking server data:", error);
    }
  };

  // Parse CSV data
  const parseCSV = (csvContent) => {
    return Papa.parse(csvContent, { header: true }).data;
  };
  
  // Function to sync data to cloud storage and local storage
  const syncToCloud = async (participantsData, staffData) => {
    try {
      const timestamp = Date.now();
      const dataToSync = {
        participants: participantsData,
        staff: staffData,
        timestamp,
        sessionId: SESSION_ID
      };
      
      // Save to localStorage as fallback
      localStorage.setItem(`${APP_ID}_participants`, JSON.stringify(participantsData));
      localStorage.setItem(`${APP_ID}_staff`, JSON.stringify(staffData));
      
      // Try to sync to remote storage for cross-device access
      try {
        const response = await fetch(`https://jsonbin.org/rosecity/${APP_ID}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dataToSync)
        });
        
        if (response.ok) {
          setLastSync(timestamp);
          return true;
        }
      } catch (networkError) {
        console.log("Network sync failed, data saved locally", networkError);
      }
      
      // Update lastSync even if remote sync fails
      setLastSync(timestamp);
      return true;
    } catch (error) {
      console.error("Error syncing data:", error);
      return false;
    }
  };

  // Save and sync participants/staff data
  useEffect(() => {
    if (isLoaded && (participants.length > 0 || staff.length > 0)) {
      syncToCloud(participants, staff);
    }
  }, [participants, staff, isLoaded]);

  // Status toggle function
  const toggleStatus = (type, index) => {
    if (type === 'participant') {
      const updated = [...participants];
      updated[index].checkedIn = !updated[index].checkedIn;
      setParticipants(updated);
    } else {
      const updated = [...staff];
      updated[index].checkedIn = !updated[index].checkedIn;
      setStaff(updated);
    }
  };

  // Calculate metrics for dashboard
  const metrics = {
    totalParticipants: participants.length,
    checkedInParticipants: participants.filter(p => p.checkedIn).length,
    totalStaff: staff.length,
    checkedInStaff: staff.filter(s => s.checkedIn).length,
    notCheckedInParticipants: participants.filter(p => !p.checkedIn),
    notCheckedInStaff: staff.filter(s => !s.checkedIn)
  };
  
  // Filter based on search query
  const filteredParticipants = participants.filter(p => 
    p.Name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredStaff = staff.filter(s => 
    s.Name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dashboard component
  const Dashboard = () => (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Real-Time Check-In Status</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Participants Status Card */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Participants</h3>
            <Users className="text-gray-500" />
          </div>
          
          <div className="flex justify-between mb-2">
            <span>Total:</span>
            <span className="font-medium">{metrics.totalParticipants}</span>
          </div>
          
          <div className="flex justify-between mb-4">
            <span>Checked In:</span>
            <span className="font-medium">{metrics.checkedInParticipants}</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-red-600 h-2.5 rounded-full" 
              style={{ 
                width: `${metrics.totalParticipants > 0 ? (metrics.checkedInParticipants / metrics.totalParticipants * 100) : 0}%`,
                backgroundColor: '#c53a49'
              }}
            ></div>
          </div>
        </div>
        
        {/* Staff Status Card */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Staff</h3>
            <UserCheck className="text-gray-500" />
          </div>
          
          <div className="flex justify-between mb-2">
            <span>Total:</span>
            <span className="font-medium">{metrics.totalStaff}</span>
          </div>
          
          <div className="flex justify-between mb-4">
            <span>Checked In:</span>
            <span className="font-medium">{metrics.checkedInStaff}</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="h-2.5 rounded-full" 
              style={{ 
                width: `${metrics.totalStaff > 0 ? (metrics.checkedInStaff / metrics.totalStaff * 100) : 0}%`,
                backgroundColor: '#c53a49'
              }}
            ></div>
          </div>
        </div>
        
        {/* Missing Participants Dropdown Section */}
        <div className="bg-white rounded-lg shadow p-4">
          <button 
            onClick={() => setExpandedParticipants(!expandedParticipants)}
            className="w-full flex justify-between items-center text-lg font-semibold mb-4"
          >
            <span>Missing Participants ({metrics.notCheckedInParticipants.length})</span>
            {expandedParticipants ? 
              <ChevronUp className="text-gray-500" /> : 
              <ChevronDown className="text-gray-500" />
            }
          </button>
          
          {expandedParticipants && (
            <div className="mt-2">
              {metrics.notCheckedInParticipants.length > 0 ? (
                <ul className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
                  {metrics.notCheckedInParticipants.map((person, idx) => (
                    <li key={idx} className="py-2">
                      <div className="flex justify-between items-center">
                        <span>{person.Name}</span>
                        <button
                          onClick={() => {
                            const personIndex = participants.findIndex(p => p.Name === person.Name);
                            if (personIndex !== -1) toggleStatus('participant', personIndex);
                          }}
                          className="px-3 py-1 text-xs rounded text-white bg-red-600 hover:bg-red-700"
                          style={{ backgroundColor: '#c53a49' }}
                        >
                          Check In
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center py-4 text-gray-500">All checked in! 🎉</p>
              )}
            </div>
          )}
          
          {!expandedParticipants && metrics.notCheckedInParticipants.length > 0 && (
            <p className="text-center py-2 text-gray-500">
              Click to view {metrics.notCheckedInParticipants.length} missing participants
            </p>
          )}
        </div>
        
        {/* Missing Staff Dropdown Section */}
        <div className="bg-white rounded-lg shadow p-4">
          <button 
            onClick={() => setExpandedStaff(!expandedStaff)}
            className="w-full flex justify-between items-center text-lg font-semibold mb-4"
          >
            <span>Missing Staff ({metrics.notCheckedInStaff.length})</span>
            {expandedStaff ? 
              <ChevronUp className="text-gray-500" /> : 
              <ChevronDown className="text-gray-500" />
            }
          </button>
          
          {expandedStaff && (
            <div className="mt-2">
              {metrics.notCheckedInStaff.length > 0 ? (
                <ul className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
                  {metrics.notCheckedInStaff.map((person, idx) => (
                    <li key={idx} className="py-2">
                      <div className="flex justify-between items-center">
                        <span>{person.Name}</span>
                        <button
                          onClick={() => {
                            const personIndex = staff.findIndex(p => p.Name === person.Name);
                            if (personIndex !== -1) toggleStatus('staff', personIndex);
                          }}
                          className="px-3 py-1 text-xs rounded text-white bg-red-600 hover:bg-red-700"
                          style={{ backgroundColor: '#c53a49' }}
                        >
                          Check In
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center py-4 text-gray-500">All checked in! 🎉</p>
              )}
            </div>
          )}
          
          {!expandedStaff && metrics.notCheckedInStaff.length > 0 && (
            <p className="text-center py-2 text-gray-500">
              Click to view {metrics.notCheckedInStaff.length} missing staff
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // List Component for both participants and staff
  const PersonList = ({ type }) => {
    const isParticipants = type === 'participants';
    const data = isParticipants ? filteredParticipants : filteredStaff;
    
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-6">
          {isParticipants ? 'Participant' : 'Staff'} Check-In
        </h2>
        
        <div className="mb-4">
          <input
            type="text"
            placeholder={`Search ${isParticipants ? 'participant' : 'staff'} by name...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 mb-4 border border-gray-300 rounded"
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Name</th>
                {isParticipants && (
                  <th className="text-left py-3 px-4 font-medium text-gray-600">T-Shirt Size</th>
                )}
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((person, index) => (
                <tr key={index} className={person.checkedIn ? "bg-green-50" : ""}>
                  <td className="py-3 px-4">{person.Name}</td>
                  
                  {isParticipants && (
                    <td className="py-3 px-4">{person["T-Shirt Size"]}</td>
                  )}
                  
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${person.checkedIn ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                      {person.checkedIn ? "Checked In" : "Not Checked In"}
                    </span>
                  </td>
                  
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleStatus(
                        isParticipants ? 'participant' : 'staff', 
                        index
                      )}
                      className={`px-3 py-1 text-xs rounded text-white ${person.checkedIn ? "bg-gray-500" : "bg-red-600"}`}
                      style={{ backgroundColor: person.checkedIn ? "#838787" : "#c53a49" }}
                    >
                      {person.checkedIn ? "Undo" : "Check In"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Sync Status Indicator
  const SyncStatus = () => {
    return (
      <div className="flex items-center">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
        <span className="text-sm text-gray-600">
          Synced {lastSync ? formatTime(lastSync) : "..."}
        </span>
      </div>
    );
  };
  
  // Main app rendering
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm" style={{ borderBottom: '3px solid #c53a49' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#c53a49' }}>
              Rose City Officiating Experience
            </h1>
            <p className="text-gray-600">Check-In System</p>
          </div>
          <SyncStatus />
        </div>
      </header>
      
      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {['dashboard', 'participants', 'staff'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                style={{ 
                  borderColor: activeTab === tab ? '#c53a49' : 'transparent',
                  color: activeTab === tab ? '#c53a49' : undefined
                }}
              >
                {tab === 'dashboard' && <Home className="mr-2 w-4 h-4" />}
                {tab === 'participants' && <Users className="mr-2 w-4 h-4" />}
                {tab === 'staff' && <UserCheck className="mr-2 w-4 h-4" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'participants' && <PersonList type="participants" />}
          {activeTab === 'staff' && <PersonList type="staff" />}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white py-4 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to reset all check-in data? This cannot be undone.")) {
                  localStorage.removeItem(`${APP_ID}_participants`);
                  localStorage.removeItem(`${APP_ID}_staff`);
                  
                  // Also clear remote data
                  fetch(`https://jsonbin.org/rosecity/${APP_ID}`, {
                    method: 'DELETE'
                  }).catch(err => console.log("Error clearing remote data", err));
                  
                  window.location.reload();
                }
              }}
              className="text-sm text-red-600 hover:text-red-800"
              style={{ color: '#c53a49' }}
            >
              Reset All Data
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
