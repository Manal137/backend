

// const express = require('express');
// const cors = require('cors');
// require('dotenv').config();

// const app = express();

// // ✅ CORS configuration
// const allowedOrigins = ['https://frontend-nu-ebon-15.vercel.app'];

// const corsOptions = {
//   origin: function (origin, callback) {
//     // allow requests with no origin like mobile apps or curl
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: true
// };

// app.use(cors(corsOptions));

// // ✅ Apply express.json BEFORE routes
// app.use(express.json());

// // ✅ Routes
// app.use('/api/auth', require('./routes/auth'));

// // ✅ Health check
// app.get('/', (req, res) => {
//   res.send('Backend is running.');
// });

// // ✅ DB connection
// const pool = require('./db');

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });




const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

const allowedOrigins = ['https://frontend-nu-ebon-15.vercel.app'];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));

// Health check
app.get('/', (req, res) => {
  res.send('Backend is running.');
});

const pool = require('./db');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
