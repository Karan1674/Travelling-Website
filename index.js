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


const session = require('express-session');
const { notFoundPage } = require('./controller/authController');

app.use(session({
    secret: process.env.SESSION_SECRET ,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 
    }
}));



app.use(cookieParser());


app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));


app.use(cors()); 
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true })); 
app.use("/uploads", express.static("uploads"));

app.use(express.static('public'))

connectDB()



app.use('',authRoutes)
app.use('',adminRoutes)
app.use('',clientRoutes)

// Render 404 Page 
app.use(async (req, res, next) => {
    try {
        res.render('shared/layout/404', {
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error rendering 404 page:', error);
        req.session = req.session || {};
        req.session.message = 'Error rendering error page';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});