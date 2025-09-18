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
import CareerSchema from '../models/CareerSchema.js';
import ApplicationSchema from '../models/ApplicationSchema.js';
import GuideSchema from '../models/GuideSchema.js';
import GallerySchema from '../models/GallerySchema.js';
import faqSchema from '../models/faqSchema.js';
import contactSchema from '../models/contactSchema.js';
import productSchema from '../models/productSchema.js';
import productBookingSchema from '../models/productBookingSchema.js';
import blogSchema from '../models/blogSchema.js';

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);


// Adminand agent Dashboard Page
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
        else {
            userData = await agentModel.findById(userId);
        }


        if (!userData) {
            req.session.message = 'Admin not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }
        // Fetch metrics
        const agentCount = await agentModel.countDocuments({ isActive: true });
        const usersCount = await userModel.countDocuments();

        // Calculate total earnings for packages
        const packageEarnings = await packageBookingSchema.aggregate([
            { $match: { 'payment.paymentStatus': 'succeeded' } },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$total' }
                }
            }
        ]).then(result => result[0]?.totalAmount || 0);

        // Calculate total earnings for products
        const productEarnings = await productBookingSchema.aggregate([
            { $match: { 'payment.paymentStatus': 'succeeded' } },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$total' }
                }
            }
        ]).then(result => result[0]?.totalAmount || 0);

        // Fetch recent bookings (package + product)
        const packageBookings = await packageBookingSchema
            .find({ status: { $in: ['approved', 'pending'] } })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate({ path: 'userId', select: 'firstName lastName email' })
            .populate({ path: 'items.packageId', select: 'title' });

        const productBookings = await productBookingSchema
            .find({ status: { $in: ['approved', 'pending'] } })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate({ path: 'userId', select: 'firstName lastName email' })
            .populate({ path: 'items.productId', select: 'name' });

        // Flatten bookings to include all items
        const bookings = [
            ...packageBookings.flatMap(booking =>
                booking.items.map(item => ({
                    user: {
                        name: `${booking.userId?.firstName || ''} ${booking.userId?.lastName || ''}`.trim() || 'Unknown User',
                        email: booking.userId.email
                    },
                    bookingDate: booking.createdAt || new Date(),
                    itemName: item.packageId?.title || 'Unknown Package',
                    type: 'Package',
                    status: booking.status || 'Unknown',
                    quantity: item.quantity || 1
                }))
            ),
            ...productBookings.flatMap(booking =>
                booking.items.map(item => ({
                    user: {
                        name: `${booking.userId?.firstName || ''} ${booking.userId?.lastName || ''}`.trim() || 'Unknown User',
                        email: booking.userId?.email
                    },
                    bookingDate: booking.createdAt || new Date(),
                    itemName: item.productId?.name || 'Unknown Product',
                    type: 'Product',
                    status: booking.status || 'Unknown',
                    quantity: item.quantity || 1
                }))
            )
        ].sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate)).slice(0, 5);

        // Fetch contact enquiries
        const enquiries = await contactSchema
            .find()
            .sort({ createdAt: -1 })
            .limit(5)


        // Fetch recent packages
        const packages = await packageModel
            .find({ status: 'Active' })
            .sort({ createdAt: -1 })
            .limit(4)
            .select('title regularPrice discount featuredImage');

        // Fetch booking counts for these package IDs in one go
        const packageIds = packages.map(pkg => pkg._id);

        const packageBookingCounts = await packageBookingSchema.aggregate([
            { $unwind: '$items' },
            { $match: { 'items.packageId': { $in: packageIds } } },
            {
                $group: {
                    _id: '$items.packageId',
                    count: { $sum: '$items.quantity' }
                }
            }
        ]);

        // Convert bookingCounts array into a Map for quick lookup
        const bookingCountMap = new Map(
            packageBookingCounts.map(b => [b._id.toString(), b.count])
        );

        // Format packages with counts
        const formattedPackages = packages.map(pkg => ({
            _id: pkg._id,
            title: pkg.title || 'Untitled Package',
            regularPrice: pkg.regularPrice || 0,
            discount: pkg.discount || 0,
            featuredImage: pkg.featuredImage || null,
            bookingsCount: bookingCountMap.get(pkg._id.toString()) || 0
        }));

        // Fetch recent products
        const products = await productSchema
            .find({ status: 'active' })
            .sort({ createdAt: -1 })
            .limit(4)
            .select('name price discountPrice featureImage');

        const productBookingCounts = await productBookingSchema.aggregate([
            { $unwind: "$items" },
            { $group: { _id: "$items.productId", count: { $sum: "$items.quantity" } } }
        ]);

        const countMap = productBookingCounts.reduce((map, item) => {
            map[item._id.toString()] = item.count;
            return map;
        }, {});

        const formattedProducts = products.map(product => ({
            _id: product._id,
            name: product.name || "Untitled Product",
            price: product.price || 0,
            discountPrice: product.discountPrice || 0,
            featureImage: product.featureImage || null,
            bookingsCount: countMap[product._id.toString()] || 0
        }));

        // Fetch recent FAQs
        const faqs = await faqSchema
            .find()
            .sort({ questionAt: -1 })
            .limit(4);


        res.render('admin/layout/AdminDashboard', {
            user: userData,
            isAdmin,
            agentCount,
            usersCount,
            productEarnings,
            packageEarnings,
            bookings,
            enquiries,
            packages: formattedPackages,
            products: formattedProducts,
            faqs,
            message: req.session?.message || null,
            type: req.session?.type || null
        });

    } catch (error) {
        console.error("Error loading admin dashboard:", error);
        req.session = req.session || {};
        req.session.message = 'Server error loading dashboard';
        req.session.type = 'error';
        res.status(500).redirect('/error')
    }
};

// Get Agg Agent And render on agent list page
export const getAllAgents = async (req, res) => {
    try {
        const { page = 1, search = '' } = req.query;
        const statusFilter = req.query.statusFilter || 'all';
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

        if (statusFilter === 'Active') {
            query.isActive = true;
        } else if (statusFilter === 'notActive') {
            query.isActive = false;
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
            statusFilter,
            user: userData,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching agents:', error);
        req.session = req.session || {};
        req.session.message = 'Server error fetching agents';
        req.session.type = 'error';
        res.status(500).redirect('/error')
    }
};

// Render New Agent Page 
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
        res.status(500).redirect('/error')
    }
};

// Add new Agent
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
        res.status(500).redirect('/error')
    }
};

// Render Edit Agent page 
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
        res.status(500).redirect('/error')
    }
};

// Edit agent
export const editAgent = async (req, res) => {
    try {
        const isAdmin = req.isAdmin;
        const { editAgentId } = req.params;
        const { firstName, lastName, email, phone, countryCode, city, country, state, address, description, day, month, year, isActive } = req.body;
        req.session = req.session || {};

        if (!isAdmin) {
            console.log("User is not authorized to edit");
            req.session.message = 'Unauthorized: Admin access required';
            req.session.type = 'error';
            return res.redirect('/db-admin-created-agents');
        }

        if (!firstName || !email || !phone) {
            req.session.message = 'Missing required fields';
            req.session.type = 'error';
            return res.redirect('/db-admin-created-agents');
        }

        let dateOfBirth;
        if (day && month && year) {
            dateOfBirth = new Date(`${year}-${month}-${day}`);
            if (isNaN(dateOfBirth)) {
                req.session.message = 'Invalid date of birth';
                req.session.type = 'error';
                return res.redirect('/db-admin-created-agents');
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
            isActive,
            ...(dateOfBirth && { dateOfBirth }),
        };

        if (req.file) {
            editAgent.profilePic = req.file.filename;
            const agent = await agentModel.findById(editAgentId);
            if (!agent) {
                req.session.message = 'Agent not found';
                req.session.type = 'error';
                return res.redirect('/db-admin-created-agents');
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
            return res.redirect('/db-admin-created-agents');
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
        res.status(500).redirect('/error')
    }
};

// Render the agent detail page
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
        res.status(500).redirect('/error');
    }
};

// Delete Agent
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
        res.status(500).redirect('/error');
    }
};

// Get sign up users from database and render sign up user page
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
            statusFilter: null,
            user: adminData,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error("Error fetching signed-in users:", error);
        req.session = req.session || {};
        req.session.message = 'Server error fetching users';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Render the user detail page
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
        res.status(500).redirect('/error');
    }
};

// Render the Add package Page
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
        res.status(500).redirect('/error');
    }
};

// Render the edit package Page
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
        res.status(500).redirect('/error');
    }
};

// Validation functionality to ensure the packages creation
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

// Add new package
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
                return res.redirect('/error')
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
        res.status(500).redirect('/error');
    }
};

// Edit package
export const editPackage = async (req, res) => {
    try {
        const { id } = req.params;
        req.session = req.session || {};
        const userId = req.id;
        const isAdmin = req.isAdmin

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
        data.updatedBy = userId;
        data.updatedByModel = isAdmin ? 'Admin' : 'Agent';
        data.updatedAt = new Date();

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
        res.status(500).redirect('/error');
    }
};

// Render all packages
export const getAllPackages = async (req, res) => {
    try {
        const { page = 1, search = '' } = req.query;
        const statusFilter = req.query.statusFilter || 'all';
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
        if (statusFilter !== 'all') {
            query.status = statusFilter;
        }

        const totalPackages = await packageModel.countDocuments(query);
        const totalPages = Math.ceil(totalPackages / limit) || 1;

        const allPackages = await packageModel
            .find(query)
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email')
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
            statusFilter,
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
        res.status(500).redirect('/error');
    }
};

// Delete package
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
        res.status(500).redirect('/error');
    }
};

// Render the different pages according to status of packages(Pending, Accepted and rejected Packages)
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

        let query = {};

        if (isAdmin) {
            // Admin can see their own packages and those created by their agents
            const agentIds = await agentModel.find({ admin: userId }).distinct('_id');
            query = {
                $or: [
                    { createdBy: userId, createdByModel: 'Admin' },
                    { createdBy: { $in: agentIds }, createdByModel: 'Agent' },
                ],
                status: status
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
                ],
                status: status
            };
        }

        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        const limit = 10;
        const pageNum = Math.max(1, Number(page));
        const skip = (pageNum - 1) * limit;
        const totalPackages = await packageModel.countDocuments(query);
        const totalPages = Math.ceil(totalPackages / limit) || 1;

        const allPackages = await packageModel.find(query)
            .populate('createdBy', 'firstName lastName email')
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
            statusFilter: null,
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
        res.status(500).redirect('/error');
    }
};

// Render the agents and signed up users Dashboard Page 
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
        res.status(500).redirect('/error');
    }
};

// Render the packages according to status Dashboard Page 
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
        res.status(500).redirect('/error');
    }
};

// Get Admin And Agent profile Details
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
        res.status(500).redirect('/error');
    }
};

// Update Agent And Admin Profile
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
        res.status(500).redirect('/error');
    }
};

// Render package Booking list page
export const getPackageBookings = async (req, res) => {
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
        const statusFilter = req.query.statusFilter || 'all';

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


        if (statusFilter !== 'all') {
            searchQuery.status = statusFilter;
        }
        // Determine package IDs based on user role
        let packageIds = [];
        if (isAdmin) {
            // Admin sees their own packages and their agents' packages
            const agentIds = await agentModel.find({ admin: userId }).distinct('_id');
            packageIds = await packageModel.find({

                $or: [
                    { createdBy: userId, createdByModel: 'Admin' },
                    { createdBy: { $in: agentIds }, createdByModel: 'Agent' }
                ]
            }).distinct('_id');
        } else {
            // Agent sees their own packages and their admin's packages
            const adminId = userData.admin; // Assuming agentModel has admin field
            packageIds = await packageModel.find({
                $or: [
                    { createdBy: userId, createdByModel: 'Agent' },
                    { createdBy: adminId, createdByModel: 'Admin' }
                ]
            }).distinct('_id');
        }

        // Only add packageId filter if packages exist
        if (packageIds.length > 0) {
            searchQuery['items.packageId'] = { $in: packageIds };
        } else if (!search) {
            // If no packages and no search term, return no bookings
            return res.render('admin/layout/db-package-booking', {
                bookings: [],
                currentPage: 1,
                totalPages: 1,
                user: userData,
                isAdmin,
                search,
                message: 'No packages found for this user',
                type: 'info'
            });
        }


        const bookings = await packageBookingSchema.find(searchQuery)
            .populate('userId', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email')
            .populate('items.packageId', 'title')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        const totalBookings = await packageBookingSchema.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalBookings / limit) || 1;

        res.render('admin/layout/db-package-booking', {
            bookings,
            currentPage: page,
            totalPages,
            user: userData,
            statusFilter,
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
        res.status(500).redirect('/error');
    }
};

// Get pacakge Bookig Details And Update package Booking status Functionality
export const getEditPackageBooking = async (req, res) => {
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
            return res.status(404).render('admin/layout/edit-package-booking', {
                booking: null,
                user: userData,
                isAdmin,
                message: req.session.message,
                type: req.session.type
            });
        }

        res.render('admin/layout/edit-package-booking', {
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
        res.status(500).redirect('/error');
    }
};

// Update package Booking Status
export const editPackageBooking = async (req, res) => {
    try {
        const userId = req.id;
        req.session = req.session || {};
        const isAdmin = req.isAdmin
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
            return res.status(400).redirect('/package-booking');
        }

        const booking = await packageBookingSchema.findById(bookingId);
        if (!booking) {
            req.session.message = 'Booking not found';
            req.session.type = 'error';
            return res.status(404).redirect('/package-booking');
        }

        booking.status = status;
        booking.updatedBy = userId;
        booking.updatedByModel = isAdmin ? 'Admin' : 'Agent';
        booking.updatedAt = new Date();

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
                return res.status(500).redirect('/package-booking');
            }
        }

        await booking.save();

        req.session.message = 'Booking updated successfully';
        req.session.type = 'success';
        res.redirect('/package-booking');
    } catch (error) {
        console.error('Error editing booking:', error);
        req.session = req.session || {};
        req.session.message = 'Server error editing booking';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Delete package Booking
export const deletePackageBooking = async (req, res) => {
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
            return res.status(404).redirect('/package-booking');
        }

        req.session.message = 'Booking deleted successfully';
        req.session.type = 'success';
        res.redirect('/package-booking');
    } catch (error) {
        console.error('Error deleting booking:', error);
        req.session = req.session || {};
        req.session.message = 'Server error deleting booking';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Render Package Preview Page
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
        res.status(500).redirect('/error');
    }
};

// Render coupon list page
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
        const statusFilter = req.query.statusFilter || 'all';

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

        if (statusFilter === 'Active') {
            query.isActive = true;
        } else if (statusFilter === 'notActive') {
            query.isActive = false;
        }
        // Fetch coupons
        const coupons = await couponSchema.find(query)
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email')
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
            statusFilter,
            currentPage: parseInt(page),
            totalPages,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching coupon list:', error);
        req.session.message = 'Error fetching coupon list';
        req.session.type = 'error';
        res.status(500).redirect('/error');
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
        res.status(500).redirect('/error');
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

            const user = await userModel.findOne({ email: restrictToUser });
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
        res.status(500).redirect('/error');
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

        const coupon = await couponSchema.findOne(query).populate('restrictToUser', 'firstName lastName email').lean();
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
        res.status(500).redirect('/error');
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

            const user = await userModel.findOne({ email: restrictToUser });
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
                updatedBy: userId,
                updatedByModel: isAdmin ? 'Admin' : 'Agent',
                updatedAt: new Date(),
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
        res.status(500).redirect('/error');
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
        res.status(500).redirect('/error');
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
            .populate('createdBy', 'firstName lastName email')
            .populate('restrictToUser', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email')
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
        res.status(500).redirect('/error');
    }
};

// Get career list for admin/agent
export const getCareerList = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = await adminModel.findById(userId);
        if (!userData) {
            userData = await agentModel.findById(userId);
        }

        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const { page = 1, search = '' } = req.query;
        const limit = 10;
        const skip = (page - 1) * limit;
        const statusFilter = req.query.statusFilter || 'all';

        let query = {};
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }
        if (statusFilter === 'Active') {
            query.isActive = true;
        } else if (statusFilter === 'notActive') {
            query.isActive = false;
        }

        const careers = await CareerSchema.find(query)
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();



        const totalCareers = await CareerSchema.countDocuments(query);
        const totalPages = Math.ceil(totalCareers / limit) || 1;

        res.render('admin/layout/careerList', {
            allCareers: careers,
            search,
            currentPage: parseInt(page),
            totalPages,
            statusFilter,
            isAdmin,
            user: userData,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching career list:', error);
        req.session.message = 'Error fetching career list';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Get add career page for admin/agent
export const getAddCareerPage = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = await adminModel.findById(userId);
        if (!userData) {
            userData = await agentModel.findById(userId);
        }

        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        res.render('admin/layout/addCareer', {
            isAdmin,
            user: userData,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error rendering add career page:', error);
        req.session = req.session || {};
        req.session.message = 'Server error rendering add career page';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Add new career
export const addCareer = async (req, res) => {
    try {
        const userId = req.id;

        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Admin or Agent access required';
            req.session.type = 'error';
            return res.redirect('/add-career');
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
            title, employmentType, shortDescription, description,
            overview, experience, requirements, vacancies, salary, isActive
        } = req.body;

        if (!title || !employmentType || !shortDescription || !description || !overview || !experience || !requirements || !vacancies || !salary) {
            req.session.message = 'All fields are required';
            req.session.type = 'error';
            return res.redirect('/add-career');
        }

        if (!req.file) {
            req.session.message = 'Image is required';
            req.session.type = 'error';
            return res.redirect('/add-career');
        }

        const newCareer = new CareerSchema({
            title,
            employmentType,
            shortDescription,
            description,
            overview,
            experience,
            isActive,
            requirements,
            vacancies: parseInt(vacancies),
            salary,
            image: req.file.filename,
            createdBy: createdBy,
            createdByModel: createdByModel
        });

        await newCareer.save();
        req.session.message = 'Career added successfully';
        req.session.type = 'success';
        res.redirect('/career-list');
    } catch (error) {
        console.error('Error adding career:', error);
        req.session.message = 'Server error adding career';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
}

// Get edit career page for admin/agent
export const getEditCareerPage = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = await adminModel.findById(userId);
        if (!userData) {
            userData = await agentModel.findById(userId);
        }

        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const career = await CareerSchema.findById(req.params.id);
        if (!career) {
            req.session.message = 'Career not found';
            req.session.type = 'error';
            return res.redirect('/career-list');
        }

        res.render('admin/layout/editCareer', {
            career,
            isAdmin,
            user: userData,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error rendering edit career page:', error);
        req.session.message = 'Server error rendering edit career page';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Edit career
export const editCareer = async (req, res) => {
    try {
        const userId = req.id;
        req.session = req.session || {};
        const isAdmin = req.isAdmin

        if (!userId) {
            req.session.message = 'Unauthorized: Admin or Agent access required';
            req.session.type = 'error';
            return res.redirect('/edit-career/' + req.params.id);
        }

        const career = await CareerSchema.findById(req.params.id);
        if (!career) {
            req.session.message = 'Career not found';
            req.session.type = 'error';
            return res.redirect('/career-list');
        }

        const {
            title, employmentType, shortDescription, description,
            overview, experience, requirements, vacancies, salary, isActive
        } = req.body;

        if (!title || !employmentType || !shortDescription || !description || !overview || !experience || !requirements || !vacancies || !salary) {
            req.session.message = 'All fields are required';
            req.session.type = 'error';
            return res.redirect('/edit-career/' + req.params.id);
        }

        career.title = title;
        career.employmentType = employmentType;
        career.shortDescription = shortDescription;
        career.description = description;
        career.overview = overview;
        career.experience = experience;
        career.requirements = requirements;
        career.vacancies = parseInt(vacancies);
        career.salary = salary;
        career.isActive = isActive
        career.updatedBy = userId;
        career.updatedByModel = isAdmin ? 'Admin' : 'Agent';
        career.updatedAt = new Date();


        if (req.file) {
            // Delete old image if exists
            if (career.image) {
                try {
                    const oldImagePath = join(__dirname, '../Uploads/career');
                    await fs.unlink(join(oldImagePath, career.image));
                    console.log('Deleted old career picture:', career.image);

                } catch (err) {
                    if (err.code !== 'ENOENT') {
                        console.error('Error deleting career picture:', err);
                    }
                }
            }
            career.image = req.file.filename;
        }

        await career.save();
        req.session.message = 'Career updated successfully';
        req.session.type = 'success';
        res.redirect('/career-list');
    } catch (error) {
        console.error('Error editing career:', error);
        req.session.message = 'Server error editing career';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
}

// Get career detail for admin/agent
export const getCareerDetail = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = await adminModel.findById(userId);
        if (!userData) {
            userData = await agentModel.findById(userId);
        }

        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const career = await CareerSchema.findById(req.params.id).populate({
            path: 'createdBy',
            select: 'firstName lastName email',
        }).populate({
            path: 'updatedBy',
            select: 'firstName lastName email',
        });

        if (!career) {
            req.session.message = 'Career not found';
            req.session.type = 'error';
            return res.redirect('/career-list');
        }

        // Fetch applications for this career
        const applications = await ApplicationSchema.find({ careerId: req.params.id }).populate({
            path: 'userId',
            select: 'firstName lastName email',
        }).sort({ createdAt: -1 });

        res.render('admin/layout/careerDetail', {
            career,
            applications, // Pass applications to the view
            isAdmin,
            user: userData,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching career detail:', error);
        req.session.message = 'Error fetching career detail';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Delete Career
export const deleteCareer = async (req, res) => {
    try {
        const userId = req.id;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Admin or Agent access required';
            req.session.type = 'error';
            return res.redirect('/career-list');
        }

        const career = await CareerSchema.findById(req.params.id);
        if (!career) {
            req.session.message = 'Career not found';
            req.session.type = 'error';
            return res.redirect('/career-list');
        }


        if (career.image) {

            try {
                const oldImagePath = join(__dirname, '../Uploads/career');
                await fs.unlink(join(oldImagePath, career.image));
                console.log('Deleted old career picture:', career.image);

            } catch (err) {
                if (err.code !== 'ENOENT') {
                    console.error('Error deleting career picture:', err);
                }
            }
        }


        await CareerSchema.deleteOne({ _id: career._id });

        req.session.message = 'Career deleted successfully';
        req.session.type = 'success';
        res.redirect('/career-list');
    } catch (error) {
        console.error('Error deleting career:', error);
        req.session.message = 'Server error deleting career';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Get application list for admin/agent
export const getApplicationList = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = await adminModel.findById(userId);
        if (!userData) {
            userData = await agentModel.findById(userId);
        }

        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const { page = 1, search = '' } = req.query;
        const limit = 10;
        const skip = (page - 1) * limit;
        const statusFilter = req.query.statusFilter || 'all';

        // Determine which careers the user can access
        let careerQuery = {};
        if (isAdmin) {
            // Admins see applications for careers they created or their agents created
            const agents = await agentModel.find({ admin: userId }).select('_id');
            const agentIds = agents.map(agent => agent._id);
            careerQuery = {
                $or: [
                    { createdBy: userId, createdByModel: 'Admin' },
                    { createdBy: { $in: agentIds }, createdByModel: 'Agent' }
                ]
            };
        } else {
            // Agents see applications for careers they created or their admin created
            careerQuery = {
                $or: [
                    { createdBy: userId, createdByModel: 'Agent' },
                    { createdBy: userData.admin, createdByModel: 'Admin' }
                ]
            };
        }

        // Get career IDs that match the query
        const accessibleCareers = await CareerSchema.find(careerQuery).select('_id');
        const careerIds = accessibleCareers.map(career => career._id);

        // Build application query
        let applicationQuery = { careerId: { $in: careerIds } };
        if (search) {
            applicationQuery.$or = [
                { 'userId.firstName': { $regex: search, $options: 'i' } },
                { 'userId.lastName': { $regex: search, $options: 'i' } },
                { 'careerId.title': { $regex: search, $options: 'i' } }
            ];
        }

        if (statusFilter !== 'all') {
            applicationQuery.status = statusFilter;
        }

        // Fetch applications
        const applications = await ApplicationSchema.find(applicationQuery)
            .populate({
                path: 'userId',
                select: 'firstName lastName email'
            })
            .populate({
                path: 'updatedBy',
                select: 'firstName lastName email'
            })
            .populate({
                path: 'careerId',
                select: 'title'
            })
            .skip(skip)
            .limit(limit)
            .sort({ appliedAt: -1 })
            .lean();

        const totalApplications = await ApplicationSchema.countDocuments(applicationQuery);
        const totalPages = Math.ceil(totalApplications / limit) || 1;

        res.render('admin/layout/applicationList', {
            allApplications: applications,
            search,
            currentPage: parseInt(page),
            totalPages,
            statusFilter,
            isAdmin,
            user: userData,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching application list:', error);
        req.session.message = 'Error fetching application list';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Get application detail for admin/agent
export const getApplicationDetail = async (req, res) => {
    try {
        const userId = req.id;
        req.session = req.session || {};
        const isAdmin = req.isAdmin
        if (!userId) {
            req.session.message = 'Unauthorized: Admin or Agent access required';
            req.session.type = 'error';
            return res.redirect('/login');
        }

        let userData = await adminModel.findById(userId);
        if (!userData) {
            userData = await agentModel.findById(userId);
        }

        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const application = await ApplicationSchema.findById(req.params.id)
            .populate({
                path: 'userId',
                select: 'firstName lastName email'
            })
            .populate({
                path: 'updatedBy',
                select: 'firstName lastName email'
            })
            .populate({
                path: 'careerId',
                select: 'title'
            });

        if (!application) {
            req.session.message = 'Application not found';
            req.session.type = 'error';
            return res.redirect('/career-list');
        }


        res.render('admin/layout/application-detail', {
            application,
            isAdmin,
            user: userData,
            message: req.session?.message || null,
            type: req.session?.type || null
        });

    } catch (error) {
        console.error('Error fetching application detail:', error);
        req.session.message = 'Server error fetching application detail';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Update application status
export const updateApplicationStatus = async (req, res) => {
    try {
        const userId = req.id;
        req.session = req.session || {};
        const isAdmin = req.isAdmin
        if (!userId) {
            req.session.message = 'Unauthorized: Admin or Agent access required';
            req.session.type = 'error';
            return res.redirect('/application-detail/' + req.params.id);
        }


        let userData = await adminModel.findById(userId);
        if (!userData) {
            userData = await agentModel.findById(userId);
        }

        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const { status } = req.body;
        if (!['pending', 'accepted', 'rejected'].includes(status)) {
            req.session.message = 'Invalid status';
            req.session.type = 'error';
            return res.redirect('/application-detail/' + req.params.id);
        }

        const application = await ApplicationSchema.findById(req.params.id);
        if (!application) {
            req.session.message = 'Application not found';
            req.session.type = 'error';
            return res.redirect('/career-list');
        }

        application.status = status;
        application.updatedBy = userId;
        application.updatedByModel = isAdmin ? 'Admin' : 'Agent';
        application.updatedAt = new Date();
        await application.save();

        req.session.message = 'Application status updated successfully';
        req.session.type = 'success';
        res.redirect('/application-detail/' + req.params.id);
    } catch (error) {
        console.error('Error updating application status:', error);
        req.session.message = 'Server error updating application status';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Get tour guides for admin/agent dashboard
export const getTourGuides = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const { page = 1, search = '' } = req.query;
        const limit = 10;
        const skip = (page - 1) * limit;
        const statusFilter = req.query.statusFilter || 'all';

        // Build query based on user role
        let query = {};
        if (isAdmin) {
            const agentIds = await agentModel.find({ admin: userId }).distinct('_id');
            query = {
                $or: [
                    { createdBy: userId, createdByModel: 'Admin' },
                    { createdBy: { $in: agentIds }, createdByModel: 'Agent' }
                ]
            };
        } else {
            query = {
                $or: [
                    { createdBy: userId, createdByModel: 'Agent' },
                    { createdBy: userData.admin, createdByModel: 'Admin' }
                ]
            };
        }

        // Add search functionality
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { role: { $regex: search, $options: 'i' } }
            ];
        }

        if (statusFilter === 'Active') {
            query.isActive = true;
        } else if (statusFilter === 'notActive') {
            query.isActive = false;
        }

        const tourGuides = await GuideSchema.find(query)
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();

        const totalTourGuides = await GuideSchema.countDocuments(query);
        const totalPages = Math.ceil(totalTourGuides / limit) || 1;

        res.render('admin/layout/tourGuideList', {
            allTourGuides: tourGuides, // Renamed to match careerList.ejs
            search,
            currentPage: parseInt(page),
            totalPages,
            statusFilter,
            user: userData,
            isAdmin,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching tour guides:', error);
        req.session = req.session || {};
        req.session.message = 'Server error fetching tour guides';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Get add tour guide page
export const getAddTourGuide = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        res.render('admin/layout/addTourGuide', {
            user: userData,
            isAdmin,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching add tour guide page:', error);
        req.session = req.session || {};
        req.session.message = 'Error loading add tour guide page';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Add tour guide
export const addTourGuide = async (req, res) => {
    try {
        const userId = req.id;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
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

        const { name, role, description, facebook, twitter, youtube, instagram, linkedin, isActive } = req.body;

        if (!name || !role || !description || !req.file) {
            req.session.message = 'All required fields and image are necessary';
            req.session.type = 'error';
            return res.redirect('/add-tour-guide');
        }

        const newTourGuide = new GuideSchema({
            name,
            role,
            description,
            image: req.file.filename, // Normalize path
            socialLinks: { facebook, twitter, youtube, instagram, linkedin },
            createdBy,
            createdByModel,
            isActive: isActive === 'true'
        });

        await newTourGuide.save();
        req.session.message = 'Tour guide added successfully';
        req.session.type = 'success';
        res.redirect('/tour-guide-list');
    } catch (error) {
        console.error('Error adding tour guide:', error);
        req.session.message = 'Server error adding tour guide';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Get edit tour guide page
export const getEditTourGuide = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const tourGuide = await GuideSchema.findById(req.params.id);
        if (!tourGuide) {
            req.session.message = 'Tour guide not found';
            req.session.type = 'error';
            return res.redirect('/tour-guide-list');
        }

        // // Check if user has permission to edit
        // if (!isAdmin && tourGuide.createdBy.toString() !== userId && tourGuide.createdByModel !== 'Admin') {
        //     req.session.message = 'Unauthorized: You cannot edit this tour guide';
        //     req.session.type = 'error';
        //     return res.redirect('/tour-guide-list');
        // }

        res.render('admin/layout/editTourGuide', {
            tourGuide,
            user: userData,
            isAdmin,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching tour guide:', error);
        req.session.message = 'Error fetching tour guide';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Update tour guide
export const updateTourGuide = async (req, res) => {
    try {
        const userId = req.id;
        req.session = req.session || {};
        const isAdmin = req.isAdmin

        if (!userId) {
            req.session.message = 'Unauthorized: Admin or Agent access required';
            req.session.type = 'error';
            return res.redirect(`/edit-tour-guide/${req.params.id}`);
        }

        const tourGuide = await GuideSchema.findById(req.params.id);
        if (!tourGuide) {
            req.session.message = 'Tour guide not found';
            req.session.type = 'error';
            return res.redirect('/tour-guide-list');
        }

        const { name, role, description, facebook, twitter, youtube, instagram, linkedin, isActive } = req.body;

        if (!name || !role || !description) {
            req.session.message = 'All required fields are necessary';
            req.session.type = 'error';
            return res.redirect(`/edit-tour-guide/${req.params.id}`);
        }

        const updateData = {
            name,
            role,
            description,
            socialLinks: { facebook, twitter, youtube, instagram, linkedin },
            isActive: isActive === 'true'
        };

        updateData.updatedBy = userId;
        updateData.updatedByModel = isAdmin ? 'Admin' : 'Agent';
        updateData.updatedAt = new Date();

        if (req.file) {
            // Delete old image if exists
            if (tourGuide.image) {
                try {
                    const oldImagePath = join(__dirname, '../Uploads/tourGuides');
                    await fs.unlink(join(oldImagePath, tourGuide.image));
                    console.log('Deleted old tourGuide picture:', tourGuide.image);
                } catch (err) {
                    if (err.code !== 'ENOENT') {
                        console.error('Error deleting tourGuide picture:', err);
                    }
                }
            }
            updateData.image = req.file.filename;
        }

        await GuideSchema.findByIdAndUpdate(req.params.id, updateData);
        req.session.message = 'Tour guide updated successfully';
        req.session.type = 'success';
        res.redirect('/tour-guide-list');
    } catch (error) {
        console.error('Error updating tour guide:', error);
        req.session.message = 'Server error updating tour guide';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Delete tour guide
export const deleteTourGuide = async (req, res) => {
    try {
        const userId = req.id;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Admin or Agent access required';
            req.session.type = 'error';
            return res.redirect('/tour-guide-list');
        }

        const tourGuide = await GuideSchema.findById(req.params.id);
        if (!tourGuide) {
            req.session.message = 'Tour guide not found';
            req.session.type = 'error';
            return res.redirect('/tour-guide-list');
        }

        // // Check if user has permission to delete
        // if (!req.isAdmin && tourGuide.createdBy.toString() !== userId && tourGuide.createdByModel !== 'Admin') {
        //     req.session.message = 'Unauthorized: You cannot delete this tour guide';
        //     req.session.type = 'error';
        //     return res.redirect('/tour-guide-list');
        // }

        if (tourGuide.image) {
            try {
                const oldImagePath = join(__dirname, '../Uploads/tourGuides');
                await fs.unlink(join(oldImagePath, tourGuide.image));
                console.log('Deleted old tourGuide picture:', tourGuide.image);
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    console.error('Error deleting tourGuide picture:', err);
                }
            }
        }


        await GuideSchema.findByIdAndDelete(req.params.id);
        req.session.message = 'Tour guide deleted successfully';
        req.session.type = 'success';
        res.redirect('/tour-guide-list');
    } catch (error) {
        console.error('Error deleting tour guide:', error);
        req.session.message = 'Server error deleting tour guide';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Get tour guide detail page for admin/agent
export const getTourGuideDetail = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const tourGuide = await GuideSchema.findById(req.params.id)
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email')
            .lean();

        if (!tourGuide) {
            req.session.message = 'Tour guide not found';
            req.session.type = 'error';
            return res.redirect('/tour-guide-list');
        }

        res.render('admin/layout/tourGuideDetail', {
            tourGuide,
            user: userData,
            isAdmin,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching tour guide details:', error);
        req.session.message = 'Error fetching tour guide details';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Get gallery items for admin/agent dashboard with search and pagination
export const getGalleryDashboard = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const { page = 1, search = '' } = req.query;
        const limit = 12;
        const skip = (page - 1) * limit;
        const statusFilter = req.query.statusFilter || 'all';

        let query = {};
        if (isAdmin) {
            const agentIds = await agentModel.find({ admin: userId }).distinct('_id');
            query = {
                $or: [
                    { createdBy: userId, createdByModel: 'Admin' },
                    { createdBy: { $in: agentIds }, createdByModel: 'Agent' }
                ]
            };
        } else {
            query = {
                $or: [
                    { createdBy: userId, createdByModel: 'Agent' },
                    { createdBy: userData.admin, createdByModel: 'Admin' }
                ]
            };
        }

        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        if (statusFilter === 'Active') {
            query.isActive = true;
        } else if (statusFilter === 'notActive') {
            query.isActive = false;
        }

        const galleryItems = await GallerySchema.find(query)
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();

        const totalItems = await GallerySchema.countDocuments(query);
        const totalPages = Math.ceil(totalItems / limit) || 1;

        res.render('admin/layout/galleryDashboard', {
            galleryItems,
            search,
            currentPage: parseInt(page),
            totalPages,
            statusFilter,
            user: userData,
            isAdmin,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching gallery items:', error);
        req.session = req.session || {};
        req.session.message = 'Server error fetching gallery items';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Add Gallery Item (Image)
export const addGalleryItem = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const user = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!user) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const { title, isActive } = req.body;
        const image = req.file ? req.file.filename : null;

        if (!image) {
            req.session.message = 'Image is required';
            req.session.type = 'error';
            return res.redirect('/galleryDashboard');
        }

        const galleryItem = new GallerySchema({
            title,
            image,
            isActive: isActive === 'true',
            createdBy: userId,
            createdByModel: isAdmin ? 'Admin' : 'Agent'
        });

        await galleryItem.save();
        req.session.message = 'Gallery item added successfully';
        req.session.type = 'success';
        res.redirect('/galleryDashboard');
    } catch (error) {
        console.error('Error adding gallery item:', error);
        req.session.message = 'Server error adding gallery item';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Edit an existing gallery item
export const editGalleryItem = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const user = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!user) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const { id, title, isActive } = req.body;
        const image = req.file ? req.file.filename : null;

        let query = { _id: id };

        const galleryItem = await GallerySchema.findOne(query);
        if (!galleryItem) {
            req.session.message = 'Gallery item not found or unauthorized';
            req.session.type = 'error';
            return res.redirect('/galleryDashboard');
        }

        // Delete the previous image if a new one is uploaded
        if (image && galleryItem.image) {
            try {
                const oldImagePath = join(__dirname, '../Uploads/mediaGallery');
                await fs.unlink(join(oldImagePath, galleryItem.image));

            } catch (fileError) {
                console.warn('Warning: Could not delete previous image:', fileError.message);

            }
        }

        galleryItem.title = title;

        galleryItem.updatedBy = userId;
        galleryItem.updatedByModel = isAdmin ? 'Admin' : 'Agent';
        galleryItem.updatedAt = new Date();

        if (image) galleryItem.image = image;
        galleryItem.isActive = isActive === 'true';

        await galleryItem.save();
        req.session.message = 'Gallery item updated successfully';
        req.session.type = 'success';
        res.redirect('/galleryDashboard');
    } catch (error) {
        console.error('Error editing gallery item:', error);
        req.session.message = 'Server error editing gallery item';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Delete a gallery item
export const deleteGalleryItem = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const user = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!user) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const itemId = req.params.id;

        let query = { _id: itemId };

        const galleryItem = await GallerySchema.findOne(query);
        if (!galleryItem) {
            req.session.message = 'Gallery item not found or unauthorized';
            req.session.type = 'error';
            return res.redirect('/galleryDashboard');
        }

        // Delete the image file from the filesystem
        if (galleryItem.image) {
            try {
                const oldImagePath = join(__dirname, '../Uploads/mediaGallery');
                await fs.unlink(join(oldImagePath, galleryItem.image));

            } catch (fileError) {
                console.warn('Warning: Could not delete previous image:', fileError.message);

            }
        }


        await GallerySchema.deleteOne({ _id: itemId });
        req.session.message = 'Gallery item deleted successfully';
        req.session.type = 'success';
        res.redirect('/galleryDashboard');
    } catch (error) {
        console.error('Error deleting gallery item:', error);
        req.session.message = 'Server error deleting gallery item';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// GET: Render Enquiry Dashboard 
export const getEnquiryDashboard = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin

        if (!userId) {
            req.session = req.session || {};
            req.session.message = 'Unauthorized access';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const user = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!user) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        res.render('admin/layout/enquiryDashboard', {
            user,
            isAdmin,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching enquiry dashboard:', error);
        req.session = req.session || {};
        req.session.message = 'Error fetching enquiry dashboard';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Render FAQ Enquiry Page 
export const getFaqEnquiry = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin

        if (!userId) {
            req.session = req.session || {};
            req.session.message = 'Unauthorized access';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const user = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!user) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }


        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const search = req.query.search || '';
        const statusFilter = req.query.statusFilter || 'all';

        let query = {};
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }
        if (statusFilter === 'answered') {
            query.answer = { $ne: null };
        } else if (statusFilter === 'notAnswered') {
            query.answer = null;
        }

        const questions = await faqSchema.find(query)
            .populate('answeredBy', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const totalQuestions = await faqSchema.countDocuments(query);
        const totalPages = Math.ceil(totalQuestions / limit);

        res.render('admin/layout/faqEnquiry', {
            user,
            questions,
            search,
            isAdmin,
            statusFilter,
            currentPage: page,
            totalPages,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching FAQ enquiry page:', error);
        req.session = req.session || {};
        req.session.message = 'Error fetching FAQ enquiry page';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Edit/Answer FAQ Enquiry
export const editFaqEnquiry = async (req, res) => {
    try {
        const { answer } = req.body;
        const questionId = req.params.id;
        const userId = req.id;
        const isAdmin = req.isAdmin

        if (!userId) {
            req.session = req.session || {};
            req.session.message = 'Unauthorized access';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const user = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!user) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }
        if (!answer) {
            req.session = req.session || {};
            req.session.message = 'Answer to given question equired to update the faq';
            req.session.type = 'error';
            return res.redirect('/faqEnquiry');
        }



        const question = await faqSchema.findById(questionId);
        if (!question) {
            req.session = req.session || {};
            req.session.message = 'Question not found';
            req.session.type = 'error';
            return res.redirect('/faqEnquiry');
        }

        const updateQuestion = {}
        if (answer) {
            updateQuestion.answer = answer;
            updateQuestion.answeredBy = userId;
            updateQuestion.answeredByModel = isAdmin ? 'Admin' : 'Agent';
            updateQuestion.answeredAt = new Date();
        } else if (question.answer && !answer) {
            updateQuestion.answer = null;
            updateQuestion.answeredBy = null;
            updateQuestion.answeredByModel = null;
            updateQuestion.answeredAt = null;
        }

        await faqSchema.findByIdAndUpdate(questionId, { $set: updateQuestion }, { new: true, runValidators: true });


        req.session = req.session || {};
        req.session.message = 'FAQ enquiry updated successfully';
        req.session.type = 'success';
        res.redirect('/faqEnquiry');
    } catch (error) {
        console.error('Error updating FAQ enquiry:', error);
        req.session = req.session || {};
        req.session.message = 'Error updating FAQ enquiry';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Delete FAQ Enquiry 
export const deleteFaqEnquiry = async (req, res) => {
    try {
        const questionId = req.params.id;
        const isAdmin = req.isAdmin
        const userId = req.id

        if (!userId) {
            req.session = req.session || {};
            req.session.message = 'Unauthorized access';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const user = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!user) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const question = await faqSchema.findById(questionId);
        if (!question) {
            req.session = req.session || {};
            req.session.message = 'FAQ enquiry not found';
            req.session.type = 'error';
            return res.redirect('/faqEnquiry');
        }

        await question.deleteOne();

        req.session = req.session || {};
        req.session.message = 'FAQ enquiry deleted successfully';
        req.session.type = 'success';
        res.redirect('/faqEnquiry');
    } catch (error) {
        console.error('Error deleting FAQ enquiry:', error);
        req.session = req.session || {};
        req.session.message = 'Error deleting FAQ enquiry';
        req.session.type = 'error';
        res.redirect('/error');
    }
};

// Render Contact Enquiry Page 
export const getContactEnquiries = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;

        if (!userId) {
            req.session = req.session || {};
            req.session.message = 'Unauthorized access';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const user = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);

        if (!user) {
            req.session = req.session || {};
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 1;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';
        const statusFilter = req.query.statusFilter || 'all';

        let query = {};
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }
        if (statusFilter !== 'all') {
            query.enquiryStatus = statusFilter;
        }

        const total = await contactSchema.countDocuments(query);
        const contacts = await contactSchema.find(query)
            .populate('updatedBy', 'firstName lastName email')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        res.render('admin/layout/contactEnquiry', {
            user,
            isAdmin,
            contacts,
            search,
            statusFilter,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error loading contact enquiries:', error);
        req.session = req.session || {};
        req.session.message = 'Error loading contact enquiries';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Update/Answer Contact Enquiry 
export const updateContactEnquiryStatus = async (req, res) => {
    try {
        const { enquiryStatus } = req.body;
        const contactId = req.params.id;
        const userId = req.id;
        const isAdmin = req.isAdmin;

        if (!userId) {
            req.session = req.session || {};
            req.session.message = 'Unauthorized access';
            req.session.type = 'error';
            return res.redirect('/');
        }


        const user = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!user) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        if (!['pending', 'active', 'cancel'].includes(enquiryStatus)) {
            req.session = req.session || {};
            req.session.message = 'Invalid status provided';
            req.session.type = 'error';
            return res.redirect('/contactEnquiry');
        }

        const contact = await contactSchema.findById(contactId);
        if (!contact) {
            req.session = req.session || {};
            req.session.message = 'Contact enquiry not found';
            req.session.type = 'error';
            return res.redirect('/contactEnquiry');
        }


        const updatedBy = userId;
        const updatedByModel = isAdmin ? 'Admin' : 'Agent';
        const updatedAt = new Date();

        await contactSchema.findByIdAndUpdate(contactId, { $set: { enquiryStatus, updatedBy, updatedByModel, updatedAt } }, { new: true, runValidators: true });

        req.session = req.session || {};
        req.session.message = 'Contact enquiry status updated successfully';
        req.session.type = 'success';
        res.redirect('/contactEnquiry');
    } catch (error) {
        console.error('Error updating contact enquiry status:', error);
        req.session = req.session || {};
        req.session.message = 'Error updating contact enquiry status';
        req.session.type = 'error';
        res.redirect('/error');
    }
};

// Delete FAQ Contact Enquiry 
export const deleteContactEnquiry = async (req, res) => {
    try {
        const contactId = req.params.id;
        const userId = req.id;
        const isAdmin = req.isAdmin;

        if (!userId) {
            req.session = req.session || {};
            req.session.message = 'Unauthorized access';
            req.session.type = 'error';
            return res.redirect('/');
        }


        const contact = await contactSchema.findById(contactId);
        if (!contact) {
            req.session = req.session || {};
            req.session.message = 'Contact enquiry not found';
            req.session.type = 'error';
            return res.redirect('/contactEnquiry');
        }

        await contact.deleteOne();

        req.session = req.session || {};
        req.session.message = 'Contact enquiry deleted successfully';
        req.session.type = 'success';
        res.redirect('/contactEnquiry');
    } catch (error) {
        console.error('Error deleting contact enquiry:', error);
        req.session = req.session || {};
        req.session.message = 'Error deleting contact enquiry';
        req.session.type = 'error';
        res.redirect('/error');
    }
};

// Render the product list page
export const getProductList = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const { page = 1, search = '', statusFilter = 'all' } = req.query;
        const limit = 12;
        const skip = (page - 1) * limit;

        let query = {};
        if (isAdmin) {
            const agentIds = await agentModel.find({ admin: userId }).distinct('_id');
            query = {
                $or: [
                    { createdBy: userId, createdByModel: 'Admin' },
                    { createdBy: { $in: agentIds }, createdByModel: 'Agent' }
                ]
            };
        } else {
            query = {
                $or: [
                    { createdBy: userId, createdByModel: 'Agent' },
                    { createdBy: userData.admin, createdByModel: 'Admin' }
                ]
            };
        }

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        if (statusFilter !== 'all') {
            query.status = statusFilter;
        }

        const products = await productSchema.find(query)
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();

        const totalItems = await productSchema.countDocuments(query);
        const totalPages = Math.ceil(totalItems / limit) || 1;

        res.render('admin/layout/product-list', {
            products,
            search,
            statusFilter,
            currentPage: parseInt(page),
            totalPages,
            user: userData,
            isAdmin,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        req.session.message = 'Server error fetching products';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Render add Product Page
export const getAddProduct = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        res.render('admin/layout/product-add', {
            user: userData,
            isAdmin,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
        req.session.message = null;
        req.session.type = null;
    } catch (error) {
        console.error('Error loading add product page:', error);
        req.session.message = 'Server error loading add product page';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Add product
export const postAddProduct = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }


        const { name, shortDescription, price, discountPrice, isOnSale, status, categories, tags, description, weight, dimensions, featureImage } = req.body;
        const images = req.files ? req.files.map(file => file.filename) : [];
        const selectedFeatureImage = featureImage && images[parseInt(featureImage)] ? images[parseInt(featureImage)] : images[0] || '';

        const productData = {
            name,
            shortDescription,
            price: price ? parseFloat(price) : undefined,
            discountPrice: discountPrice ? parseFloat(discountPrice) : undefined,
            isOnSale: isOnSale === 'on',
            status,
            images,
            featureImage: selectedFeatureImage,
            categories: categories ? categories.split(',').map(cat => cat.trim()) : [],
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            description,
            additionalInfo: { weight, dimensions },
            createdBy: userId,
            createdByModel: isAdmin ? 'Admin' : 'Agent'
        };

        const product = new productSchema(productData);
        await product.validate();
        await product.save();

        req.session.message = 'Product created successfully';
        req.session.type = 'success';
        res.redirect('/product-list');
    } catch (error) {
        console.error('Error creating product:', error);
        req.session.message = 'Error creating product';
        req.session.type = 'error';
        res.redirect('/error');
    }
};

// Render Edit Product Page
export const getEditProduct = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let query = {};
        if (isAdmin) {
            const agentIds = await agentModel.find({ admin: userId }).distinct('_id');
            query = {
                $or: [
                    { createdBy: userId, createdByModel: 'Admin' },
                    { createdBy: { $in: agentIds }, createdByModel: 'Agent' }
                ]
            };
        } else {
            query = {
                $or: [
                    { createdBy: userId, createdByModel: 'Agent' },
                    { createdBy: userData.admin, createdByModel: 'Admin' }
                ]
            };
        }

        query._id = req.params.id;
        const product = await productSchema.findOne(query)
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email');

        if (!product) {
            req.session.message = 'Product not found or you lack permission';
            req.session.type = 'error';
            return res.redirect('/product-list');
        }

        res.render('admin/layout/product-edit', {
            product,
            user: userData,
            isAdmin,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
        req.session.message = null;
        req.session.type = null;
    } catch (error) {
        console.error('Error loading product:', error);
        req.session.message = 'Error loading product';
        req.session.type = 'error';
        res.redirect('/error');
    }
};

// Edit Product
export const postEditProduct = async (req, res) => {

    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }



        let query = {};
        if (isAdmin) {
            const agentIds = await agentModel.find({ admin: userId }).distinct('_id');
            query = {
                $or: [
                    { createdBy: userId, createdByModel: 'Admin' },
                    { createdBy: { $in: agentIds }, createdByModel: 'Agent' }
                ]
            };
        } else {
            query = {
                $or: [
                    { createdBy: userId, createdByModel: 'Agent' },
                    { createdBy: userData.admin, createdByModel: 'Admin' }
                ]
            };
        }

        query._id = req.params.id;
        const existingProduct = await productSchema.findOne(query);
        if (!existingProduct) {
            req.session.message = 'Product not found or you lack permission';
            req.session.type = 'error';
            return res.redirect('/product-list');
        }

        const { name, shortDescription, price, discountPrice, isOnSale, status, categories, tags, description, weight, dimensions, featureImage, existingImages, newImageFeatureIndex } = req.body;
        const newImages = req.files ? req.files.map(file => file.filename) : [];
        const existingImagesArray = existingImages ? (Array.isArray(existingImages) ? existingImages : [existingImages]).filter(img => img && img.trim()) : [];

        // Identify images to delete
        const imagesToDelete = existingProduct.images.filter(img => !existingImagesArray.includes(img));
        for (const image of imagesToDelete) {
            console.log(image)
            try {
                const oldImagePath = join(__dirname, '../Uploads/shopGallery');
                await fs.unlink(join(oldImagePath, image));
            } catch (err) {
                console.error(`Error deleting file ${image}:`, err);
            }
        }

        // Combine kept existing images and new images
        const allImages = [...existingImagesArray, ...newImages];
        let selectedFeatureImage = '';
        if (featureImage) {
            if (featureImage.startsWith('new-') && newImageFeatureIndex !== undefined) {
                const index = parseInt(newImageFeatureIndex);
                selectedFeatureImage = newImages[index] || '';
            } else if (allImages.includes(featureImage)) {
                selectedFeatureImage = featureImage;
            }
        }
        if (!selectedFeatureImage && allImages.length > 0) {
            selectedFeatureImage = allImages[0];
        }

        if (price && discountPrice && parseFloat(discountPrice) >= parseFloat(price)) {
            throw new Error('Discount price must be less than regular price');
        }

        const productData = {
            name,
            shortDescription,
            price: price ? parseFloat(price) : undefined,
            discountPrice: discountPrice ? parseFloat(discountPrice) : undefined,
            isOnSale: isOnSale === 'on',
            status,
            images: allImages,
            featureImage: selectedFeatureImage,
            categories: categories ? categories.split(',').map(cat => cat.trim()) : [],
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            description,
            additionalInfo: { weight, dimensions },
            updatedBy: userId,
            updatedByModel: isAdmin ? 'Admin' : 'Agent'
        };

        const updatedProduct = await productSchema.findOneAndUpdate(query, productData, { runValidators: true, new: true });
        if (!updatedProduct) {
            req.session.message = 'Product not found or you lack permission';
            req.session.type = 'error';
            return res.redirect('/product-list');
        }

        req.session.message = 'Product updated successfully';
        req.session.type = 'success';
        res.redirect('/product-list');
    } catch (error) {
        console.error('Error updating product:', error);
        req.session.message = error.message || 'Error updating product';
        req.session.type = 'error';
        res.redirect(`/error`);
    }
};

// Delete Product
export const deleteProduct = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let query = {};
        if (isAdmin) {
            const agentIds = await agentModel.find({ admin: userId }).distinct('_id');
            query = {
                $or: [
                    { createdBy: userId, createdByModel: 'Admin' },
                    { createdBy: { $in: agentIds }, createdByModel: 'Agent' }
                ]
            };
        } else {
            query = {
                $or: [
                    { createdBy: userId, createdByModel: 'Agent' },
                    { createdBy: userData.admin, createdByModel: 'Admin' }
                ]
            };
        }

        query._id = req.params.id;
        const product = await productSchema.findOneAndDelete(query);
        if (!product) {
            req.session.message = 'Product not found or you lack permission';
            req.session.type = 'error';
        } else {
            for (const image of [...product.images]) {
                if (image) {

                    try {
                        const oldImagePath = join(__dirname, '../Uploads/shopGallery');
                        await fs.unlink(join(oldImagePath, image));
                    } catch (err) {
                        console.error(`Error deleting file ${image}:`, err);
                    }
                }

            }
            req.session.message = 'Product deleted successfully';
            req.session.type = 'success';
        }
        res.redirect('/product-list');
    } catch (error) {
        console.error('Error deleting product:', error);
        req.session.message = 'Error deleting product';
        req.session.type = 'error';
        res.redirect('/product-list');
    }
};

// Get Product Detail with Bookings
export const getProductDetail = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let query = {};
        if (isAdmin) {
            const agentIds = await agentModel.find({ admin: userId }).distinct('_id');
            query = {
                $or: [
                    { createdBy: userId, createdByModel: 'Admin' },
                    { createdBy: { $in: agentIds }, createdByModel: 'Agent' }
                ]
            };
        } else {
            query = {
                $or: [
                    { createdBy: userId, createdByModel: 'Agent' },
                    { createdBy: userData.admin, createdByModel: 'Admin' }
                ]
            };
        }

        query._id = req.params.id;
        const product = await productSchema.findOne(query)
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email');

        if (!product) {
            req.session.message = 'Product not found or you lack permission';
            req.session.type = 'error';
            return res.redirect('/product-list');
        }

        // Fetch bookings for this product
        const bookingQuery = {
            'items.productId': product._id
        };

        const bookings = await productBookingSchema
            .find(bookingQuery)
            .populate('items.productId')
            .populate('userId', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .lean();

        res.render('admin/layout/product-detail', {
            product,
            bookings,
            user: userData,
            isAdmin,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
        req.session.message = null;
        req.session.type = null;
    } catch (error) {
        console.error('Error loading product:', error);
        req.session.message = 'Error loading product';
        req.session.type = 'error';
        res.redirect('/error');
    }
};

// Get Product Bookings (Admin and Agent)
export const getProductBookings = async (req, res) => {
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
        const statusFilter = req.query.statusFilter || 'all';

        const searchQuery = {};
        if (search) {
            const matchingProductIds = await productSchema.find({
                name: { $regex: search, $options: 'i' }
            }).distinct('_id');

            searchQuery.$or = [
                { 'items.productId': { $in: matchingProductIds } },
                { status: { $regex: search, $options: 'i' } }
            ].filter(condition => condition !== null);
        }

        if (statusFilter !== 'all') {
            searchQuery.status = statusFilter;
        }

        // Determine product IDs based on user role
        let productIds = [];
        if (isAdmin) {
            // Admin sees their own products and their agents' products
            const agentIds = await agentModel.find({ admin: userId }).distinct('_id');
            productIds = await productSchema.find({
                $or: [
                    { createdBy: userId, createdByModel: 'Admin' },
                    { createdBy: { $in: agentIds }, createdByModel: 'Agent' }
                ]
            }).distinct('_id');
        } else {
            // Agent sees their own products and their admin's products
            const adminId = userData.admin;
            productIds = await productSchema.find({
                $or: [
                    { createdBy: userId, createdByModel: 'Agent' },
                    { createdBy: adminId, createdByModel: 'Admin' }
                ]
            }).distinct('_id');
        }

        // Only add productId filter if products exist
        if (productIds.length > 0) {
            searchQuery['items.productId'] = { $in: productIds };
        } else if (!search) {
            // If no products and no search term, return no bookings
            return res.render('admin/layout/db-product-booking', {
                bookings: [],
                currentPage: 1,
                totalPages: 1,
                user: userData,
                isAdmin,
                search,
                statusFilter,
                message: 'No products found for this user',
                type: 'info'
            });
        }

        const bookings = await productBookingSchema.find(searchQuery)
            .populate('userId', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email')
            .populate('items.productId', 'name')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        const totalBookings = await productBookingSchema.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalBookings / limit) || 1;

        res.render('admin/layout/db-product-booking', {
            bookings,
            currentPage: page,
            totalPages,
            user: userData,
            isAdmin,
            search,
            statusFilter,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching product bookings:', error);
        req.session = req.session || {};
        req.session.message = 'Server error fetching product bookings';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Get Bookings Dashboard
export const getBookingsDashboard = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            console.log("No userId Available");
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
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

        res.render('admin/layout/db-bookings-dashboard', {
            user: userData,
            isAdmin,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
        req.session.message = null;
        req.session.type = null;
    } catch (error) {
        console.error('Error loading bookings dashboard:', error);
        req.session = req.session || {};
        req.session.message = 'Error loading bookings dashboard';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Get Product Booking Detail
export const getProductBookingDetail = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const bookingId = req.params.id;
        const booking = await productBookingSchema.findById(bookingId)
            .populate('items.productId', 'name price')
            .populate('userId', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email')
            .lean();

        if (!booking) {
            req.session.message = 'Booking not found';
            req.session.type = 'error';
            return res.redirect('/product-bookings');
        }


        res.render('admin/layout/db-product-booking-detail', {
            booking,
            user: userData,
            isAdmin,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
        req.session.message = null;
        req.session.type = null;
    } catch (error) {
        console.error('Error fetching product booking detail:', error);
        req.session.message = 'Error fetching booking detail';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Update Product Booking Status (with Refund if Rejected)
export const updateProductBookingStatus = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const bookingId = req.params.id;
        const { status } = req.body;

        const booking = await productBookingSchema.findById(bookingId);

        if (!booking) {
            req.session.message = 'Booking not found';
            req.session.type = 'error';
            return res.redirect('/product-bookings');
        }



        // Handle refund if status changes to 'rejected' and payment is Stripe
        if (status === 'rejected' && booking.payment.paymentMethod === 'stripe' && booking.payment.stripePaymentIntentId && booking.payment.paymentStatus === 'succeeded') {
            try {
                const refund = await stripeInstance.refunds.create({
                    payment_intent: booking.payment.stripePaymentIntentId,
                    amount: Math.round(booking.total * 100) // Refund full amount in cents
                });
                if (refund.status === 'succeeded') {
                    booking.payment.paymentStatus = 'pending';
                    booking.payment.paymentType = 'refund';
                } else {
                    throw new Error('Refund failed');
                }
            } catch (error) {
                console.error('Refund error:', error);
                req.session.message = 'Error initiating refund';
                req.session.type = 'error';
                return res.redirect('/product-bookings/detail/' + bookingId);
            }
        }

        // Update status and updatedBy
        booking.status = status;
        booking.updatedBy = userId;
        booking.updatedByModel = isAdmin ? 'Admin' : 'Agent';
        booking.updatedAt = new Date();

        if (status == 'approved') {
            booking.payment.paymentType = 'deposit';
            booking.payment.paymentStatus = 'succeeded'
        }

        await booking.save();

        req.session.message = 'Booking status updated successfully';
        req.session.type = 'success';
        res.redirect('/product-bookings/detail/' + bookingId);
    } catch (error) {
        console.error('Error updating product booking status:', error);
        req.session.message = 'Error updating booking status';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Delete Product Booking
export const deleteProductBooking = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const bookingId = req.params.id;
        const booking = await productBookingSchema.findById(bookingId);

        if (!booking) {
            req.session.message = 'Booking not found';
            req.session.type = 'error';
            return res.redirect('/product-bookings');
        }

        // Check if booking status is 'rejected'
        if (booking.status !== 'rejected') {
            req.session.message = 'Only rejected bookings can be deleted';
            req.session.type = 'error';
            return res.redirect('/product-bookings');
        }

        // Delete the booking1
        await productBookingSchema.deleteOne({ _id: bookingId });

        req.session.message = 'Booking deleted successfully';
        req.session.type = 'success';
        res.redirect('/product-bookings');
    } catch (error) {
        console.error('Error deleting product booking:', error);
        req.session.message = 'Error deleting booking';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Get Blog List
export const getBlogList = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 3;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';
        const statusFilter = req.query.statusFilter || 'all';

        let query = {};
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }
        if (statusFilter !== 'all') {
            query.status = statusFilter;
        }

        const blogs = await blogSchema.find(query)
            .populate('createdBy', 'firstName lastName')
            .populate('updatedBy', 'firstName lastName')
            .skip(skip)
            .limit(limit)
            .lean();

        const totalBlogs = await blogSchema.countDocuments(query);
        const totalPages = Math.ceil(totalBlogs / limit) || 1;

        res.render('admin/layout/blog-list', {
            blogs,
            user: userData,
            isAdmin,
            search,
            statusFilter,
            currentPage: page,
            totalPages,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
        req.session.message = null;
        req.session.type = null;
    } catch (error) {
        console.error('Error loading blog list:', error);
        req.session.message = 'Error loading blog list';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Get Blog Add Page
export const getBlogAdd = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }


        res.render('admin/layout/blog-add', {
            user: userData,
            isAdmin,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
        req.session.message = null;
        req.session.type = null;
    } catch (error) {
        console.error('Error loading blog add page:', error);
        req.session.message = 'Error loading blog add page';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Add Blog
export const addBlog = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const { title, status, shortDescription, content, tags } = req.body;
        const blog = new blogSchema({
            title,
            status,
            shortDescription,
            content,
            featureImage: req.file ? req.file.filename : '',
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            postedOn: new Date(),
            createdBy: userId,
            createdByModel: isAdmin ? 'Admin' : 'Agent'
        });

        await blog.validate();
        await blog.save();
        req.session.message = 'Blog added successfully';
        req.session.type = 'success';
        res.redirect('/blog-list');
    } catch (error) {
        console.error('Error adding blog:', error);
        req.session.message = 'Error adding blog';
        req.session.type = 'error';
        res.redirect('/error');
    }
};

// Get Blog Edit Page
export const getBlogEdit = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let query = {};
        if (isAdmin) {
            const agentIds = await agentModel.find({ admin: userId }).distinct('_id');
            query = {
                $or: [
                    { createdBy: userId, createdByModel: 'Admin' },
                    { createdBy: { $in: agentIds }, createdByModel: 'Agent' }
                ]
            };
        } else {
            query = {
                $or: [
                    { createdBy: userId, createdByModel: 'Agent' },
                    { createdBy: userData.admin, createdByModel: 'Admin' }
                ]
            };
        }

        query._id = req.params.id;
        const blog = await blogSchema.findOne(query)
            .populate('createdBy', 'firstName lastName')
            .populate('updatedBy', 'firstName lastName')
            .lean();

        if (!blog) {
            req.session.message = 'Blog not found or you lack permission';
            req.session.type = 'error';
            return res.redirect('/blog-list');
        }

        res.render('admin/layout/blog-edit', {
            blog,
            user: userData,
            isAdmin,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
        req.session.message = null;
        req.session.type = null;
    } catch (error) {
        console.error('Error loading blog edit page:', error);
        req.session.message = 'Error loading blog edit page';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Update Blog
export const updateBlog = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let query = {};


        query._id = req.params.id;
        const blog = await blogSchema.findOne(query);
        if (!blog) {
            req.session.message = 'Blog not found or you lack permission';
            req.session.type = 'error';
            return res.redirect('/blog-list');
        }

        const { title, status, shortDescription, content, tags, existingFeatureImage } = req.body;
        blog.title = title;
        blog.status = status;
        blog.shortDescription = shortDescription;
        blog.content = content;
        blog.tags = tags ? tags.split(',').map(tag => tag.trim()) : [];
        blog.updatedBy = userId;
        blog.updatedByModel = isAdmin ? 'Admin' : 'Agent';
        if (req.file) {
            // Delete old image if it exists
            if (blog.featureImage) {
                try {
                    const oldImagePath = join(__dirname, '../Uploads/blogGallery');
                    await fs.unlink(join(oldImagePath, blog.featureImage));
                } catch (err) {
                    console.error(`Error deleting file ${image}:`, err);
                }
            }
            blog.featureImage = req.file.filename;
        } else if (!existingFeatureImage) {
            // Delete image if removed
            if (blog.featureImage) {
                try {
                    const oldImagePath = join(__dirname, '../Uploads/blogGallery');
                    await fs.unlink(join(oldImagePath, blog.featureImage));
                } catch (err) {
                    console.error(`Error deleting file ${image}:`, err);
                }
            }
            blog.featureImage = '';
        }

        await blog.save();
        req.session.message = 'Blog updated successfully';
        req.session.type = 'success';
        res.redirect('/blog-list');
    } catch (error) {
        console.error('Error updating blog:', error);
        req.session.message = 'Error updating blog';
        req.session.type = 'error';
        res.redirect(`/error`);
    }
};

// Delete Blog
export const deleteBlog = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const blogId = req.params.id;
        let query = {};
        console.log(blogId)


        query._id = blogId;
        const blog = await blogSchema.findOne(query);

        if (!blog) {
            req.session.message = 'Blog not found or you lack permission';
            req.session.type = 'error';
            return res.redirect('/blog-list');
        }

        // Delete associated image
        if (blog.featureImage) {
            try {
                const oldImagePath = join(__dirname, '../Uploads/blogGallery');
                await fs.unlink(join(oldImagePath, blog.featureImage));
            } catch (err) {
                console.error(`Error deleting file ${image}:`, err);
            }
        }

        await blogSchema.deleteOne({ _id: blogId });
        req.session.message = 'Blog deleted successfully';
        req.session.type = 'success';
        res.redirect('/blog-list');
    } catch (error) {
        console.error('Error deleting blog:', error);
        req.session.message = 'Error deleting blog';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

// Get Blog Details 
export const getBlogDetails = async (req, res) => {
    try {
        const userId = req.id;
        const isAdmin = req.isAdmin;
        req.session = req.session || {};

        if (!userId) {
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let userData = isAdmin ? await adminModel.findById(userId) : await agentModel.findById(userId);
        if (!userData) {
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        let query = {};
        if (isAdmin) {
            const agentIds = await agentModel.find({ admin: userId }).distinct('_id');
            query = {
                $or: [
                    { createdBy: userId, createdByModel: 'Admin' },
                    { createdBy: { $in: agentIds }, createdByModel: 'Agent' }
                ]
            };
        } else {
            query = {
                $or: [
                    { createdBy: userId, createdByModel: 'Agent' },
                    { createdBy: userData.admin, createdByModel: 'Admin' }
                ]
            };
        }

        query._id = req.params.id;
        const blog = await blogSchema.findOne(query)
            .populate('createdBy', 'firstName lastName')
            .populate('updatedBy', 'firstName lastName')
            .lean();

        if (!blog) {
            req.session.message = 'Blog not found or you lack permission';
            req.session.type = 'error';
            return res.redirect('/blog-list');
        }

        res.render('admin/layout/blog-details', {
            blog,
            user: userData,
            isAdmin,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
        req.session.message = null;
        req.session.type = null;
    } catch (error) {
        console.error('Error fetching admin blog details:', error);
        req.session.message = 'Error fetching blog details';
        req.session.type = 'error';
        res.status(500).redirect('/error');
    }
};

