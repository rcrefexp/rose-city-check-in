import { useState, useEffect } from 'react';
import { Clipboard, Users, UserCheck, Home, ArrowLeft, ArrowRight } from 'lucide-react';
import Papa from 'papaparse';

// Real-time sync functionality using BroadcastChannel API
// This allows communication between tabs/windows on the same device
const syncChannel = new BroadcastChannel('roseCitySync');

// Helper function to parse CSV data
const parseCSV = (csvContent) => {
  return Papa.parse(csvContent, { header: true }).data;
};

export default function App() {
  // Core state
  const [participants, setParticipants] = useState([]);
  const [staff, setStaff] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncId, setSyncId] = useState(`device-${Math.random().toString(36).substring(2, 9)}`);
  
  // Load data from CSV files or localStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        // Check localStorage first
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
            checkedIn: false,
            shirtProvided: false
          }));

          const parsedStaff = parseCSV(staffFile).map(s => ({
            ...s,
            checkedIn: false,
            shirtProvided: s['Shirt Needed'] === 'No'
          }));

          setParticipants(parsedParticipants);
          setStaff(parsedStaff);
          
          // Save to localStorage
          localStorage.setItem('roseCity_participants', JSON.stringify(parsedParticipants));
          localStorage.setItem('roseCity_staff', JSON.stringify(parsedStaff));
        }
        setIsLoaded(true);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
    
    // Set up real-time sync listener
    syncChannel.onmessage = (event) => {
      const { type, data, origin } = event.data;
      
      // Ignore messages from self
      if (origin === syncId) return;
      
      if (type === 'participants_update') {
        setParticipants(data);
        localStorage.setItem('roseCity_participants', JSON.stringify(data));
      } else if (type === 'staff_update') {
        setStaff(data);
        localStorage.setItem('roseCity_staff', JSON.stringify(data));
      }
    };
    
    return () => syncChannel.close();
  }, [syncId]);

  // Save and sync participants data
  useEffect(() => {
    if (isLoaded && participants.length > 0) {
      localStorage.setItem('roseCity_participants', JSON.stringify(participants));
      
      // Broadcast changes to other tabs/windows
      syncChannel.postMessage({
        type: 'participants_update',
        data: participants,
        origin: syncId
      });
    }
  }, [participants, isLoaded, syncId]);

  // Save and sync staff data
  useEffect(() => {
    if (isLoaded && staff.length > 0) {
      localStorage.setItem('roseCity_staff', JSON.stringify(staff));
      
      // Broadcast changes to other tabs/windows
      syncChannel.postMessage({
        type: 'staff_update',
        data: staff,
        origin: syncId
      });
    }
  }, [staff, isLoaded, syncId]);

  // Status toggle functions
  const toggleStatus = (type, index, field) => {
    if (type === 'participant') {
      const updated = [...participants];
      updated[index][field] = !updated[index][field];
      setParticipants(updated);
    } else {
      const updated = [...staff];
      updated[index][field] = !updated[index][field];
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
    notCheckedInStaff: staff.filter(s => !s.checkedIn),
    totalShirtsGiven: participants.filter(p => p.shirtProvided).length + 
                     staff.filter(s => s.shirtProvided && s['Shirt Needed'] === 'Yes').length,
    totalShirtsNeeded: participants.length + staff.filter(s => s['Shirt Needed'] === 'Yes').length
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
          
          <div className="mt-4">
            <button 
              onClick={() => setSelectedPerson({ 
                type: 'missing-participants',
                data: metrics.notCheckedInParticipants 
              })}
              className="text-sm text-gray-600 flex items-center hover:text-red-600"
            >
              {metrics.notCheckedInParticipants.length} missing
              <ArrowRight className="ml-1 w-4 h-4" />
            </button>
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
          
          <div className="mt-4">
            <button 
              onClick={() => setSelectedPerson({ 
                type: 'missing-staff',
                data: metrics.notCheckedInStaff 
              })}
              className="text-sm text-gray-600 flex items-center hover:text-red-600"
            >
              {metrics.notCheckedInStaff.length} missing
              <ArrowRight className="ml-1 w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* T-Shirt Distribution Card */}
        <div className="bg-white rounded-lg shadow p-4 md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">T-Shirt Distribution</h3>
            <Clipboard className="text-gray-500" />
          </div>
          
          <div className="flex justify-between mb-4">
            <span>Distributed:</span>
            <span className="font-medium">{metrics.totalShirtsGiven} / {metrics.totalShirtsNeeded}</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="h-2.5 rounded-full" 
              style={{ 
                width: `${metrics.totalShirtsNeeded > 0 ? (metrics.totalShirtsGiven / metrics.totalShirtsNeeded * 100) : 0}%`,
                backgroundColor: '#c53a49'
              }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Display missing persons if selected */}
      {selectedPerson && ['missing-participants', 'missing-staff'].includes(selectedPerson.type) && (
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {selectedPerson.type === 'missing-participants' ? 'Missing Participants' : 'Missing Staff'}
            </h3>
            <button 
              onClick={() => setSelectedPerson(null)}
              className="text-gray-600 hover:text-red-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
          
          {selectedPerson.data.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {selectedPerson.data.map((person, index) => (
                <li key={index} className="py-2">
                  <div className="flex justify-between items-center">
                    <span>{person.Name}</span>
                    <button
                      onClick={() => {
                        const listType = selectedPerson.type === 'missing-participants' ? 'participant' : 'staff';
                        const personIndex = listType === 'participant' 
                          ? participants.findIndex(p => p.Name === person.Name)
                          : staff.findIndex(s => s.Name === person.Name);
                          
                        if (personIndex !== -1) toggleStatus(listType, personIndex, 'checkedIn');
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
    </div>
  );

  // Person Detail Modal
  const PersonDetailModal = () => {
    if (!selectedPerson || !['participant', 'staff'].includes(selectedPerson.type)) return null;
    
    const person = selectedPerson.data;
    const isStaff = selectedPerson.type === 'staff';
    const personList = isStaff ? staff : participants;
    const personIndex = personList.findIndex(p => p.Name === person.Name);
    
    const handleStatusToggle = () => {
      if (personIndex !== -1) {
        toggleStatus(selectedPerson.type, personIndex, 'checkedIn');
        setSelectedPerson({
          ...selectedPerson,
          data: {
            ...selectedPerson.data,
            checkedIn: !selectedPerson.data.checkedIn
          }
        });
      }
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">{person.Name}</h3>
            <button 
              onClick={() => setSelectedPerson(null)}
              className="text-gray-600 hover:text-red-600"
            >
              &times;
            </button>
          </div>
          
          <div className="space-y-3">
            {isStaff ? (
              <>
                <div className="flex justify-between">
                  <span className="font-medium">Shirt Needed:</span>
                  <span>{person["Shirt Needed"]}</span>
                </div>
                {person["Shirt Needed"] === "Yes" && (
                  <>
                    <div className="flex justify-between">
                      <span className="font-medium">Shirt Size:</span>
                      <span>{person["Shirt Size"]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Shirt Type:</span>
                      <span>{person["Shirt Type"]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Shirt Status:</span>
                      <span className={person.shirtProvided ? "text-green-600" : "text-red-600"}>
                        {person.shirtProvided ? "Provided" : "Not Provided"}
                      </span>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="font-medium">T-Shirt Size:</span>
                  <span>{person["T-Shirt Size"]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Location:</span>
                  <span>{person["City/State"]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">T-Shirt:</span>
                  <span className={person.shirtProvided ? "text-green-600" : "text-red-600"}>
                    {person.shirtProvided ? "Provided" : "Not Provided"}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="font-medium">Status:</span>
              <span className={person.checkedIn ? "text-green-600" : "text-red-600"}>
                {person.checkedIn ? "Checked In" : "Not Checked In"}
              </span>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={handleStatusToggle}
              className="px-4 py-2 rounded text-white bg-red-600 hover:bg-red-700"
              style={{ backgroundColor: '#c53a49' }}
            >
              {person.checkedIn ? "Undo Check-In" : "Check In"}
            </button>
          </div>
        </div>
      </div>
    );
  };

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
                {isParticipants ? (
                  <th className="text-left py-3 px-4 font-medium text-gray-600">T-Shirt Size</th>
                ) : (
                  <>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Shirt Needed</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Shirt Size</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Shirt Type</th>
                  </>
                )}
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((person, index) => (
                <tr key={index} className={person.checkedIn ? "bg-green-50" : ""}>
                  <td className="py-3 px-4">
                    <button 
                      onClick={() => setSelectedPerson({ 
                        type: isParticipants ? 'participant' : 'staff', 
                        data: person 
                      })}
                      className="text-blue-600 hover:underline"
                    >
                      {person.Name}
                    </button>
                  </td>
                  
                  {isParticipants ? (
                    <td className="py-3 px-4">{person["T-Shirt Size"]}</td>
                  ) : (
                    <>
                      <td className="py-3 px-4">{person["Shirt Needed"]}</td>
                      <td className="py-3 px-4">{person["Shirt Size"] || "N/A"}</td>
                      <td className="py-3 px-4">{person["Shirt Type"] || "N/A"}</td>
                    </>
                  )}
                  
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${person.checkedIn ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                      {person.checkedIn ? "Checked In" : "Not Checked In"}
                    </span>
                  </td>
                  
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => toggleStatus(
                          isParticipants ? 'participant' : 'staff', 
                          index, 
                          'checkedIn'
                        )}
                        className={`px-3 py-1 text-xs rounded text-white ${person.checkedIn ? "bg-gray-500" : "bg-red-600"}`}
                        style={{ backgroundColor: person.checkedIn ? "#838787" : "#c53a49" }}
                      >
                        {person.checkedIn ? "Undo" : "Check In"}
                      </button>
                      
                      {(isParticipants || (!isParticipants && person["Shirt Needed"] === "Yes")) && (
                        <button
                          onClick={() => toggleStatus(
                            isParticipants ? 'participant' : 'staff', 
                            index, 
                            'shirtProvided'
                          )}
                          className={`px-3 py-1 text-xs rounded text-white ${person.shirtProvided ? "bg-gray-500" : "bg-red-600"}`}
                          style={{ backgroundColor: person.shirtProvided ? "#838787" : "#c53a49" }}
                          disabled={!person.checkedIn}
                        >
                          {person.shirtProvided ? "Undo Shirt" : "Give Shirt"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Online status indicator
  const SyncStatus = () => {
    const [onlineUsers, setOnlineUsers] = useState(1); // Default to 1 (self)
    
    useEffect(() => {
      // Set up ping for online status
      const pingInterval = setInterval(() => {
        syncChannel.postMessage({
          type: 'ping',
          origin: syncId,
          timestamp: Date.now()
        });
      }, 5000);
      
      // Listen for pings
      const activeSessions = new Map();
      const pingListener = (event) => {
        if (event.data.type === 'ping') {
          activeSessions.set(event.data.origin, event.data.timestamp);
          
          // Clean up old sessions (older than 15 seconds)
          const now = Date.now();
          for (const [id, timestamp] of activeSessions.entries()) {
            if (now - timestamp > 15000) {
              activeSessions.delete(id);
            }
          }
          
          setOnlineUsers(activeSessions.size + 1); // +1 for self
        }
      };
      
      syncChannel.addEventListener('message', pingListener);
      
      return () => {
        clearInterval(pingInterval);
        syncChannel.removeEventListener('message', pingListener);
      };
    }, [syncId]);
    
    return (
      <div className="flex items-center">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
        <span className="text-sm text-gray-600">{onlineUsers} device{onlineUsers !== 1 ? 's' : ''} online</span>
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
      
      {/* Person Detail Modal */}
      <PersonDetailModal />
      
      {/* Footer */}
      <footer className="bg-white py-4 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm mb-2 md:mb-0">
              &copy; {new Date().getFullYear()} Rose City Officiating Experience
            </p>
            <div>
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to reset all check-in data? This cannot be undone.")) {
                    localStorage.removeItem('roseCity_participants');
                    localStorage.removeItem('roseCity_staff');
                    window.location.reload();
                  }
                }}
                className="text-sm text-red-600 hover:text-red-800 mr-4"
                style={{ color: '#c53a49' }}
              >
                Reset All Data
              </button>
              <button
                onClick={() => {
                  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                  const dataExport = {
                    participants,
                    staff,
                    exportDate: new Date().toISOString(),
                    summary: {
                      totalParticipants: metrics.totalParticipants,
                      checkedInParticipants: metrics.checkedInParticipants,
                      totalStaff: metrics.totalStaff,
                      checkedInStaff: metrics.checkedInStaff,
                      totalShirtsGiven: metrics.totalShirtsGiven,
                      totalShirtsNeeded: metrics.totalShirtsNeeded
                    }
                  };
                  
                  const dataBlob = new Blob([JSON.stringify(dataExport, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `rose-city-check-in-data-${timestamp}.json`;
                  link.click();
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Export Data
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
