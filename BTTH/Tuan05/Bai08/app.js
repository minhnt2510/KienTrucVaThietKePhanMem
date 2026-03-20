const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3000;

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

app.get('/', (req, res) => {
  connection.connect((err) => {
    if (err) {
      res.send('Error connecting to MySQL: ' + err.stack);
      return;
    }
    res.send('Connected to MySQL successfully!');
  });
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
