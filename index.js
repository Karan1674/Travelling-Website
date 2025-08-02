const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const connectDB = require('./config/db');
const app = express();
const port = 8000;
const dotenv = require('dotenv')
const cookieParser = require("cookie-parser");
dotenv.config();

const adminRoutes = require('./routes/adminRoute');
const authRoutes = require('./routes/authRoutes');
const clientRoutes = require('./routes/clientRoutes');

app.use(cookieParser());


app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));


app.use(cors()); 
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true })); 
// app.use(express.static(path.join(__dirname, 'public')));
app.use("/uploads", express.static("uploads"));

app.use(express.static('public'))

connectDB()



app.use('',authRoutes)
app.use('',adminRoutes)
app.use('',clientRoutes)

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});