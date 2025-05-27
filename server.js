

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



const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS configuration
const allowedOrigins = ['https://frontend-nu-ebon-15.vercel.app'];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// ✅ Handle preflight requests for all routes
app.options('*', cors());

app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));

// Root test route
app.get('/', (req, res) => {
  res.send('Backend is running.');
});

// DB (update path as needed)
const pool = require('../db');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
