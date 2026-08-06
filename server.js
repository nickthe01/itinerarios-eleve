const path = require('node:path');
const express = require('express');

require('./src/db');
require('./src/seed');

const publicRoutes = require('./src/routes/public');
const adminRoutes = require('./src/routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`Itinerários Eleve rodando em http://localhost:${PORT}`);
});
