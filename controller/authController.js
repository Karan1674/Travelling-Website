import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import adminModel from '../models/adminModel.js';
import agentModel from '../models/agentModel.js';
import userModel from '../models/userModel.js';
import crypto from 'crypto';


export const homePage = async (req, res) => {
    try {
        const token = req.cookies?.authToken;

        if (token) {
            const decoded = jwt.verify(token, process.env.SECRET_KEY);
            const userId = decoded.userId;

            let loginedUserData = await adminModel.findById(userId);
            if (loginedUserData) {
                return res.redirect('/AdminDashboard');
            }

            loginedUserData = await agentModel.findById(userId);
            if (loginedUserData) {
                return res.redirect('/AdminDashboard');
            }

            loginedUserData = await userModel.findById(userId);
            if (loginedUserData) {
                return res.redirect('/UserDashboard');
            }

            res.clearCookie('authToken');
        }

   
        return res.render('client/layout/Home');
    } catch (error) {
        console.error("Home page error:", error);
        return res.status(500).render('client/layout/Home', { error: "Internal server error" });
    }
};


// Register a Admin
export const adminRegister = async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone } = req.body;

        const existingAdmin = await adminModel.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ message: 'Admin already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = new adminModel({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            phone,
        });

        await newAdmin.save();
        res.status(201).json({ message: 'Admin registered successfully' });

    } catch (error) {
        console.error('Admin Register Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};


export const getSignupPage = async(req, res) => {
    try {
        return res.render('shared/layout/sign-up');
    } catch (error) {
        console.error("Error rendering sign page:", error);
        res.status(500).send("Internal Server Error");
    }
};




export const signupUser = async (req, res) => {
    try {


        const { firstName, lastName, email, password, phone } = req.body;

       
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

 
        let profilePicPath = '';
        if (req.file) {
            profilePicPath = req.file.filename;
        }

        // Create new user
        const newUser = new userModel({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            phone,
            profilePic: profilePicPath,
        });

 
        await newUser.save();

        res.redirect('/loginPage') ;
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Server error during signup' });
    }
};



export const loginPage = async (req, res) => {
    try {
        const token = req.cookies?.authToken;

        if (!token) {
            return res.render('shared/layout/login');
        }
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userId = decoded.userId;

        if(!userId){
            return res.render('shared/layout/login');
        }
        let loginedUserData = await adminModel.findById(userId);
        if (loginedUserData) {
            return res.redirect('/AdminDashboard');
        }
        if (!loginedUserData) {
            loginedUserData = await agentModel.findById(userId);
            if (loginedUserData) {
                return res.redirect('/AdminDashboard');
            }
            if (!loginedUserData) {
                loginedUserData = await userModel.findById(userId);
                return res.redirect('/UserDashboard');
            }
        }

        res.clearCookie('authToken');
        return res.render('shared/layout/login', { error: "Invalid session" });

    } catch (error) {
        console.error("Error rendering login page:", error);
        res.status(500).send("Internal Server Error");
    }
};


export const loginUserOrAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        let userData = await adminModel.findOne({ email });
        let role = 'admin'

        if (!userData) {
            userData = await agentModel.findOne({ email });
            role = 'admin'
        }

        
        if (!userData) {
            userData = await userModel.findOne({ email });
            role = 'User'
        }

        if (!userData) {
            return res.status(400).redirect('/loginPage');
        }


        const isMatch = await bcrypt.compare(password, userData.password);
        if (!isMatch) {
            return res.status(400).redirect('/loginPage');
        }

        const tokenData = {
            userId: userData._id,
        };

        const token = jwt.sign(tokenData, process.env.SECRET_KEY, {
            expiresIn: "1d",
        });


        // Save token in cookie
        res.cookie('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000
        });


        if (role === 'admin') {
            return res.redirect('/AdminDashboard',);
        } else if(role==='User') {
            return res.redirect('/userDashboard');
        }
        else{
            return res.redirect('/loginPage')
        }

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).redirect('/loginPage');
    }
};



export const logoutUser = async (req, res) => {
    try {
        res.clearCookie("authToken");
        return res.redirect("/?message=Logout successful&type=success");
    } catch (error) {
        console.log("error", error);
    }
};



export const forgetPasswordPage = async (req, res) => {
    try {
        res.render('shared/layout/forget');
    } catch (error) {
        console.error('Error rendering forget password page:', error);
        res.status(500).send('Server error');
    }
};



export const forgetPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Check both User and Admin models
        let user = await agentModel.findOne({ email });
        let userType = 'Agent';
        if (!user) {
            user = await adminModel.findOne({ email });
            userType = 'Admin';
        }
        if(!user){
            user = await userModel.findOne({ email });
            userType = 'User';
        }
        if (!user) {
            return res.status(404).json({ error: 'No user found with this email' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour expiry

        // Save token and expiry
        user.resetPasswordToken = resetTokenHash;
        user.resetPasswordExpires = resetTokenExpiry;
        await user.save();

        // Create reset URL with query parameters
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}&type=${userType}`;
        console.log(`Reset URL for ${email} (${userType}): ${resetUrl}`); // Log for debugging

        // Render confirmation page with reset URL
        res.render('shared/layout/forget-confirmation', { resetUrl, email });
    } catch (error) {
        console.error('Error in forgetPassword:', error);
        res.status(500).json({ error: 'Failed to process password reset request' });
    }
};



export const resetPasswordPage = async (req, res) => {
    try {
        const { token, type } = req.query; // Get token and type from query parameters

        // Validate query parameters
        if (!token || !type || !['User','Agent', 'Admin'].includes(type)) {
            return res.status(400).send('Invalid or missing reset token or user type');
        }

        // Verify token
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        let user;
        if (type === 'Admin') {
            user = await adminModel.findOne({
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: Date.now() },
            });
        } else if(type === 'Agent') {
            user = await agentModel.findOne({
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: Date.now() },
            });
        }
        else if(type === 'User') {
            user = await userModel.findOne({
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: Date.now() },
            });

        }

        if (!user) {
            return res.status(400).send('Invalid or expired reset token');
        }

        res.render('shared/layout/reset-password', { token, userType: type });
    } catch (error) {
        console.error('Error rendering reset password page:', error);
        res.status(500).send('Server error');
    }
};



export const resetPassword = async (req, res) => {
    try {
        const { token, type } = req.query; // Get token and type from query parameters
        const { password, confirmPassword } = req.body;

        // Validate input
        if (!token || !type || !['User','Agent', 'Admin'].includes(type)) {
            return res.status(400).json({ error: 'Invalid or missing reset token or user type' });
        }
        if (!password || !confirmPassword) {
            return res.status(400).json({ error: 'Both password fields are required' });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        // Verify token
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        let user;
        if (type === 'Admin') {
            user = await adminModel.findOne({
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: Date.now() },
            });
        } else  if (type === 'Agent') {
            user = await agentModel.findOne({
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: Date.now() },
            });
        }
        else  if (type === 'User') {
            user = await userModel.findOne({
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: Date.now() },
            });
        }

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Update password
        user.password = await bcrypt.hash(password, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        console.log(`Password reset successfully for ${user.email} (${type})`);
        res.redirect('/loginPage');
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
};
