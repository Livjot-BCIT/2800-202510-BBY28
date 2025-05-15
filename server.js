const express = require('express');
const path = require('path');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.render('index'));
app.get('/shop', (req, res) => res.render('shop'));
app.get('/profile', (req, res) => res.render('profile'));
app.get('/about', (req, res) => res.render('about'));

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
