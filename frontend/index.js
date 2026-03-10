require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend'))); // Serve static files from frontend folder

// Endpoint to initiate STK Push
app.post('/pay', async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }

  const payload = {
    BusinessShortCode: process.env.CHANNEL_ID,
    TransactionType: "CustomerPayBillOnline",
    Amount: 1000, // 1 KSH
    PartyA: phoneNumber,
    PartyB: process.env.CHANNEL_ID,
    PhoneNumber: phoneNumber,
    CallBackURL: process.env.CALLBACK_URL,
    AccountReference: "INV-TEST",
    TransactionDesc: "Test Payment",
  };

  try {
    const response = await axios.post('https://api.yourpaymentprovider.com/stkpush', payload, {
      headers: {
        'Authorization': `Bearer ${process.env.API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    res.json({ success: true, message: 'STK Push sent. Check phone.', data: response.data });
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Failed to send STK Push' });
  }
});

// Callback endpoint
app.post('/callback', (req, res) => {
  const payload = req.body;
  console.log('Callback received:', payload);
  res.status(200).json({ message: 'Callback received' });
});

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
