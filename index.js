const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory storage for payment statuses
const payments = {};

// Endpoint to initiate payment
app.post('/pay', async (req, res) => {
  const { phoneNumber, amount } = req.body;

  // Validation
  if (!phoneNumber) return res.status(400).json({ success: false, message: 'Phone number is required' });
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) return res.status(400).json({ success: false, message: 'Valid amount required' });

  // Generate unique reference
  const reference = 'REF-' + Date.now();

  // Store initial 'pending' status
  payments[reference] = { status: 'pending' };

  // Prepare payload for payment provider
  const payload = {
    BusinessShortCode: process.env.CHANNEL_ID,
    TransactionType: "CustomerPayBillOnline",
    Amount: parsedAmount,
    PartyA: phoneNumber,
    PartyB: process.env.CHANNEL_ID,
    PhoneNumber: phoneNumber,
    CallBackURL: process.env.CALLBACK_URL,
    AccountReference: reference,
    TransactionDesc: "Test Payment",
  };

  try {
    const response = await axios.post('https://swiftwallet.co.ke/v3/stk-initiate', payload, {
      headers: {
        'Authorization': `Bearer ${process.env.API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    res.json({ success: true, message: 'STK Push sent. Check phone.', reference });
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    delete payments[reference]; // Remove pending if request fails
    res.status(500).json({ success: false, message: 'Failed to send STK Push' });
  }
});

// Callback handler from payment provider
app.post('/callback', (req, res) => {
  console.log('Callback received:', req.body);

  const { Body } = req.body;
  if (Body && Body.StkCallback) {
    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = Body.StkCallback;

    // Extract reference from metadata
    const reference = CallbackMetadata?.Item?.find(item => item.Name === 'AccountReference')?.Value;

    if (reference && payments[reference]) {
      // Update status based on ResultCode
      if (ResultCode === 0) {
        payments[reference].status = 'success';
      } else {
        payments[reference].status = 'failed';
      }
      console.log(`Payment ${reference} updated to ${payments[reference].status}`);
    }
  }

  res.status(200).json({ message: 'Callback received' });
});

// Endpoint to get current payment status
app.get('/receipt/:reference', (req, res) => {
  const reference = req.params.reference;
  const payment = payments[reference];

  if (payment) {
    res.json({ receipt: { status: payment.status } });
  } else {
    res.json({ receipt: { status: 'pending' } });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
