import { useState, useEffect } from 'react';
import { Clipboard, Users, UserCheck, UserX, Home, ArrowLeft, ArrowRight } from 'lucide-react';
import Papa from 'papaparse';

// Helper function to parse CSV data
const parseCSV = (csvContent) => {
  const results = Papa.parse(csvContent, { header: true });
  return results.data;
};

export default function App() {
  // State for participants and staff data
  const [participants, setParticipants] = useState([]);
  const [staff, setStaff] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load data from CSV files
  useEffect(() => {
    const loadData = async () => {
      try {
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
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
  }, []);

  // Toggle checked-in status for participants
  const toggleParticipantStatus = (index) => {
    const updatedParticipants = [...participants];
    updatedParticipants[index].checkedIn = !updatedParticipants[index].checkedIn;
    setParticipants(updatedParticipants);
  };

  // Toggle shirt provided status for participants
  const toggleParticipantShirtStatus = (index) => {
    const updatedParticipants = [...participants];
    updatedParticipants[index].shirtProvided = !updatedParticipants[index].shirtProvided;
    setParticipants(updatedParticipants);
  };

  // Toggle checked-in status for staff
  const toggleStaffStatus = (index) => {
    const updatedStaff = [...staff];
    updatedStaff[index].checkedIn = !updatedStaff[index].checkedIn;
    setStaff(updatedStaff);
  };

  // Toggle shirt provided status for staff
  const toggleStaffShirtStatus = (index) => {
    const updatedStaff = [...staff];
    if (updatedStaff[index]['Shirt Needed'] === 'Yes') {
      updatedStaff[index].shirtProvided = !updatedStaff[index].shirtProvided;
      setStaff(updatedStaff);
    }
  };

  // Calculate metrics for dashboard
  const totalParticipants = participants.length;
  const checkedInParticipants = participants.filter(p => p.checkedIn).length;
  const totalStaff = staff.length;
  const checkedInStaff = staff.filter(s => s.checkedIn).length;
  
  const notCheckedInParticipants = participants.filter(p => !p.checkedIn);
  const notCheckedInStaff = staff.filter(s => !s.checkedIn);

  // Shirt distribution metrics
  const totalShirtsGiven = participants.filter(p => p.shirtProvided).length + 
                           staff.filter(s => s.shirtProvided && s['Shirt Needed'] === 'Yes').length;
  const totalShirtsNeeded = totalParticipants + staff.filter(s => s['Shirt Needed'] === 'Yes').length;
  
  // Filter participants based on search query
  const filteredParticipants = participants.filter(p => 
    p.Name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Filter staff based on search query
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
            <span className="font-medium">{totalParticipants}</span>
          </div>
          
          <div className="flex justify-between mb-4">
            <span>Checked In:</span>
            <span className="font-medium">{checkedInParticipants}</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-red-600 h-2.5 rounded-full" 
              style={{ 
                width: `${totalParticipants > 0 ? (checkedInParticipants / totalParticipants * 100) : 0}%`,
                backgroundColor: '#c53a49'
              }}
            ></div>
          </div>
          
          <div className="mt-4">
            <button 
              onClick={() => setSelectedPerson({ 
                type: 'missing-participants',
                data: notCheckedInParticipants 
              })}
              className="text-sm text-gray-600 flex items-center hover:text-red-600"
            >
              {notCheckedInParticipants.length} missing
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
            <span className="font-medium">{totalStaff}</span>
          </div>
          
          <div className="flex justify-between mb-4">
            <span>Checked In:</span>
            <span className="font-medium">{checkedInStaff}</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="h-2.5 rounded-full" 
              style={{ 
                width: `${totalStaff > 0 ? (checkedInStaff / totalStaff * 100) : 0}%`,
                backgroundColor: '#c53a49'
              }}
            ></div>
          </div>
          
          <div className="mt-4">
            <button 
              onClick={() => setSelectedPerson({ 
                type: 'missing-staff',
                data: notCheckedInStaff 
              })}
              className="text-sm text-gray-600 flex items-center hover:text-red-600"
            >
              {notCheckedInStaff.length} missing
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
            <span className="font-medium">{totalShirtsGiven} / {totalShirtsNeeded}</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="h-2.5 rounded-full" 
              style={{ 
                width: `${totalShirtsNeeded > 0 ? (totalShirtsGiven / totalShirtsNeeded * 100) : 0}%`,
                backgroundColor: '#c53a49'
              }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Display missing persons if selected */}
      {selectedPerson && (
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
                        if (selectedPerson.type === 'missing-participants') {
                          const personIndex = participants.findIndex(p => p.Name === person.Name);
                          if (personIndex !== -1) toggleParticipantStatus(personIndex);
                        } else {
                          const personIndex = staff.findIndex(s => s.Name === person.Name);
                          if (personIndex !== -1) toggleStaffStatus(personIndex);
                        }
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

  // Participant check-in component
  const ParticipantCheckIn = () => (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Participant Check-In</h2>
      
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search participant by name..."
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
              <th className="text-left py-3 px-4 font-medium text-gray-600">T-Shirt Size</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">T-Shirt</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredParticipants.map((participant, index) => (
              <tr key={index} className={participant.checkedIn ? "bg-green-50" : ""}>
                <td className="py-3 px-4">
                  <button 
                    onClick={() => setSelectedPerson({ type: 'participant', data: participant })}
                    className="text-blue-600 hover:underline"
                  >
                    {participant.Name}
                  </button>
                </td>
                <td className="py-3 px-4">{participant["T-Shirt Size"]}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${participant.checkedIn ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                    {participant.checkedIn ? "Checked In" : "Not Checked In"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${participant.shirtProvided ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                    {participant.shirtProvided ? "Provided" : "Not Provided"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => toggleParticipantStatus(index)}
                      className={`px-3 py-1 text-xs rounded text-white ${participant.checkedIn ? "bg-gray-500" : "bg-red-600"}`}
                      style={{ backgroundColor: participant.checkedIn ? "#838787" : "#c53a49" }}
                    >
                      {participant.checkedIn ? "Undo" : "Check In"}
                    </button>
                    <button
                      onClick={() => toggleParticipantShirtStatus(index)}
                      className={`px-3 py-1 text-xs rounded text-white ${participant.shirtProvided ? "bg-gray-500" : "bg-red-600"}`}
                      style={{ backgroundColor: participant.shirtProvided ? "#838787" : "#c53a49" }}
                      disabled={!participant.checkedIn}
                    >
                      {participant.shirtProvided ? "Undo Shirt" : "Give Shirt"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Display selected participant details */}
      {selectedPerson && selectedPerson.type === 'participant' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">{selectedPerson.data.Name}</h3>
              <button 
                onClick={() => setSelectedPerson(null)}
                className="text-gray-600 hover:text-red-600"
              >
                &times;
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">T-Shirt Size:</span>
                <span>{selectedPerson.data["T-Shirt Size"]}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Location:</span>
                <span>{selectedPerson.data["City/State"]}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Status:</span>
                <span className={selectedPerson.data.checkedIn ? "text-green-600" : "text-red-600"}>
                  {selectedPerson.data.checkedIn ? "Checked In" : "Not Checked In"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">T-Shirt:</span>
                <span className={selectedPerson.data.shirtProvided ? "text-green-600" : "text-red-600"}>
                  {selectedPerson.data.shirtProvided ? "Provided" : "Not Provided"}
                </span>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  const personIndex = participants.findIndex(p => p.Name === selectedPerson.data.Name);
                  if (personIndex !== -1) {
                    toggleParticipantStatus(personIndex);
                    // Update the selected person's data to reflect the change
                    setSelectedPerson({
                      ...selectedPerson,
                      data: {
                        ...selectedPerson.data,
                        checkedIn: !selectedPerson.data.checkedIn
                      }
                    });
                  }
                }}
                className="px-4 py-2 rounded text-white bg-red-600 hover:bg-red-700"
                style={{ backgroundColor: '#c53a49' }}
              >
                {selectedPerson.data.checkedIn ? "Undo Check-In" : "Check In"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Staff check-in component
  const StaffCheckIn = () => (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Staff Check-In</h2>
      
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search staff by name..."
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
              <th className="text-left py-3 px-4 font-medium text-gray-600">Shirt Needed</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Shirt Size</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Shirt Type</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredStaff.map((staffMember, index) => (
              <tr key={index} className={staffMember.checkedIn ? "bg-green-50" : ""}>
                <td className="py-3 px-4">
                  <button 
                    onClick={() => setSelectedPerson({ type: 'staff', data: staffMember })}
                    className="text-blue-600 hover:underline"
                  >
                    {staffMember.Name}
                  </button>
                </td>
                <td className="py-3 px-4">{staffMember["Shirt Needed"]}</td>
                <td className="py-3 px-4">{staffMember["Shirt Size"] || "N/A"}</td>
                <td className="py-3 px-4">{staffMember["Shirt Type"] || "N/A"}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${staffMember.checkedIn ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                    {staffMember.checkedIn ? "Checked In" : "Not Checked In"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => toggleStaffStatus(index)}
                      className={`px-3 py-1 text-xs rounded text-white ${staffMember.checkedIn ? "bg-gray-500" : "bg-red-600"}`}
                      style={{ backgroundColor: staffMember.checkedIn ? "#838787" : "#c53a49" }}
                    >
                      {staffMember.checkedIn ? "Undo" : "Check In"}
                    </button>
                    {staffMember["Shirt Needed"] === "Yes" && (
                      <button
                        onClick={() => toggleStaffShirtStatus(index)}
                        className={`px-3 py-1 text-xs rounded text-white ${staffMember.shirtProvided ? "bg-gray-500" : "bg-red-600"}`}
                        style={{ backgroundColor: staffMember.shirtProvided ? "#838787" : "#c53a49" }}
                        disabled={!staffMember.checkedIn}
                      >
                        {staffMember.shirtProvided ? "Undo Shirt" : "Give Shirt"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Display selected staff details */}
      {selectedPerson && selectedPerson.type === 'staff' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">{selectedPerson.data.Name}</h3>
              <button 
                onClick={() => setSelectedPerson(null)}
                className="text-gray-600 hover:text-red-600"
              >
                &times;
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">Shirt Needed:</span>
                <span>{selectedPerson.data["Shirt Needed"]}</span>
              </div>
              {selectedPerson.data["Shirt Needed"] === "Yes" && (
                <>
                  <div className="flex justify-between">
                    <span className="font-medium">Shirt Size:</span>
                    <span>{selectedPerson.data["Shirt Size"]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Shirt Type:</span>
                    <span>{selectedPerson.data["Shirt Type"]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Shirt Status:</span>
                    <span className={selectedPerson.data.shirtProvided ? "text-green-600" : "text-red-600"}>
                      {selectedPerson.data.shirtProvided ? "Provided" : "Not Provided"}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="font-medium">Status:</span>
                <span className={selectedPerson.data.checkedIn ? "text-green-600" : "text-red-600"}>
                  {selectedPerson.data.checkedIn ? "Checked In" : "Not Checked In"}
                </span>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  const personIndex = staff.findIndex(s => s.Name === selectedPerson.data.Name);
                  if (personIndex !== -1) {
                    toggleStaffStatus(personIndex);
                    // Update the selected person's data to reflect the change
                    setSelectedPerson({
                      ...selectedPerson,
                      data: {
                        ...selectedPerson.data,
                        checkedIn: !selectedPerson.data.checkedIn
                      }
                    });
                  }
                }}
                className="px-4 py-2 rounded text-white bg-red-600 hover:bg-red-700"
                style={{ backgroundColor: '#c53a49' }}
              >
                {selectedPerson.data.checkedIn ? "Undo Check-In" : "Check In"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm" style={{ borderBottom: '3px solid #c53a49' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold" style={{ color: '#c53a49' }}>
            Rose City Officiating Experience
          </h1>
          <p className="text-gray-600">Check-In System</p>
        </div>
      </header>
      
      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'dashboard'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={{ 
                borderColor: activeTab === 'dashboard' ? '#c53a49' : 'transparent',
                color: activeTab === 'dashboard' ? '#c53a49' : undefined
              }}
            >
              <Home className="mr-2 w-4 h-4" />
              Dashboard
            </button>
            
            <button
              onClick={() => setActiveTab('participants')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'participants'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={{ 
                borderColor: activeTab === 'participants' ? '#c53a49' : 'transparent',
                color: activeTab === 'participants' ? '#c53a49' : undefined
              }}
            >
              <Users className="mr-2 w-4 h-4" />
              Participants
            </button>
            
            <button
              onClick={() => setActiveTab('staff')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'staff'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={{ 
                borderColor: activeTab === 'staff' ? '#c53a49' : 'transparent',
                color: activeTab === 'staff' ? '#c53a49' : undefined
              }}
            >
              <UserCheck className="mr-2 w-4 h-4" />
              Staff
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'participants' && <ParticipantCheckIn />}
          {activeTab === 'staff' && <StaffCheckIn />}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white py-4 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Rose City Officiating Experience
          </p>
        </div>
      </footer>
    </div>
  );
}