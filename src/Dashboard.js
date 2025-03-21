import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { ref, onValue, update } from 'firebase/database';
import { database } from './firebase';

function Dashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('invest');
  const [amount, setAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState('');
  const [jazzCashNumber, setJazzCashNumber] = useState('');
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      navigate('/login');
      return;
    }

    const userRef = ref(database, 'users/' + user.uid);
    const unsubscribe = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUserData(data);
      }
      setLoading(false);
    });

    // Add withdrawal history fetch
    if (user) {
      const withdrawalsRef = ref(database, 'withdrawals');
      onValue(withdrawalsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const withdrawalList = Object.keys(data)
            .map(key => ({
              id: key,
              ...data[key]
            }))
            .filter(withdrawal => withdrawal.userId === user.uid)
            .sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
          
          setWithdrawalHistory(withdrawalList);
        }
      });
    }

    return () => unsubscribe();
  }, [navigate]);

  // Calculate earned amount based on payable amount (10% of investment)
  const calculateEarnedAmount = () => {
    if (!userData) return 0;
    
    // Return the current payable amount (which represents accumulated daily earnings)
    return userData.payableAmount || 0;
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setPaymentError('');

    if (!amount || amount < 100) {
      setPaymentError('Minimum investment amount is Rs. 100');
      return;
    }

    try {
      // JazzCash API Integration
      const merchantId = process.env.REACT_APP_JAZZCASH_MERCHANT_ID || "YOUR_MERCHANT_ID"; 
      const returnUrl = window.location.origin + "/payment-status";
      
      // Get current timestamp for pp_TxnDateTime
      const date = new Date();
      const pp_TxnDateTime = date.getFullYear() + 
        String(date.getMonth() + 1).padStart(2, '0') +
        String(date.getDate()).padStart(2, '0') +
        String(date.getHours()).padStart(2, '0') +
        String(date.getMinutes()).padStart(2, '0') +
        String(date.getSeconds()).padStart(2, '0');
      
      // Generate unique transaction ID
      const pp_TxnRefNo = 'T' + pp_TxnDateTime;

      // Prepare data for form submission
      const formData = {
        pp_Version: '1.1',
        pp_TxnType: 'MWALLET',
        pp_Language: 'EN',
        pp_MerchantID: merchantId,
        pp_SubMerchantID: '',
        pp_Password: process.env.REACT_APP_JAZZCASH_PASSWORD || 'YOUR_PASSWORD',
        pp_BankID: 'TBANK',
        pp_ProductID: 'RETL',
        pp_TxnRefNo: pp_TxnRefNo,
        pp_Amount: amount * 100, // Amount in cents
        pp_TxnCurrency: 'PKR',
        pp_TxnDateTime: pp_TxnDateTime,
        pp_BillReference: userData.uid,
        pp_Description: 'Investment Payment',
        pp_TxnExpiryDateTime: '', // Set appropriate expiry
        pp_SecureHash: '', // Hash should be generated on backend
        pp_ReturnURL: returnUrl,
        ppmpf_1: userData.uid,
        ppmpf_2: userData.email,
        ppmpf_3: '',
        ppmpf_4: '',
        ppmpf_5: ''
      };

      // In production, this should be handled by your backend
      // Here's a placeholder for the form submission
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform';

      for (const key in formData) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = formData[key];
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();

    } catch (error) {
      setPaymentError('Payment processing failed. Please try again.');
      console.error('Payment error:', error);
    }
  };

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawSuccess('');
    setIsWithdrawing(true);

    if (!withdrawAmount || withdrawAmount < 100) {
      setWithdrawError('Minimum withdrawal amount is Rs. 100');
      setIsWithdrawing(false);
      return;
    }

    if (!jazzCashNumber || jazzCashNumber.length !== 11) {
      setWithdrawError('Please enter a valid 11-digit JazzCash number');
      setIsWithdrawing(false);
      return;
    }

    // Check if withdrawal amount doesn't exceed earned amount (payable amount)
    if (withdrawAmount > userData.payableAmount) {
      setWithdrawError('Withdrawal amount exceeds your earned amount');
      setIsWithdrawing(false);
      return;
    }

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (user) {
        // Create a withdrawal request in the database
        const userRef = ref(database, 'users/' + user.uid);
        const withdrawalRef = ref(database, 'withdrawals/' + user.uid + '_' + Date.now());
        
        // Update user's payable amount (earned amount)
        await update(userRef, {
          payableAmount: userData.payableAmount - withdrawAmount
        });
        
        // Record withdrawal request
        await update(withdrawalRef, {
          userId: user.uid,
          amount: withdrawAmount,
          jazzCashNumber: jazzCashNumber,
          status: 'pending',
          requestDate: new Date().toISOString(),
          username: userData.username || '',
          email: userData.email
        });
        
        setWithdrawSuccess(`Your withdrawal request for Rs. ${withdrawAmount} has been submitted. The amount will be sent to your JazzCash account (${jazzCashNumber}) once approved.`);
        setWithdrawAmount('');
        setJazzCashNumber('');
      }
    } catch (error) {
      setWithdrawError('Withdrawal request failed. Please try again.');
      console.error('Withdrawal error:', error);
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  const withdrawalTab = (
    <div className="dashboard-content">
      <div className="investment-summary">
        <h3>Withdrawal Summary</h3>
        <p>Earned Amount: Rs. {calculateEarnedAmount()}</p>
        <p>Available for Withdrawal: Rs. {calculateEarnedAmount()}</p>
      </div>

      {/* Withdrawal form */}
      <div className="withdrawal-form">
        <h3>Withdraw Funds</h3>
        {withdrawError && <p className="error-message">{withdrawError}</p>}
        {withdrawSuccess && <p className="success-message">{withdrawSuccess}</p>}
        
        <form onSubmit={handleWithdrawSubmit}>
          <div className="form-group">
            <label htmlFor="jazzCashNumber">JazzCash Number</label>
            <input
              type="text"
              id="jazzCashNumber"
              value={jazzCashNumber}
              onChange={(e) => setJazzCashNumber(e.target.value)}
              placeholder="Enter JazzCash Number"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="withdrawalAmount">Withdrawal Amount (Rs.)</label>
            <input
              type="number"
              id="withdrawalAmount"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="Enter amount to withdraw"
              min="1"
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="action-button withdraw"
            disabled={isWithdrawing}
          >
            {isWithdrawing ? 'Processing...' : 'Request Withdrawal'}
          </button>
        </form>
      </div>

      {/* Withdrawal History */}
      <div className="withdrawal-history">
        <h3>Withdrawal History</h3>
        {withdrawalHistory.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>JazzCash Number</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {withdrawalHistory.map((withdrawal) => (
                  <tr key={withdrawal.id}>
                    <td>{new Date(withdrawal.requestDate).toLocaleDateString()}</td>
                    <td>Rs. {withdrawal.amount}</td>
                    <td>{withdrawal.jazzCashNumber}</td>
                    <td>
                      <span className={`status ${withdrawal.status}`}>
                        {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-data">No withdrawal history</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="user-info">
          <h2>Welcome, {userData?.username || 'User'}</h2>
          <p className="email">{userData?.email}</p>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </header>

      <div className="dashboard-grid">
        <div className="dashboard-card investment-summary">
          <h3>Investment Summary</h3>
          <div className="summary-details">
            <div className="summary-item">
              <span className="label">Total Invested</span>
              <span className="value">Rs. {userData?.investedMoney || 0}</span>
            </div>
            <div className="summary-item">
              <span className="label">Daily Earnings (10%)</span>
              <span className="value">Rs. {(userData?.investedMoney * 0.1) || 0}</span>
            </div>
            <div className="summary-item">
              <span className="label">Earned Amount</span>
              <span className="value earned">Rs. {calculateEarnedAmount().toFixed(2)}</span>
            </div>
            <div className="summary-item">
              <span className="label">Payment Counter</span>
              <span className="value">{userData?.counter || 0}</span>
            </div>
          </div>
        </div>

        <div className="dashboard-card payment-tabs">
          <div className="tab-buttons">
            <button 
              className={`tab-button ${activeTab === 'invest' ? 'active' : ''}`}
              onClick={() => setActiveTab('invest')}
            >
              Make Investment
            </button>
            <button 
              className={`tab-button ${activeTab === 'withdraw' ? 'active' : ''}`}
              onClick={() => setActiveTab('withdraw')}
            >
              Withdraw Funds
            </button>
          </div>

          {activeTab === 'invest' ? (
            <div className="tab-content">
              <h3>Make Investment</h3>
              {paymentError && <div className="error-message">{paymentError}</div>}
              <form onSubmit={handlePaymentSubmit}>
                <div className="form-group">
                  <label>Investment Amount (Rs.)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="100"
                    required
                    placeholder="Enter amount (min. Rs. 100)"
                  />
                </div>
                <button type="submit" className="action-button invest">
                  Pay with JazzCash
                </button>
              </form>
            </div>
          ) : withdrawalTab}
        </div>

        <div className="dashboard-card payment-history">
          <h3>Payment History</h3>
          <div className="history-content">
            {userData?.counter > 0 ? (
              <div className="history-item">
                <span className="date">Last Payment</span>
                <span className="amount">Counter: {userData.counter}</span>
              </div>
            ) : (
              <p className="no-history">No payment history available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;