const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const app = express();

dotenv.config(); // Load env vars

// ✅ Allow only specific frontend origin
const allowedOrigins = ['https://frontend-nu-ebon-15.vercel.app'];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // If you're using cookies or auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

// ✅ CORS comes FIRST
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Preflight for all routes

// ✅ JSON parsing middleware
app.use(express.json());

// ✅ Connect to DB
const pool = require('./db'); // Corrected relative path if needed

// ✅ Routes
app.use('/api/auth', require('./routes/auth'));

// ✅ Health check route
app.get('/', (req, res) => {
  res.send('Backend is running.');
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
