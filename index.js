const express = require("express")
const cors = require("cors")
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const arbitrageRoutes = require('./routes/arbitrageRoutes');



const app = express();
const port = 5000;



// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/arbitrage', arbitrageRoutes);




// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});