import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import adminModel from '../models/adminModel.js';
import agentModel from '../models/agentModel.js';
import userModel from '../models/userModel.js';
import crypto from 'crypto';

// Render Home Page
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


        return res.render('client/layout/Home', { user: null, message: req.session?.message, type: req.session?.type });
    } catch (error) {
        console.error("Home page error:", error);
        req.session = req.session || {};
        req.session.message = 'Internal server error';
        req.session.type = 'error';
        res.status(500).redirect('/error')
    }
};

// Admin Registration 
export const adminRegister = async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone } = req.body;

        const existingAdmin = await adminModel.findOne({ email });
        if (existingAdmin) {
            req.session = req.session || {};
            req.session.message = 'Admin already exists';
            req.session.type = 'error';
            return res.redirect('/signupPage');
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
        req.session = req.session || {};
        req.session.message = 'Admin registered successfully';
        req.session.type = 'success';
        res.redirect('/loginPage');
    } catch (error) {
        console.error('Admin Register Error:', error);
        req.session = req.session || {};
        req.session.message = 'Server error during registration';
        req.session.type = 'error';
        res.status(500).redirect('/error')
    }
};

// Render Signup page
export const getSignupPage = async (req, res) => {
    try {
        return res.render('shared/layout/sign-up', { message: req.session?.message, type: req.session?.type });
    } catch (error) {
        console.error("Error rendering sign page:", error);
        req.session = req.session || {};
        req.session.message = 'Internal server error';
        req.session.type = 'error';
        res.status(500).redirect('/error')
    }
};

// User Registration
export const signupUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone } = req.body;

        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            req.session = req.session || {};
            req.session.message = 'Email already registered';
            req.session.type = 'error';
            return res.redirect('/signupUser');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let profilePicPath = '';
        if (req.file) {
            profilePicPath = req.file.filename;
        }

        const newUser = new userModel({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            phone,
            profilePic: profilePicPath,
        });

        await newUser.save();
        req.session = req.session || {};
        req.session.message = 'User registered successfully';
        req.session.type = 'success';
        res.redirect('/loginPage');
    } catch (error) {
        console.error('Signup error:', error);
        req.session = req.session || {};
        req.session.message = 'Server error during signup';
        req.session.type = 'error';
        res.status(500).redirect('/error')
    }
};

// Render Login Page
export const loginPage = async (req, res) => {
    try {
        const token = req.cookies?.authToken;

        if (!token) {
            return res.render('shared/layout/login', { message: req.session?.message, type: req.session?.type });
        }
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userId = decoded.userId;

        if (!userId) {
            req.session = req.session || {};
            req.session.message = 'Invalid session';
            req.session.type = 'error';
            return res.render('shared/layout/login', { message: req.session.message, type: req.session.type });
        }
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
        req.session = req.session || {};
        req.session.message = 'Invalid session';
        req.session.type = 'error';
        return res.render('shared/layout/login', { message: req.session.message, type: req.session.type });
    } catch (error) {
        console.error("Error rendering login page:", error);
        req.session = req.session || {};
        req.session.message = 'Internal server error';
        req.session.type = 'error';
        res.status(500).redirect('/error')
    }
};

// User, Admin, Agent Login
export const loginUserOrAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        let userData = await adminModel.findOne({ email });
        let role = 'admin';

        if (!userData) {
            userData = await agentModel.findOne({ email });
            role = 'admin';
        }

        if (!userData) {
            userData = await userModel.findOne({ email });
            role = 'User';
        }

        if (!userData) {
            req.session = req.session || {};
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const isMatch = await bcrypt.compare(password, userData.password);
        if (!isMatch) {
            req.session = req.session || {};
            req.session.message = 'Invalid credentials';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const tokenData = {
            userId: userData._id,
        };

        const token = jwt.sign(tokenData, process.env.SECRET_KEY, {
            expiresIn: "1d",
        });

        res.cookie('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000
        });

        if (role === 'admin') {
            req.session = req.session || {};
            req.session.message = 'Login successful';
            req.session.type = 'success';
            return res.redirect('/AdminDashboard');
        } else if (role === 'User') {
            req.session = req.session || {};
            req.session.message = 'Login successful';
            req.session.type = 'success';
            return res.redirect('/UserDashboard');
        } else {
            req.session = req.session || {};
            req.session.message = 'Invalid role';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }
    } catch (error) {
        console.error("Login Error:", error);
        req.session = req.session || {};
        req.session.message = 'Server error during login';
        req.session.type = 'error';
        res.status(500).redirect('/error')
    }
};

// Logout user, agent, admin
export const logoutUser = async (req, res) => {
    try {
        res.clearCookie("authToken");
        req.session = req.session || {};
        req.session.message = 'Logged out successfully';
        req.session.type = 'success';
        return res.redirect('/');
    } catch (error) {
        console.log("error", error);
        req.session = req.session || {};
        req.session.message = 'Error during logout';
        req.session.type = 'error';
        res.status(500).redirect('/error')
    }
};

// Render forget password Page
export const forgetPasswordPage = async (req, res) => {
    try {
        res.render('shared/layout/forget', { message: req.session?.message || null, type: req.session?.type || null });
    } catch (error) {
        console.error('Error rendering forget password page:', error);
        req.session = req.session || {};
        req.session.message = 'Server error';
        req.session.type = 'error';
        res.status(500).redirect('/error')
    }
};

// Forget Password logic
export const forgetPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            req.session = req.session || {};
            req.session.message = 'Email is required';
            req.session.type = 'error';
            return res.redirect('/forgetPasswordPage');
        }

        let user = await agentModel.findOne({ email });
        let userType = 'Agent';
        if (!user) {
            user = await adminModel.findOne({ email });
            userType = 'Admin';
        }
        if (!user) {
            user = await userModel.findOne({ email });
            userType = 'User';
        }
        if (!user) {
            req.session = req.session || {};
            req.session.message = 'No user found with this email';
            req.session.type = 'error';
            return res.redirect('/forgetPasswordPage');
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetTokenExpiry = Date.now() + 60 * 60 * 1000;

        user.resetPasswordToken = resetTokenHash;
        user.resetPasswordExpires = resetTokenExpiry;
        await user.save();

        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}&type=${userType}`;
        console.log(`Reset URL for ${email} (${userType}): ${resetUrl}`);

        req.session = req.session || {};
        req.session.message = 'Password reset link sent';
        req.session.type = 'success';
        res.render('shared/layout/forget-confirmation', { resetUrl, email, message: req.session?.message || null, type: req.session?.type || null });
    } catch (error) {
        console.error('Error in forgetPassword:', error);
        req.session = req.session || {};
        req.session.message = 'Failed to process password reset request';
        req.session.type = 'error';
        res.status(500).redirect('/error')
    }
};

// Render Reset Password Page
export const resetPasswordPage = async (req, res) => {
    try {
        const { token, type } = req.query;

        if (!token || !type || !['User', 'Agent', 'Admin'].includes(type)) {
            req.session = req.session || {};
            req.session.message = 'Invalid or missing reset token or user type';
            req.session.type = 'error';
            return res.render('shared/layout/reset-password', { message: req.session.message, type: req.session.type });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        let user;
        if (type === 'Admin') {
            user = await adminModel.findOne({
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: Date.now() },
            });
        } else if (type === 'Agent') {
            user = await agentModel.findOne({
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: Date.now() },
            });
        } else if (type === 'User') {
            user = await userModel.findOne({
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: Date.now() },
            });
        }

        if (!user) {
            req.session = req.session || {};
            req.session.message = 'Invalid or expired reset token';
            req.session.type = 'error';
            return res.render('shared/layout/reset-password', { message: req.session.message, type: req.session.type });
        }

        res.render('shared/layout/reset-password', { token, userType: type, message: req.session?.message || null, type: req.session?.type || null });
    } catch (error) {
        console.error('Error rendering reset password page:', error);
        req.session = req.session || {};
        req.session.message = 'Server error';
        req.session.type = 'error';
        res.status(500).redirect('/error')
    }
};

// Reset password Logic
export const resetPassword = async (req, res) => {
    try {
        const { token, type } = req.query;
        const { password, confirmPassword } = req.body;

        if (!token || !type || !['User', 'Agent', 'Admin'].includes(type)) {
            req.session = req.session || {};
            req.session.message = 'Invalid or missing reset token or user type';
            req.session.type = 'error';
            return res.redirect(`/reset-password?token=${token}&type=${type}`);
        }
        if (!password || !confirmPassword) {
            req.session = req.session || {};
            req.session.message = 'Both password fields are required';
            req.session.type = 'error';
            return res.redirect(`/reset-password?token=${token}&type=${type}`);
        }
        if (password !== confirmPassword) {
            req.session = req.session || {};
            req.session.message = 'Passwords do not match';
            req.session.type = 'error';
            return res.redirect(`/reset-password?token=${token}&type=${type}`);
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        let user;
        if (type === 'Admin') {
            user = await adminModel.findOne({
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: Date.now() },
            });
        } else if (type === 'Agent') {
            user = await agentModel.findOne({
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: Date.now() },
            });
        } else if (type === 'User') {
            user = await userModel.findOne({
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: Date.now() },
            });
        }

        if (!user) {
            req.session = req.session || {};
            req.session.message = 'Invalid or expired reset token';
            req.session.type = 'error';
            return res.redirect(`/reset-password?token=${token}&type=${type}`);
        }

        user.password = await bcrypt.hash(password, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        console.log(`Password reset successfully for ${user.email} (${type})`);
        req.session = req.session || {};
        req.session.message = 'Password reset successfully';
        req.session.type = 'success';
        res.redirect('/loginPage');
    } catch (error) {
        console.error('Error resetting password:', error);
        req.session = req.session || {};
        req.session.message = 'Failed to reset password';
        req.session.type = 'error';
        res.status(500).redirect('/error')
    }
};

// Toast Messages in session Clear Logic
export const clearSessionMessage = async (req, res) => {
    try {
        req.session = req.session || {};
        req.session.message = null;
        req.session.type = null;
        res.status(200).send('Session message cleared');
    } catch (error) {
        console.error('Error clearing session message:', error);
        res.status(500).redirect('/error')
    }
};

// Render Error Page 
export const getErrorPage = async (req, res) => {
    try {
        const status = parseInt(req.query.status) || 500;
        const textMessage = req.query.message || 'Something Went Wrong';

        res.status(status).render('shared/layout/error', {
            status,
            textMessage,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error rendering error page:', error);
        req.session = req.session || {};
        req.session.message = 'Error rendering error page';
        req.session.type = 'error';
        res.status(500).render('shared/layout/error', {
            status: 500,
            textMessage: 'Internal Server Error',
            message: req.session.message,
            type: req.session.type
        });
    }
};
