const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const jwt = require('jsonwebtoken');
const { jwtSecret } = require('./src/config/auth');
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const vehicleRoutes = require('./src/routes/vehicleRoutes');
const partRoutes = require('./src/routes/partRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const auditRoutes = require('./src/routes/auditRoutes');
const marcaRoutes = require('./src/routes/marcaRoutes');
const modeloRoutes = require('./src/routes/modeloRoutes');
const categoriaPecaRoutes = require('./src/routes/categoriaPecaRoutes');
const fornecedorRoutes = require('./src/routes/fornecedorRoutes');
const ordemCompraRoutes = require('./src/routes/ordemCompraRoutes');

const errorHandler = require('./src/middlewares/errorHandler');
const swaggerSetup = require('./src/utils/swagger');
const staleOrdersJob = require('./src/jobs/notifyStaleOrders');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';
const corsOrigin = process.env.CORS_ORIGIN;

if (isProduction && (!corsOrigin || !String(corsOrigin).trim())) {
  throw new Error('Variável obrigatória ausente em produção: CORS_ORIGIN');
}

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      scriptSrcAttr: ["'unsafe-inline'"]
    }
  }
}));
app.use(cors({
  origin: corsOrigin || (process.env.NODE_ENV === 'development' ? '*' : false)
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 100,
  message: { error: 'Muitas requisições. Tente novamente mais tarde.' }
});
app.use('/api/', limiter);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/parts', partRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/marcas', marcaRoutes);
app.use('/api/modelos', modeloRoutes);
app.use('/api/categorias-pecas', categoriaPecaRoutes);
app.use('/api/fornecedores', fornecedorRoutes);
app.use('/api', ordemCompraRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/login.html', (req, res) => {
  res.redirect('/');
});
app.get('/index.html', (req, res) => {
  res.redirect('/app');
});
app.get('/app', (req, res) => {
  const token = req.query.token;
  if (token) {
    try {
      jwt.verify(token, jwtSecret);
      return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } catch (err) {
      return res.redirect('/');
    }
  }
  res.redirect('/');
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

if (process.env.NODE_ENV === 'production') {
  app.use('/api-docs', (req, res) => {
    res.status(404).json({ error: 'Swagger desativado em produção' });
  });
} else {
  app.use('/api-docs', swaggerSetup);
}

staleOrdersJob.start();

app.use(errorHandler);

module.exports = app;
