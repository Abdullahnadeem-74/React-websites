import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue, update, get } from 'firebase/database';
import { getAuth, signOut } from 'firebase/auth';
import { database } from './firebase';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if admin
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user || user.email !== 'admin@example.com') {
      navigate('/login');
      return;
    }

    // Load users data
    const usersRef = ref(database, 'users');
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      const userList = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })) : [];
      setUsers(userList);
      setLoading(false);
    });

    // Load withdrawals data
    const withdrawalsRef = ref(database, 'withdrawals');
    const unsubscribeWithdrawals = onValue(withdrawalsRef, (snapshot) => {
      const data = snapshot.val();
      const withdrawalList = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })) : [];
      setWithdrawals(withdrawalList.filter(w => w.status === 'pending'));
    });

    return () => {
      unsubscribeUsers();
      unsubscribeWithdrawals();
    };
  }, [navigate]);

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Process daily payment for a user (10% of investment)
  const handleSendDailyPayment = async (userId) => {
    try {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      const userData = snapshot.val();
      
      if (userData) {
        const investedAmount = userData.investedMoney || 0;
        const dailyPayment = investedAmount * 0.1; // 10% of investment
        
        // Add daily payment to payable amount
        await update(userRef, {
          payableAmount: (userData.payableAmount || 0) + dailyPayment,
          counter: (userData.counter || 0) + 1
        });
      }
    } catch (error) {
      console.error('Error processing payment:', error);
    }
  };

  // Process withdrawal request
  const handleApproveWithdrawal = async (withdrawalId) => {
    try {
      const withdrawalRef = ref(database, `withdrawals/${withdrawalId}`);
      
      // Update withdrawal status
      await update(withdrawalRef, {
        status: 'approved',
        processedDate: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error approving withdrawal:', error);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h2>Admin Dashboard</h2>
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </header>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>User Investments</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Serial No</th>
                  <th>User Name</th>
                  <th>Email</th>
                  <th>Invested Money</th>
                  <th>Payable Amount</th>
                  <th>Counter</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={user.id}>
                    <td>{index + 1}</td>
                    <td>{user.username || 'N/A'}</td>
                    <td>{user.email}</td>
                    <td>Rs. {user.investedMoney || 0}</td>
                    <td>Rs. {user.payableAmount || 0}</td>
                    <td>{user.counter || 0}</td>
                    <td>
                      <button 
                        onClick={() => handleSendDailyPayment(user.id)} 
                        className="send-button"
                        disabled={!user.investedMoney}
                      >
                        Send Daily Payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-card">
          <h3>Pending Withdrawals</h3>
          <div className="table-container">
            {withdrawals.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Serial No</th>
                    <th>User</th>
                    <th>JazzCash Number</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((withdrawal, index) => (
                    <tr key={withdrawal.id}>
                      <td>{index + 1}</td>
                      <td>{withdrawal.username || withdrawal.email}</td>
                      <td>{withdrawal.jazzCashNumber}</td>
                      <td>Rs. {withdrawal.amount}</td>
                      <td>{new Date(withdrawal.requestDate).toLocaleDateString()}</td>
                      <td>
                        <button 
                          onClick={() => handleApproveWithdrawal(withdrawal.id)} 
                          className="approve-button"
                        >
                          Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="no-data">No pending withdrawals</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;