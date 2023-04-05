const fs = require('fs');
require('dotenv').config();
const cors = require('cors');
const logger = require('./services/logger');

const url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.wpxhvxd.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const usersRoutes = require('./routes/users-routes');
const projectsRoutes = require('./routes/projects-routes');
const HttpError = require('./models/http-error');

const app = express();

app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({extended: true}));

const corsOptions = {
  "origin": "*",
    "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
    "preflightContinue": false,
    "optionsSuccessStatus": 200,
    "exposedHeaders": ['Content-Length', 'X-Requested-With', ' Authorization','Content-Type'],
}
  
app.use(cors(corsOptions))

app.use('/projects', projectsRoutes);
app.use('/users', usersRoutes);

app.use((req, res, next) => {
  const error = new HttpError('Could not find this route.', 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, err => {
      console.log(err);
    });
  }
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || 'An unknown error occurred!' });
});

mongoose
  .connect(
    url,
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => {
    app.listen(process.env.PORT || 5000);
    logger.info(`server starts at ${process.env.PORT || 5000}`)
  })
  .catch(err => {
    console.log(err);
  });
