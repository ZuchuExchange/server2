const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Needed for form-urlencoded

app.post('/pay', async (req, res) => {
  console.log('Received body:', req.body);  // Debug

  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }

  const payload = {
    BusinessShortCode: process.env.CHANNEL_ID,
    TransactionType: "CustomerPayBillOnline",
    Amount: 1,
    PartyA: phoneNumber,
    PartyB: process.env.CHANNEL_ID,
    PhoneNumber: phoneNumber,
    CallBackURL: process.env.CALLBACK_URL,
    AccountReference: "INV-TEST",
    TransactionDesc: "Test Payment",
  };

  try {
    const response = await axios.post('https://swiftwallet.co.ke/v3/stk-initiate', payload, {
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

app.post('/callback', (req, res) => {
  console.log('Callback received:', req.body);
  res.status(200).json({ message: 'Callback received' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
