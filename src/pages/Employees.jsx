import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import * as sheetApi from '../services/sheetApi';
import './Employees.css';

const Employees = () => {
    const [activeTab, setActiveTab] = useState('list');
    const [employees, setEmployees] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendance, setAttendance] = useState({});
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [salaryData, setSalaryData] = useState([]);

    // Editing State
    const [editingId, setEditingId] = useState(null);
    const [editSalary, setEditSalary] = useState('');

    // Add Employee Form
    const [addForm, setAddForm] = useState({
        name: '',
        position: '',
        salaryPerDay: '',
        dateOfJoining: '',
        photo: ''
    });

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        try {
            const fetchedEmployees = await sheetApi.getEmployees();
            setEmployees(fetchedEmployees);
        } catch (error) {
            console.error('Error loading employees:', error);
        }
    };

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAddForm(prev => ({ ...prev, photo: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddEmployee = async (e) => {
        e.preventDefault();

        // Optimistic Update
        const newEmployee = {
            ...addForm,
            // Generate a temp ID to use as key until backend refreshes
            id: 'temp-' + Date.now(),
            // Ensure numbers are handled as expected
            salaryPerDay: parseFloat(addForm.salaryPerDay) || 0
        };

        // 1. Update local state immediately
        setEmployees(prev => [...prev, newEmployee]);

        // 2. Switch to list view immediately for better UX
        setActiveTab('list');

        // 3. Reset form
        setAddForm({ name: '', position: '', salaryPerDay: '', dateOfJoining: '', photo: '' });

        try {
            alert('Employee added! Syncing with database...');

            // 4. Send to backend
            await sheetApi.addEmployee(addForm);

            // 5. Wait a bit for Google Sheets to propagate, then reload
            // This ensures the next fetch is likely to have the new data
            setTimeout(async () => {
                await loadEmployees();
            }, 2000);

        } catch (error) {
            console.error('Error adding employee:', error);
            alert(`Failed to save to database: ${error.message}`);
            // Rollback optimistic update if needed, or just let the next load fix it
        }
    };

    const handleDeleteEmployee = async (id, name) => {
        if (window.confirm(`Are you sure you want to delete ${name}?`)) {
            try {
                await sheetApi.deleteEmployee(id);
                await loadEmployees();
                alert('Employee deleted successfully!');
            } catch (error) {
                console.error('Error deleting employee:', error);
                alert('Failed to delete employee. Please try again.');
            }
        }
    };

    const handleStartEdit = (emp) => {
        setEditingId(emp.id || emp.name);
        setEditSalary(emp.salaryPerDay);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditSalary('');
    };

    const handleSaveSalary = async (id) => {
        try {
            // Optimistic Update
            setEmployees(prev => prev.map(emp =>
                (emp.id || emp.name) === id ? { ...emp, salaryPerDay: editSalary } : emp
            ));

            setEditingId(null);

            await sheetApi.updateEmployee({ id, salaryPerDay: editSalary });
            alert('Salary updated successfully!');
        } catch (error) {
            console.error('Error updating salary:', error);
            alert('Failed to update salary.');
            loadEmployees(); // Revert on error
        }
    };

    const handleAttendance = (employeeId, status) => {
        setAttendance(prev => ({
            ...prev,
            [employeeId]: status
        }));
    };

    const submitAttendance = async () => {
        try {
            await sheetApi.markAttendance(selectedDate, attendance);
            alert('Attendance marked successfully!');
        } catch (error) {
            console.error('Error marking attendance:', error);
            alert('Failed to mark attendance.');
        }
    };

    const calculateSalary = async () => {
        try {
            if (!startDate || !endDate) {
                alert('Please select both Start Date and End Date');
                return;
            }

            // 1. Fetch ALL Attendance (Backend is configured to return everything)
            console.log('Fetching full attendance...');
            const allAttendance = await sheetApi.getAttendanceByRange(startDate, endDate);

            if (!allAttendance || allAttendance.length === 0) {
                console.warn('No attendance records found via API');
                alert(`No attendance records found. \n1. Did you click "Save Attendance"?\n2. Did you redeploy the script?`);
            }

            // 2. Fetch Payments History (ALL)
            console.log('Fetching payments history...');
            let payments = [];
            try {
                payments = await sheetApi.getPayments(startDate, endDate);
            } catch (e) {
                console.warn("Could not fetch payments:", e);
            }

            // 3. Process Data
            const SHIFT_MULTIPLIERS = { 'HALF': 0.5, 'FULL': 1.0, 'ONE_HALF': 1.5, 'DOUBLE': 2.0, 'TRIPLE': 3.0, 'ABSENT': 0, 'P': 1.0 };

            const processedData = employees.map(emp => {
                const id = String(emp.id || emp.name);

                // A. Calculate Lifetime Earned & Paid Up To Date
                let lifetimeShifts = 0;
                let lastPaidDate = '2000-01-01'; // Default long ago

                // Find Last Payment Date for this employee from Payment History
                const empPayments = payments.filter(p => String(p.employeeId) === id);
                empPayments.forEach(p => {
                    if (p.endDate > lastPaidDate) lastPaidDate = p.endDate;
                });

                // Deduplicate full history by date
                const histUniqueMap = {};
                const histList = Array.isArray(allAttendance) ? allAttendance : Object.values(allAttendance);
                histList.forEach(r => { if (r.date) histUniqueMap[r.date] = r.attendance || r; });

                // -- Lifetime Earned Calc (Sum of ALL records found) --
                Object.values(histUniqueMap).forEach(attMap => {
                    const status = attMap[id];
                    if (status) {
                        lifetimeShifts += (SHIFT_MULTIPLIERS[status] || 0);
                    }
                });
                const lifetimeEarned = lifetimeShifts * (parseFloat(emp.salaryPerDay) || 0);

                // -- Lifetime Paid Calc (Sum of ALL payments) --
                const lifetimePaid = empPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

                // -- Net Payable (Total Balance) --
                const netPayable = lifetimeEarned - lifetimePaid;


                // B. Calculate "Current Period" stats (For Display Only)
                // Defined as: Shifts in [startDate, endDate] that are AFTER lastPaidDate
                let currentPeriodShifts = 0;

                // Filter records strictly within the requested window
                Object.keys(histUniqueMap).forEach(dateStr => {
                    // Check if date is within selected range
                    if (dateStr >= startDate && dateStr <= endDate) {
                        // Check if date is NOT already paid
                        if (dateStr > lastPaidDate) {
                            const status = histUniqueMap[dateStr][id];
                            if (status) {
                                currentPeriodShifts += (SHIFT_MULTIPLIERS[status] || 0);
                            }
                        }
                    }
                });

                const currentPeriodSalary = currentPeriodShifts * (parseFloat(emp.salaryPerDay) || 0);

                // C. Previous Due
                // Logic: NetPayable = Current + Previous. So Previous = Net - Current.
                const previousDue = netPayable - currentPeriodSalary;

                return {
                    ...emp,
                    presentDays: currentPeriodShifts, // Show only UNPAID shifts in this period
                    salaryPerDay: emp.salaryPerDay,   // Pass through
                    totalSalary: currentPeriodSalary, // Show only UNPAID amount in this period (Current Salary)
                    previousDue: previousDue,
                    netPayable: netPayable,
                    paidAmount: '',
                    note: '',
                    balance: netPayable
                };
            });

            console.log('Final Salary Calc:', processedData);
            setSalaryData(processedData);

        } catch (error) {
            console.error('Error calculating salary:', error);
            alert('Failed to calculate salary. Please try again.');
        }
    };

    const handlePaymentChange = (id, field, value) => {
        setSalaryData(prev => prev.map(emp => {
            if (String(emp.id || emp.name) === String(id)) {
                const newEmp = { ...emp, [field]: value };
                // Recalculate balance if paidAmount changes
                if (field === 'paidAmount') {
                    const paid = parseFloat(value) || 0;
                    // Balance = Total Payable (Net) - Paid
                    // Note: 'totalSalary' in data object is just current period. 
                    // We need 'netPayable' which is (Lifetime - PaidBefore + Current).
                    newEmp.balance = (newEmp.netPayable || 0) - paid;
                }
                return newEmp;
            }
            return emp;
        }));
    };

    const savePayment = async (emp) => {
        try {
            const id = String(emp.id || emp.name);
            await sheetApi.savePayment({
                employeeId: id,
                amount: emp.paidAmount,
                note: emp.note,
                startDate: startDate,
                endDate: endDate
            });
            alert(`Payment saved for ${emp.name}`);
        } catch (error) {
            console.error('Error saving payment:', error);
            alert('Failed to save payment.');
        }
    };

    return (
        <div className="employees-container">
            <Navbar />
            <header className="employees-header">
                <h1>Employees Management</h1>
                <p>Manage staff, attendance, and payroll</p>
            </header>

            <div className="employees-tabs">
                <button
                    className={`tab ${activeTab === 'list' ? 'active' : ''}`}
                    onClick={() => setActiveTab('list')}
                >
                    Employee List
                </button>
                <button
                    className={`tab ${activeTab === 'add' ? 'active' : ''}`}
                    onClick={() => setActiveTab('add')}
                >
                    Add Employee
                </button>
                <button
                    className={`tab ${activeTab === 'attendance' ? 'active' : ''}`}
                    onClick={() => setActiveTab('attendance')}
                >
                    Attendance
                </button>
                <button
                    className={`tab ${activeTab === 'salary' ? 'active' : ''}`}
                    onClick={() => setActiveTab('salary')}
                >
                    Salary
                </button>
            </div>

            <div className={`employees-content ${activeTab === 'list' ? 'full-width' : ''}`}>
                {activeTab === 'list' && (
                    <div className="tab-panel">
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                            <button
                                className="submit-btn"
                                style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                onClick={loadEmployees}
                            >
                                ↻ Refresh List
                            </button>
                        </div>
                        <div className="employee-grid">
                            {employees.map(emp => (
                                <div key={emp.id || emp.name} className="employee-card">
                                    {emp.photo && (
                                        <div className="employee-photo">
                                            <img src={emp.photo} alt={emp.name} />
                                        </div>
                                    )}
                                    <h3>{emp.name}</h3>
                                    <p className="role">{emp.position}</p>
                                    <div className="employee-details">
                                        <div style={{ marginBottom: '0.3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '30px' }}>
                                            <strong style={{ color: '#fff' }}>Salary/Day:</strong>
                                            {editingId === (emp.id || emp.name) ? (
                                                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                                    <input
                                                        type="number"
                                                        value={editSalary}
                                                        onChange={(e) => setEditSalary(e.target.value)}
                                                        style={{ width: '80px', padding: '2px 5px', borderRadius: '4px', border: '1px solid #4ade80', background: 'var(--input-bg)', color: '#fff' }}
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => handleSaveSalary(emp.id || emp.name)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4ade80', padding: 0, fontSize: '1.2rem' }}
                                                        title="Save"
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 0, fontSize: '1.2rem' }}
                                                        title="Cancel"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                    <span>₹{emp.salaryPerDay}</span>
                                                    <button
                                                        onClick={() => handleStartEdit(emp)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', padding: 0 }}
                                                        title="Edit Salary"
                                                    >
                                                        ✎
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <p><strong>Joined:</strong> {emp.dateOfJoining}</p>
                                    </div>
                                    <button
                                        className="delete-btn"
                                        onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                            {employees.length === 0 && <p className="empty-state">No employees found.</p>}
                        </div>
                    </div>
                )}

                {activeTab === 'add' && (
                    <div className="tab-panel">
                        <form onSubmit={handleAddEmployee} className="stock-form">
                            <div className="form-group">
                                <label>Photo</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoUpload}
                                    className="file-input"
                                />
                                {addForm.photo && (
                                    <div className="photo-preview">
                                        <img src={addForm.photo} alt="Preview" />
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Name</label>
                                <input
                                    type="text"
                                    value={addForm.name}
                                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Position</label>
                                <input
                                    type="text"
                                    value={addForm.position}
                                    onChange={(e) => setAddForm({ ...addForm, position: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Salary Per Day (₹)</label>
                                    <input
                                        type="number"
                                        value={addForm.salaryPerDay}
                                        onChange={(e) => setAddForm({ ...addForm, salaryPerDay: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Date of Joining</label>
                                    <input
                                        type="date"
                                        value={addForm.dateOfJoining}
                                        onChange={(e) => setAddForm({ ...addForm, dateOfJoining: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <button type="submit" className="submit-btn">Add Employee</button>
                        </form>
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="tab-panel">
                        <div className="date-picker">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                        <div className="attendance-list">
                            {employees.map(emp => (
                                <div key={emp.id || emp.name} className="attendance-item">
                                    <h4>{emp.name}</h4>
                                    <div className="attendance-controls shift-controls">
                                        <button
                                            className={`shift-btn full ${attendance[emp.id || emp.name] === 'FULL' ? 'active' : ''}`}
                                            onClick={() => handleAttendance(emp.id || emp.name, 'FULL')}
                                            title="Full Day (1.0)"
                                        >
                                            Full
                                        </button>
                                        <button
                                            className={`shift-btn half ${attendance[emp.id || emp.name] === 'HALF' ? 'active' : ''}`}
                                            onClick={() => handleAttendance(emp.id || emp.name, 'HALF')}
                                            title="Half Day (0.5)"
                                        >
                                            Half
                                        </button>
                                        <button
                                            className={`shift-btn one-half ${attendance[emp.id || emp.name] === 'ONE_HALF' ? 'active' : ''}`}
                                            onClick={() => handleAttendance(emp.id || emp.name, 'ONE_HALF')}
                                            title="1.5 Shift (1.5)"
                                        >
                                            1.5x
                                        </button>
                                        <button
                                            className={`shift-btn double ${attendance[emp.id || emp.name] === 'DOUBLE' ? 'active' : ''}`}
                                            onClick={() => handleAttendance(emp.id || emp.name, 'DOUBLE')}
                                            title="Double Shift (2.0)"
                                        >
                                            2x
                                        </button>
                                        <button
                                            className={`shift-btn triple ${attendance[emp.id || emp.name] === 'TRIPLE' ? 'active' : ''}`}
                                            onClick={() => handleAttendance(emp.id || emp.name, 'TRIPLE')}
                                            title="Triple Shift (3.0)"
                                        >
                                            3x
                                        </button>
                                        <button
                                            className={`shift-btn absent ${attendance[emp.id || emp.name] === 'ABSENT' ? 'active' : ''}`}
                                            onClick={() => handleAttendance(emp.id || emp.name, 'ABSENT')}
                                            title="Absent (0)"
                                        >
                                            Ab
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            className="submit-btn"
                            style={{ marginTop: '2rem' }}
                            onClick={submitAttendance}
                        >
                            Save Attendance
                        </button>
                    </div>
                )}

                {activeTab === 'salary' && (
                    <div className="tab-panel">
                        <div className="date-picker">
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div className="form-group">
                                    <label style={{ color: 'var(--text-secondary)' }}>Start Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ color: 'var(--text-secondary)' }}>End Date</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <button
                                className="submit-btn"
                                style={{ marginTop: '1rem', width: 'auto', padding: '0.8rem 2rem' }}
                                onClick={calculateSalary}
                            >
                                Calculate Salary
                            </button>
                        </div>

                        {salaryData.length > 0 && (
                            <div className="salary-table-container">
                                <table className="salary-table">
                                    <thead>
                                        <tr>
                                            <th>Employee</th>
                                            <th>Daily Rate</th>
                                            <th>Total Shifts</th>
                                            <th>Current Salary</th>
                                            <th>Previous Due</th>
                                            <th>Net Payable</th>
                                            <th>Paid</th>
                                            <th>Note</th>
                                            <th>Balance</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {salaryData.map(data => (
                                            <tr key={data.id || data.name}>
                                                <td>
                                                    <div className="emp-cell">
                                                        {data.photo && <img src={data.photo} alt="" className="table-avatar" />}
                                                        {data.name}
                                                    </div>
                                                </td>
                                                <td>₹{data.salaryPerDay}</td>
                                                <td>{data.presentDays}</td>
                                                <td className="total-cell">₹{data.totalSalary.toLocaleString()}</td>
                                                <td>-</td> {/* Placeholder for Previous Due */}
                                                <td>-</td> {/* Placeholder for Net Payable */}
                                                <td>
                                                    <input
                                                        type="number"
                                                        value={data.paidAmount}
                                                        onChange={(e) => handlePaymentChange(data.id || data.name, 'paidAmount', e.target.value)}
                                                        placeholder="0"
                                                        style={{ width: '80px', padding: '5px', borderRadius: '4px', border: '1px solid #555', background: '#222', color: '#fff' }}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={data.note}
                                                        onChange={(e) => handlePaymentChange(data.id || data.name, 'note', e.target.value)}
                                                        placeholder="Details..."
                                                        style={{ width: '120px', padding: '5px', borderRadius: '4px', border: '1px solid #555', background: '#222', color: '#fff' }}
                                                    />
                                                </td>
                                                <td style={{ color: data.balance > 0 ? '#f87171' : '#4ade80', fontWeight: 'bold' }}>
                                                    ₹{data.balance.toLocaleString()}
                                                </td>
                                                <td>
                                                    <button
                                                        className="submit-btn"
                                                        style={{ width: 'auto', padding: '5px 10px', fontSize: '0.8rem' }}
                                                        onClick={() => savePayment(data)}
                                                    >
                                                        Save
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Employees;
