import adminModel from '../models/adminModel.js';
import agentModel from '../models/agentModel.js';
import packageBookingSchema from '../models/packageBookingSchema.js';
import packageModel from '../models/packageModel.js';
import userModel from '../models/userModel.js';

import bcrypt from 'bcrypt';
import { promises as fs } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));


import Stripe from 'stripe';
const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);



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



export const getAllAgents = async (req, res) => {
    try {
        const { page = 1, search = '' } = req.query;
        const limit = 10; // Agents per page
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
        const totalAgents = await agentModel.countDocuments(query);
        const totalPages = Math.ceil(totalAgents / limit) || 1; // Ensure at least 1 page

        // Fetch paginated agents
        const agents = await agentModel
            .find(query)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();

        res.render('admin/layout/agent', {
            allAgents: agents,
            search,
            currentPage: pageNum,
            totalPages,
            isAdmin,
            user: userData
        });
    } catch (error) {
        console.error('Error fetching agents:', error);
        res.status(500).redirect('/loginPage');
    }
};


export const getNewAgentPage = async (req, res) => {
    const userId = req.id;
    const isAdmin = req.isAdmin
    if (!userId) {
        return res.status(401).send("Unauthorized: Admin ID missing");
    }

    const userData = await adminModel.findById(userId);

    if (!userData && isAdmin) {
        return res.redirect('/AdminDashboard')
    }

    res.render('admin/layout/new-agent', {
        isAdmin,
        user: userData
    });
};


export const newAgent = async (req, res) => {
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
            return res.redirect('/new-agent?error=All fields are required');
        }

        if (password !== confirmPassword) {
            console.log("Passwords do not match.");
            return res.redirect('/new-agent?error=Passwords do not match');
        }

        if (email !== confirmEmail) {
            console.log("Emails do not match.");
            return res.redirect('/new-agent?error=Emails do not match');
        }

        const existingAgent = await agentModel.findOne({ email });
        if (existingAgent) {
            console.log("Agent already exists.");
            return res.redirect('/new-agent?error=agent already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const agent = new agentModel({
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

        await agent.save();
        console.log("Agent registered successfully.");
        return res.redirect('/db-admin-created-agents?success=Agent created');
    } catch (error) {
        console.log("Agent registration error:", error.message);
        return res.redirect('/new-agent?error=Internal server error');
    }
};



export const editAgentPage = async (req, res) => {
    try {
        const editAgentId = req.query.editAgentId
        const userId = req.id;
        const isAdmin = req.isAdmin
        if (!userId) {
            return res.status(401).send("Unauthorized: Admin ID missing");
        }

        const userData = await adminModel.findById(userId);

        if (!userData && isAdmin) {
            return res.redirect('/AdminDashboard')
        }

        if (!editAgentId) {
            return res.redirect('/AdminDashboard')
        }

        const editAgentData = await agentModel.findById(editAgentId)

        res.render('admin/layout/edit-agent', {
            isAdmin,
            user: userData,
            editAgent: editAgentData
        });

    } catch (error) {
        console.error("Error in editPage:", error);
        res.status(500).send("Internal Server Error");
    }
}




export const editAgent = async (req, res) => {
    try {
        const isAdmin = req.isAdmin;
        const { editAgentId } = req.params;
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
        const editAgent = {
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
            editAgent.profilePic = req.file.filename;
            const agent = await agentModel.findById(editAgentId);
            if (!agent) {
                return res.status(404).json({ error: "Agent not found" });
            }

            if (agent.profilePic) {
                const filePath = join(__dirname, '../Uploads/profiles', agent.profilePic);
                try {
                    await fs.unlink(filePath);
                    console.log(`Profile picture deleted: ${filePath}`);
                } catch (fileError) {
                    console.error(`Error deleting profile picture: ${fileError.message}`);
                }
            }
        }



        const updatedAgent = await agentModel.findByIdAndUpdate(
            editAgentId,
            { $set: editAgent },
            { new: true, runValidators: true }
        );

        if (!updatedAgent) {
            return res.status(404).json({ error: "Agent not found" });
        }

        console.log("Agent updated successfully");
        res.redirect('/db-admin-created-agents');
    } catch (error) {
        console.error("Error updating Agent:", error);
        res.status(500).json({ error: "Failed to update Agent" });
    }
};




export const getAgentDetails = async (req, res) => {
    try {

        const agentId = req.query.agentId;
        const adminId = req.id;
        const isAdmin = req.isAdmin;

        // Check if admin ID is present
        if (!adminId) {
            console.log("Unauthorized: Admin ID missing");
            return res.status(401).send("Unauthorized: Admin ID missing");
        }

        // Verify admin exists
        const adminData = await adminModel.findById(adminId);
        if (!adminData) {
            console.log("Admin not found");
            return res.status(401).send("Unauthorized: Admin details not found");
        }

        // Check if user is admin
        if (!isAdmin) {
            console.log("User is not authorized to view user details");
            return res.status(403).send("Unauthorized: Admin access required");
        }

        // Fetch user data
        const agent = await agentModel.findById(agentId);
        if (!agent) {
            console.log(`Agent not found for ID: ${agentId}`);
            return res.redirect('/db-admin-created-agents')
        }


        res.render('admin/layout/agentDetail', { user: adminData, isAdmin, agent });
    } catch (error) {
        console.error("Error fetching agent details:", error);

    }
};


export const deleteAgent = async (req, res) => {
    try {
        const isAdmin = req.isAdmin;
        const { agentId } = req.params;


        if (!isAdmin) {
            console.log("Agent is not authorized to delete");
            return res.status(403).json({ error: "Unauthorized: Admin access required" });
        }


        const agent = await agentModel.findById(agentId);
        if (!agent) {
            return res.status(404).json({ error: "Agent not found" });
        }

        if (agent.profilePic) {
            const filePath = join(__dirname, '../Uploads/profiles', agent.profilePic);
            try {
                await fs.unlink(filePath);
                console.log(`Profile picture deleted: ${filePath}`);
            } catch (fileError) {
                console.error(`Error deleting profile picture: ${fileError.message}`);
            }
        }


        await agentModel.findByIdAndDelete(agentId);

        console.log("Agent deleted successfully");
        res.redirect('/db-admin-created-agents');
    } catch (error) {
        console.error("Error deleting agent:", error);
        res.status(500).json({ error: "Failed to delete agent" });
    }
};



export const getSignedInUsers = async (req, res) => {
    try {
        const adminId = req.id;
        const isAdmin = req.isAdmin;
        const { search = '', page = 1 } = req.query;
        const limit = 10;

        // Check if admin ID is present
        if (!adminId) {
            console.log("Unauthorized: Admin ID missing");
            return res.status(401).send("Unauthorized: Admin ID missing");
        }

        // Verify admin exists
        const adminData = await adminModel.findById(adminId);
        if (!adminData) {
            console.log("Admin not found");
            return res.status(401).send("Unauthorized: Admin details not found");
        }

        // Check if user is admin
        if (!isAdmin) {
            console.log("User is not authorized to view signed-in users");
            return res.status(403).send("Unauthorized: Admin access required");
        }

        // Build search query
        const searchQuery = search
            ? {
                $or: [
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                ],
            }
            : {};


        const users = await userModel
            .find(searchQuery)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const totalUsers = await userModel.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalUsers / limit);

        res.render('admin/layout/signed-in-users', {
            allUsers: users,
            search,
            currentPage: parseInt(page),
            totalPages: totalPages || 1,
            isAdmin,
            user: adminData
        });
    } catch (error) {
        console.error("Error fetching signed-in users:", error);
        res.redirect('/loginPage')
    }
};


export const getUserDetails = async (req, res) => {
    try {
        const { userId } = req.query;
        const adminId = req.id;
        const isAdmin = req.isAdmin;

        if (!adminId) {
            console.log("Unauthorized: Admin ID missing");
            return res.status(401).send("Unauthorized: Admin ID missing");
        }

        const adminData = await adminModel.findById(adminId);
        if (!adminData) {
            console.log("Admin not found");
            return res.status(401).send("Unauthorized: Admin details not found");
        }

        if (!isAdmin) {
            console.log("User is not authorized to view user details");
            return res.status(403).send("Unauthorized: Admin access required");
        }

        const userDetail = await userModel.findById(userId);
        if (!userDetail) {
            console.log(`User not found for ID: ${userId}`);
            return res.render('user-details', { userDetail: null });
        }

        res.render('admin/layout/user-details', { userDetail, isAdmin, user: adminData });
    } catch (error) {
        console.error("Error fetching user details:", error);
        res.redirect('/loginPage')
    }
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
        });
    } catch (error) {
        console.error('Error rendering add package page:', error);
        res.status(500).send('Server error');
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

        // Ensure itineraryDays has the correct structure
        packageData.itineraryDays = packageData.itineraryDays || [];
        packageData.itineraryDays = packageData.itineraryDays.map((day, index) => ({
            day: day.day || index + 1,
            activities: Array.isArray(day.activities) ? day.activities : [{ title: '', sub_title: '', start_time: '', end_time: '', type: '' }]
        }));

        res.render('admin/layout/editPackage', {
            packageData,
            isAdmin,
            user: userData,
            opencageApiKey: process.env.OPENCAGE_API_KEY
        });
    } catch (error) {
        console.error('Error rendering edit package page:', error);
        res.status(500).send('Server error');
    }
};

// Validation function for package data
const validatePackage = (data, isActive) => {
    const errors = [];

    // Always required fields
    if (!data.title) errors.push('Title is required');
    if (!data.adminId) errors.push('Admin ID is required');
    if (!data.status || !['Pending', 'Active', 'Expired'].includes(data.status)) {
        errors.push('Valid status is required (Pending, Active, Expired)');
    }

    // Additional validation for fields not strictly required by schema
    if (!data.description) errors.push('Description is required');
    if (!data.packageType || !['Adventure', 'Cultural', 'Luxury', 'Family', 'Wellness', 'Eco'].includes(data.packageType)) {
        errors.push('Valid package type is required (Adventure, Cultural, Luxury, Family, Wellness, Eco)');
    }

    // Additional fields required for Active status
    if (isActive) {
        if (!data.groupSize || isNaN(data.groupSize) || data.groupSize <= 0) errors.push('Valid group size is required');
        if (!data.tripDuration?.days || isNaN(data.tripDuration.days) || data.tripDuration.days <= 0) errors.push('Valid number of days is required');
        if (!data.tripDuration?.nights || isNaN(data.tripDuration.nights) || data.tripDuration.nights < 0) errors.push('Valid number of nights is required');
        if (!data.category || !['Adult', 'Child', 'Couple'].includes(data.category)) errors.push('Valid category is required (Adult, Child, Couple)');
        if (!data.regularPrice || isNaN(data.regularPrice) || data.regularPrice <= 0) errors.push('Valid regular price is required');
        if (!data.multipleDepartures || !Array.isArray(data.multipleDepartures) || data.multipleDepartures.length === 0) {
            errors.push('At least one departure is required');
        } else {
            data.multipleDepartures.forEach((dep, index) => {
                if (!dep.location) errors.push(`Departure ${index + 1}: Location is required`);
                if (!dep.dateTime || new Date(dep.dateTime).toString() === 'Invalid Date') {
                    errors.push(`Departure ${index + 1}: Valid date and time is required`);
                }
            });
        }
        if (!data.itineraryDescription) errors.push('Itinerary description is required');
        if (!data.itineraryDays || !Array.isArray(data.itineraryDays) || data.itineraryDays.length === 0) {
            errors.push('At least one itinerary day is required');
        } else {
            data.itineraryDays.forEach((day, index) => {
                if (!day.day || isNaN(day.day) || day.day <= 0) errors.push(`Itinerary Day ${index + 1}: Valid day number is required`);
                if (!day.activities || !Array.isArray(day.activities) || day.activities.length === 0) {
                    errors.push(`Itinerary Day ${index + 1}: At least one activity is required`);
                } else {
                    day.activities.forEach((activity, actIndex) => {
                        if (!activity.title) errors.push(`Itinerary Day ${index + 1}, Activity ${actIndex + 1}: Title is required`);
                        if (!activity.sub_title) errors.push(`Itinerary Day ${index + 1}, Activity ${actIndex + 1}: Sub-title is required`);
                        if (!activity.start_time) errors.push(`Itinerary Day ${index + 1}, Activity ${actIndex + 1}: Start time is required`);
                        if (!activity.end_time) errors.push(`Itinerary Day ${index + 1}, Activity ${actIndex + 1}: End time is required`);
                        if (!activity.type || !['sightseeing', 'activity', 'meal', 'transport', 'accommodation'].includes(activity.type)) {
                            errors.push(`Itinerary Day ${index + 1}, Activity ${actIndex + 1}: Valid type is required`);
                        }
                    });
                }
            });
        }
        if (!data.programDays || !Array.isArray(data.programDays) || data.programDays.length === 0) {
            errors.push('At least one program day is required');
        } else {
            data.programDays.forEach((day, index) => {
                if (!day.day || isNaN(day.day) || day.day <= 0) errors.push(`Program Day ${index + 1}: Valid day number is required`);
                if (!day.title) errors.push(`Program Day ${index + 1}: Title is required`);
                if (!day.description) errors.push(`Program Day ${index + 1}: Description is required`);
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
            errors.push('Valid difficulty level is required (Easy, Moderate, Challenging)');
        }
        if (!data.latitude || isNaN(data.latitude)) errors.push('Valid latitude is required');
        if (!data.longitude || isNaN(data.longitude)) errors.push('Valid longitude is required');
        if (!data.destinationAddress) errors.push('Destination address is required');
        if (!data.destinationCountry) errors.push('Destination country is required');
        if (!data.gallery || !Array.isArray(data.gallery) || data.gallery.length === 0) errors.push('At least one gallery image is required');
        if (!data.featuredImage) errors.push('Featured image is required');
    }

    // Gallery limit check
    if (data.gallery && data.gallery.length > 8) errors.push('Maximum 8 gallery images allowed');

    return errors;
};


export const addPackage = async (req, res) => {
    try {
        // Apply multer middleware
    

            const data = req.body;

            // Determine adminId
            let adminId;
            if (req.isAdmin) {
                adminId = req.id;
            } else {
                const userData = await agentModel.findById(req.id);
                if (!userData) {
                    return res.status(400).json({ error: 'Agent not found' });
                }
                adminId = userData.admin;
            }
            if (!adminId) {
                return res.status(400).json({ error: 'Admin ID not found' });
            }
            data.adminId = adminId;
            data.status = data.status || 'Pending';

            // Parse multipleDepartures
            if (data.multipleDepartures) {
                let departures = data.multipleDepartures;
                if (typeof departures === 'string') {
                    try {
                        departures = JSON.parse(departures);
                    } catch (e) {
                        return res.status(400).json({ error: 'Invalid multipleDepartures format' });
                    }
                }
                if (!Array.isArray(departures)) {
                    departures = [departures];
                }
                for (let i = 0; i < departures.length; i++) {
                    const dep = departures[i];
                    if (!dep.location || !dep.dateTime || new Date(dep.dateTime).toString() === 'Invalid Date') {
                        return res.status(400).json({ error: `Departure ${i + 1}: Valid location and date/time are required` });
                    }
                }
                data.multipleDepartures = departures.map(dep => ({
                    location: dep.location,
                    dateTime: new Date(dep.dateTime)
                }));
            } else {
                data.multipleDepartures = [];
            }

            // Parse itineraryDays
            if (data.itineraryDays) {
                let itineraryDays = data.itineraryDays;
                if (typeof itineraryDays === 'string') {
                    try {
                        itineraryDays = JSON.parse(itineraryDays);
                    } catch (e) {
                        return res.status(400).json({ error: 'Invalid itineraryDays format' });
                    }
                }
                if (!Array.isArray(itineraryDays)) {
                    itineraryDays = [itineraryDays];
                }
                data.itineraryDays = itineraryDays.map((day, index) => ({
                    day: Number(day.day) || index + 1,
                    activities: Array.isArray(day.activities) ? day.activities.map(act => ({
                        title: act.title || '',
                        sub_title: act.sub_title || '',
                        start_time: act.start_time || '',
                        end_time: act.end_time || '',
                        type: act.type || ''
                    })) : []
                }));
            } else {
                data.itineraryDays = [];
            }

            // Parse programDays
            if (data.programDays) {
                let programDays = data.programDays;
                if (typeof programDays === 'string') {
                    try {
                        programDays = JSON.parse(programDays);
                    } catch (e) {
                        return res.status(400).json({ error: 'Invalid programDays format' });
                    }
                }
                if (!Array.isArray(programDays)) {
                    programDays = [programDays];
                }
                data.programDays = programDays.map((day, index) => ({
                    day: Number(day.day) || index + 1,
                    title: day.title || '',
                    description: day.description || ''
                }));
            } else {
                data.programDays = [];
            }

            // Parse arrays
            data.inclusions = data.inclusions ? (Array.isArray(data.inclusions) ? data.inclusions : JSON.parse(data.inclusions || '[]')).filter(i => i) : [];
            data.exclusions = data.exclusions ? (Array.isArray(data.exclusions) ? data.exclusions : JSON.parse(data.exclusions || '[]')).filter(e => e) : [];
            data.activityTypes = data.activityTypes ? (Array.isArray(data.activityTypes) ? data.activityTypes : JSON.parse(data.activityTypes || '[]')).filter(a => a) : [];
            data.highlights = data.highlights ? (Array.isArray(data.highlights) ? data.highlights : JSON.parse(data.highlights || '[]')).filter(h => h) : [];
            data.additionalCategories = data.additionalCategories ? (Array.isArray(data.additionalCategories) ? data.additionalCategories : JSON.parse(data.additionalCategories || '[]')).filter(c => c) : [];
            if (data.additionalCategoriesInput) {
                data.additionalCategories.push(...data.additionalCategoriesInput.split(',').map(c => c.trim()).filter(c => c));
                delete data.additionalCategoriesInput;
            }
            data.keywords = data.keywords ? data.keywords.split(',').map(k => k.trim()).filter(k => k) : [];

            // Parse numeric fields
            data.tripDuration = {
                days: Number(data.tripDuration?.days) || 0,
                nights: Number(data.tripDuration?.nights) || 0
            };
            data.groupSize = Number(data.groupSize) || undefined;
            data.regularPrice = Number(data.regularPrice) || undefined;
            data.salePrice = Number(data.salePrice) || undefined;
            data.discount = Number(data.discount) || undefined;
            data.latitude = Number(data.latitude) || undefined;
            data.longitude = Number(data.longitude) || undefined;
            data.destinationAddress = data.destinationAddress || undefined;
            data.destinationCountry = data.destinationCountry || undefined;

            // Handle file uploads
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

            // Validate data
            const validationErrors = validatePackage(data, data.status === 'Active');
            if (validationErrors.length > 0) {
                return res.status(400).json({ error: validationErrors.join(', ') });
            }

            // Remove undefined fields
            Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

            // Save package
            const newPackage = new packageModel(data);
            await newPackage.save();
            return res.status(200).json({ message: 'Package created successfully', packageId: newPackage._id });

    } catch (error) {
        console.error('Error adding package:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const editPackage = async (req, res) => {
    try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({ error: 'Invalid package ID' });
            }

            const data = req.body;

            // Determine adminId
            let adminId;
            if (req.isAdmin) {
                adminId = req.id;
            } else {
                const userData = await agentModel.findById(req.id);
                if (!userData) {
                    return res.status(400).json({ error: 'Agent not found' });
                }
                adminId = userData.admin;
            }
            if (!adminId) {
                return res.status(400).json({ error: 'Admin ID not found' });
            }
            data.adminId = adminId;
            data.status = data.status || 'Pending';

            // Parse multipleDepartures
            if (data.multipleDepartures) {
                let departures = data.multipleDepartures;
                if (typeof departures === 'string') {
                    try {
                        departures = JSON.parse(departures);
                    } catch (e) {
                        return res.status(400).json({ error: 'Invalid multipleDepartures format' });
                    }
                }
                if (!Array.isArray(departures)) {
                    departures = [departures];
                }
                for (let i = 0; i < departures.length; i++) {
                    const dep = departures[i];
                    if (!dep.location || !dep.dateTime || new Date(dep.dateTime).toString() === 'Invalid Date') {
                        return res.status(400).json({ error: `Departure ${i + 1}: Valid location and date/time are required` });
                    }
                }
                data.multipleDepartures = departures.map(dep => ({
                    location: dep.location,
                    dateTime: new Date(dep.dateTime)
                }));
            } else {
                data.multipleDepartures = [];
            }

            // Parse itineraryDays
            if (data.itineraryDays) {
                let itineraryDays = data.itineraryDays;
                if (typeof itineraryDays === 'string') {
                    try {
                        itineraryDays = JSON.parse(itineraryDays);
                    } catch (e) {
                        return res.status(400).json({ error: 'Invalid itineraryDays format' });
                    }
                }
                if (!Array.isArray(itineraryDays)) {
                    itineraryDays = [itineraryDays];
                }
                data.itineraryDays = itineraryDays.map((day, index) => ({
                    day: Number(day.day) || index + 1,
                    activities: Array.isArray(day.activities) ? day.activities.map(act => ({
                        title: act.title || '',
                        sub_title: act.sub_title || '',
                        start_time: act.start_time || '',
                        end_time: act.end_time || '',
                        type: act.type || ''
                    })) : []
                }));
            } else {
                data.itineraryDays = [];
            }

            // Parse programDays
            if (data.programDays) {
                let programDays = data.programDays;
                if (typeof programDays === 'string') {
                    try {
                        programDays = JSON.parse(programDays);
                    } catch (e) {
                        return res.status(400).json({ error: 'Invalid programDays format' });
                    }
                }
                if (!Array.isArray(programDays)) {
                    programDays = [programDays];
                }
                data.programDays = programDays.map((day, index) => ({
                    day: Number(day.day) || index + 1,
                    title: day.title || '',
                    description: day.description || ''
                }));
            } else {
                data.programDays = [];
            }

            // Parse arrays
            data.inclusions = data.inclusions ? (Array.isArray(data.inclusions) ? data.inclusions : JSON.parse(data.inclusions || '[]')).filter(i => i) : [];
            data.exclusions = data.exclusions ? (Array.isArray(data.exclusions) ? data.exclusions : JSON.parse(data.exclusions || '[]')).filter(e => e) : [];
            data.activityTypes = data.activityTypes ? (Array.isArray(data.activityTypes) ? data.activityTypes : JSON.parse(data.activityTypes || '[]')).filter(a => a) : [];
            data.highlights = data.highlights ? (Array.isArray(data.highlights) ? data.highlights : JSON.parse(data.highlights || '[]')).filter(h => h) : [];
            data.additionalCategories = data.additionalCategories ? (Array.isArray(data.additionalCategories) ? data.additionalCategories : JSON.parse(data.additionalCategories || '[]')).filter(c => c) : [];
            if (data.additionalCategoriesInput) {
                data.additionalCategories.push(...data.additionalCategoriesInput.split(',').map(c => c.trim()).filter(c => c));
                delete data.additionalCategoriesInput;
            }
            data.keywords = data.keywords ? data.keywords.split(',').map(k => k.trim()).filter(k => k) : [];

            // Parse numeric fields
            data.tripDuration = {
                days: Number(data.tripDuration?.days) || 0,
                nights: Number(data.tripDuration?.nights) || 0
            };
            data.groupSize = Number(data.groupSize) || undefined;
            data.regularPrice = Number(data.regularPrice) || undefined;
            data.salePrice = Number(data.salePrice) || undefined;
            data.discount = Number(data.discount) || undefined;
            data.latitude = Number(data.latitude) || undefined;
            data.longitude = Number(data.longitude) || undefined;
            data.destinationAddress = data.destinationAddress || undefined;
            data.destinationCountry = data.destinationCountry || undefined;

            // Fetch existing package
            const existingPackage = await packageModel.findById(id);
            if (!existingPackage) {
                return res.status(404).json({ error: 'Package not found' });
            }

            // Handle gallery updates
            let gallery = existingPackage.gallery || [];
            if (data.deletedImages) {
                let imagesToDelete = data.deletedImages;
                if (typeof imagesToDelete === 'string') {
                    imagesToDelete = imagesToDelete.split(',').map(img => img.trim()).filter(img => img);
                }
                for (const image of imagesToDelete) {
                    if (gallery.includes(image)) {
                        try {
                            await fs.unlink(join(uploadsDir, image));
                            console.log(`Deleted image: ${image}`);
                        } catch (err) {
                            console.error(`Failed to delete image ${image}:`, err);
                        }
                    }
                }
                gallery = gallery.filter(image => !imagesToDelete.includes(image));
            }

            if (req.files && req.files['gallery']) {
                const newImages = req.files['gallery'].map(file => file.filename);
                gallery = [...gallery, ...newImages].slice(0, 8); // Enforce max 8 images
            }

            // Handle featured image
            let featuredImage = existingPackage.featuredImage;
            if (req.files && req.files['featuredImage']) {
                if (featuredImage) {
                    try {
                        await fs.unlink(join(uploadsDir, featuredImage));
                        console.log(`Deleted featured image: ${featuredImage}`);
                    } catch (err) {
                        console.error(`Failed to delete featured image ${featuredImage}:`, err);
                    }
                }
                featuredImage = req.files['featuredImage'][0].filename;
            }

            data.gallery = gallery;
            data.featuredImage = featuredImage;

            // Validate data
            const validationErrors = validatePackage(data, data.status === 'Active');
            if (validationErrors.length > 0) {
                // Clean up uploaded files if validation fails
                if (req.files && req.files['gallery']) {
                    for (const file of req.files['gallery']) {
                        try {
                            await fs.unlink(join(uploadsDir, file.filename));
                        } catch (err) {
                            console.error(`Failed to clean up gallery image ${file.filename}:`, err);
                        }
                    }
                }
                if (req.files && req.files['featuredImage']) {
                    try {
                        await fs.unlink(join(uploadsDir, req.files['featuredImage'][0].filename));
                    } catch (err) {
                        console.error(`Failed to clean up featured image ${req.files['featuredImage'][0].filename}:`, err);
                    }
                }
                return res.status(400).json({ error: validationErrors.join(', ') });
            }

            // Remove undefined fields
            Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

            // Update package
            const updatedPackage = await packageModel.findByIdAndUpdate(id, data, { new: true });
            if (!updatedPackage) {
                return res.status(404).json({ error: 'Package not found' });
            }

            return res.status(200).json({ message: 'Package updated successfully', packageId: updatedPackage._id });

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







// Get Admin/Agent Profile
export const getAdminAgentProfile = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin
        if (!userId) {
            console.log('No user ID in request');
            return res.redirect('/');
        }

   
        let user = await adminModel.findById(userId);
        if (user) {
            console.log('Rendering admin profile for:', userId);
            return res.render('admin/layout/adminAgentProfile', { user,isAdmin });
        }

        // Check if user is an agent
        user = await agentModel.findById(userId).populate('admin');
        if (user) {
            console.log('Rendering agent profile for:', userId);
            return res.render('admin/layout/adminAgentProfile', { user,isAdmin });
        }

        console.log('No admin or agent found for:', userId);
        return res.redirect('/');
    } catch (error) {
        console.error('Get admin/agent profile error:', error);
        res.status(500).send('Error fetching profile');
    }
};

// Update Admin/Agent Profile
export const updateAdminAgentProfile = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            console.log('No user ID in request');
            return res.status(401).json({ error: 'Unauthorized: No user ID provided' });
        }

        const { firstName, lastName, email, phone, countryCode, dateOfBirth, country, state, city, address, description } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !phone) {
            console.log('Missing required fields:', { firstName, lastName, email, phone });
            return res.status(400).json({ error: 'First name, last name, email, and phone are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('Invalid email format:', email);
            return res.status(400).json({ error: 'Invalid email format' });
        }

        let updateData = { firstName, lastName, email, phone };

        // Validate dateOfBirth if provided
        if (dateOfBirth) {
            const dob = new Date(dateOfBirth);
            if (isNaN(dob.getTime())) {
                console.log('Invalid date of birth:', dateOfBirth);
                return res.status(400).json({ error: 'Invalid date of birth' });
            }
            updateData.dateOfBirth = dob;
        }

        // Check if user is an admin
        let user = await adminModel.findById(userId);
        if (user) {
            if (req.file) {
                // Delete existing profile picture if it exists
                if (user.profilePic) {
                    const oldImagePath = join(__dirname, '../Uploads/profiles');
                    try {
                        await fs.unlink(join(oldImagePath, user.profilePic));
                        console.log('Deleted old profile picture:', user.profilePic);
                    } catch (err) {
                        if (err.code !== 'ENOENT') {
                            console.error('Error deleting old profile picture:', err);
                        }
                    }
                }
                updateData.profilePic = req.file.filename;
            }
            await adminModel.findByIdAndUpdate(userId, updateData, { new: true });
            console.log('Updated admin profile:', userId);
            return res.redirect('/admin-agent-profile');
        }

        // Check if user is an agent
        user = await agentModel.findById(userId);
        if (user) {
            // Validate agent-specific required field
            if (!countryCode) {
                console.log('Missing country code for agent:', userId);
                return res.status(400).json({ error: 'Country code is required for agents' });
            }
            updateData = { ...updateData, countryCode, dateOfBirth: updateData.dateOfBirth || user.dateOfBirth, country, state, city, address, description };
            if (req.file) {
                // Delete existing profile picture if it exists
                if (user.profilePic) {
          
                    const oldImagePath = join(__dirname, '../Uploads/profiles');
                    try {
                        
                     
                        await fs.unlink(join(oldImagePath, user.profilePic));
                        console.log('Deleted old profile picture:', user.profilePic);
                    } catch (err) {
                        if (err.code !== 'ENOENT') {
                            console.error('Error deleting old profile picture:', err);
                        }
                    }
                }
                updateData.profilePic = req.file.filename;
            }
            await agentModel.findByIdAndUpdate(userId, updateData, { new: true });
            console.log('Updated agent profile:', userId);
            return res.redirect('/admin-agent-profile');
        }

        console.log('No admin or agent found for:', userId);
        return res.status(404).json({ error: 'User not found' });
    } catch (error) {
        console.error('Update admin/agent profile error:', error);
        res.status(500).json({ error: 'Server error while updating profile' });
    }
};





export const getBookings = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;

        if (!userId) {
            console.log("No userId Available");
            return res.redirect('/');
        }

        let userData;
        if (isAdmin) {
            userData = await adminModel.findById(userId); // Assuming User model for admins
        } else {
            userData = await agentModel.findById(userId); // Assuming same model for agents
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 1; // Bookings per page (as per provided controller)
        const search = req.query.search || '';

        const searchQuery = {};
        if (search) {
            const matchingPackageIds = await packageModel.find({
                title: { $regex: search, $options: 'i' }
            }).distinct('_id');

            searchQuery.$or = [
                { 'items.packageId': { $in: matchingPackageIds } },
                { status: { $regex: search, $options: 'i' } }
            ].filter(condition => condition !== null);
        }

        // Fetch bookings with pagination and population
        const bookings = await packageBookingSchema.find(searchQuery)
            .populate('userId', 'firstName lastName email')
            .populate('items.packageId', 'title')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });


        const totalBookings = await packageBookingSchema.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalBookings / limit);

        res.render('admin/layout/db-booking', {
            bookings,
            currentPage: page,
            totalPages,
            user: userData,
            isAdmin,
            search,
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).send('Error fetching bookings');
    }
};



export const getEditBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
  

        const userId = req.id;
        const isAdmin = req.isAdmin;

        if (!userId) {
            console.log("No userId Available");
            return res.redirect('/');
        }

        let userData;
        if (isAdmin) {
            userData = await adminModel.findById(userId); // Assuming User model for admins
        } else {
            userData = await agentModel.findById(userId); // Assuming same model for agents
        }

    
        const booking = await packageBookingSchema.findById(bookingId)
            .populate('userId', 'firstName lastName email')
            .populate('items.packageId', 'title');

        if (!booking) {
            return res.status(404).send('Booking not found');
        }

        res.render('admin/layout/edit-booking', {
            booking,
            user: userData,
            isAdmin
        });
    } catch (error) {
        console.error('Error fetching booking for edit:', error);
        res.status(500).send('Error fetching booking');
    }
};

export const editBooking = async (req, res) => {
    try {
   

        const userId = req.id;
    

        if (!userId) {
            console.log("No userId Available");
            return res.redirect('/');
        }

       


        const { bookingId } = req.params;
        const { status } = req.body;

        if (!['approved', 'pending', 'rejected'].includes(status)) {
            return res.status(400).send('Invalid status');
        }

        const booking = await packageBookingSchema.findById(bookingId);
        if (!booking) {
            return res.status(404).send('Booking not found');
        }

        booking.status = status;

        // Automatically initiate refund if status is 'rejected'
        if (status === 'rejected' && booking.payment.paymentStatus === 'succeeded' && booking.payment.paymentType !== 'refund') {
            try {
                const refund = await stripeInstance.refunds.create({
                    payment_intent: booking.payment.stripePaymentIntentId,
                    amount: Math.round(booking.total * 100), // Convert to cents
                });
                booking.payment.paymentType = 'refund';
                booking.payment.paymentStatus = 'pending';
            } catch (refundError) {
                console.error('Error processing refund:', refundError);
                return res.status(500).send('Error processing refund');
            }
        }

        await booking.save();

        res.redirect('/admin/bookings');
    } catch (error) {
        console.error('Error editing booking:', error);
        res.status(500).send('Error editing booking');
    }
};



 export const deleteBooking = async (req, res) => {
    try {
        
        const userId = req.id;
    

        if (!userId) {
            console.log("No userId Available");
            return res.redirect('/');
        }

        
        const { bookingId } = req.params;
        const booking = await packageBookingSchema.findByIdAndDelete(bookingId);
        if (!booking) {
            return res.status(404).send('Booking not found');
        }
        res.redirect('/admin/bookings');
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).send('Error deleting booking');
    }
};