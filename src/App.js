import { useState, useEffect } from 'react';
import { Users, UserCheck, Home } from 'lucide-react';
import Papa from 'papaparse';

export default function App() {
  // Core state
  const [participants, setParticipants] = useState([]);
  const [staff, setStaff] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  
  // Firebase-like storage key for sync
  const STORAGE_KEY = 'roseCityData_v1';
  const SESSION_ID = Date.now().toString();
  
  // Helper for timestamp formatting
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Load data from CSV files or localStorage
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
  
  // Function to check cloud storage and get latest data
  const checkServerData = async () => {
    try {
      // First try to load from cloud storage
      const cloudData = localStorage.getItem(STORAGE_KEY);
      
      if (cloudData) {
        const parsedData = JSON.parse(cloudData);
        
        // Only update if the data is newer than what we have
        if (!lastSync || parsedData.timestamp > lastSync) {
          setParticipants(parsedData.participants);
          setStaff(parsedData.staff);
          setLastSync(parsedData.timestamp);
          setIsLoaded(true);
          return;
        }
      }
      
      // If no cloud data or first load, try local data or CSV
      if (!isLoaded) {
        const savedParticipants = localStorage.getItem('roseCity_participants');
        const savedStaff = localStorage.getItem('roseCity_staff');
        
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
  
  // Function to sync data to cloud storage
  const syncToCloud = (participantsData, staffData) => {
    try {
      const timestamp = Date.now();
      const dataToSync = {
        participants: participantsData,
        staff: staffData,
        timestamp,
        sessionId: SESSION_ID
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSync));
      setLastSync(timestamp);
      
      return true;
    } catch (error) {
      console.error("Error syncing to cloud:", error);
      return false;
    }
  };

  // Save and sync participants/staff data
  useEffect(() => {
    if (isLoaded && (participants.length > 0 || staff.length > 0)) {
      // Save to local storage
      localStorage.setItem('roseCity_participants', JSON.stringify(participants));
      localStorage.setItem('roseCity_staff', JSON.stringify(staff));
      
      // Sync to cloud storage
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
        
        {/* Missing Participants Section */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">Missing Participants</h3>
          
          {metrics.notCheckedInParticipants.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {metrics.notCheckedInParticipants.slice(0, 5).map((person, idx) => (
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
              {metrics.notCheckedInParticipants.length > 5 && (
                <li className="py-2 text-center text-gray-500">
                  +{metrics.notCheckedInParticipants.length - 5} more...
                </li>
              )}
            </ul>
          ) : (
            <p className="text-center py-4 text-gray-500">All checked in! 🎉</p>
          )}
        </div>
        
        {/* Missing Staff Section */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">Missing Staff</h3>
          
          {metrics.notCheckedInStaff.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {metrics.notCheckedInStaff.slice(0, 5).map((person, idx) => (
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
              {metrics.notCheckedInStaff.length > 5 && (
                <li className="py-2 text-center text-gray-500">
                  +{metrics.notCheckedInStaff.length - 5} more...
                </li>
              )}
            </ul>
          ) : (
            <p className="text-center py-4 text-gray-500">All checked in! 🎉</p>
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
                  localStorage.removeItem('roseCity_participants');
                  localStorage.removeItem('roseCity_staff');
                  localStorage.removeItem(STORAGE_KEY);
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
