
import adminModel from '../models/adminModel.js';
import agentModel from '../models/agentModel.js';
import packageBookingSchema from '../models/packageBookingSchema.js';
import packageModel from '../models/packageModel.js';
import userModel from '../models/userModel.js';
import bcrypt from 'bcrypt';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
import Stripe from 'stripe';
import reviewSchema from '../models/reviewSchema.js';
import couponSchema from '../models/couponSchema.js';
const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const AdminDashboard = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

    let userData;
    if (isAdmin) {
         userData = await adminModel.findById(userId);
    }
    else{
         userData = await agentModel.findById(userId);
    }

    
    if (!userData) {
            req.session.message = 'Admin not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        res.render('admin/layout/AdminDashboard', {
            user: userData,
            isAdmin,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error("Error loading admin dashboard:", error);
        req.session = req.session || {};
        req.session.message = 'Server error loading dashboard';
        req.session.type = 'error';
        res.status(500).render('admin/layout/AdminDashboard', {
            user: null,
            isAdmin,
            message: req.session.message,
            type: req.session.type
        });
    }
};

export const getAllAgents = async (req, res) => {
    try {
        const { page = 1, search = '' } = req.query;
        const limit = 10;
        const pageNum = Math.max(1, Number(page));
        const skip = (pageNum - 1) * limit;
        const adminId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!adminId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.status(401).redirect('/loginPage');
        }

        const userData = await adminModel.findById(adminId);
        if (!userData) {
            req.session.message = 'Admin not found';
            req.session.type = 'error';
            return res.status(401).redirect('/loginPage');
        }

        let query = { admin: adminId };
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } }
            ];
        }

        const totalAgents = await agentModel.countDocuments(query);
        const totalPages = Math.ceil(totalAgents / limit) || 1;

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
            user: userData,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching agents:', error);
        req.session = req.session || {};
        req.session.message = 'Server error fetching agents';
        req.session.type = 'error';
        res.status(500).redirect('/loginPage');
    }
};

export const getNewAgentPage = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Admin ID missing';
            req.session.type = 'error';
            return res.status(401).redirect('/loginPage');
        }

        const userData = await adminModel.findById(userId);
        if (!userData && isAdmin) {
            req.session.message = 'Admin not found';
            req.session.type = 'error';
            return res.redirect('/AdminDashboard');
        }

        res.render('admin/layout/new-agent', {
            isAdmin,
            user: userData,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error("Error rendering new agent page:", error);
        req.session = req.session || {};
        req.session.message = 'Server error rendering page';
        req.session.type = 'error';
        res.status(500).redirect('/AdminDashboard');
    }
};

export const newAgent = async (req, res) => {
    try {
        const adminId = req.id;
        req.session = req.session || {};

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
            req.session.message = 'All fields are required';
            req.session.type = 'error';
            return res.redirect('/new-agent');
        }

        if (password !== confirmPassword) {
            console.log("Passwords do not match.");
            req.session.message = 'Passwords do not match';
            req.session.type = 'error';
            return res.redirect('/new-agent');
        }

        if (email !== confirmEmail) {
            console.log("Emails do not match.");
            req.session.message = 'Emails do not match';
            req.session.type = 'error';
            return res.redirect('/new-agent');
        }

        const existingAgent = await agentModel.findOne({ email });
        if (existingAgent) {
            console.log("Agent already exists.");
            req.session.message = 'Agent already exists';
            req.session.type = 'error';
            return res.redirect('/new-agent');
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
        req.session.message = 'Agent created successfully';
        req.session.type = 'success';
        return res.redirect('/db-admin-created-agents');
    } catch (error) {
        console.log("Agent registration error:", error.message);
        req.session = req.session || {};
        req.session.message = 'Server error during agent registration';
        req.session.type = 'error';
        return res.redirect('/new-agent');
    }
};

export const editAgentPage = async (req, res) => {
    try {
        const editAgentId = req.query.editAgentId;
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Admin ID missing';
            req.session.type = 'error';
            return res.status(401).redirect('/loginPage');
        }

        const userData = await adminModel.findById(userId);
        if (!userData && isAdmin) {
            req.session.message = 'Admin not found';
            req.session.type = 'error';
            return res.redirect('/AdminDashboard');
        }

        if (!editAgentId) {
            req.session.message = 'Agent ID missing';
            req.session.type = 'error';
            return res.redirect('/AdminDashboard');
        }

        const editAgentData = await agentModel.findById(editAgentId);
        if (!editAgentData) {
            req.session.message = 'Agent not found';
            req.session.type = 'error';
            return res.redirect('/AdminDashboard');
        }

        res.render('admin/layout/edit-agent', {
            isAdmin,
            user: userData,
            editAgent: editAgentData,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error("Error in editPage:", error);
        req.session = req.session || {};
        req.session.message = 'Server error loading edit page';
        req.session.type = 'error';
        res.status(500).redirect('/AdminDashboard');
    }
};

export const editAgent = async (req, res) => {
    try {
        const isAdmin = req.isAdmin;
        const { editAgentId } = req.params;
        const { firstName, lastName, email, phone, countryCode, city, country, state, address, description, day, month, year } = req.body;
        req.session = req.session || {};

        if (!isAdmin) {
            console.log("User is not authorized to edit");
            req.session.message = 'Unauthorized: Admin access required';
            req.session.type = 'error';
            return res.status(403).json({ error: "Unauthorized: Admin access required" });
        }

        if (!firstName || !lastName || !email || !phone || !countryCode) {
            req.session.message = 'Missing required fields';
            req.session.type = 'error';
            return res.status(400).json({ error: "Missing required fields", message: req.session.message, type: req.session.type });
        }

        let dateOfBirth;
        if (day && month && year) {
            dateOfBirth = new Date(`${year}-${month}-${day}`);
            if (isNaN(dateOfBirth)) {
                req.session.message = 'Invalid date of birth';
                req.session.type = 'error';
                return res.status(400).json({ error: "Invalid date of birth", message: req.session.message, type: req.session.type });
            }
        }

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
                req.session.message = 'Agent not found';
                req.session.type = 'error';
                return res.status(404).json({ error: "Agent not found", message: req.session.message, type: req.session.type });
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
            req.session.message = 'Agent not found';
            req.session.type = 'error';
            return res.status(404).json({ error: "Agent not found", message: req.session.message, type: req.session.type });
        }

        console.log("Agent updated successfully");
        req.session.message = 'Agent updated successfully';
        req.session.type = 'success';
        res.redirect('/db-admin-created-agents');
    } catch (error) {
        console.error("Error updating Agent:", error);
        req.session = req.session || {};
        req.session.message = 'Failed to update agent';
        req.session.type = 'error';
        res.status(500).json({ error: "Failed to update Agent", message: req.session.message, type: req.session.type });
    }
};

export const getAgentDetails = async (req, res) => {
    try {
        const agentId = req.query.agentId;
        const adminId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!adminId) {
            console.log("Unauthorized: Admin ID missing");
            req.session.message = 'Unauthorized: Admin ID missing';
            req.session.type = 'error';
            return res.status(401).redirect('/loginPage');
        }

        const adminData = await adminModel.findById(adminId);
        if (!adminData) {
            console.log("Admin not found");
            req.session.message = 'Admin not found';
            req.session.type = 'error';
            return res.status(401).redirect('/loginPage');
        }

        if (!isAdmin) {
            console.log("User is not authorized to view user details");
            req.session.message = 'Unauthorized: Admin access required';
            req.session.type = 'error';
            return res.status(403).redirect('/AdminDashboard');
        }

        const agent = await agentModel.findById(agentId);
        if (!agent) {
            console.log(`Agent not found for ID: ${agentId}`);
            req.session.message = 'Agent not found';
            req.session.type = 'error';
            return res.redirect('/db-admin-created-agents');
        }

        res.render('admin/layout/agentDetail', {
            user: adminData,
            isAdmin,
            agent,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error("Error fetching agent details:", error);
        req.session = req.session || {};
        req.session.message = 'Server error fetching agent details';
        req.session.type = 'error';
        res.redirect('/db-admin-created-agents');
    }
};

export const deleteAgent = async (req, res) => {
    try {
        const isAdmin = req.isAdmin;
        const { agentId } = req.params;
        req.session = req.session || {};

        if (!isAdmin) {
            console.log("Agent is not authorized to delete");
            req.session.message = 'Unauthorized: Admin access required';
            req.session.type = 'error';
            return res.status(403).json({ error: "Unauthorized: Admin access required", message: req.session.message, type: req.session.type });
        }

        const agent = await agentModel.findById(agentId);
        if (!agent) {
            req.session.message = 'Agent not found';
            req.session.type = 'error';
            return res.status(404).json({ error: "Agent not found", message: req.session.message, type: req.session.type });
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
        req.session.message = 'Agent deleted successfully';
        req.session.type = 'success';
        res.redirect('/db-admin-created-agents');
    } catch (error) {
        console.error("Error deleting agent:", error);
        req.session = req.session || {};
        req.session.message = 'Failed to delete agent';
        req.session.type = 'error';
        res.status(500).json({ error: "Failed to delete agent", message: req.session.message, type: req.session.type });
    }
};

export const getSignedInUsers = async (req, res) => {
    try {
        const adminId = req.id;
        const isAdmin = req.isAdmin;
        const { search = '', page = 1 } = req.query;
        const limit = 10;
        req.session = req.session || {};

        if (!adminId) {
            console.log("Unauthorized: Admin ID missing");
            req.session.message = 'Unauthorized: Admin ID missing';
            req.session.type = 'error';
            return res.status(401).redirect('/loginPage');
        }

        const adminData = await adminModel.findById(adminId);
        if (!adminData) {
            console.log("Admin not found");
            req.session.message = 'Admin not found';
            req.session.type = 'error';
            return res.status(401).redirect('/loginPage');
        }

        if (!isAdmin) {
            console.log("User is not authorized to view signed-in users");
            req.session.message = 'Unauthorized: Admin access required';
            req.session.type = 'error';
            return res.status(403).redirect('/AdminDashboard');
        }

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
            user: adminData,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error("Error fetching signed-in users:", error);
        req.session = req.session || {};
        req.session.message = 'Server error fetching users';
        req.session.type = 'error';
        res.redirect('/loginPage');
    }
};

export const getUserDetails = async (req, res) => {
    try {
        const { userId } = req.query;
        const adminId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!adminId) {
            console.log("Unauthorized: Admin ID missing");
            req.session.message = 'Unauthorized: Admin ID missing';
            req.session.type = 'error';
            return res.status(401).redirect('/loginPage');
        }

        const adminData = await adminModel.findById(adminId);
        if (!adminData) {
            console.log("Admin not found");
            req.session.message = 'Admin not found';
            req.session.type = 'error';
            return res.status(401).redirect('/loginPage');
        }

        if (!isAdmin) {
            console.log("User is not authorized to view user details");
            req.session.message = 'Unauthorized: Admin access required';
            req.session.type = 'error';
            return res.status(403).redirect('/AdminDashboard');
        }

        const userDetail = await userModel.findById(userId);
        if (!userDetail) {
            console.log(`User not found for ID: ${userId}`);
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.render('admin/layout/user-details', {
                userDetail: null,
                isAdmin,
                user: adminData,
                message: req.session.message,
                type: req.session.type
            });
        }

        res.render('admin/layout/user-details', {
            userDetail,
            isAdmin,
            user: adminData,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error("Error fetching user details:", error);
        req.session = req.session || {};
        req.session.message = 'Server error fetching user details';
        req.session.type = 'error';
        res.redirect('/loginPage');
    }
};

export const addPackagePage = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'User ID not available';
            req.session.type = 'error';
            return res.status(400).redirect('/loginPage');
        }

        let userData = await adminModel.findById(userId);
        if (!userData) {
            userData = await agentModel.findById(userId);
        }

        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.status(400).redirect('/loginPage');
        }

        res.render('admin/layout/addPackages', {
            isAdmin,
            user: userData,
            opencageApiKey: process.env.OPENCAGE_API_KEY,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error rendering add package page:', error);
        req.session = req.session || {};
        req.session.message = 'Server error rendering add package page';
        req.session.type = 'error';
        res.status(500).redirect('/loginPage');
    }
};

export const editPackagePage = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'User ID not available';
            req.session.type = 'error';
            return res.status(400).redirect('/loginPage');
        }

        let userData = await adminModel.findById(userId);
        if (!userData) {
            userData = await agentModel.findById(userId);
        }

        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.status(400).redirect('/loginPage');
        }

        const packageData = await packageModel.findById(req.params.id);
        if (!packageData) {
            req.session.message = 'Package not found';
            req.session.type = 'error';
            return res.status(404).redirect('/db-all-packages');
        }

        packageData.itineraryDays = packageData.itineraryDays || [];
        packageData.itineraryDays = packageData.itineraryDays.map((day, index) => ({
            day: day.day || index + 1,
            activities: Array.isArray(day.activities) ? day.activities : [{ title: '', sub_title: '', start_time: '', end_time: '', type: '' }]
        }));

        res.render('admin/layout/editPackage', {
            packageData,
            isAdmin,
            user: userData,
            opencageApiKey: process.env.OPENCAGE_API_KEY,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error rendering edit package page:', error);
        req.session = req.session || {};
        req.session.message = 'Server error rendering edit package page';
        req.session.type = 'error';
        res.status(500).redirect('/db-all-packages');
    }
};

export const validatePackage = (data, isActive) => {
    const errors = [];

    if (!data.title) errors.push('Title is required');
    if (!data.createdBy) errors.push('CreatedBy ID is required');
    if (!data.createdByModel) errors.push('CreatedByModel is required');
    if (!['Admin', 'Agent'].includes(data.createdByModel)) errors.push('Invalid createdByModel (must be Admin or Agent)');
    if (!data.status || !['Pending', 'Active', 'Expired'].includes(data.status)) {
        errors.push('Valid status is required (Pending, Active, Expired)');
    }

    if (!data.description) errors.push('Description is required');
    if (!data.packageType || !['Adventure', 'Cultural', 'Luxury', 'Family', 'Wellness', 'Eco'].includes(data.packageType)) {
        errors.push('Valid package type is required (Adventure, Cultural, Luxury, Family, Wellness, Eco)');
    }

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

    if (data.gallery && data.gallery.length > 8) errors.push('Maximum 8 gallery images allowed');

    return errors;
};

export const addPackage = async (req, res) => {
    try {
        const data = req.body;
        req.session = req.session || {};

        let createdBy, createdByModel;
        if (req.isAdmin) {
            createdBy = req.id;
            createdByModel = 'Admin';
        } else {
            const userData = await agentModel.findById(req.id);
            if (!userData) {
                req.session.message = 'Agent not found';
                req.session.type = 'error';
                return res.status(400).json({ error: 'Agent not found', message: req.session.message, type: req.session.type });
            }
            createdBy = req.id;
            createdByModel = 'Agent';
        }

        data.createdBy = createdBy;
        data.createdByModel = createdByModel;
        data.status = data.status || 'Pending';

        if (data.multipleDepartures) {
            let departures = data.multipleDepartures;
            if (typeof departures === 'string') {
                try {
                    departures = JSON.parse(departures);
                } catch (e) {
                    req.session.message = 'Invalid multipleDepartures format';
                    req.session.type = 'error';
                    return res.status(400).json({ error: 'Invalid multipleDepartures format', message: req.session.message, type: req.session.type });
                }
            }
            if (!Array.isArray(departures)) {
                departures = [departures];
            }
            for (let i = 0; i < departures.length; i++) {
                const dep = departures[i];
                if (!dep.location || !dep.dateTime || new Date(dep.dateTime).toString() === 'Invalid Date') {
                    req.session.message = `Departure ${i + 1}: Valid location and date/time are required`;
                    req.session.type = 'error';
                    return res.status(400).json({ error: `Departure ${i + 1}: Valid location and date/time are required`, message: req.session.message, type: req.session.type });
                }
            }
            data.multipleDepartures = departures.map(dep => ({
                location: dep.location,
                dateTime: new Date(dep.dateTime)
            }));
        } else {
            data.multipleDepartures = [];
        }

        if (data.itineraryDays) {
            let itineraryDays = data.itineraryDays;
            if (typeof itineraryDays === 'string') {
                try {
                    itineraryDays = JSON.parse(itineraryDays);
                } catch (e) {
                    req.session.message = 'Invalid itineraryDays format';
                    req.session.type = 'error';
                    return res.status(400).json({ error: 'Invalid itineraryDays format', message: req.session.message, type: req.session.type });
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

        if (data.programDays) {
            let programDays = data.programDays;
            if (typeof programDays === 'string') {
                try {
                    programDays = JSON.parse(programDays);
                } catch (e) {
                    req.session.message = 'Invalid programDays format';
                    req.session.type = 'error';
                    return res.status(400).json({ error: 'Invalid programDays format', message: req.session.message, type: req.session.type });
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

        const validationErrors = validatePackage(data, data.status === 'Active');
        if (validationErrors.length > 0) {
            req.session.message = validationErrors.join(', ');
            req.session.type = 'error';
            return res.status(400).json({ error: validationErrors.join(', '), message: req.session.message, type: req.session.type });
        }

        Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

        const newPackage = new packageModel(data);
        await newPackage.save();
        req.session.message = 'Package created successfully';
        req.session.type = 'success';
        return res.status(200).json({ message: 'Package created successfully', packageId: newPackage._id, sessionMessage: req.session.message, sessionType: req.session.type });
    } catch (error) {
        console.error('Error adding package:', error);
        req.session = req.session || {};
        req.session.message = 'Server error adding package';
        req.session.type = 'error';
        res.status(500).json({ error: 'Server error', message: req.session.message, type: req.session.type });
    }
};

export const editPackage = async (req, res) => {
    try {
        const { id } = req.params;
        req.session = req.session || {};

        if (!id) {
            req.session.message = 'Invalid package ID';
            req.session.type = 'error';
            return res.status(400).json({ error: 'Invalid package ID', message: req.session.message, type: req.session.type });
        }

        const data = req.body;

        let createdBy, createdByModel;
        if (req.isAdmin) {
            createdBy = req.id;
            createdByModel = 'Admin';
        } else {
            const userData = await agentModel.findById(req.id);
            if (!userData) {
                req.session.message = 'Agent not found';
                req.session.type = 'error';
                return res.status(400).json({ error: 'Agent not found', message: req.session.message, type: req.session.type });
            }
            createdBy = req.id;
            createdByModel = 'Agent';
        }
        data.createdBy = createdBy;
        data.createdByModel = createdByModel;
        data.status = data.status || 'Pending';

        if (data.multipleDepartures) {
            let departures = data.multipleDepartures;
            if (typeof departures === 'string') {
                try {
                    departures = JSON.parse(departures);
                } catch (e) {
                    req.session.message = 'Invalid multipleDepartures format';
                    req.session.type = 'error';
                    return res.status(400).json({ error: 'Invalid multipleDepartures format', message: req.session.message, type: req.session.type });
                }
            }
            if (!Array.isArray(departures)) {
                departures = [departures];
            }
            for (let i = 0; i < departures.length; i++) {
                const dep = departures[i];
                if (!dep.location || !dep.dateTime || new Date(dep.dateTime).toString() === 'Invalid Date') {
                    req.session.message = `Departure ${i + 1}: Valid location and date/time are required`;
                    req.session.type = 'error';
                    return res.status(400).json({ error: `Departure ${i + 1}: Valid location and date/time are required`, message: req.session.message, type: req.session.type });
                }
            }
            data.multipleDepartures = departures.map(dep => ({
                location: dep.location,
                dateTime: new Date(dep.dateTime)
            }));
        } else {
            data.multipleDepartures = [];
        }

        if (data.itineraryDays) {
            let itineraryDays = data.itineraryDays;
            if (typeof itineraryDays === 'string') {
                try {
                    itineraryDays = JSON.parse(itineraryDays);
                } catch (e) {
                    req.session.message = 'Invalid itineraryDays format';
                    req.session.type = 'error';
                    return res.status(400).json({ error: 'Invalid itineraryDays format', message: req.session.message, type: req.session.type });
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

        if (data.programDays) {
            let programDays = data.programDays;
            if (typeof programDays === 'string') {
                try {
                    programDays = JSON.parse(programDays);
                } catch (e) {
                    req.session.message = 'Invalid programDays format';
                    req.session.type = 'error';
                    return res.status(400).json({ error: 'Invalid programDays format', message: req.session.message, type: req.session.type });
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

        const existingPackage = await packageModel.findById(id);
        if (!existingPackage) {
            req.session.message = 'Package not found';
            req.session.type = 'error';
            return res.status(404).json({ error: 'Package not found', message: req.session.message, type: req.session.type });
        }

        let gallery = existingPackage.gallery || [];
        if (data.deletedImages) {
            let imagesToDelete = data.deletedImages;
            if (typeof imagesToDelete === 'string') {
                imagesToDelete = imagesToDelete.split(',').map(img => img.trim()).filter(img => img);
            }
            for (const image of imagesToDelete) {
                if (gallery.includes(image)) {
                    try {
                        await fs.unlink(join(__dirname, '../Uploads/gallery', image));
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
            gallery = [...gallery, ...newImages].slice(0, 8);
        }

        let featuredImage = existingPackage.featuredImage;
        if (req.files && req.files['featuredImage']) {
            if (featuredImage) {
                try {
                    await fs.unlink(join(__dirname, '../Uploads/gallery', featuredImage));
                    console.log(`Deleted featured image: ${featuredImage}`);
                } catch (err) {
                    console.error(`Failed to delete featured image ${featuredImage}:`, err);
                }
            }
            featuredImage = req.files['featuredImage'][0].filename;
        }

        data.gallery = gallery;
        data.featuredImage = featuredImage;

        const validationErrors = validatePackage(data, data.status === 'Active');
        if (validationErrors.length > 0) {
            if (req.files && req.files['gallery']) {
                for (const file of req.files['gallery']) {
                    try {
                        await fs.unlink(join(__dirname, '../Uploads/gallery', file.filename));
                    } catch (err) {
                        console.error(`Failed to clean up gallery image ${file.filename}:`, err);
                    }
                }
            }
            if (req.files && req.files['featuredImage']) {
                try {
                    await fs.unlink(join(__dirname, '../Uploads/gallery', req.files['featuredImage'][0].filename));
                } catch (err) {
                    console.error(`Failed to clean up featured image ${req.files['featuredImage'][0].filename}:`, err);
                }
            }
            req.session.message = validationErrors.join(', ');
            req.session.type = 'error';
            return res.status(400).json({ error: validationErrors.join(', '), message: req.session.message, type: req.session.type });
        }

        Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

        const updatedPackage = await packageModel.findByIdAndUpdate(id, data, { new: true });
        if (!updatedPackage) {
            req.session.message = 'Package not found';
            req.session.type = 'error';
            return res.status(404).json({ error: 'Package not found', message: req.session.message, type: req.session.type });
        }

        req.session.message = 'Package updated successfully';
        req.session.type = 'success';
        return res.status(200).json({ message: 'Package updated successfully', packageId: updatedPackage._id, sessionMessage: req.session.message, sessionType: req.session.type });
    } catch (error) {
        console.error('Error updating package:', error);
        req.session = req.session || {};
        req.session.message = 'Server error updating package';
        req.session.type = 'error';
        res.status(500).json({ error: 'Server error', message: req.session.message, type: req.session.type });
    }
};

export const getAllPackages = async (req, res) => {
    try {
        const { page = 1, search = '' } = req.query;
        const limit = 5;
        const pageNum = Math.max(1, Number(page));
        const skip = (pageNum - 1) * limit;
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.status(401).redirect('/loginPage');
        }

        let userData = await adminModel.findById(userId);
        let query = {};

        if (isAdmin) {
            // Admin can see their own packages and those created by their agents
            const agentIds = await agentModel.find({ admin: userId }).distinct('_id');
            query = {
                $or: [
                    { createdBy: userId, createdByModel: 'Admin' },
                    { createdBy: { $in: agentIds }, createdByModel: 'Agent' }
                ]
            };
        } else {
            userData = await agentModel.findById(userId);
            if (!userData) {
                req.session.message = 'User not found';
                req.session.type = 'error';
                return res.status(401).redirect('/loginPage');
            }
            // Agent can see their own packages, their admin's packages, and other agents' packages under the same admin
            const adminId = userData.admin;
            const agentIds = await agentModel.find({ admin: adminId }).distinct('_id');
            query = {
                $or: [
                    { createdBy: adminId, createdByModel: 'Admin' },
                    { createdBy: { $in: agentIds }, createdByModel: 'Agent' }
                ]
            };
        }

        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        const totalPackages = await packageModel.countDocuments(query);
        const totalPages = Math.ceil(totalPackages / limit) || 1;

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
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching packages:', error);
        req.session = req.session || {};
        req.session.message = 'Server error fetching packages';
        req.session.type = 'error';
        res.status(500).redirect('/loginPage');
    }
};


export const deletePackage = async (req, res) => {
    try {
        const { id } = req.params;
        req.session = req.session || {};

        let adminId;
        if (req.isAdmin) {
            adminId = req.id;
        } else {
            const userData = await agentModel.findById(req.id);
            if (!userData) {
                req.session.message = 'Unauthorized: User not found';
                req.session.type = 'error';
                return res.status(401).json({ error: 'Unauthorized: User not found', message: req.session.message, type: req.session.type });
            }
            adminId = userData.admin;
        }

        const packagePacket = await packageModel.findById(id);
        if (!packagePacket) {
            req.session.message = 'Package not found';
            req.session.type = 'error';
            return res.status(404).json({ error: 'Package not found', message: req.session.message, type: req.session.type });
        }

        const uploadsDir = join(__dirname, '../Uploads/gallery');

        if (packagePacket.gallery && packagePacket.gallery.length > 0) {
            for (const image of packagePacket.gallery) {
                try {
                    await fs.unlink(join(uploadsDir, image));
                } catch (err) {
                    console.error(`Failed to delete image ${image}:`, err);
                }
            }
        }

        if (packagePacket.featuredImage) {
            try {
                await fs.unlink(join(uploadsDir, packagePacket.featuredImage));
            } catch (err) {
                console.error(`Failed to delete featured image ${packagePacket.featuredImage}:`, err);
            }
        }

        await packageModel.findByIdAndDelete(id);

        req.session.message = 'Package deleted successfully';
        req.session.type = 'success';
        res.status(200).json({ message: 'Package deleted successfully', sessionMessage: req.session.message, sessionType: req.session.type });
    } catch (error) {
        console.error('Error deleting package:', error);
        req.session = req.session || {};
        req.session.message = 'Failed to delete package';
        req.session.type = 'error';
        res.status(500).json({ error: 'Failed to delete package', message: req.session.message, type: req.session.type });
    }
};

export const getPackagesByStatus = async (req, res) => {
    try {
        const { page = 1, search = '', status } = req.query;
        const validStatuses = ['Active', 'Pending', 'Expired'];
        req.session = req.session || {};

        if (!validStatuses.includes(status)) {
            req.session.message = 'Invalid package status';
            req.session.type = 'error';
            return res.status(400).redirect('/db-all-packages');
        }

        const userId = req.id;
        const isAdmin = req.isAdmin;

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.status(401).redirect('/loginPage');
        }

        let userData = await adminModel.findById(userId);
        let createdId = userId;
        if (!userData) {
            userData = await agentModel.findById(userId);
            if (!userData) {
                req.session.message = 'User not found';
                req.session.type = 'error';
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
            pageTitle: `${status} Packages`,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error(`Error fetching ${req.query.status} packages:`, error);
        req.session = req.session || {};
        req.session.message = `Server error fetching ${req.query.status} packages`;
        req.session.type = 'error';
        res.status(500).redirect('/loginPage');
    }
};

export const getUserDashboard = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.status(401).redirect('/loginPage');
        }

        const userData = await adminModel.findById(userId);
        if (!userData) {
            req.session.message = 'Admin not found';
            req.session.type = 'error';
            return res.status(401).redirect('/loginPage');
        }

        res.render('admin/layout/userPageDashboard', {
            isAdmin,
            user: userData,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error rendering user dashboard:', error);
        req.session = req.session || {};
        req.session.message = 'Server error rendering user dashboard';
        req.session.type = 'error';
        res.status(500).redirect('/loginPage');
    }
};

export const getPackageDashboard = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.status(401).redirect('/loginPage');
        }

        const userData = await adminModel.findById(userId) || await agentModel.findById(userId);
        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.status(401).redirect('/loginPage');
        }

        res.render('admin/layout/packagePageDashboard', {
            isAdmin,
            user: userData,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error rendering package dashboard:', error);
        req.session = req.session || {};
        req.session.message = 'Server error rendering package dashboard';
        req.session.type = 'error';
        res.status(500).redirect('/loginPage');
    }
};

export const getAdminAgentProfile = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            console.log('No user ID in request');
            req.session.message = 'Unauthorized: No user ID provided';
            req.session.type = 'error';
            return res.redirect('/');
        }

        let user = await adminModel.findById(userId);
        if (user) {
            console.log('Rendering admin profile for:', userId);
            return res.render('admin/layout/adminAgentProfile', {
                user,
                isAdmin,
                message: req.session?.message || null,
                type: req.session?.type || null
            });
        }

        user = await agentModel.findById(userId).populate('admin');
        if (user) {
            console.log('Rendering agent profile for:', userId);
            return res.render('admin/layout/adminAgentProfile', {
                user,
                isAdmin,
                message: req.session?.message || null,
                type: req.session?.type || null
            });
        }

        console.log('No admin or agent found for:', userId);
        req.session.message = 'User not found';
        req.session.type = 'error';
        return res.redirect('/');
    } catch (error) {
        console.error('Get admin/agent profile error:', error);
        req.session = req.session || {};
        req.session.message = 'Server error fetching profile';
        req.session.type = 'error';
        res.status(500).render('admin/layout/adminAgentProfile', {
            user: null,
            isAdmin,
            message: req.session.message,
            type: req.session.type
        });
    }
};

export const updateAdminAgentProfile = async (req, res) => {
    try {
        const userId = req.id;
        req.session = req.session || {};

        if (!userId) {
            console.log('No user ID in request');
            req.session.message = 'Unauthorized: No user ID provided';
            req.session.type = 'error';
            return res.status(401).json({ error: 'Unauthorized: No user ID provided', message: req.session.message, type: req.session.type });
        }

        const { firstName, lastName, email, phone, countryCode, dateOfBirth, country, state, city, address, description } = req.body;

        if (!firstName || !lastName || !email || !phone) {
            console.log('Missing required fields:', { firstName, lastName, email, phone });
            req.session.message = 'First name, last name, email, and phone are required';
            req.session.type = 'error';
            return res.status(400).json({ error: 'First name, last name, email, and phone are required', message: req.session.message, type: req.session.type });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('Invalid email format:', email);
            req.session.message = 'Invalid email format';
            req.session.type = 'error';
            return res.status(400).json({ error: 'Invalid email format', message: req.session.message, type: req.session.type });
        }

        let updateData = { firstName, lastName, email, phone };

        if (dateOfBirth) {
            const dob = new Date(dateOfBirth);
            if (isNaN(dob.getTime())) {
                console.log('Invalid date of birth:', dateOfBirth);
                req.session.message = 'Invalid date of birth';
                req.session.type = 'error';
                return res.status(400).json({ error: 'Invalid date of birth', message: req.session.message, type: req.session.type });
            }
            updateData.dateOfBirth = dob;
        }

        let user = await adminModel.findById(userId);
        if (user) {
            if (req.file) {
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
            req.session.message = 'Admin profile updated successfully';
            req.session.type = 'success';
            return res.redirect('/admin-agent-profile');
        }

        user = await agentModel.findById(userId);
        if (user) {
            if (!countryCode) {
                console.log('Missing country code for agent:', userId);
                req.session.message = 'Country code is required for agents';
                req.session.type = 'error';
                return res.status(400).json({ error: 'Country code is required for agents', message: req.session.message, type: req.session.type });
            }
            updateData = { ...updateData, countryCode, dateOfBirth: updateData.dateOfBirth || user.dateOfBirth, country, state, city, address, description };
            if (req.file) {
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
            req.session.message = 'Agent profile updated successfully';
            req.session.type = 'success';
            return res.redirect('/admin-agent-profile');
        }

        console.log('No admin or agent found for:', userId);
        req.session.message = 'User not found';
        req.session.type = 'error';
        return res.status(404).json({ error: 'User not found', message: req.session.message, type: req.session.type });
    } catch (error) {
        console.error('Update admin/agent profile error:', error);
        req.session = req.session || {};
        req.session.message = 'Server error updating profile';
        req.session.type = 'error';
        res.status(500).json({ error: 'Server error while updating profile', message: req.session.message, type: req.session.type });
    }
};

export const getBookings = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            console.log("No userId Available");
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/');
        }

        let userData;
        if (isAdmin) {
            userData = await adminModel.findById(userId);
        } else {
            userData = await agentModel.findById(userId);
        }

        if (!userData) {
            console.log("User not found");
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 3;
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

        if (isAdmin) {
            const adminPackageIds = await packageModel.find({ adminId: userId }).distinct('_id');
            if (adminPackageIds.length > 0) {
                searchQuery['items.packageId'] = { $in: adminPackageIds };
            } else {
                searchQuery['items.packageId'] = { $in: [] };
            }
        } else {
            const agentPackageIds = await packageModel.find({ adminId: userData.admin }).distinct('_id');
            if (agentPackageIds.length > 0) {
                searchQuery['items.packageId'] = { $in: agentPackageIds };
            } else {
                searchQuery['items.packageId'] = { $in: [] };
            }
        }

        const bookings = await packageBookingSchema.find(searchQuery)
            .populate('userId', 'firstName lastName email')
            .populate('items.packageId', 'title')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        const totalBookings = await packageBookingSchema.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalBookings / limit) || 1;

        res.render('admin/layout/db-booking', {
            bookings,
            currentPage: page,
            totalPages,
            user: userData,
            isAdmin,
            search,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        req.session = req.session || {};
        req.session.message = 'Server error fetching bookings';
        req.session.type = 'error';
        res.status(500).render('admin/layout/db-booking', {
            bookings: [],
            currentPage: 1,
            totalPages: 1,
            user: null,
            isAdmin,
            search: '',
            message: req.session.message,
            type: req.session.type
        });
    }
};

export const getEditBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            console.log("No userId Available");
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/');
        }

        let userData;
        if (isAdmin) {
            userData = await adminModel.findById(userId);
        } else {
            userData = await agentModel.findById(userId);
        }

        if (!userData) {
            console.log("User not found");
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const booking = await packageBookingSchema.findById(bookingId)
            .populate('userId', 'firstName lastName email')
            .populate('items.packageId', 'title');

        if (!booking) {
            req.session.message = 'Booking not found';
            req.session.type = 'error';
            return res.status(404).render('admin/layout/edit-booking', {
                booking: null,
                user: userData,
                isAdmin,
                message: req.session.message,
                type: req.session.type
            });
        }

        res.render('admin/layout/edit-booking', {
            booking,
            user: userData,
            isAdmin,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching booking for edit:', error);
        req.session = req.session || {};
        req.session.message = 'Server error fetching booking';
        req.session.type = 'error';
        res.status(500).redirect('/admin/bookings');
    }
};

export const editBooking = async (req, res) => {
    try {
        const userId = req.id;
        req.session = req.session || {};

        if (!userId) {
            console.log("No userId Available");
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const { bookingId } = req.params;
        const { status } = req.body;

        if (!['approved', 'pending', 'rejected'].includes(status)) {
            req.session.message = 'Invalid status';
            req.session.type = 'error';
            return res.status(400).redirect('/admin/bookings');
        }

        const booking = await packageBookingSchema.findById(bookingId);
        if (!booking) {
            req.session.message = 'Booking not found';
            req.session.type = 'error';
            return res.status(404).redirect('/admin/bookings');
        }

        booking.status = status;

        if (status === 'rejected' && booking.payment.paymentStatus === 'succeeded' && booking.payment.paymentType !== 'refund') {
            try {
                const refund = await stripeInstance.refunds.create({
                    payment_intent: booking.payment.stripePaymentIntentId,
                    amount: Math.round(booking.total * 100),
                });
                booking.payment.paymentType = 'refund';
                booking.payment.paymentStatus = 'pending';
            } catch (refundError) {
                console.error('Error processing refund:', refundError);
                req.session.message = 'Error processing refund';
                req.session.type = 'error';
                return res.status(500).redirect('/admin/bookings');
            }
        }

        await booking.save();

        req.session.message = 'Booking updated successfully';
        req.session.type = 'success';
        res.redirect('/admin/bookings');
    } catch (error) {
        console.error('Error editing booking:', error);
        req.session = req.session || {};
        req.session.message = 'Server error editing booking';
        req.session.type = 'error';
        res.status(500).redirect('/admin/bookings');
    }
};

export const deleteBooking = async (req, res) => {
    try {
        const userId = req.id;
        req.session = req.session || {};

        if (!userId) {
            console.log("No userId Available");
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const { bookingId } = req.params;
        const booking = await packageBookingSchema.findByIdAndDelete(bookingId);
        if (!booking) {
            req.session.message = 'Booking not found';
            req.session.type = 'error';
            return res.status(404).redirect('/admin/bookings');
        }

        req.session.message = 'Booking deleted successfully';
        req.session.type = 'success';
        res.redirect('/admin/bookings');
    } catch (error) {
        console.error('Error deleting booking:', error);
        req.session = req.session || {};
        req.session.message = 'Server error deleting booking';
        req.session.type = 'error';
        res.status(500).redirect('/admin/bookings');
    }
};

export const packagePreview = async (req, res) => {
    try {
        const userId = req.id;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const isAdmin = req.isAdmin;

        let userData;
        if (isAdmin) {
            userData = await adminModel.findById(userId);
        } else {
            userData = await agentModel.findById(userId);
        }

        if (!userData) {
            console.log("User not found");
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const packageData = await packageModel.findById(req.params.packageId).lean();
        if (!packageData) {
            req.session.message = 'Package not found';
            req.session.type = 'error';
            return res.render('admin/layout/packagePreview', {
                package: null,
                isAdmin,
                bookings: [],
                reviews: [],
                user: userData,
                message: req.session.message,
                type: req.session.type
            });
        }

        const bookings = await packageBookingSchema.find({ 'items.packageId': req.params.packageId })
            .populate('userId', 'firstName lastName email')
            .lean();
        const reviews = await reviewSchema.find({ 'packageId': req.params.packageId }).sort({ date: -1 });

        res.render('admin/layout/packagePreview', {
            package: packageData,
            bookings,
            reviews,
            user: userData,
            isAdmin,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching package preview:', error);
        req.session = req.session || {};
        req.session.message = 'Server error fetching package preview';
        req.session.type = 'error';
        res.status(500).render('admin/layout/packagePreview', {
            package: null,
            isAdmin,
            bookings: [],
            reviews: [],
            user: null,
            message: req.session.message,
            type: req.session.type
        });
    }
};



export const renderCouponList = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const isAdmin = req.isAdmin;
        let userData = await adminModel.findById(userId);
        if (!userData) {
            userData = await agentModel.findById(userId);
            if (!userData) {
                req.session.message = 'User not found';
                req.session.type = 'error';
                return res.redirect('/');
            }
        }

        const { search = '', page = 1 } = req.query;
        const limit = 10; // Number of coupons per page
        const skip = (page - 1) * limit;

        // Build query
        let query = {};
        if (isAdmin) {
            // Admin can see their own coupons and those created by their agents
            const agentIds = await agentModel.find({ admin: userId }).distinct('_id');
            query.$or = [
                { createdBy: userId, createdByModel: 'Admin' },
                { createdBy: { $in: agentIds }, createdByModel: 'Agent' }
            ];
        } else {
            // Agent can see their own coupons, their admin's coupons, and other agents' coupons under the same admin
            const agentData = await agentModel.findById(userId);
            if (!agentData || !agentData.admin) {
                req.session.message = 'Agent or admin not found';
                req.session.type = 'error';
                return res.redirect('/');
            }
            const adminId = agentData.admin;
            const agentIds = await agentModel.find({ admin: adminId }).distinct('_id');
            query.$or = [
                { createdBy: adminId, createdByModel: 'Admin' },
                { createdBy: { $in: agentIds }, createdByModel: 'Agent' }
            ];
        }

        if (search) {
            query.code = { $regex: search, $options: 'i' }; // Case-insensitive search by code
        }

        // Fetch coupons
        const coupons = await couponSchema.find(query)
            .lean()
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        // Get total count for pagination
        const totalCoupons = await couponSchema.countDocuments(query);
        const totalPages = Math.ceil(totalCoupons / limit) || 1;

        res.render('admin/layout/couponList', {
            coupons,
            user: userData,
            isAdmin,
            search,
            currentPage: parseInt(page),
            totalPages,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching coupon list:', error);
        req.session.message = 'Error fetching coupon list';
        req.session.type = 'error';
        res.status(500).redirect('/loginPage');
    }
};




// Render Add Coupon Page
export const renderAddCoupon = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const isAdmin = req.isAdmin;
        let userData = await adminModel.findById(userId);
        if (!userData) {
            userData = await agentModel.findById(userId);
            if (!userData) {
                req.session.message = 'User not found';
                req.session.type = 'error';
                return res.redirect('/');
            }
        }

        res.render('admin/layout/addCoupon', {
            user: userData,
            isAdmin,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error rendering add coupon page:', error);
        req.session.message = 'Error rendering add coupon page';
        req.session.type = 'error';
        res.status(500).redirect('/loginPage');
    }
};



// Function to generate a random coupon code
function generateRandomCode(length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}



// Create New Coupon
export const createCoupon = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const isAdmin = req.isAdmin;
        let userData = await adminModel.findById(userId);
        let createdBy, createdByModel;
        if (isAdmin) {
            createdBy = userId;
            createdByModel = 'Admin';
        } else {
            userData = await agentModel.findById(userId);
            if (!userData) {
                req.session.message = 'User not found';
                req.session.type = 'error';
                return res.redirect('/');
            }
            createdBy = userId;
            createdByModel = 'Agent';
        }

        const {
            creationMode = 'manual',
            code,
            numCoupons,
            discountType,
            discountValue,
            minPurchase = 0,
            maxDiscount = 0,
            expiryDate,
            usageLimit = 1,
            restrictToUser,
            isActive = 'true'
        } = req.body;

        if (creationMode === 'manual' && !code) {
            req.session.message = 'Coupon code is required for manual creation';
            req.session.type = 'error';
            return res.redirect('/new-coupon');
        }
        if (creationMode === 'automatic' && (!numCoupons || parseInt(numCoupons) <= 0)) {
            req.session.message = 'Number of coupons must be greater than 0 for automatic creation';
            req.session.type = 'error';
            return res.redirect('/new-coupon');
        }

        // Validate required fields
        if (!discountType || !discountValue || !expiryDate) {
            req.session.message = 'Required fields are missing';
            req.session.type = 'error';
            return res.redirect('/new-coupon');
        }


        // Validate discountType
        if (!['percentage', 'fixed'].includes(discountType)) {
            req.session.message = 'Invalid discount type';
            req.session.type = 'error';
            return res.redirect('/new-coupon');
        }

        // Validate discountValue
        if (parseFloat(discountValue) < 0) {
            req.session.message = 'Discount value cannot be negative';
            req.session.type = 'error';
            return res.redirect('/new-coupon');
        }

        // Validate restrictToUser (if provided)
        let userIdRestrict = null;
        if (restrictToUser) {

            const user = await userModel.findOne({email: restrictToUser});
            if (!user) {
                req.session.message = 'User not found';
                req.session.type = 'error';
                return res.redirect('/new-coupon');
            }
            userIdRestrict = user._id;
        }

        // Create coupon
        const couponData = {
            
            // code: code.toUpperCase(),
            discountType,
            discountValue: parseFloat(discountValue),
            minPurchase: parseFloat(minPurchase),
            maxDiscount: parseFloat(maxDiscount),
            expiryDate: new Date(expiryDate),
            usageLimit: parseInt(usageLimit),
            restrictToUser: userIdRestrict,
            isActive: isActive === 'true',
            createdBy,
            createdByModel
        };

 // Handle manual or automatic creation
 if (creationMode === 'manual') {
    const coupon = new couponSchema({
        ...couponData,
        code: code.toUpperCase()
    });
    await coupon.save();
    req.session.message = 'Coupon created successfully';
    req.session.type = 'success';
} else {
    const numToGenerate = parseInt(numCoupons);
    const coupons = [];
    for (let i = 0; i < numToGenerate; i++) {
        let uniqueCode;
        let attempts = 0;
        const maxAttempts = 10;

        // Generate unique code
        do {
            uniqueCode = generateRandomCode();
            attempts++;
            if (attempts > maxAttempts) {
                req.session.message = 'Unable to generate unique coupon codes';
                req.session.type = 'error';
                return res.redirect('/new-coupon');
            }
        } while (await couponSchema.findOne({ code: uniqueCode }));

        coupons.push({
            ...couponData,
            code: uniqueCode
        });
    }

    await couponSchema.insertMany(coupons);
    req.session.message = `${numToGenerate} coupons generated successfully`;
    req.session.type = 'success';
}


        res.redirect('/coupon-list');
    } catch (error) {
        console.error('Error creating coupon:', error);
        req.session.message = 'Error creating coupon';
        req.session.type = 'error';
        res.redirect('/new-coupon');
    }
};


// Render Edit Coupon Page
export const renderEditCoupon = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const isAdmin = req.isAdmin;
        let userData = await adminModel.findById(userId);
        if (!userData) {
            userData = await agentModel.findById(userId);
            if (!userData) {
                req.session.message = 'User not found';
                req.session.type = 'error';
                return res.redirect('/');
            }
        }

        // Build query to ensure user has access to the coupon
        let query = { _id: req.params.couponId };
        if (isAdmin) {
            const agentIds = await agentModel.find({ admin: userId }).distinct('_id');
            query.$or = [
                { createdBy: userId, createdByModel: 'Admin' },
                { createdBy: { $in: agentIds }, createdByModel: 'Agent' }
            ];
        } else {
            const agentData = await agentModel.findById(userId);
            if (!agentData || !agentData.admin) {
                req.session.message = 'Agent or admin not found';
                req.session.type = 'error';
                return res.redirect('/');
            }
            const adminId = agentData.admin;
            const agentIds = await agentModel.find({ admin: adminId }).distinct('_id');
            query.$or = [
                { createdBy: adminId, createdByModel: 'Admin' },
                { createdBy: { $in: agentIds }, createdByModel: 'Agent' }
            ];
        }

        const coupon = await couponSchema.findOne(query).lean();
        if (!coupon) {
            req.session.message = 'Coupon not found or you do not have access';
            req.session.type = 'error';
            return res.redirect('/coupon-list');
        }

        res.render('admin/layout/editCoupon', {
            coupon,
            user: userData,
            isAdmin,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching coupon:', error);
        req.session.message = 'Error fetching coupon';
        req.session.type = 'error';
        res.redirect('/coupon-list');
    }
};

// // Update Coupon
export const updateCoupon = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const isAdmin = req.isAdmin;
        let userData = await adminModel.findById(userId);
        let createdBy, createdByModel;
        if (isAdmin) {
            createdBy = userId;
            createdByModel = 'Admin';
        } else {
            userData = await agentModel.findById(userId);
            if (!userData) {
                req.session.message = 'User not found';
                req.session.type = 'error';
                return res.redirect('/');
            }
            createdBy = userId;
            createdByModel = 'Agent';
        }

        const {
            code,
            discountType,
            discountValue,
            minPurchase = 0,
            maxDiscount = 0,
            expiryDate,
            usageLimit = 1,
            restrictToUser,
            isActive = 'true'
        } = req.body;

        // Validate required fields
        if (!code || !discountType || !discountValue || !expiryDate) {
            req.session.message = 'Required fields are missing';
            req.session.type = 'error';
            return res.redirect(`/edit-coupon/${req.params.couponId}`);
        }

        // Validate discountType
        if (!['percentage', 'fixed'].includes(discountType)) {
            req.session.message = 'Invalid discount type';
            req.session.type = 'error';
            return res.redirect(`/edit-coupon/${req.params.couponId}`);
        }

        // Validate discountValue
        if (parseFloat(discountValue) < 0) {
            req.session.message = 'Discount value cannot be negative';
            req.session.type = 'error';
            return res.redirect(`/edit-coupon/${req.params.couponId}`);
        }

        // Validate restrictToUser (if provided)
        let userIdRestrict = null;
        if (restrictToUser) {
           
            const user = await userModel.findOne({email: restrictToUser});
            if (!user) {
                req.session.message = 'User not found';
                req.session.type = 'error';
                return res.redirect('/new-coupon');
            }
            userIdRestrict = user._id;
        }

        // Update coupon
        const coupon = await couponSchema.findByIdAndUpdate(
            req.params.couponId,
            {
                code: code.toUpperCase(),
                discountType,
                discountValue: parseFloat(discountValue),
                minPurchase: parseFloat(minPurchase),
                maxDiscount: parseFloat(maxDiscount),
                expiryDate: new Date(expiryDate),
                usageLimit: parseInt(usageLimit),
                restrictToUser: userIdRestrict,
                isActive: isActive === 'true',
                createdBy,
                createdByModel
            },
            { new: true, runValidators: true }
        );

        if (!coupon) {
            req.session.message = 'Coupon not found';
            req.session.type = 'error';
            return res.redirect('/coupon-list');
        }

        req.session.message = 'Coupon updated successfully';
        req.session.type = 'success';
        res.redirect('/coupon-list');
    } catch (error) {
        console.error('Error updating coupon:', error);
        req.session.message = 'Error updating coupon';
        req.session.type = 'error';
        res.redirect(`/edit-coupon/${req.params.couponId}`);
    }
};



// Delete Coupon
export const deleteCoupon = async (req, res) => {
    try {

        const userId = req.id;
        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/');
        }
    
        const isAdmin = req.isAdmin;
        let userData = await adminModel.findById(userId);
        if (!userData) {
            userData = await agentModel.findById(userId);
            if (!userData) {
                req.session.message = 'User not found';
                req.session.type = 'error';
                return res.redirect('/');
            }
        }
  

        const { couponId } = req.params;
        let query = { _id: couponId };
     
        if (isAdmin) {
            const agentIds = await agentModel.find({ admin: userId }).distinct('_id');
            query.$or = [
                { createdBy: userId, createdByModel: 'Admin' },
                { createdBy: { $in: agentIds }, createdByModel: 'Agent' }
            ];
        } else {
            const agentData = await agentModel.findById(userId);
            if (!agentData || !agentData.admin) {
                req.session.message = 'Agent or admin not found';
                req.session.type = 'error';
                return res.redirect('/');
            }
            const adminId = agentData.admin;
            const agentIds = await agentModel.find({ admin: adminId }).distinct('_id');
            query.$or = [
                { createdBy: adminId, createdByModel: 'Admin' },
                { createdBy: { $in: agentIds }, createdByModel: 'Agent' }
            ];
        }

        const coupon = await couponSchema.findOneAndDelete(query);
        if (!coupon) {
            req.session.message = 'Coupon not found or you do not have access';
            req.session.type = 'error';
            return res.redirect('/coupon-list');
        }

        req.session.message = 'Coupon deleted successfully';
        req.session.type = 'success';
        res.redirect('/coupon-list');
    } catch (error) {
        console.error('Error deleting coupon:', error);
        req.session.message = 'Error deleting coupon';
        req.session.type = 'error';
        res.redirect('/coupon-list');
    }
};



// Render Coupon Details
export const renderCouponDetails = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const isAdmin = req.isAdmin;
        let userData = await adminModel.findById(userId);
        if (!userData) {
            userData = await agentModel.findById(userId);
            if (!userData) {
                req.session.message = 'User not found';
                req.session.type = 'error';
                return res.redirect('/');
            }
        }

        // Build query to ensure user has access to the coupon
        let query = { _id: req.params.couponId };
        if (isAdmin) {
            const agentIds = await agentModel.find({ admin: userId }).distinct('_id');
            query.$or = [
                { createdBy: userId, createdByModel: 'Admin' },
                { createdBy: { $in: agentIds }, createdByModel: 'Agent' }
            ];
        } else {
            const agentData = await agentModel.findById(userId);
            if (!agentData || !agentData.admin) {
                req.session.message = 'Agent or admin not found';
                req.session.type = 'error';
                return res.redirect('/');
            }
            const adminId = agentData.admin;
            const agentIds = await agentModel.find({ admin: adminId }).distinct('_id');
            query.$or = [
                { createdBy: adminId, createdByModel: 'Admin' },
                { createdBy: { $in: agentIds }, createdByModel: 'Agent' }
            ];
        }

        const coupon = await couponSchema.findOne(query)
            .populate('usedBy.userId', 'firstName lastName email')
            .populate('restrictToUser', 'firstName lastName email')
            .lean();
        if (!coupon) {
            req.session.message = 'Coupon not found or you do not have access';
            req.session.type = 'error';
            return res.render('admin/layout/couponDetails', {
                coupon: null,
                user: userData,
                isAdmin,
                message: req.session.message,
                type: req.session.type
            });
        }

        res.render('admin/layout/couponDetails', {
            coupon,
            user: userData,
            isAdmin,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching coupon details:', error);
        req.session.message = 'Error fetching coupon details';
        req.session.type = 'error';
        res.status(500).redirect('/loginPage');
    }
};
