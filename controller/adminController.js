import adminModel from '../models/adminModel.js';

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import userModel from '../models/userModel.js';

import { promises as fs } from 'fs'
 import { dirname, join } from 'path'
 import { fileURLToPath } from 'url';
import { uploadGallery } from '../middleware/multer.js';
import packageModel from '../models/packageModel.js';

 const __dirname = dirname(fileURLToPath(import.meta.url));

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


export const loginPage = async (req, res) => {
    try {
        const token = req.cookies?.authToken;

        if (!token) {
            return res.render('admin/layout/login');
        }
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userId = decoded.userId;
        const adminData = await adminModel.findById(userId);
        if (adminData) {
            return res.redirect('/dashboard');
        }

        const userData = await userModel.findById(userId);
        if (userData) {
            return res.redirect('/dashboard');
        }

        res.clearCookie('authToken');
        return res.render('admin/layout/login', { error: "Invalid session" });

    } catch (error) {
        console.error("Error rendering login page:", error);
        res.status(500).send("Internal Server Error");
    }
};


export const loginUserOrAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        let userData = await adminModel.findOne({ email });
    

        if (!userData) {
            userData = await userModel.findOne({ email });
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

        return res.redirect('/dashboard');

        // if (role === 'admin') {
        // } else {
        //     return res.redirect('/userDashboard');
        // }

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


export const dashboard = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin
        if (!userId) {
            return res.redirect('/loginPage'); // Redirect if not authenticated
        }


        const userData = await adminModel.findById(userId);

        res.render('admin/layout/Dashboard', {
            user: userData,
            isAdmin
        });
    } catch (error) {
        console.error("Error loading admin dashboard:", error);
        res.status(500).send("Server error");
    }
};




export const getAllUsers = async (req, res) => {
    try {
        const adminId = req.id;

        const isAdmin = req.isAdmin
        if (!adminId) {
            return res.status(401).send("Unauthorized: Admin ID missing");
        }

        const userData = await adminModel.findById(req.id);
        const users = await userModel.find({ admin: adminId});


        res.render('admin/layout/user', {
            allUsers: users,
            isAdmin,
            user: userData
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send("Internal Server Error");
    }
};


export const getNewUserPage = async (req, res) => {
    const userId = req.id;
    const isAdmin = req.isAdmin
    if (!userId) {
        return res.status(401).send("Unauthorized: Admin ID missing");
    }

    const userData = await adminModel.findById(userId);

    if (!userData && isAdmin) {
        return res.redirect('/dashboard')
    }

    res.render('admin/layout/new-user', {
        isAdmin,
        user: userData
    });
};

export const newUser = async (req, res) => {
    try {

        const adminId = req.id

        const {
            firstName,
            lastName,
            countryCode,
            phone,
            city,
            country,
            password,
            confirmPassword,
            email,
            confirmEmail,

        } = req.body;


        if (!firstName || !lastName || !countryCode || !phone || !city || !country || !email || !confirmEmail || !password || !confirmPassword) {
            console.log("All fields are required.");
            return res.redirect('/new-user?error=All fields are required');
        }

        if (password !== confirmPassword) {
            console.log("Passwords do not match.");
            return res.redirect('/new-user?error=Passwords do not match');
        }

        if (email !== confirmEmail) {
            console.log("Emails do not match.");
            return res.redirect('/new-user?error=Emails do not match');
        }

        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            console.log("User already exists.");
            return res.redirect('/new-user?error=User already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new userModel({
            firstName,
            lastName,
            countryCode,
            phone,
            city,
            country,
            email,
            password: hashedPassword,
            admin: adminId
        });

        await user.save();
        console.log("User registered successfully.");
        return res.redirect('/users?success=User created');
    } catch (error) {
        console.log("User registration error:", error.message);
        return res.redirect('/new-user?error=Internal server error');
    }
};



export const editUserPage=async(req,res)=>{
    try {
        const editUserId = req.query.editUserId
        const userId = req.id;
        const isAdmin = req.isAdmin
        if (!userId) {
            return res.status(401).send("Unauthorized: Admin ID missing");
        }
    
        const userData = await adminModel.findById(userId);
    
        if (!userData && isAdmin) {
            return res.redirect('/dashboard')
        }

        if(!editUserId){
            return res.redirect('/dashboard')
        }

        const editUserData = await userModel.findById(editUserId)
    
        res.render('admin/layout/edit-user', {
            isAdmin,
            user: userData,
            editUser : editUserData
        });

    } catch (error) {
        console.error("Error in editPage:", error);
        res.status(500).send("Internal Server Error");
    }
}



export const editUserPost = async (req, res) => {
    try {
        const isAdmin = req.isAdmin;
        const { editUserId } = req.params;
        const { firstName, lastName, email, phone, countryCode, city, country, state, address, description, day, month, year } = req.body;

        console.log(firstName, lastName, email, phone, countryCode, city, country, state, address, description, day, month, year)
        // Check if user is admin
        if (!isAdmin) {
            console.log("User is not authorized to edit");
            return res.status(403).json({ error: "Unauthorized: Admin access required" });
        }

        // Validate required fields
        if (!firstName || !lastName || !email || !phone || !countryCode) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Construct dateOfBirth if provided
        let dateOfBirth;
        if (day && month && year) {
            dateOfBirth = new Date(`${year}-${month}-${day}`);
            if (isNaN(dateOfBirth)) {
                return res.status(400).json({ error: "Invalid date of birth" });
            }
        }

        // Build the update object
        const editUser = {
            firstName,
            lastName,
            email,
            phone,
            countryCode,
            city,
            country,
            state,
            address,
            description,
            ...(dateOfBirth && { dateOfBirth }), 
        };

 
        if (req.file) {
            editUser.profilePic = req.file.filename;
        }


        const updatedUser = await userModel.findByIdAndUpdate(
            editUserId,
            { $set: editUser },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        console.log("User updated successfully");
        res.redirect('/users');
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ error: "Failed to update user" });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const isAdmin = req.isAdmin;
        const { userId } = req.params;


        if (!isAdmin) {
            console.log("User is not authorized to delete");
            return res.status(403).json({ error: "Unauthorized: Admin access required" });
        }


        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (user.profilePic) {
            const filePath = join(__dirname, '../Uploads/profiles', user.profilePic);
            try {
                await fs.unlink(filePath);
                console.log(`Profile picture deleted: ${filePath}`);
            } catch (fileError) {
                console.error(`Error deleting profile picture: ${fileError.message}`);
            }
        }


        await userModel.findByIdAndDelete(userId);

        console.log("User deleted successfully");
        res.redirect('/users');
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ error: "Failed to delete user" });
    }
};


export const forgetPasswordPage = async (req, res) => {
    try {
        res.render('admin/layout/forget');
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
        let user = await userModel.findOne({ email });
        let userType = 'User';
        if (!user) {
            user = await adminModel.findOne({ email });
            userType = 'Admin';
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
        res.render('admin/layout/forget-confirmation', { resetUrl, email });
    } catch (error) {
        console.error('Error in forgetPassword:', error);
        res.status(500).json({ error: 'Failed to process password reset request' });
    }
};

export const resetPasswordPage = async (req, res) => {
    try {
        const { token, type } = req.query; // Get token and type from query parameters

        // Validate query parameters
        if (!token || !type || !['User', 'Admin'].includes(type)) {
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
        } else {
            user = await userModel.findOne({
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: Date.now() },
            });
        }

        if (!user) {
            return res.status(400).send('Invalid or expired reset token');
        }

        res.render('admin/layout/reset-password', { token, userType: type });
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
        if (!token || !type || !['User', 'Admin'].includes(type)) {
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
        } else {
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









export const addPackagePage = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        if(!userId){
            return res.send('User Id not available')
        }

        let userData = await adminModel.findById( userId );
    
        if (!userData) {
            userData = await userModel.findById( userId );
        }
        

        if (!userData) {
            return res.status(400).redirect('/loginPage');
        }
    
        res.render('admin/layout/addPackages',{
            isAdmin,
            user:userData

        });
    } catch (error) {
        console.error('Error rendering add package page:', error);
        res.status(500).send('Server error');
    }
};

export const addPackage = async (req, res) => {
  
        try {
            const { title, description, groupSize, days, nights, category, salePrice, regularPrice, discount, itineraryDescription, itineraryDays, status, keywords, additionalCategories, additionalCategoriesInput, mapType, apiKey, departureLocation, departureDateTime } = req.body;
            let adminId;
            if(req.isAdmin){
                
             adminId = req.id; // Assume auth middleware sets req.user
            }
            else{
                const userData = await userModel.findById(req.id);
                if(userData){
                    adminId = userData.admin
                }
            }

            if (!title || !description || !groupSize || !days || !nights || !category || !regularPrice || !departureLocation || !departureDateTime) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            let parsedItineraryDays = [];
            if (itineraryDays) {
                parsedItineraryDays = Array.isArray(itineraryDays) ? itineraryDays : JSON.parse(itineraryDays || '[]');
                parsedItineraryDays = parsedItineraryDays.map((day, index) => ({
                    dayNumber: index + 1,
                    title: day.title,
                    description: day.description,
                }));
            }

            // Combine checkbox and custom input categories
            let allCategories = Array.isArray(additionalCategories) ? additionalCategories : additionalCategories ? [additionalCategories] : [];
            if (additionalCategoriesInput) {
                allCategories.push(...additionalCategoriesInput.split(',').map(c => c.trim()).filter(c => c));
            }

            const totalDays = Number(days) + Number(nights);

            const packageData = {
                title,
                description,
                groupSize: Number(groupSize),
                tripDuration: {
                    days: Number(days),
                    nights: Number(nights),
                },
                category,
                salePrice,
                regularPrice,
                discount,
                gallery: req.files && req.files['gallery'] ? req.files['gallery'].map(file => file.filename) : [],
                featuredImage: req.files && req.files['featuredImage'] ? req.files['featuredImage'][0].filename : null,
                map: {
                    type: mapType || 'Google Map',
                    apiKey,
                },
                keywords: keywords ? keywords.split(',').map(k => k.trim()).filter(k => k) : [],
                additionalCategories: allCategories,
                departure: {
                    location: departureLocation,
                    dateTime: new Date(departureDateTime),
                },
                itinerary: {
                    title: 'Program',
                    duration: `${totalDays} days`,
                    description: itineraryDescription,
                    days: parsedItineraryDays,
                },
                adminId,
                // createdId: adminId,
                status
            };

            const packagePacket = new packageModel(packageData);
            await packagePacket.save();

    
            res.redirect('/db-all-packages');
        } catch (error) {
            console.error('Error adding package:', error);
            res.status(500).json({ error: 'Failed to add package' });
        }
   
};


export const allPackages = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        let createdId=req.id
        if (!userId) {
            return res.send('User Id not available');
        }

        let userData = await adminModel.findById(userId);
        if (!userData) {
            userData = await userModel.findById(userId);
            createdId = userData.admin
        }

        if (!userData) {
            return res.status(400).redirect('/loginPage');
        }

        const allPackages = await packageModel.find({ adminId: createdId }).lean();
        console.log()
        res.render('admin/layout/allPackages', { allPackages,isAdmin, user:userData });
    } catch (error) {
        console.error('Error fetching all packages:', error);
        res.status(500).send('Server error');
    }
};

export const editPackagePage = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        if(!userId){
            return res.send('User Id not available')
        }

        let userData = await adminModel.findById( userId );
    

        if (!userData) {
            userData = await userModel.findById( userId );
        }


        if (!userData) {
            return res.status(400).redirect('/loginPage');
        }

        const packagePacket = await packageModel.findById(req.params.id);
        if (!packagePacket) {
            return res.status(404).send('Package not found');
        }
        res.render('admin/layout/edit-package', { packagePacket, isAdmin, user:userData });
    } catch (error) {
        console.error('Error rendering edit package page:', error);
        res.status(500).send('Server error');
    }
};


export const editPackage = async (req, res) => {
  
        try {
            const { title, description, groupSize, days, nights, category, salePrice, regularPrice, discount, itineraryDescription, itineraryDays, status, keywords, additionalCategories, additionalCategoriesInput, mapType, apiKey, departureLocation, departureDateTime } = req.body;
            const packagePacket = await packageModel.findById(req.params.id);
            if (!packagePacket) {
                return res.status(404).json({ error: 'Package not found' });
            }

            let parsedItineraryDays = [];
            if (itineraryDays) {
                parsedItineraryDays = Array.isArray(itineraryDays) ? itineraryDays : JSON.parse(itineraryDays || '[]');
                parsedItineraryDays = parsedItineraryDays.map((day, index) => ({
                    dayNumber: index + 1,
                    title: day.title,
                    description: day.description,
                }));
            }

            let allCategories = Array.isArray(additionalCategories) ? additionalCategories : additionalCategories ? [additionalCategories] : [];
            if (additionalCategoriesInput) {
                allCategories.push(...additionalCategoriesInput.split(',').map(c => c.trim()).filter(c => c));
            }

            const totalDays = Number(days) + Number(nights);

            packagePacket.title = title;
            packagePacket.description = description;
            packagePacket.groupSize = Number(groupSize);
            packagePacket.tripDuration = { days: Number(days), nights: Number(nights) };
            packagePacket.category = category;
            packagePacket.salePrice = salePrice;
            packagePacket.regularPrice = regularPrice;
            packagePacket.discount = discount;
            packagePacket.gallery = req.files && req.files['gallery'] ? req.files['gallery'].map(file => file.filename) : packagePacket.gallery;
            packagePacket.featuredImage = req.files && req.files['featuredImage'] ? req.files['featuredImage'][0].filename : packagePacket.featuredImage;
            packagePacket.map = { type: mapType || 'Google Map', apiKey };
            packagePacket.keywords = keywords ? keywords.split(',').map(k => k.trim()).filter(k => k) : packagePacket.keywords;
            packagePacket.additionalCategories = allCategories;
            packagePacket.departure = {
                location: departureLocation,
                dateTime: new Date(departureDateTime),
            };
            packagePacket.itinerary = {
                title: 'Program',
                duration: `${totalDays} days`,
                description: itineraryDescription,
                days: parsedItineraryDays,
            };
            packagePacket.status = status 

            await packagePacket.save();

            console.log(`Package ${title} updated by admin ${req.user._id} with status ${packagePacket.status}`);
            res.redirect('/db-all-package');
        } catch (error) {
            console.error('Error updating package:', error);
            res.status(500).json({ error: 'Failed to update package' });
        }

};



