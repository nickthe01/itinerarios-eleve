const path = require('node:path');
const express = require('express');

const publicRoutes = require('./src/routes/public');
const adminRoutes = require('./src/routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'erro_interno' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Itinerários Eleve rodando em http://localhost:${PORT}`);
  });
}

module.exports = app;
