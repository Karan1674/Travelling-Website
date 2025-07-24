const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const port = 3000;


app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));


app.use(cors()); 
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true })); 
app.use(express.static(path.join(__dirname, 'public'))); 


app.get('/', (req, res) => {
res.render('client/layout/index')
});



app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});