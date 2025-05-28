

// const express = require('express');
// const cors = require('cors');
// require('dotenv').config();

// const app = express();

// const allowedOrigins = ['https://frontend-nu-ebon-15.vercel.app'];

// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   credentials: true
// }));

// app.use(express.json());

// app.use('/api/auth', require('./routes/auth'));

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// app.get('/', (req, res) => {
//   res.send('Backend is running.');
// });

// const pool = require('../db'); // or './db' if in same folder



// const express = require('express');
// const cors = require('cors');
// require('dotenv').config();

// const app = express();

// app.use(cors());
// app.use(express.json());

// app.use('/api/auth', require('./routes/auth')); // ✅ Correct

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// app.get('/', (req, res) => {
//   res.send('Backend is running.');
// });

// const pool = require('../db'); // or './db' if in same folder

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ CORS: only allow your frontend
const allowedOrigins = ['https://frontend-nu-ebon-15.vercel.app'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ✅ Preflight handler
app.options('*', cors());

app.use(express.json());

// ✅ API routes
app.use('/api/auth', require('./routes/auth'));

// ✅ Test route
app.get('/', (req, res) => {
  res.send('Backend is running.');
});

// ✅ DB connection
const pool = require('./db'); // adjust if needed

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
