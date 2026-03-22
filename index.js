require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { handleIncoming } = require('./core/handler');
const { initWhatsAppWeb } = require('./core/whatsapp-web');
const dashboard = require('./web/routes');

const PORT = process.env.PORT || 3000;

app.use('/dashboard', dashboard);
app.get('/', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`\n🤖 Bot running on port ${PORT}`);
  console.log(`🖥️  Dashboard: http://localhost:${PORT}/dashboard\n`);
  initWhatsAppWeb(handleIncoming);
});

module.exports = app;
