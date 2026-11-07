const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { env } = require('./config');
const { errorHandler, generalLimiter } = require('./middleware');
const routes = require('./routes');

const app = express();

app.set('trust proxy', env.trustProxy);
app.use(helmet());

const corsConCredenciales = {
  credentials: true,
  origin: env.cors.origin === '*'
    ? (origin, callback) => callback(null, origin || false)
    : env.cors.origin
};
app.use(cors(corsConCredenciales));

app.use(cookieParser());
app.use(generalLimiter);
if (env.nodeEnv !== 'production') {
  app.use(morgan('dev'));
}
app.use(express.json({ limit: '100kb' }));

app.use(routes);

app.use(errorHandler);

if (require.main === module) {
  app.listen(env.port, () => {
    console.log(`Servidor JEBO 2026 corriendo en puerto ${env.port}`);
  });
}

module.exports = app;
