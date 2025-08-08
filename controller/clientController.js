import userModel from '../models/userModel.js';
import packageModel from "../models/packageModel.js";
import destinations from '../data/destinations.js';
import reviewSchema from '../models/reviewSchema.js';
import wishlistSchema from '../models/wishlistSchema.js';
import packageCartSchema from '../models/packageCartSchema.js';
import packageBookingSchema from '../models/packageBookingSchema.js';
import Stripe from 'stripe';
import mongoose from 'mongoose';

import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const signInUserDashboard = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            console.log("UserId not Available ");
            req.session = req.session || {};
            req.session.message = 'User ID not available';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const userData = await userModel.findById(userId);

        if (!userData) {
            console.log('No such User Exist in The DataBase');
            req.session = req.session || {};
            req.session.message = 'No such user exists in the database';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

   
        return res.render('client/layout/Home', {
            user: userData,
            message: req.session?.message,
            type: req.session?.type
        });
    } catch (error) {
        console.error('Sign in error:', error);
        req.session = req.session || {};
        req.session.message = 'Server error during sign-in';
        req.session.type = 'error';
        return res.redirect('/loginPage');
    }
};

// Destination page controller
export const destinationPage = async (req, res) => {
    try {
        const userId = req.id;
        let userData = null;

        if (!userId) {
            console.log('No User ID Available ');
            req.session = req.session || {};
            req.session.message = 'User ID not available';
            req.session.type = 'error';
            return res.redirect('/loginPage');    
        }
        
        userData = await userModel.findById(userId);
        if (!userData) {
            console.log('No such User Exist in The DataBase');
            req.session = req.session || {};
            req.session.message = 'No such user exists in the database';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        res.render('client/layout/destination', {
            user: userData,
            destinations,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error(error);
        req.session = req.session || {};
        req.session.message = 'Server error';
        req.session.type = 'error';
        res.status(500).render('client/layout/error', {
            error: 'Server error',
            message: req.session.message,
            type: req.session.type
        });
    }
};

// Tour packages page controller
export const tourPackagesPage = async (req, res) => {
    try {
        const userId = req.id;
        let userData = null;

        if (!userId) {
            console.log('No User id Available');
            req.session = req.session || {};
            req.session.message = 'User ID not available';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }
        
        userData = await userModel.findById(userId);
        if (!userData) {
            console.log('No such User Exist in The DataBase');
            req.session = req.session || {};
            req.session.message = 'No such user exists in the database';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const destination = req.query.destination;
        let query = { status: 'Active' };

        if (destination) {
            query.destinationCountry = new RegExp(destination, 'i');
        }

        const packages = await packageModel.find(query);
        
        // Fetch reviews for all packages
        const packageIds = packages.map(pkg => pkg._id);
        const reviews = await reviewSchema.find({ packageId: { $in: packageIds } }).sort({ date: -1 });
       
        const wishlist = await wishlistSchema.findOne({ userId });
        const wishlistPackageIds = wishlist ? wishlist.packages.map(id => id.toString()) : [];
        // Attach reviews to each package
        const packagesWithReviews = packages.map(pkg => {
            const pkgReviews = reviews.filter(review => review.packageId.toString() === pkg._id.toString());
            return {
                ...pkg._doc, 
                reviews: pkgReviews,
                reviewCount: pkgReviews.length,
                isWishlisted: wishlistPackageIds.includes(pkg._id.toString()),
                averageRating: pkgReviews.length > 0 
                    ? (pkgReviews.reduce((sum, review) => sum + review.rating, 0) / pkgReviews.length).toFixed(1)
                    : '0'
            };
        });

        res.render('client/layout/tour-packages', {
            user: userData,
            packages: packagesWithReviews,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error(error);
        req.session = req.session || {};
        req.session.message = 'Server error';
        req.session.type = 'error';
        res.status(500).render('client/layout/error', {
            error: 'Server error',
            message: req.session.message,
            type: req.session.type
        });
    }
};

export const packageDetailPage = async (req, res) => {
    try {
        const userId = req.id;
        let userData = null;

        if (!userId) {
            console.log('No User Id');
            req.session = req.session || {};
            req.session.message = 'User ID not available';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        userData = await userModel.findById(userId);
        if (!userData) {
            console.log('No such User Exist in The DataBase');
            req.session = req.session || {};
            req.session.message = 'No such user exists in the database';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }
        const packageId = req.params.id;
    
        const packageData = await packageModel.findOne({ _id: packageId, status: 'Active' });

        const reviews = await reviewSchema.find({ packageId }).sort({ date: -1 });
        const reviewCount = reviews.length;
  
        if (!packageData) {
            req.session = req.session || {};
            req.session.message = 'No package available or the package is not active';
            req.session.type = 'error';
            return res.render('client/layout/package-detail', {
                user: userData,
                package: null,
                reviewCount: 0,
                message: req.session.message,
                type: req.session.type
            });
        }

        res.render('client/layout/package-detail', {
            user: userData,
            package: packageData,
            reviewCount,
            reviews,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error(error);
        req.session = req.session || {};
        req.session.message = 'Server error';
        req.session.type = 'error';
        res.status(500).render('client/layout/error', {
            error: 'Server error',
            message: req.session.message,
            type: req.session.type
        });
    }
};

// Submit a new review
export const submitReview = async (req, res) => {
    try {
        const { packageId, name, email, rating, subject, comment } = req.body;
  
        // Validate input
        if (!packageId || !name || !email || !rating || !subject || !comment) {
            req.session = req.session || {};
            req.session.message = 'All fields are required';
            req.session.type = 'error';
            return res.status(400).json({ message: req.session.message, type: req.session.type });
        }
  
        // Create new review
        const review = new reviewSchema({
            packageId,
            name,
            email,
            rating,
            subject,
            comment,
        });
  
        await review.save();
  
        req.session = req.session || {};
        req.session.message = 'Review submitted successfully';
        req.session.type = 'success';
        res.status(201).json({ message: req.session.message, type: req.session.type, review });
    } catch (error) {
        console.error('Error submitting review:', error);
        req.session = req.session || {};
        req.session.message = 'Server error';
        req.session.type = 'error';
        res.status(500).json({ message: req.session.message, type: req.session.type });
    }
};

export const addToWishlist = async (req, res) => {
    try {
        const userId = req.id;
        const packageId = req.params.packageId;

        if (!userId) {
            console.log('No User ID Available');
            req.session = req.session || {};
            req.session.message = 'User ID not available';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const user = await userModel.findById(userId);
        if (!user) {
            console.log('No such User Exists in the Database');
            req.session = req.session || {};
            req.session.message = 'No such user exists in the database';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const packageData = await packageModel.findOne({ _id: packageId, status: 'Active' });
        if (!packageData) {
            req.session = req.session || {};
            req.session.message = 'Package not found or not active';
            req.session.type = 'error';
            return res.status(404).json({ message: req.session.message, type: req.session.type });
        }

        let wishlist = await wishlistSchema.findOne({ userId });
        if (!wishlist) {
            wishlist = new wishlistSchema({ userId, packages: [packageId] });
        } else {
            if (!wishlist.packages.includes(packageId)) {
                wishlist.packages.push(packageId);
            }
        }

        await wishlist.save();
        req.session = req.session || {};
        req.session.message = 'Package added to wishlist successfully';
        req.session.type = 'success';
        res.status(200).json({ message: req.session.message, type: req.session.type });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        req.session = req.session || {};
        req.session.message = 'Server error';
        req.session.type = 'error';
        res.status(500).json({ message: req.session.message, type: req.session.type });
    }
};

export const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.id;
        const packageId = req.params.packageId;

        if (!userId) {
            console.log('No User ID Available');
            req.session = req.session || {};
            req.session.message = 'User ID not available';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const user = await userModel.findById(userId);
        if (!user) {
            console.log('No such User Exists in the Database');
            req.session = req.session || {};
            req.session.message = 'No such user exists in the database';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const wishlist = await wishlistSchema.findOne({ userId });
        if (!wishlist) {
            req.session = req.session || {};
            req.session.message = 'Wishlist not found';
            req.session.type = 'error';
            return res.status(404).json({ message: req.session.message, type: req.session.type });
        }

        wishlist.packages = wishlist.packages.filter(id => id.toString() !== packageId);
        await wishlist.save();

        req.session = req.session || {};
        req.session.message = 'Package removed from wishlist successfully';
        req.session.type = 'success';
        res.status(200).json({ message: req.session.message, type: req.session.type });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        req.session = req.session || {};
        req.session.message = 'Server error';
        req.session.type = 'error';
        res.status(500).json({ message: req.session.message, type: req.session.type });
    }
};

export const getWishlist = async (req, res) => {
    try {
        const userId = req.id;

        if (!userId) {
            console.log('No User ID Available');
            req.session = req.session || {};
            req.session.message = 'User ID not available';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const user = await userModel.findById(userId);
        if (!user) {
            console.log('No such User Exists in the Database');
            req.session = req.session || {};
            req.session.message = 'No such user exists in the database';
            req.session.type = 'error';
            return res.redirect('/loginPage');
        }

        const wishlist = await wishlistSchema.findOne({ userId }).populate({
            path: 'packages',
            match: { status: 'Active' } 
        });
        const packages = wishlist ? wishlist.packages : [];

        const packageIds = packages.map(pkg => pkg._id);
        const reviews = await reviewSchema.find({ packageId: { $in: packageIds } }).sort({ date: -1 });

        const packagesWithReviews = packages.map(pkg => {
            const pkgReviews = reviews.filter(review => review.packageId.toString() === pkg._id.toString());
            return {
                ...pkg._doc,
                reviewCount: pkgReviews.length,
                averageRating: pkgReviews.length > 0 
                    ? (pkgReviews.reduce((sum, review) => sum + review.rating, 0) / pkgReviews.length).toFixed(1)
                    : '0'
            };
        });

        res.render('client/layout/wishlist', {
            user,
            packages: packagesWithReviews,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        req.session = req.session || {};
        req.session.message = 'Server error';
        req.session.type = 'error';
        res.status(500).render('client/layout/error', {
            error: 'Server error',
            message: req.session.message,
            type: req.session.type
        });
    }
};

export const packageOfferPage = async (req, res) => {
    try {
        const userId = req.id;
        let userData = null;

        if (!userId) {
            console.log('No User ID Available');
            req.session = req.session || {};
            req.session.message = 'User ID not available';
            req.session.type = 'error';
            return res.redirect('/');
        }

        userData = await userModel.findById(userId);
        if (!userData) {
            console.log('No such User Exists in the Database');
            req.session = req.session || {};
            req.session.message = 'No such user exists in the database';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const packages = await packageModel.find({ 
            status: 'Active',
            salePrice: { $exists: true, $ne: null }, 
            regularPrice: { $exists: true, $ne: null }, 
            discount: { $exists: true, $ne: null }, 
            $expr: { $lt: ['$salePrice', '$regularPrice'] } 
        });
    
        const packageIds = packages.map(pkg => pkg._id);
        const reviews = await reviewSchema.find({ packageId: { $in: packageIds } }).sort({ date: -1 });

        const wishlist = await wishlistSchema.findOne({ userId });
        const wishlistPackageIds = wishlist ? wishlist.packages.map(id => id.toString()) : [];

        const packagesWithReviews = packages.map(pkg => {
            const pkgReviews = reviews.filter(review => review.packageId.toString() === pkg._id.toString());
            return {
                ...pkg._doc,
                reviewCount: pkgReviews.length,
                averageRating: pkgReviews.length > 0 
                    ? (pkgReviews.reduce((sum, review) => sum + review.rating, 0) / pkgReviews.length).toFixed(1)
                    : '0',
                isWishlisted: wishlistPackageIds.includes(pkg._id.toString())
            };
        });

        res.render('client/layout/package-offer', {
            user: userData,
            packages: packagesWithReviews,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching package offer page:', error);
        req.session = req.session || {};
        req.session.message = 'Server error';
        req.session.type = 'error';
        res.status(500).render('client/layout/error', {
            error: 'Server error',
            message: req.session.message,
            type: req.session.type
        });
    }
};

export const addToPackageCart = async (req, res) => {
    try {
        const { packageId, quantity } = req.body;
        const userId = req.id;
        if (!userId) {
            req.session = req.session || {};
            req.session.message = 'User ID not available';
            req.session.type = 'error';
            return res.redirect('/');
        }
        let cart = await packageCartSchema.findOne({ userId });

        if (!cart) {
            cart = new packageCartSchema({ userId, items: [] });
        }

        const packageDetail = await packageModel.findById(packageId);
        if (!packageDetail) {
            req.session = req.session || {};
            req.session.message = 'Package not found';
            req.session.type = 'error';
            return res.status(404).json({ success: false, message: req.session.message, type: req.session.type });
        }

        const existingItemIndex = cart.items.findIndex(item => item.packageId.toString() === packageId);
        if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            cart.items.push({ packageId, quantity });
        }

        await cart.save();
        req.session = req.session || {};
        req.session.message = 'Package added to cart';
        req.session.type = 'success';
        res.json({ success: true, message: req.session.message, type: req.session.type });
    } catch (error) {
        console.error(error);
        req.session = req.session || {};
        req.session.message = 'Server error';
        req.session.type = 'error';
        res.status(500).json({ success: false, message: req.session.message, type: req.session.type });
    }
};

export const getpackageCart = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            req.session = req.session || {};
            req.session.message = 'User ID not available';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const userData = await userModel.findById(userId);

        if (!userData) {
            console.log('No such User Exists in the Database');
            req.session = req.session || {};
            req.session.message = 'No such user exists in the database';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const cart = await packageCartSchema.findOne({ userId }).populate('items.packageId');
    
        if (!cart) {
            return res.render('client/layout/tour-cart', { 
                cart: { items: [] }, 
                user: userData,
                message: req.session?.message || null,
                type: req.session?.type || null
            });
        }
        res.render('client/layout/tour-cart', { 
            cart, 
            user: userData,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error(error);
        req.session = req.session || {};
        req.session.message = 'Error retrieving cart';
        req.session.type = 'error';
        res.status(500).render('client/layout/error', {
            error: 'Error retrieving cart',
            message: req.session.message,
            type: req.session.type
        });
    }
};

export const updatePackageCart = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            req.session = req.session || {};
            req.session.message = 'User ID not available';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const cart = await packageCartSchema.findOne({ userId });

        if (!cart) {
            req.session = req.session || {};
            req.session.message = 'Cart not found';
            req.session.type = 'error';
            return res.status(404).json({ success: false, message: req.session.message, type: req.session.type });
        }

        if (req.body.packageId && req.body.quantity) {
            const { packageId, quantity } = req.body;
            const itemIndex = cart.items.findIndex(item => item.packageId.toString() === packageId);
     
            if (itemIndex > -1) {
                if (quantity <= 0) {
                    cart.items.splice(itemIndex, 1);
                } else {
                    cart.items[itemIndex].quantity = quantity; 
                }
            } else {
                req.session = req.session || {};
                req.session.message = 'Item not found in cart';
                req.session.type = 'error';
                return res.status(404).json({ success: false, message: req.session.message, type: req.session.type });
            }
        } else {
            req.session = req.session || {};
            req.session.message = 'Invalid request data';
            req.session.type = 'error';
            return res.status(400).json({ success: false, message: req.session.message, type: req.session.type });
        }

        await cart.save();
        req.session = req.session || {};
        req.session.message = 'Cart updated';
        req.session.type = 'success';
        res.json({ success: true, message: req.session.message, type: req.session.type });
    } catch (error) {
        console.error(error);
        req.session = req.session || {};
        req.session.message = 'Server error';
        req.session.type = 'error';
        res.status(500).json({ success: false, message: req.session.message, type: req.session.type });
    }
};

export const removeFromPackageCart = async (req, res) => {
    try {
        const { packageId } = req.body;
        const userId = req.id;
        if (!userId) {
            req.session = req.session || {};
            req.session.message = 'User ID not available';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const cart = await packageCartSchema.findOne({ userId });

        if (!cart) {
            req.session = req.session || {};
            req.session.message = 'Cart not found';
            req.session.type = 'error';
            return res.status(404).json({ success: false, message: req.session.message, type: req.session.type });
        }

        cart.items = cart.items.filter(item => item.packageId.toString() !== packageId);
        await cart.save();
        req.session = req.session || {};
        req.session.message = 'Item removed from cart';
        req.session.type = 'success';
        res.json({ success: true, message: req.session.message, type: req.session.type });
    } catch (error) {
        console.error(error);
        req.session = req.session || {};
        req.session.message = 'Server error';
        req.session.type = 'error';
        res.status(500).json({ success: false, message: req.session.message, type: req.session.type });
    }
};

const countryToIsoCode = {
    'United States': 'US',
    'Canada': 'CA',
    'United Kingdom': 'GB',
    // Add more mappings as needed
};

export const checkoutPackageCart = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            console.log('No user ID in request');
            req.session = req.session || {};
            req.session.message = 'User ID not available';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const userData = await userModel.findById(userId);
        if (!userData) {
            console.log('No such User Exists in the Database');
            req.session = req.session || {};
            req.session.message = 'No such user exists in the database';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const cart = await packageCartSchema.findOne({ userId }).populate('items.packageId');
        if (!cart || cart.items.length === 0) {
            console.log('Cart is empty or not found for user:', userId);
            req.session = req.session || {};
            req.session.message = 'Cart is empty or not found';
            req.session.type = 'error';
            return res.redirect('/packageCart');
        }

        if (!process.env.STRIPE_PUBLISHABLE_KEY || !process.env.STRIPE_SECRET_KEY) {
            console.error('Stripe keys are not set in environment');
            req.session = req.session || {};
            req.session.message = 'Server configuration error: Missing Stripe keys';
            req.session.type = 'error';
            return res.status(500).render('client/layout/error', {
                error: 'Server configuration error',
                message: req.session.message,
                type: req.session.type
            });
        }

        console.log('Rendering booking with STRIPE_PUBLISHABLE_KEY:', process.env.STRIPE_PUBLISHABLE_KEY);
        res.render('client/layout/booking', { 
            cart, 
            user: userData, 
            stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
            isShow: true,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Checkout error:', error);
        req.session = req.session || {};
        req.session.message = 'Error during checkout';
        req.session.type = 'error';
        res.status(500).render('client/layout/error', {
            error: 'Error during checkout',
            message: req.session.message,
            type: req.session.type
        });
    }
};

export const createPackagePaymentIntent = async (req, res) => {
    try {
        console.log('Starting createPaymentIntent for user:', req.id);
        const userId = req.id;
        if (!userId) {
            console.log('Unauthorized: No user ID');
            req.session = req.session || {};
            req.session.message = 'Unauthorized';
            req.session.type = 'error';
            return res.status(401).json({ success: false, message: req.session.message, type: req.session.type });
        }

        const { items, email } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            console.log('No items provided in request body');
            req.session = req.session || {};
            req.session.message = 'No items provided';
            req.session.type = 'error';
            return res.status(400).json({ success: false, message: req.session.message, type: req.session.type });
        }

        // Validate and fetch package data
        const packageIds = items.map(item => item.packageId);
        const packages = await packageModel.find({ _id: { $in: packageIds } });
        if (packages.length !== items.length) {
            console.log('Some packages not found or not active');
            req.session = req.session || {};
            req.session.message = 'Some packages not found or not active';
            req.session.type = 'error';
            return res.status(400).json({ success: false, message: req.session.message, type: req.session.type });
        }

        // Create a map of package data for price lookup
        const packageMap = packages.reduce((map, pkg) => {
            map[pkg._id.toString()] = pkg;
            return map;
        }, {});

        // Calculate total
        const subtotal = items.reduce((sum, item) => {
            const pkg = packageMap[item.packageId];
            if (!pkg || !item.quantity || item.quantity < 1) return sum;
            return sum + item.quantity * (pkg.salePrice || pkg.regularPrice);
        }, 0);
        const tax = subtotal * 0.13;
        const total = subtotal + 34 + 34 + tax;
        console.log('Calculated total:', total);

        const paymentIntent = await stripeInstance.paymentIntents.create({
            amount: Math.round(total * 100), // Convert to cents
            currency: 'usd',
            metadata: { userId: userId.toString() },
            receipt_email: email || (await userModel.findById(userId)).email,
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'never'
            }
        });
        console.log('Payment intent created:', paymentIntent.id);

        req.session = req.session || {};
        req.session.message = 'Payment intent created successfully';
        req.session.type = 'success';
        res.json({ success: true, clientSecret: paymentIntent.client_secret, message: req.session.message, type: req.session.type });
    } catch (error) {
        console.error('Create payment intent error:', error);
        req.session = req.session || {};
        req.session.message = 'Server error';
        req.session.type = 'error';
        res.status(500).json({ success: false, message: req.session.message, type: req.session.type });
    }
};

export const confirmPackageBooking = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            console.log('No user ID in request');
            req.session = req.session || {};
            req.session.message = 'User ID not available';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const userData = await userModel.findById(userId);
        if (!userData) {
            console.log('No such User Exists in the Database');
            req.session = req.session || {};
            req.session.message = 'No such user exists in the database';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const { 
            items, firstname, lastname, email, phone, country, street_1, street_2, city, state, postal_code, notes,
            firstname_booking, client_secret
        } = req.body;

        // Validate required fields
        if (!items || !Array.isArray(items) || items.length === 0 || !firstname_booking || !client_secret || 
            !firstname || !lastname || !email || !phone || !country || !street_1 || !city || !state || !postal_code) {
            console.log('Missing required fields');
            req.session = req.session || {};
            req.session.message = 'All required fields are required';
            req.session.type = 'error';
            return res.status(400).render('client/layout/booking', {
                error: 'All required fields are required',
                user: userData,
                message: req.session.message,
                type: req.session.type
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('Invalid email format:', email);
            req.session = req.session || {};
            req.session.message = 'Invalid email format';
            req.session.type = 'error';
            return res.status(400).render('client/layout/booking', {
                error: 'Invalid email format',
                user: userData,
                message: req.session.message,
                type: req.session.type
            });
        }

        // Convert country to ISO 3166-1 alpha-2 code
        const isoCountry = countryToIsoCode[country] || country;
        if (!isoCountry || isoCountry.length !== 2) {
            console.log('Invalid country code:', isoCountry);
            req.session = req.session || {};
            req.session.message = 'Invalid country code. Please select a valid country.';
            req.session.type = 'error';
            return res.status(400).render('client/layout/booking', {
                error: 'Invalid country code',
                user: userData,
                message: req.session.message,
                type: req.session.type
            });
        }

        // Validate and fetch package data
        const packageIds = items.map(item => item.packageId);
        const packages = await packageModel.find({ _id: { $in: packageIds } });
        if (packages.length !== items.length) {
            console.log('Some packages not found or not active');
            req.session = req.session || {};
            req.session.message = 'Some packages not found or not active';
            req.session.type = 'error';
            return res.status(400).render('client/layout/booking', {
                error: 'Some packages not found or not active',
                user: userData,
                message: req.session.message,
                type: req.session.type
            });
        }

        // Create a map of package data for price lookup
        const packageMap = packages.reduce((map, pkg) => {
            map[pkg._id.toString()] = pkg;
            return map;
        }, {});

        // Retrieve and verify payment intent
        const paymentIntent = await stripeInstance.paymentIntents.retrieve(client_secret.split('_secret_')[0]);
        if (paymentIntent.status !== 'succeeded') {
            console.log('Payment not completed:', paymentIntent.status);
            req.session = req.session || {};
            req.session.message = 'Payment not completed: ' + paymentIntent.status;
            req.session.type = 'error';
            return res.status(400).render('client/layout/booking', {
                error: 'Payment not completed',
                user: userData,
                message: req.session.message,
                type: req.session.type
            });
        }

        // Prepare booking details
        const bookingDetails = {
            userId,
            items: items.map(item => ({
                packageId: item.packageId,
                quantity: parseInt(item.quantity),
                price: packageMap[item.packageId].salePrice || packageMap[item.packageId].regularPrice
            })),
            userDetails: {
                firstname,
                lastname,
                email,
                phone,
                country: isoCountry,
                street_1,
                street_2: street_2 || '',
                city,
                state,
                postal_code: postal_code || '',
                notes: notes || ''
            },
            payment: {
                stripePaymentIntentId: paymentIntent.id,
                paymentStatus: paymentIntent.status,
                paymentType: 'deposit'
            },
            status: 'pending',
            total: paymentIntent.amount / 100
        };

        // Save booking to database
        console.log('Saving booking:', bookingDetails);
        const bookingData = await packageBookingSchema.create(bookingDetails);

        // Clear cart after booking
        const cart = await packageCartSchema.findOne({ userId });
        if (cart) {
            cart.items = [];
            await cart.save();
            console.log('Cart cleared for user:', userId);
        }

        // Fetch payment details for display
        const paymentMethod = await stripeInstance.paymentMethods.retrieve(paymentIntent.payment_method);
        const paymentDetails = {
            cardBrand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4
        };

        // Populate booking for confirmation page
        const populatedBooking = await packageBookingSchema.findById(bookingData._id).populate('items.packageId');

        req.session = req.session || {};
        req.session.message = 'Booking confirmed successfully';
        req.session.type = 'success';
        res.render('client/layout/confirmation', { 
            booking: populatedBooking, 
            user: userData, 
            paymentDetails,
            isShow: true,
            message: req.session.message,
            type: req.session.type
        });
    } catch (error) {
        console.error('Confirm booking error:', error);
        req.session = req.session || {};
        req.session.message = error.type === 'StripeInvalidRequestError' ? `Payment error: ${error.message}` : `Error confirming booking: ${error.message}`;
        req.session.type = 'error';
        res.status(500).render('client/layout/error', {
            error: 'Error confirming booking',
            message: req.session.message,
            type: req.session.type
        });
    }
};

export const bookSinglePackage = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            console.log('No user ID in request');
            req.session = req.session || {};
            req.session.message = 'User ID not available';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const userData = await userModel.findById(userId);
        if (!userData) {
            console.log('No such User Exists in the Database');
            req.session = req.session || {};
            req.session.message = 'No such user exists in the database';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const packageId = req.params.packageId;
        const packageData = await packageModel.findById(packageId);
        if (!packageData) {
            console.log('Package not found or not active:', packageId);
            req.session = req.session || {};
            req.session.message = 'Package not found or not active';
            req.session.type = 'error';
            return res.redirect('/tour-packages');
        }
        const cart = {
            items: [{
                packageId: packageData,
                quantity: 1
            }]
        };

        if (!process.env.STRIPE_PUBLISHABLE_KEY || !process.env.STRIPE_SECRET_KEY) {
            console.error('Stripe keys are not set in environment');
            req.session = req.session || {};
            req.session.message = 'Server configuration error: Missing Stripe keys';
            req.session.type = 'error';
            return res.status(500).render('client/layout/error', {
                error: 'Server configuration error',
                message: req.session.message,
                type: req.session.type
            });
        }

        console.log('Rendering booking for package:', packageId);
        res.render('client/layout/booking', {
            cart,
            user: userData,
            stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
            isShow: false,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Book package error:', error);
        req.session = req.session || {};
        req.session.message = 'Error loading booking page';
        req.session.type = 'error';
        res.status(500).render('client/layout/error', {
            error: 'Error loading booking page',
            message: req.session.message,
            type: req.session.type
        });
    }
};

export const createSinglePackagePaymentIntent = async (req, res) => {
    try {
        console.log('Starting createPaymentIntent for user:', req.id);
        const userId = req.id;
        if (!userId) {
            console.log('Unauthorized: No user ID');
            req.session = req.session || {};
            req.session.message = 'Unauthorized';
            req.session.type = 'error';
            return res.status(401).json({ success: false, message: req.session.message, type: req.session.type });
        }

        const { packageId, quantity = 1, email } = req.body;
        console.log(packageId);
        const packageData = await packageModel.findById(packageId);
        if (!packageData) {
            console.log('Package not found or not active:', packageId);
            req.session = req.session || {};
            req.session.message = 'Package not found or not active';
            req.session.type = 'error';
            return res.status(400).json({ success: false, message: req.session.message, type: req.session.type });
        }

        // Calculate total: package price + fixed fees ($34 + $34) + 13% tax
        const packagePrice = packageData.salePrice || packageData.regularPrice;
        const subtotal = packagePrice * quantity;
        const tax = subtotal * 0.13;
        const total = subtotal + 34 + 34 + tax;
        console.log('Calculated total for package:', total);

        const paymentIntent = await stripeInstance.paymentIntents.create({
            amount: Math.round(total * 100), // Convert to cents
            currency: 'usd',
            metadata: { userId: userId.toString(), packageId: packageId.toString() },
            receipt_email: email || (await userModel.findById(userId)).email,
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'never'
            }
        });
        console.log('Payment intent created:', paymentIntent.id);

        req.session = req.session || {};
        req.session.message = 'Payment intent created successfully';
        req.session.type = 'success';
        res.json({ success: true, clientSecret: paymentIntent.client_secret, message: req.session.message, type: req.session.type });
    } catch (error) {
        console.error('Create payment intent error:', error);
        req.session = req.session || {};
        req.session.message = 'Server error';
        req.session.type = 'error';
        res.status(500).json({ success: false, message: req.session.message, type: req.session.type });
    }
};

export const confirmSinglePackageBooking = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            console.log('No user ID in request');
            req.session = req.session || {};
            req.session.message = 'User ID not available';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const userData = await userModel.findById(userId);
        if (!userData) {
            console.log('No such User Exists in the Database');
            req.session = req.session || {};
            req.session.message = 'No such user exists in the database';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const { 
            packageId, quantity = 1, firstname, lastname, email, phone, country, 
            street_1, street_2, city, state, postal_code, notes, firstname_booking, client_secret 
        } = req.body;

        // Validate required fields
        if (!packageId || !firstname_booking || !client_secret || !firstname || !lastname || !email || !phone || !country || !street_1 || !city || !state || !postal_code) {
            console.log('Missing required fields');
            req.session = req.session || {};
            req.session.message = 'Package ID, name on card, payment details, and user details are required';
            req.session.type = 'error';
            return res.status(400).render('client/layout/booking', {
                error: 'Missing required fields',
                user: userData,
                message: req.session.message,
                type: req.session.type
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('Invalid email format:', email);
            req.session = req.session || {};
            req.session.message = 'Invalid email format';
            req.session.type = 'error';
            return res.status(400).render('client/layout/booking', {
                error: 'Invalid email format',
                user: userData,
                message: req.session.message,
                type: req.session.type
            });
        }

        const packageData = await packageModel.findById(packageId);
        if (!packageData) {
            console.log('Package not found:', packageId);
            req.session = req.session || {};
            req.session.message = 'Package not found or not active';
            req.session.type = 'error';
            return res.status(400).render('client/layout/booking', {
                error: 'Package not found',
                user: userData,
                message: req.session.message,
                type: req.session.type
            });
        }

        // Convert country to ISO 3166-1 alpha-2 code
        const isoCountry = countryToIsoCode[country] || country;
        if (!isoCountry || isoCountry.length !== 2) {
            console.log('Invalid country code:', isoCountry);
            req.session = req.session || {};
            req.session.message = 'Invalid country code. Please select a valid country.';
            req.session.type = 'error';
            return res.status(400).render('client/layout/booking', {
                error: 'Invalid country code',
                user: userData,
                message: req.session.message,
                type: req.session.type
            });
        }

        // Retrieve and verify payment intent
        const paymentIntent = await stripeInstance.paymentIntents.retrieve(client_secret.split('_secret_')[0]);
        if (paymentIntent.status !== 'succeeded') {
            console.log('Payment not completed:', paymentIntent.status);
            req.session = req.session || {};
            req.session.message = 'Payment not completed: ' + paymentIntent.status;
            req.session.type = 'error';
            return res.status(400).render('client/layout/booking', {
                error: 'Payment not completed',
                user: userData,
                message: req.session.message,
                type: req.session.type
            });
        }

        // Prepare booking details
        const bookingDetails = {
            userId,
            items: [{
                packageId,
                quantity: parseInt(quantity),
                price: packageData.salePrice || packageData.regularPrice
            }],
            userDetails: {
                firstname,
                lastname,
                email,
                phone,
                country: isoCountry,
                street_1,
                street_2: street_2 || '',
                city,
                state,
                postal_code: postal_code || '',
                notes: notes || ''
            },
            payment: {
                stripePaymentIntentId: paymentIntent.id,
                paymentStatus: paymentIntent.status,
                paymentType: 'deposit'
            },
            status: 'pending',
            total: paymentIntent.amount / 100
        };

        // Save booking to database
        console.log('Saving booking:', bookingDetails);
        const bookingData = await packageBookingSchema.create(bookingDetails);

        // Fetch payment details for display
        const paymentMethod = await stripeInstance.paymentMethods.retrieve(paymentIntent.payment_method);
        const paymentDetails = {
            cardBrand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4
        };

        // Populate booking for confirmation page
        const populatedBooking = await packageBookingSchema.findById(bookingData._id).populate('items.packageId');

        req.session = req.session || {};
        req.session.message = 'Booking confirmed successfully';
        req.session.type = 'success';
        res.render('client/layout/confirmation', { 
            booking: populatedBooking, 
            user: userData, 
            paymentDetails,
            isShow: false,
            message: req.session.message,
            type: req.session.type
        });
    } catch (error) {
        console.error('Confirm booking error:', error);
        req.session = req.session || {};
        req.session.message = error.type === 'StripeInvalidRequestError' ? `Payment error: ${error.message}` : `Error confirming booking: ${error.message}`;
        req.session.type = 'error';
        res.status(500).render('client/layout/error', {
            error: 'Error confirming booking',
            message: req.session.message,
            type: req.session.type
        });
    }
};

export const getUserBookings = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            console.log('No user ID in request');
            req.session = req.session || {};
            req.session.message = 'User ID not available';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const userData = await userModel.findById(userId);
        if (!userData) {
            console.log('No such User Exists in the Database');
            req.session = req.session || {};
            req.session.message = 'No such user exists in the database';
            req.session.type = 'error';
            return res.redirect('/');
        }

        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = 3; // Number of bookings per page
        const skip = (page - 1) * limit;

        // Search query
        const search = req.query.search || '';
        let query = { userId };

        if (search) {
            let idQuery = {};
            if (mongoose.isValidObjectId(search)) {
                idQuery = { _id: new mongoose.Types.ObjectId(search) };
            }

            const packageIds = await packageModel.find({
                title: { $regex: search, $options: 'i' }
            }).distinct('_id');

            query = {
                userId,
                $or: [
                    idQuery,
                    { 'items.packageId': { $in: packageIds } },
                    { 'payment.paymentStatus': { $regex: search, $options: 'i' } }
                ].filter(condition => Object.keys(condition).length > 0)
            };
        }

        // Fetch bookings with pagination
        const bookings = await packageBookingSchema
            .find(query)
            .populate('items.packageId')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        // Calculate total pages
        const totalBookings = await packageBookingSchema.countDocuments(query);
        const totalPages = Math.ceil(totalBookings / limit);

        console.log(`Fetched bookings for user: ${userId}, page: ${page}, total: ${totalBookings}, search: ${search}`);

        res.render('client/layout/userBookings', { 
            bookings,
            user: userData,
            currentPage: page,
            totalPages,
            limit,
            search,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Get user bookings error:', error);
        req.session = req.session || {};
        req.session.message = 'Error fetching bookings';
        req.session.type = 'error';
        res.status(500).render('client/layout/error', {
            error: 'Error fetching bookings',
            message: req.session.message,
            type: req.session.type
        });
    }
};

export const getBookingDetails = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            console.log('No user ID in request');
            req.session = req.session || {};
            req.session.message = 'User ID not available';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const userData = await userModel.findById(userId);
        if (!userData) {
            console.log('No such User Exists in the Database');
            req.session = req.session || {};
            req.session.message = 'No such user exists in the database';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const bookingId = req.params.bookingId;
        const booking = await packageBookingSchema.findById(bookingId).populate('items.packageId');
        if (!booking || booking.userId.toString() !== userId.toString()) {
            console.log('Booking not found or not authorized:', bookingId);
            req.session = req.session || {};
            req.session.message = 'Booking not found or not authorized';
            req.session.type = 'error';
            return res.redirect('/my-bookings');
        }

        // Fetch payment details
        const paymentIntent = await stripeInstance.paymentIntents.retrieve(booking.payment.stripePaymentIntentId);
        const paymentMethod = await stripeInstance.paymentMethods.retrieve(paymentIntent.payment_method);
        const paymentDetails = {
            cardBrand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4
        };

        console.log('Rendering booking details for:', bookingId);
        res.render('client/layout/bookingDetails', { 
            booking, 
            user: userData, 
            paymentDetails,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Get booking details error:', error);
        req.session = req.session || {};
        req.session.message = error.type === 'StripeInvalidRequestError' ? `Payment error: ${error.message}` : 'Error fetching booking details';
        req.session.type = 'error';
        res.status(500).render('client/layout/error', {
            error: 'Error fetching booking details',
            message: req.session.message,
            type: req.session.type
        });
    }
};

export const getUserProfile = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            console.log('No user ID in request');
            req.session = req.session || {};
            req.session.message = 'User ID not available';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const user = await userModel.findById(userId);
        if (!user) {
            console.log('No user found for:', userId);
            req.session = req.session || {};
            req.session.message = 'No user found';
            req.session.type = 'error';
            return res.redirect('/');
        }

        console.log('Rendering user profile for:', userId);
        res.render('client/layout/userProfile', { 
            user,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        req.session = req.session || {};
        req.session.message = 'Server error while fetching profile';
        req.session.type = 'error';
        res.status(500).render('client/layout/error', {
            error: 'Server error while fetching profile',
            message: req.session.message,
            type: req.session.type
        });
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            console.log('No user ID in request');
            req.session = req.session || {};
            req.session.message = 'Unauthorized: No user ID provided';
            req.session.type = 'error';
            return res.status(401).render('client/layout/userProfile', {
                user: null,
                message: req.session.message,
                type: req.session.type
            });
        }

        const { firstName, lastName, email, phone } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !phone) {
            console.log('Missing required fields:', { firstName, lastName, email, phone });
            req.session = req.session || {};
            req.session.message = 'First name, last name, email, and phone are required';
            req.session.type = 'error';
            return res.status(400).render('client/layout/userProfile', {
                user: await userModel.findById(userId),
                message: req.session.message,
                type: req.session.type
            });
        }

        let updateData = { firstName, lastName, email, phone };

        const user = await userModel.findById(userId);
        if (!user) {
            console.log('No user found for:', userId);
            req.session = req.session || {};
            req.session.message = 'User not found';
            req.session.type = 'error';
            return res.status(404).render('client/layout/userProfile', {
                user: null,
                message: req.session.message,
                type: req.session.type
            });
        }

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

        await userModel.findByIdAndUpdate(userId, updateData, { new: true });
        console.log('Updated user profile:', userId);
        req.session = req.session || {};
        req.session.message = 'Profile updated successfully';
        req.session.type = 'success';
        res.redirect('/user-profile');
    } catch (error) {
        console.error('Update user profile error:', error);
        req.session = req.session || {};
        req.session.message = 'Server error while updating profile';
        req.session.type = 'error';
        res.status(500).render('client/layout/userProfile', {
            user: null,
            message: req.session.message,
            type: req.session.type
        });
    }
};

export const getAboutPage = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            req.session = req.session || {};
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.status(401).render('client/layout/about', {
                user: null,
                message: req.session.message,
                type: req.session.type
            });
        }
        
        const user = await userModel.findById(userId);
        if (!user) {
            req.session = req.session || {};
            req.session.message = 'No such user exists in the database';
            req.session.type = 'error';
            return res.render('client/layout/about', {
                user: null,
                message: req.session.message,
                type: req.session.type
            });
        }

        res.render('client/layout/about', {
            user,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error rendering About page:', error);
        req.session = req.session || {};
        req.session.message = 'Server error while loading the About page';
        req.session.type = 'error';
        res.status(500).render('client/layout/error', {
            error: 'Server error while loading the About page',
            message: req.session.message,
            type: req.session.type
        });
    }
};

export const getServicePage = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            req.session = req.session || {};
            req.session.message = 'Unauthorized: Please log in';
            req.session.type = 'error';
            return res.status(401).render('client/layout/services', {
                user: null,
                message: req.session.message,
                type: req.session.type
            });
        }
        
        const user = await userModel.findById(userId);
        if (!user) {
            req.session = req.session || {};
            req.session.message = 'No such user exists in the database';
            req.session.type = 'error';
            return res.render('client/layout/services', {
                user: null,
                message: req.session.message,
                type: req.session.type
            });
        }

        res.render('client/layout/services', {
            user,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error rendering Service page:', error);
        req.session = req.session || {};
        req.session.message = 'Server error while loading the Service page';
        req.session.type = 'error';
        res.status(500).render('client/layout/error', {
            error: 'Server error while loading the Service page',
            message: req.session.message,
            type: req.session.type
        });
    }
};