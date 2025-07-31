import adminModel from '../models/adminModel.js';
import agentModel from '../models/agentModel.js';
import packageModel from '../models/packageModel.js';

import bcrypt from 'bcrypt';
import { promises as fs } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));



export const AdminDashboard = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin
        if (!userId) {
            return res.redirect('/loginPage'); // Redirect if not authenticated
        }


        const userData = await adminModel.findById(userId);

        res.render('admin/layout/AdminDashboard', {
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
        const { page = 1, search = '' } = req.query;
        const limit = 10; // Users per page
        const pageNum = Math.max(1, Number(page)); // Ensure page is at least 1
        const skip = (pageNum - 1) * limit; // Calculate skip, never negative
        const adminId = req.id;
        const isAdmin = req.isAdmin;

        if (!adminId) {
            return res.status(401).redirect('/loginPage');
        }

        const userData = await adminModel.findById(adminId);
        if (!userData) {
            return res.status(401).redirect('/loginPage');
        }

        let query = { admin: adminId };

        // Add search filter
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } }
            ]; // Case-insensitive search on firstName or lastName
        }

        // Get total count for pagination
        const totalUsers = await agentModel.countDocuments(query);
        const totalPages = Math.ceil(totalUsers / limit) || 1; // Ensure at least 1 page

        // Fetch paginated users
        const users = await agentModel
            .find(query)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();

        res.render('admin/layout/user', {
            allUsers: users,
            search,
            currentPage: pageNum,
            totalPages,
            isAdmin,
            user: userData
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
            return res.status(500).json({ error: 'Failed to fetch users' });
        }
        res.status(500).redirect('/loginPage');
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
        return res.redirect('/AdminDashboard')
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

        const existingUser = await agentModel.findOne({ email });
        if (existingUser) {
            console.log("User already exists.");
            return res.redirect('/new-user?error=User already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new agentModel({
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
        return res.redirect('/db-admin-created-users?success=User created');
    } catch (error) {
        console.log("User registration error:", error.message);
        return res.redirect('/new-user?error=Internal server error');
    }
};



export const editUserPage = async (req, res) => {
    try {
        const editUserId = req.query.editUserId
        const userId = req.id;
        const isAdmin = req.isAdmin
        if (!userId) {
            return res.status(401).send("Unauthorized: Admin ID missing");
        }

        const userData = await adminModel.findById(userId);

        if (!userData && isAdmin) {
            return res.redirect('/AdminDashboard')
        }

        if (!editUserId) {
            return res.redirect('/AdminDashboard')
        }

        const editUserData = await agentModel.findById(editUserId)

        res.render('admin/layout/edit-user', {
            isAdmin,
            user: userData,
            editUser: editUserData
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
            const user = await agentModel.findById(editUserId);
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
        }



        const updatedUser = await agentModel.findByIdAndUpdate(
            editUserId,
            { $set: editUser },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        console.log("User updated successfully");
        res.redirect('/db-admin-created-users');
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


        const user = await agentModel.findById(userId);
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


        await agentModel.findByIdAndDelete(userId);

        console.log("User deleted successfully");
        res.redirect('/db-admin-created-users');
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ error: "Failed to delete user" });
    }
};


// Validation function for package data
const validatePackage = (data, isActive) => {
    const errors = [];

    // Always required fields (as per schema)
    if (!data.title) errors.push('Title is required');
    if (!data.adminId) errors.push('Admin ID is required');
    if (!data.status || !['Pending', 'Active', 'Expired'].includes(data.status)) {
        errors.push('Valid status is required');
    }

    // Additional validation for fields that are not strictly required by schema
    if (!data.description) errors.push('Description is required');
    if (!data.packageType || !['Adventure', 'Cultural', 'Luxury', 'Family', 'Wellness', 'Eco'].includes(data.packageType)) {
        errors.push('Valid package type is required');
    }

    // Additional fields required for Active status
    if (isActive) {
        if (!data.groupSize || isNaN(data.groupSize) || data.groupSize <= 0) errors.push('Valid group size is required');
        if (!data.tripDuration?.days || isNaN(data.tripDuration.days) || data.tripDuration.days <= 0) errors.push('Valid number of days is required');
        if (!data.tripDuration?.nights || isNaN(data.tripDuration.nights) || data.tripDuration.nights < 0) errors.push('Valid number of nights is required');
        if (!data.category || !['Adult', 'Child', 'Couple'].includes(data.category)) errors.push('Valid category is required');
        if (!data.regularPrice || isNaN(data.regularPrice) || data.regularPrice <= 0) errors.push('Valid regular price is required');
        if (!data.multipleDepartures || !Array.isArray(data.multipleDepartures) || data.multipleDepartures.length === 0) {
            errors.push('At least one departure is required');
        } else {
            data.multipleDepartures.forEach((dep, index) => {
                if (!dep.location) errors.push(`Departure ${index + 1}: Location is required`);
                if (!dep.dateTime || dep.dateTime.toString() === 'Invalid Date') {
                    errors.push(`Departure ${index + 1}: Valid date and time is required`);
                }
            });
        }
        if (!data.itineraryDescription) errors.push('Itinerary description is required');
        if (!data.itineraryDays || !Array.isArray(data.itineraryDays) || data.itineraryDays.length === 0) {
            errors.push('At least one itinerary day is required');
        } else {
            data.itineraryDays.forEach((day, index) => {
                if (!day.title) errors.push(`Itinerary Day ${index + 1}: Title is required`);
                if (!day.description) errors.push(`Itinerary Day ${index + 1}: Description is required`);
                if (!day.dayNumber || isNaN(day.dayNumber) || day.dayNumber <= 0) errors.push(`Itinerary Day ${index + 1}: Valid day number is required`);
            });
        }
        if (!data.inclusions || !Array.isArray(data.inclusions) || data.inclusions.length === 0) errors.push('At least one inclusion is required');
        if (!data.exclusions || !Array.isArray(data.exclusions) || data.exclusions.length === 0) errors.push('At least one exclusion is required');
        if (!data.activityTypes || !Array.isArray(data.activityTypes) || data.activityTypes.length === 0) errors.push('At least one activity type is required');
        if (!data.highlights || !Array.isArray(data.highlights) || data.highlights.length === 0) errors.push('At least one highlight is required');
        if (!data.additionalCategories || !Array.isArray(data.additionalCategories) || data.additionalCategories.length === 0) {
            errors.push('At least one additional category is required');
        }
        if (!data.keywords || !Array.isArray(data.keywords) || data.keywords.length === 0) errors.push('At least one keyword is required');
        if (!data.quote) errors.push('Quote is required');
        if (!data.difficultyLevel || !['Easy', 'Moderate', 'Challenging'].includes(data.difficultyLevel)) {
            errors.push('Valid difficulty level is required');
        }
        if (!data.latitude || isNaN(data.latitude)) errors.push('Valid latitude is required');
        if (!data.longitude || isNaN(data.longitude)) errors.push('Valid longitude is required');
        if (!data.address) errors.push('Address is required');
        if (!data.gallery || !Array.isArray(data.gallery) || data.gallery.length === 0) errors.push('At least one gallery image is required');
        if (!data.featuredImage) errors.push('Featured image is required');
    }

    // Gallery limit check
    if (data.gallery && data.gallery.length > 8) errors.push('Maximum 8 gallery images allowed');

    return errors;
};

// Render add package page
export const addPackagePage = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        if (!userId) {
            return res.status(400).send('User ID not available');
        }

        let userData = await adminModel.findById(userId);
        if (!userData) {
            userData = await agentModel.findById(userId);
        }

        if (!userData) {
            return res.status(400).redirect('/loginPage');
        }

        res.render('admin/layout/addPackages', {
            isAdmin,
            user: userData,
            opencageApiKey: process.env.OPENCAGE_API_KEY,
            packageData: {}, // Empty for new package
        });
    } catch (error) {
        console.error('Error rendering add package page:', error);
        res.status(500).send('Server error');
    }
};

// Handle add package submission
export const addPackage = async (req, res) => {
    try {
        const data = req.body;
        let adminId;
        if (req.isAdmin) {
            adminId = req.id;
        } else {
            const userData = await agentModel.findById(req.id);
            if (userData) {
                adminId = userData.admin;
            }
        }
        if (!adminId) {
            return res.status(400).json({ error: 'Admin ID not found' });
        }
        data.adminId = adminId;
        data.status = data.status || 'Pending';

        // Early validation for multipleDepartures dateTime
        if (data.multipleDepartures) {
            const departures = Array.isArray(data.multipleDepartures) ? data.multipleDepartures : [data.multipleDepartures];
            for (let i = 0; i < departures.length; i++) {
                const dep = departures[i];
                if (!dep.dateTime || new Date(dep.dateTime).toString() === 'Invalid Date') {
                    return res.status(400).json({ error: `Departure ${i + 1}: Valid date and time is required` });
                }
            }

        }

        // Parse arrays and nested objects
        data.multipleDepartures = data.multipleDepartures ? (Array.isArray(data.multipleDepartures) ? data.multipleDepartures : [data.multipleDepartures]).map(dep => ({
            location: dep.location,
            dateTime: new Date(dep.dateTime) // Already validated above
        })) : [];
        data.itineraryDays = data.itineraryDays ? (Array.isArray(data.itineraryDays) ? data.itineraryDays : JSON.parse(data.itineraryDays || '[]')).map((day, index) => ({
            dayNumber: index + 1,
            title: day.title,
            description: day.description,
        })) : [];
        data.inclusions = data.inclusions ? (Array.isArray(data.inclusions) ? data.inclusions : [data.inclusions]).filter(i => i) : [];
        data.exclusions = data.exclusions ? (Array.isArray(data.exclusions) ? data.exclusions : [data.exclusions]).filter(e => e) : [];
        data.activityTypes = data.activityTypes ? (Array.isArray(data.activityTypes) ? data.activityTypes : [data.activityTypes]).filter(a => a) : [];
        data.highlights = data.highlights ? (Array.isArray(data.highlights) ? data.highlights : [data.highlights]).filter(h => h) : [];
        data.additionalCategories = data.additionalCategories ? (Array.isArray(data.additionalCategories) ? data.additionalCategories : [data.additionalCategories]).filter(c => c) : [];
        if (data.additionalCategoriesInput) {
            data.additionalCategories.push(...data.additionalCategoriesInput.split(',').map(c => c.trim()).filter(c => c));
        }
        data.keywords = data.keywords ? data.keywords.split(',').map(k => k.trim()).filter(k => k) : [];
        data.tripDuration = {
            days: Number(data.days) || 0,
            nights: Number(data.nights) || 0,
        };
        data.groupSize = Number(data.groupSize) || undefined;
        data.regularPrice = Number(data.regularPrice) || undefined;
        data.salePrice = Number(data.salePrice) || undefined;
        data.discount = Number(data.discount) || undefined;
        data.latitude = Number(data.latitude) || undefined;
        data.longitude = Number(data.longitude) || undefined;

        // Validate data
        const validationErrors = validatePackage(data, data.status === 'Active');
        if (validationErrors.length > 0) {
            return res.status(400).json({ error: validationErrors.join(', ') });
        }


        // Handle file uploads
        const uploadsDir = join(__dirname, '../Uploads/gallery');
        let gallery = [];
        if (req.files && req.files['gallery']) {
            gallery = req.files['gallery'].map(file => file.filename);
        }
        let featuredImage = '';
        if (req.files && req.files['featuredImage']) {
            featuredImage = req.files['featuredImage'][0].filename;
        }
        data.gallery = gallery;
        data.featuredImage = featuredImage;



        // Remove undefined fields
        Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

        const newPackage = new packageModel(data);
        await newPackage.save();
        return res.status(200).json({ message: 'Package created successfully' });
    } catch (error) {
        console.error('Error adding package:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Render edit package page
export const editPackagePage = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        if (!userId) {
            return res.status(400).send('User ID not available');
        }

        let userData = await adminModel.findById(userId);
        if (!userData) {
            userData = await agentModel.findById(userId);
        }

        if (!userData) {
            return res.status(400).redirect('/loginPage');
        }

        const packageData = await packageModel.findById(req.params.id);
        if (!packageData) {
            return res.status(404).send('Package not found');
        }

        res.render('admin/layout/editPackage', {
            packageData,
            isAdmin,
            user: userData,
            opencageApiKey: process.env.OPENCAGE_API_KEY,
        });
    } catch (error) {
        console.error('Error rendering edit package page:', error);
        res.status(500).send('Server error');
    }
};

// Handle edit package submission
export const editPackage = async (req, res) => {
    try {
        console.log("jj")
        const { id } = req.params;
        const data = req.body;
        let adminId;
        if (req.isAdmin) {
            adminId = req.id;
        } else {
            const userData = await agentModel.findById(req.id);
            if (userData) {
                adminId = userData.admin;
            }
        }
        if (!adminId) {
            return res.status(400).json({ error: 'Admin ID not found' });
        }
        data.adminId = adminId;
        data.status = data.status || 'Pending';

        // Early validation for multipleDepartures dateTime
        if (data.multipleDepartures) {
            const departures = Array.isArray(data.multipleDepartures) ? data.multipleDepartures : [data.multipleDepartures];
            for (let i = 0; i < departures.length; i++) {
                const dep = departures[i];
                if (!dep.dateTime || new Date(dep.dateTime).toString() === 'Invalid Date') {
                    return res.status(400).json({ error: `Departure ${i + 1}: Valid date and time is required` });
                }
            }
        }

        // Parse arrays and nested objects
        data.multipleDepartures = data.multipleDepartures ? (Array.isArray(data.multipleDepartures) ? data.multipleDepartures : [data.multipleDepartures]).map(dep => ({
            location: dep.location,
            dateTime: new Date(dep.dateTime) // Already validated above
        })) : [];
        data.itineraryDays = data.itineraryDays ? (Array.isArray(data.itineraryDays) ? data.itineraryDays : JSON.parse(data.itineraryDays || '[]')).map((day, index) => ({
            dayNumber: index + 1,
            title: day.title,
            description: day.description,
        })) : [];
        data.inclusions = data.inclusions ? (Array.isArray(data.inclusions) ? data.inclusions : [data.inclusions]).filter(i => i) : [];
        data.exclusions = data.exclusions ? (Array.isArray(data.exclusions) ? data.exclusions : [data.exclusions]).filter(e => e) : [];
        data.activityTypes = data.activityTypes ? (Array.isArray(data.activityTypes) ? data.activityTypes : [data.activityTypes]).filter(a => a) : [];
        data.highlights = data.highlights ? (Array.isArray(data.highlights) ? data.highlights : [data.highlights]).filter(h => h) : [];
        data.additionalCategories = data.additionalCategories ? (Array.isArray(data.additionalCategories) ? data.additionalCategories : [data.additionalCategories]).filter(c => c) : [];
        if (data.additionalCategoriesInput) {
            data.additionalCategories.push(...data.additionalCategoriesInput.split(',').map(c => c.trim()).filter(c => c));
        }
        data.keywords = data.keywords ? data.keywords.split(',').map(k => k.trim()).filter(k => k) : [];
        data.tripDuration = {
            days: Number(data.days) || 0,
            nights: Number(data.nights) || 0,
        };
        data.groupSize = Number(data.groupSize) || undefined;
        data.regularPrice = Number(data.regularPrice) || undefined;
        data.salePrice = Number(data.salePrice) || undefined;
        data.discount = Number(data.discount) || undefined;
        data.latitude = Number(data.latitude) || undefined;
        data.longitude = Number(data.longitude) || undefined;

        // Fetch existing package
        const existingPackage = await packageModel.findById(id);
        if (!existingPackage) {
            return res.status(404).json({ error: 'Package not found' });
        }

        // Validate data
        const validationErrors = validatePackage(data, data.status === 'Active');
        if (validationErrors.length > 0) {
            return res.status(400).json({ error: validationErrors.join(', ') });
        }



        // Handle gallery updates
        const uploadsDir = join(__dirname, '../Uploads/gallery');
        let gallery = existingPackage.gallery || [];
        if (data.deletedImages) {
            const imagesToDelete = Array.isArray(data.deletedImages) ? data.deletedImages : data.deletedImages.split(',').map(img => img.trim());
            for (const image of imagesToDelete) {
                if (gallery.includes(image)) {
                    try {
                        await fs.unlink(join(uploadsDir, image));
                    } catch (err) {
                        console.error(`Failed to delete image ${image}:`, err);
                    }
                }
            }
            gallery = gallery.filter(image => !imagesToDelete.includes(image));
        }

        if (req.files && req.files['gallery']) {
            const newImages = req.files['gallery'].map(file => file.filename);
            gallery = [...gallery, ...newImages].slice(0, 8); // Append new images, ensure max 8
        }

        // Handle featured image
        let featuredImage = existingPackage.featuredImage;
        if (req.files && req.files['featuredImage']) {
            if (featuredImage) {
                try {
                    await fs.unlink(join(uploadsDir, featuredImage));
                } catch (err) {
                    console.error(`Failed to delete featured image ${featuredImage}:`, err);
                }
            }
            featuredImage = req.files['featuredImage'][0].filename;
        }

        data.gallery = gallery;
        data.featuredImage = featuredImage;


        // Remove undefined fields
        Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

        const updatedPackage = await packageModel.findByIdAndUpdate(id, data, { new: true });
        if (!updatedPackage) {
            return res.status(404).json({ error: 'Package not found' });
        }

        return res.status(200).json({ message: 'update' });
    } catch (error) {
        console.error('Error updating package:', error);
        res.status(500).json({ error: 'Server error' });
    }
};




// Render all packages page
export const getAllPackages = async (req, res) => {
    try {
        const { page = 1, search = '' } = req.query;
        const limit = 5; // Packages per page
        const pageNum = Math.max(1, Number(page)); // Ensure page is at least 1
        const skip = (pageNum - 1) * limit; // Calculate skip
        const userId = req.id;
        const isAdmin = req.isAdmin;

        if (!userId) {
            return res.status(401).redirect('/loginPage');
        }

        let userData = await adminModel.findById(userId);
        let adminId = userId;
        if (!userData) {
            userData = await agentModel.findById(userId);
            if (!userData) {
                return res.status(401).redirect('/loginPage');
            }
            adminId = userData.admin;
        }

        let query = { adminId };
        if (search) {
            query.title = { $regex: search, $options: 'i' }; // Case-insensitive search
        }

        // Get total count for pagination
        const totalPackages = await packageModel.countDocuments(query);
        const totalPages = Math.ceil(totalPackages / limit) || 1; // Ensure at least 1 page

        // Fetch paginated packages
        const allPackages = await packageModel
            .find(query)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();

        res.render('admin/layout/allPackages', {
            allPackages,
            search,
            currentPage: pageNum,
            totalPages,
            isAdmin,
            user: userData,
            opencageApiKey: process.env.OPENCAGE_API_KEY,
        });
    } catch (error) {
        console.error('Error fetching packages:', error);
        res.status(500).redirect('/loginPage');
    }
};



export const deletePackage = async (req, res) => {
    try {
        const { id } = req.params;


        let adminId;
        if (req.isAdmin) {
            adminId = req.id;
        } else {
            const userData = await agentModel.findById(req.id);
            if (!userData) {
                return res.status(401).json({ error: 'Unauthorized: User not found' });
            }
            adminId = userData.admin;
        }

        // Fetch package to verify ownership and get images
        const packagePacket = await packageModel.findById(id);
        if (!packagePacket) {
            return res.status(404).json({ error: 'Package not found' });
        }



        // Delete associated images from file system
        const uploadsDir = join(__dirname, '../Uploads/gallery');

        // Delete gallery images
        if (packagePacket.gallery && packagePacket.gallery.length > 0) {
            for (const image of packagePacket.gallery) {
                try {
                    await fs.unlink(join(uploadsDir, image));
                } catch (err) {
                    console.error(`Failed to delete image ${image}:`, err);
                }
            }
        }

        // Delete featured image
        if (packagePacket.featuredImage) {
            try {
                await fs.unlink(join(uploadsDir, packagePacket.featuredImage));
            } catch (err) {
                console.error(`Failed to delete featured image ${packagePacket.featuredImage}:`, err);
            }
        }

        // Delete package from database
        await packageModel.findByIdAndDelete(id);


        res.status(200).json({
            message: "Package Deleted Successfuly"
        })
    } catch (error) {
        console.error('Error deleting package:', error);

        res.status(500).json({ error: 'Failed to delete package' });
    }
};


export const getPackagesByStatus = async (req, res) => {
    try {
        const { page = 1, search = '', status } = req.query;
        const validStatuses = ['Active', 'Pending', 'Expired'];
        if (!validStatuses.includes(status)) {
            return res.status(400).redirect('/db-all-packages');
        }




        const userId = req.id;
        const isAdmin = req.isAdmin;

        if (!userId) {
            return res.status(401).redirect('/loginPage');
        }

        let userData = await adminModel.findById(userId);
        let createdId = userId;
        if (!userData) {
            userData = await agentModel.findById(userId);
            if (!userData) {
                return res.status(401).redirect('/loginPage');
            }
            createdId = userData.admin;
        }

        let query = { adminId: createdId, status };




        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        const limit = 10;
        const pageNum = Math.max(1, Number(page));
        const skip = (pageNum - 1) * limit;
        const totalPackages = await packageModel.countDocuments(query);
        const totalPages = Math.ceil(totalPackages / limit) || 1;

        const allPackages = await packageModel.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();

        res.render('admin/layout/packagesByStatus', {
            allPackages,
            search,
            currentPage: pageNum,
            totalPages,
            isAdmin,
            user: userData,
            opencageApiKey: process.env.OPENCAGE_API_KEY,
            pageTitle: `${status} Packages`
        });
    } catch (error) {
        console.error(`Error fetching ${req.query.status} packages:`, error);
        res.status(500).redirect('/loginPage');
    }
};


export const getUserDashboard = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        if (!userId) {
            return res.status(401).redirect('/loginPage');
        }

        const userData = await adminModel.findById(userId)
        if (!userData) {
            return res.status(401).redirect('/loginPage');
        }

        res.render('admin/layout/userPageDashboard', {
            isAdmin,
            user: userData
        });
    } catch (error) {
        console.error('Error rendering user dashboard:', error);
        res.status(500).redirect('/loginPage');
    }
};



export const getPackageDashboard = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        if (!userId) {
            return res.status(401).redirect('/loginPage');
        }

        const userData = await adminModel.findById(userId) || await agentModel.findById(userId);
        if (!userData) {
            return res.status(401).redirect('/loginPage');
        }

        res.render('admin/layout/packagePageDashboard', {
            isAdmin,
            user: userData
        });
    } catch (error) {
        console.error('Error rendering package dashboard:', error);
        res.status(500).redirect('/loginPage');
    }
};


