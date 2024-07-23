const express = require('express');
const mongoose = require('mongoose');
const Customer = require('./models/Customer');
const app = express();
const port = 3000;

app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb+srv://meghna123:Gambvk5@cluster123.wzu3rmn.mongodb.net/customer_details')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// API for saving data
let apiHitTracker = {}; // Track API hits

app.post('/db-save', async (req, res) => {
  const { customer_name, dob, monthly_income } = req.body;

  // Validate input
  if (!customer_name || !dob || !monthly_income) {
    return res.status(400).send({ message: 'All para are required' });
  }

  // Age check for the customers
  const age = new Date().getFullYear() - new Date(dob).getFullYear();
  if (age < 15) {
    return res.status(400).send({ message: 'Age must be above 15' });
  }


  const currentTime = new Date();
  if (apiHitTracker[customer_name] && (currentTime - apiHitTracker[customer_name] < 2 * 60 * 1000)) {
    return res.status(429).send({ message: 'Maximum limit exceeded' });
  }
  if (!apiHitTracker[customer_name]) apiHitTracker[customer_name] = currentTime;

  // Check 2 hits in 5 mins
  const recentHits = Object.values(apiHitTracker).filter(hitTime => (currentTime - hitTime < 5 * 60 * 1000)).length;
  if (recentHits > 2) {
    return res.status(429).send({ message: 'Too many requests' });
  }

  try {
    const customer = new Customer({ customer_name, dob, monthly_income });
    await customer.save();
    res.status(200).send({ message: 'Customer saved successfully' });
  } catch (error) {
    res.status(500).send({ message: 'Error saving customer', error });
  }
});

// Time based API
app.post('/time-based-api', async (req, res) => {
  const { customer_name, dob, monthly_income } = req.body;

  //Time validation
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hour = now.getHours();

  if (dayOfWeek === 1) { // Monday
    return res.status(403).send({ message: 'Please don’t use this API on Monday' });
  }
  if (hour >= 8 && hour <= 15) {
    return res.status(403).send({ message: 'Please try after 3pm' });
  }

  // Save to database
  try {
    const customer = new Customer({ customer_name, dob, monthly_income });
    await customer.save();
    res.status(200).send({ message: 'Customer saved successfully' });
  } catch (error) {
    res.status(500).send({ message: 'Error saving customer', error });
  }
});

// DB search
app.get('/db-search', async (req, res) => {
  const start = Date.now();
  try {
    const customers = await Customer.find({
      dob: { $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 25)), $lt: new Date(new Date().setFullYear(new Date().getFullYear() - 10)) }
    }).select('customer_name');
    const end = Date.now();
    const timeTaken = (end - start) / 1000;
    res.status(200).send({ customers: customers.map(c => c.customer_name), time_taken: timeTaken });
  } catch (error) {
    res.status(500).send({ message: 'Error retrieving customers', error });
  }
});

// Handle invalid routes
app.use((req, res) => {
  res.status(404).send({ message: 'Invalid route' });
});
