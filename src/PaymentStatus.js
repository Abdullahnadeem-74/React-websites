import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { ref, update, get } from 'firebase/database';
import { database } from './firebase';

function PaymentStatus() {
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Processing your payment...');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ppResponseCode = params.get('pp_ResponseCode');
    const ppAmount = params.get('pp_Amount');
    const userId = params.get('ppmpf_1');

    const handlePaymentResponse = async () => {
      if (ppResponseCode === '000') {
        try {
          const auth = getAuth();
          const user = auth.currentUser;

          if (user && userId === user.uid) {
            const userRef = ref(database, 'users/' + user.uid);
            const amount = Number(ppAmount) / 100; // Convert from cents to rupees
            
            // Get current user data
            const snapshot = await get(userRef);
            const userData = snapshot.val();
            
            // Calculate 10% of the investment as the daily payable amount
            const dailyPayable = amount * 0.1;
            
            let currentInvestedMoney = 0;
            if (userData) {
              currentInvestedMoney = userData.investedMoney || 0;
            }

            // Update user data with new investment amount and daily payable
            await update(userRef, {
              investedMoney: currentInvestedMoney + amount,
              payableAmount: dailyPayable // Start with 10% as daily earnings
            });

            setStatus('success');
            setMessage('Payment successful! Your investment has been recorded. You can now earn 10% of your investment daily.');
          } else {
            setStatus('error');
            setMessage('User verification failed. Please contact support.');
          }
        } catch (error) {
          console.error('Database update error:', error);
          setStatus('error');
          setMessage('Failed to update investment records. Please contact support.');
        }
      } else {
        setStatus('error');
        setMessage('Payment failed. Please try again.');
      }
    };

    handlePaymentResponse();
  }, [location, navigate]);

  const handleReturn = () => {
    navigate('/dashboard');
  };

  return (
    <div className={`payment-status ${status}`}>
      <h2>{status === 'success' ? 'Payment Successful' : 'Payment Failed'}</h2>
      <p className="message">{message}</p>
      {status !== 'processing' && (
        <button onClick={handleReturn} className="action-button">
          Return to Dashboard
        </button>
      )}
    </div>
  );
}

export default PaymentStatus; 