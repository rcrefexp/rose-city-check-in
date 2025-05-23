import { useState, useEffect } from 'react';
import { Users, UserCheck, ChevronDown, ChevronUp } from 'lucide-react';
import Papa from 'papaparse';
import { database } from './firebase'; // Import from firebase.js
import { ref, onValue, set } from 'firebase/database';

export default function App() {
  // Core state
  const [participants, setParticipants] = useState([]);
  const [staff, setStaff] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [expandedParticipants, setExpandedParticipants] = useState(false);
  const [expandedStaff, setExpandedStaff] = useState(false);
  const [expandedCheckedInParticipants, setExpandedCheckedInParticipants] = useState(false);
  const [expandedCheckedInStaff, setExpandedCheckedInStaff] = useState(false);
  
  // Helper for timestamp formatting
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Initialize Firebase connection
  useEffect(() => {
    try {
      // Load data from Firebase
      loadData(database);
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      // Fall back to local data if Firebase fails
      loadLocalData();
    }
  }, []);
  
  // Load data from Firebase or CSV
  const loadData = async (database) => {
    try {
      // Check if we have data in Firebase
      const dbRef = ref(database, 'roseCityData');
      
      // Set up listener for real-time updates
      onValue(dbRef, async (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
          console.log("Data received from Firebase:", data);
          setParticipants(data.participants || []);
          setStaff(data.staff || []);
          setLastSync(data.timestamp || Date.now());
          setIsLoaded(true);
        } else {
          // No data in Firebase, load from CSV
          console.log("No data in Firebase, loading from CSV");
          await loadFromCSV();
        }
      }, (error) => {
        console.error("Firebase data read failed:", error);
        loadLocalData();
      });
    } catch (error) {
      console.error("Error in data loading:", error);
      loadLocalData();
    }
  };
  
  // Load data from CSV files
  const loadFromCSV = async () => {
    try {
      const participantsFile = await fetch('/data/participants.csv').then(res => res.text());
      const staffFile = await fetch('/data/staff.csv').then(res => res.text());

      const parsedParticipants = parseCSV(participantsFile).map(p => ({
        ...p,
        checkedIn: false,
        shirtDistributed: false
      }));

      const parsedStaff = parseCSV(staffFile).map(s => ({
        ...s,
        checkedIn: false,
        shirtDistributed: false
      }));

      setParticipants(parsedParticipants);
      setStaff(parsedStaff);
      setIsLoaded(true);
      
      // Initial sync to Firebase
      syncToFirebase(parsedParticipants, parsedStaff);
      
      return {
        participants: parsedParticipants,
        staff: parsedStaff
      };
    } catch (error) {
      console.error("Error loading from CSV:", error);
      return { participants: [], staff: [] };
    }
  };
  
  // Fall back to local storage if Firebase fails
  const loadLocalData = async () => {
    try {
      // Try localStorage as backup
      const savedParticipants = localStorage.getItem('RoseCityCheckin_participants');
      const savedStaff = localStorage.getItem('RoseCityCheckin_staff');
      
      if (savedParticipants && savedStaff) {
        setParticipants(JSON.parse(savedParticipants));
        setStaff(JSON.parse(savedStaff));
        setIsLoaded(true);
      } else {
        // Load from CSV files if no saved data
        await loadFromCSV();
      }
    } catch (error) {
      console.error("Error loading local data:", error);
    }
  };

  // Parse CSV data
  const parseCSV = (csvContent) => {
    return Papa.parse(csvContent, { 
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true
    }).data;
  };
  
  // Function to sync data to Firebase
  const syncToFirebase = async (participantsData, staffData) => {
    if (!database) {
      console.error("Firebase database not initialized");
      // Fall back to local storage
      localStorage.setItem('RoseCityCheckin_participants', JSON.stringify(participantsData || participants));
      localStorage.setItem('RoseCityCheckin_staff', JSON.stringify(staffData || staff));
      return false;
    }
    
    try {
      const timestamp = Date.now();
      const dataToSync = {
        participants: participantsData || participants,
        staff: staffData || staff,
        timestamp
      };
      
      // Save to localStorage as fallback
      localStorage.setItem('RoseCityCheckin_participants', JSON.stringify(participantsData || participants));
      localStorage.setItem('RoseCityCheckin_staff', JSON.stringify(staffData || staff));
      
      // Sync to Firebase
      await set(ref(database, 'roseCityData'), dataToSync);
      setLastSync(timestamp);
      return true;
    } catch (error) {
      console.error("Error syncing data to Firebase:", error);
      return false;
    }
  };

  // Save and sync participants/staff data when they change
  useEffect(() => {
    if (isLoaded && database && (participants.length > 0 || staff.length > 0)) {
      syncToFirebase();
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
    notCheckedInStaff: staff.filter(s => !s.checkedIn),
    checkedInParticipantsList: participants.filter(p => p.checkedIn),
    checkedInStaffList: staff.filter(s => s.checkedIn)
  };
  
  // Filter based on search query
  const filteredParticipants = participants.filter(p => 
    p.Name && p.Name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredStaff = staff.filter(s => 
    s.Name && s.Name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Person List Item Component
  const PersonListItem = ({ person, type, index }) => {
    const isParticipant = type === 'participant';
    const personIndex = isParticipant 
      ? participants.findIndex(p => p.Name === person.Name)
      : staff.findIndex(s => s.Name === person.Name);
    
    return (
      <li className="py-2 border-b border-gray-200 last:border-b-0">
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <span className="font-medium">{person.Name}</span>
              
              {/* Show T-Shirt Size for participants */}
              {isParticipant && person["T-Shirt Size"] && (
                <span className="ml-2 text-sm text-gray-500">
                  <span className="mx-1">•</span>
                  <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full">
                    Size: {person["T-Shirt Size"]}
                  </span>
                </span>
              )}
              
              {/* Show shirt details for staff who need shirts */}
              {!isParticipant && person["Shirt Needed"] === "Yes" && (
                <span className="ml-2 text-sm text-gray-500">
                  <span className="mx-1">•</span>
                  <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full">
                    Size: {person["Shirt Size"]}  •  Type: {person["Shirt Type"]}
                  </span>
                </span>
              )}
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => toggleStatus(isParticipant ? 'participant' : 'staff', personIndex)}
                className={`px-3 py-1 text-xs rounded text-white ${
                  person.checkedIn ? "bg-gray-500 hover:bg-gray-600" : "bg-red-600 hover:bg-red-700"
                }`}
                style={{ 
                  backgroundColor: person.checkedIn ? "#838787" : "#c53a49"
                }}
              >
                {person.checkedIn ? "Undo" : "Check In"}
              </button>
            </div>
          </div>
        </div>
      </li>
    );
  };

  // Sync Status Indicator
  const SyncStatus = () => {
    return (
      <div className="flex items-center">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
        <span className="text-sm text-gray-600">
          {lastSync ? `Synced ${formatTime(lastSync)}` : "Connecting..."}
        </span>
      </div>
    );
  };
  
  // Main app rendering - now as a single unified dashboard
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
      
      {/* Main Content - Single Dashboard */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4">Real-Time Check-In Status</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div 
                    className="bg-red-600 h-2.5 rounded-full" 
                    style={{ 
                      width: `${metrics.totalParticipants > 0 ? (metrics.checkedInParticipants / metrics.totalParticipants * 100) : 0}%`,
                      backgroundColor: '#c53a49'
                    }}
                  ></div>
                </div>
                
                {/* Missing Participants collapsible section */}
                <div className="border-t border-gray-200 mt-4 pt-2">
                  <button 
                    onClick={() => setExpandedParticipants(!expandedParticipants)}
                    className="w-full flex justify-between items-center text-sm font-medium p-2 text-left"
                  >
                    <span>Missing Participants ({metrics.notCheckedInParticipants.length})</span>
                    {expandedParticipants ? 
                      <ChevronUp className="text-gray-500 h-4 w-4" /> : 
                      <ChevronDown className="text-gray-500 h-4 w-4" />
                    }
                  </button>
                  
                  {expandedParticipants && (
                    <div className="border-t border-gray-200 mt-1">
                      {metrics.notCheckedInParticipants.length > 0 ? (
                        <ul className="divide-y divide-gray-200 max-h-48 overflow-y-auto">
                          {metrics.notCheckedInParticipants
                            .filter(person => !searchQuery || (person.Name && person.Name.toLowerCase().includes(searchQuery.toLowerCase())))
                            .map((person, idx) => (
                              <PersonListItem 
                                key={idx} 
                                person={person} 
                                type="participant" 
                                index={idx}
                              />
                            ))}
                        </ul>
                      ) : (
                        <p className="text-center py-4 text-gray-500">All checked in! 🎉</p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Checked-In Participants collapsible section */}
                <div className="border-t border-gray-200 mt-2 pt-2">
                  <button 
                    onClick={() => setExpandedCheckedInParticipants(!expandedCheckedInParticipants)}
                    className="w-full flex justify-between items-center text-sm font-medium p-2 text-left"
                  >
                    <span>Checked-In Participants ({metrics.checkedInParticipantsList.length})</span>
                    {expandedCheckedInParticipants ? 
                      <ChevronUp className="text-gray-500 h-4 w-4" /> : 
                      <ChevronDown className="text-gray-500 h-4 w-4" />
                    }
                  </button>
                  
                  {expandedCheckedInParticipants && (
                    <div className="border-t border-gray-200 mt-1">
                      {metrics.checkedInParticipantsList.length > 0 ? (
                        <ul className="divide-y divide-gray-200 max-h-48 overflow-y-auto">
                          {metrics.checkedInParticipantsList
                            .filter(person => !searchQuery || (person.Name && person.Name.toLowerCase().includes(searchQuery.toLowerCase())))
                            .map((person, idx) => (
                              <PersonListItem 
                                key={idx} 
                                person={person} 
                                type="participant" 
                                index={idx}
                              />
                            ))}
                        </ul>
                      ) : (
                        <p className="text-center py-4 text-gray-500">No one checked in yet</p>
                      )}
                    </div>
                  )}
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
                
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div 
                    className="h-2.5 rounded-full" 
                    style={{ 
                      width: `${metrics.totalStaff > 0 ? (metrics.checkedInStaff / metrics.totalStaff * 100) : 0}%`,
                      backgroundColor: '#c53a49'
                    }}
                  ></div>
                </div>
                
                {/* Missing Staff collapsible section */}
                <div className="border-t border-gray-200 mt-4 pt-2">
                  <button 
                    onClick={() => setExpandedStaff(!expandedStaff)}
                    className="w-full flex justify-between items-center text-sm font-medium p-2 text-left"
                  >
                    <span>Missing Staff ({metrics.notCheckedInStaff.length})</span>
                    {expandedStaff ? 
                      <ChevronUp className="text-gray-500 h-4 w-4" /> : 
                      <ChevronDown className="text-gray-500 h-4 w-4" />
                    }
                  </button>
                  
                  {expandedStaff && (
                    <div className="border-t border-gray-200 mt-1">
                      {metrics.notCheckedInStaff.length > 0 ? (
                        <ul className="divide-y divide-gray-200 max-h-48 overflow-y-auto">
                          {metrics.notCheckedInStaff
                            .filter(person => !searchQuery || (person.Name && person.Name.toLowerCase().includes(searchQuery.toLowerCase())))
                            .map((person, idx) => (
                              <PersonListItem 
                                key={idx} 
                                person={person} 
                                type="staff" 
                                index={idx}
                              />
                            ))}
                        </ul>
                      ) : (
                        <p className="text-center py-4 text-gray-500">All checked in! 🎉</p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Checked-In Staff collapsible section */}
                <div className="border-t border-gray-200 mt-2 pt-2">
                  <button 
                    onClick={() => setExpandedCheckedInStaff(!expandedCheckedInStaff)}
                    className="w-full flex justify-between items-center text-sm font-medium p-2 text-left"
                  >
                    <span>Checked-In Staff ({metrics.checkedInStaffList.length})</span>
                    {expandedCheckedInStaff ? 
                      <ChevronUp className="text-gray-500 h-4 w-4" /> : 
                      <ChevronDown className="text-gray-500 h-4 w-4" />
                    }
                  </button>
                  
                  {expandedCheckedInStaff && (
                    <div className="border-t border-gray-200 mt-1">
                      {metrics.checkedInStaffList.length > 0 ? (
                        <ul className="divide-y divide-gray-200 max-h-48 overflow-y-auto">
                          {metrics.checkedInStaffList
                            .filter(person => !searchQuery || (person.Name && person.Name.toLowerCase().includes(searchQuery.toLowerCase())))
                            .map((person, idx) => (
                              <PersonListItem 
                                key={idx} 
                                person={person} 
                                type="staff" 
                                index={idx}
                              />
                            ))}
                        </ul>
                      ) : (
                        <p className="text-center py-4 text-gray-500">No one checked in yet</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Search Box (shared between participants and staff) */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Quick Search</h3>
            </div>
            <input
              type="text"
              placeholder="Search by name across all lists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white py-4 border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to reset all check-in data? This cannot be undone.")) {
                  // Clear local storage
                  localStorage.removeItem('RoseCityCheckin_participants');
                  localStorage.removeItem('RoseCityCheckin_staff');
                  
                  // Clear Firebase data if available
                  if (database) {
                    set(ref(database, 'roseCityData'), null);
                  }
                  
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
