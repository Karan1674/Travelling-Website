import userModel from '../models/userModel.js';
import packageModel from "../models/packageModel.js";
import destinations from '../data/destinations.js';
import reviewSchema from '../models/reviewSchema.js';
import wishlistSchema from '../models/wishlistSchema.js';
import packageCartSchema from '../models/packageCartSchema.js';
import packageBookingSchema from '../models/packageBookingSchema.js';
import couponSchema from '../models/couponSchema.js';
import GuideSchema from '../models/GuideSchema.js';
import GallerySchema from '../models/GallerySchema.js';

import Stripe from 'stripe';
import mongoose from 'mongoose';

import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import CareerSchema from '../models/CareerSchema.js';
import ApplicationSchema from '../models/ApplicationSchema.js';
import faqSchema from '../models/faqSchema.js';
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
        res.status(500).redirect('/error?status=500&message=Server error during sign-in');
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
        res.status(500).redirect('/error');
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
        res.status(500).redirect('/error')
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
        res.status(500).redirect('/error')
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
        res.status(500).redirect('/error')
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
        res.status(500).redirect('/error')
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
        res.status(500).redirect('/error')
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
        res.status(500).redirect('/error')
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
        res.status(500).redirect('/error')
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
        res.status(500).redirect('/error')
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
        console.log(cart)
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
        res.status(500).redirect('/error')
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
        res.status(500).redirect('/error')
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
        res.status(500).redirect('/error')
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
        res.status(500).redirect('/error')
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
        res.status(500).redirect('/error')
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

        const { items, email, couponCode } = req.body; // Added couponCode
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

        // Calculate subtotal
        let subtotal = items.reduce((sum, item) => {
            const pkg = packageMap[item.packageId];
            if (!pkg || !item.quantity || item.quantity < 1) return sum;
            return sum + item.quantity * (pkg.salePrice || pkg.regularPrice);
        }, 0);

        // Apply coupon if provided
        let discount = 0;
        let appliedCoupon = null;
        if (couponCode) {
            const coupon = await couponSchema.findOne({ code: couponCode, isActive: true });
            if (!coupon) {
                console.log('Invalid or inactive coupon:', couponCode);
                req.session = req.session || {};
                req.session.message = 'Invalid or inactive coupon';
                req.session.type = 'error';
                return res.status(400).json({ success: false, message: req.session.message, type: req.session.type });
            }
            if (coupon.expiryDate < new Date()) {
                console.log('Coupon expired:', couponCode);
                req.session = req.session || {};
                req.session.message = 'Coupon has expired';
                req.session.type = 'error';
                return res.status(400).json({ success: false, message: req.session.message, type: req.session.type });
            }
            if (coupon.usedCount >= coupon.usageLimit) {
                console.log('Coupon usage limit reached:', couponCode);
                req.session = req.session || {};
                req.session.message = 'Coupon usage limit reached';
                req.session.type = 'error';
                return res.status(400).json({ success: false, message: req.session.message, type: req.session.type });
            }
            if (coupon.usedBy.some(entry => entry.userId.equals(userId))) {
                console.log('Coupon already used by user:', couponCode);
                req.session = req.session || {};
                req.session.message = 'You have already used this coupon';
                req.session.type = 'error';
                return res.status(400).json({ success: false, message: req.session.message, type: req.session.type });
            }
            if (coupon.restrictToUser && !coupon.restrictToUser.equals(userId)) {
                console.log('Coupon not assigned to user:', couponCode);
                req.session = req.session || {};
                req.session.message = 'This coupon is not assigned to you';
                req.session.type = 'error';
                return res.status(400).json({ success: false, message: req.session.message, type: req.session.type });
            }
            if (subtotal >= coupon.minPurchase) {
                if (coupon.discountType === 'percentage') {
                    discount = subtotal * (coupon.discountValue / 100);
                    if (coupon.maxDiscount > 0) {
                        discount = Math.min(discount, coupon.maxDiscount);
                    }
                } else {
                    discount = coupon.discountValue;
                }
                appliedCoupon = coupon;
            } else {
                console.log('Minimum purchase requirement not met:', coupon.minPurchase);
                req.session = req.session || {};
                req.session.message = 'Minimum purchase requirement not met';
                req.session.type = 'error';
                return res.status(400).json({ success: false, message: req.session.message, type: req.session.type });
            }
        }

        // Calculate final total
        const tax = (subtotal - discount) * 0.13;
        const total = subtotal - discount + 34 + 34 + tax;
        console.log('Calculated total with discount:', total, 'Discount:', discount);

        const paymentIntent = await stripeInstance.paymentIntents.create({
            amount: Math.round(total * 100), // Convert to cents
            currency: 'usd',
            metadata: {
                userId: userId.toString(),
                couponCode: couponCode || 'none' // Store coupon in metadata
            },
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
        res.status(500).redirect('/error')
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

        const { packageId, quantity = 1, email, couponCode } = req.body; // Added couponCode
        console.log('Package ID:', packageId);
        const packageData = await packageModel.findById(packageId);
        if (!packageData) {
            console.log('Package not found or not active:', packageId);
            req.session = req.session || {};
            req.session.message = 'Package not found or not active';
            req.session.type = 'error';
            return res.status(400).json({ success: false, message: req.session.message, type: req.session.type });
        }

        // Calculate subtotal
        const packagePrice = packageData.salePrice || packageData.regularPrice;
        let subtotal = packagePrice * quantity;

        // Apply coupon if provided
        let discount = 0;
        let appliedCoupon = null;
        if (couponCode) {
            const coupon = await couponSchema.findOne({ code: couponCode, isActive: true });
            if (!coupon) {
                console.log('Invalid or inactive coupon:', couponCode);
                req.session = req.session || {};
                req.session.message = 'Invalid or inactive coupon';
                req.session.type = 'error';
                return res.status(400).json({ success: false, message: req.session.message, type: req.session.type });
            }
            if (coupon.expiryDate < new Date()) {
                console.log('Coupon expired:', couponCode);
                req.session = req.session || {};
                req.session.message = 'Coupon has expired';
                req.session.type = 'error';
                return res.status(400).json({ success: false, message: req.session.message, type: req.session.type });
            }
            if (coupon.usedCount >= coupon.usageLimit) {
                console.log('Coupon usage limit reached:', couponCode);
                req.session = req.session || {};
                req.session.message = 'Coupon usage limit reached';
                req.session.type = 'error';
                return res.status(400).json({ success: false, message: req.session.message, type: req.session.type });
            }
            if (coupon.usedBy.some(entry => entry.userId.equals(userId))) {
                console.log('Coupon already used by user:', couponCode);
                req.session = req.session || {};
                req.session.message = 'You have already used this coupon';
                req.session.type = 'error';
                return res.status(400).json({ success: false, message: req.session.message, type: req.session.type });
            }
            if (coupon.restrictToUser && !coupon.restrictToUser.equals(userId)) {
                console.log('Coupon not assigned to user:', couponCode);
                req.session = req.session || {};
                req.session.message = 'This coupon is not assigned to you';
                req.session.type = 'error';
                return res.status(400).json({ success: false, message: req.session.message, type: req.session.type });
            }
            if (subtotal >= coupon.minPurchase) {
                if (coupon.discountType === 'percentage') {
                    discount = subtotal * (coupon.discountValue / 100);
                    if (coupon.maxDiscount > 0) {
                        discount = Math.min(discount, coupon.maxDiscount);
                    }
                } else {
                    discount = coupon.discountValue;
                }
                appliedCoupon = coupon;
            } else {
                console.log('Minimum purchase requirement not met:', coupon.minPurchase);
                req.session = req.session || {};
                req.session.message = 'Minimum purchase requirement not met';
                req.session.type = 'error';
                return res.status(400).json({ success: false, message: req.session.message, type: req.session.type });
            }
        }

        // Calculate final total
        const tax = (subtotal - discount) * 0.13;
        const total = subtotal - discount + 34 + 34 + tax;
        console.log('Calculated total for package with discount:', total, 'Discount:', discount);

        const paymentIntent = await stripeInstance.paymentIntents.create({
            amount: Math.round(total * 100), // Convert to cents
            currency: 'usd',
            metadata: {
                userId: userId.toString(),
                packageId: packageId.toString(),
                couponCode: couponCode || 'none' // Store coupon in metadata
            },
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
        res.status(500).redirect('/error')
    }
};


// Updated confirmPackageBooking to handle coupon
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
            firstname_booking, client_secret, appliedCouponCode
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
                stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
                message: req.session.message,
                type: req.session.type,
                isShow: true,
                cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')
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
                stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
                message: req.session.message,
                type: req.session.type,
                isShow: true,
                cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')
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
                stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
                message: req.session.message,
                type: req.session.type,
                isShow: true,
                cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')
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
                stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
                message: req.session.message,
                type: req.session.type,
                isShow: true,
                cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')
            });
        }

        // Create a map of package data for price lookup
        const packageMap = packages.reduce((map, pkg) => {
            map[pkg._id.toString()] = pkg;
            return map;
        }, {});

        // Calculate subtotal
        let subtotal = items.reduce((sum, item) => {
            const price = packageMap[item.packageId].salePrice || packageMap[item.packageId].regularPrice;
            return sum + parseInt(item.quantity) * price;
        }, 0);

        // Apply coupon if provided
        let discount = 0;
        let coupon = null;
        if (appliedCouponCode) {
            coupon = await couponSchema.findOne({ code: appliedCouponCode, isActive: true });
            if (!coupon) {
                console.log('Invalid or inactive coupon:', appliedCouponCode);
                req.session = req.session || {};
                req.session.message = 'Invalid or inactive coupon';
                req.session.type = 'error';
                return res.status(400).render('client/layout/booking', {
                    error: 'Invalid or inactive coupon',
                    user: userData,
                    message: req.session.message,
                    stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
                    type: req.session.type,
                    isShow: true,
                    cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')
                });
            }
            if (coupon.expiryDate < new Date()) {
                console.log('Coupon expired:', appliedCouponCode);
                req.session = req.session || {};
                req.session.message = 'Coupon has expired';
                req.session.type = 'error';
                return res.status(400).render('client/layout/booking', {
                    error: 'Coupon has expired',
                    user: userData,
                    message: req.session.message,
                    stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
                    type: req.session.type,
                    isShow: true,
                    cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')
                });
            }
            if (coupon.usedCount >= coupon.usageLimit) {
                console.log('Coupon usage limit reached:', appliedCouponCode);
                req.session = req.session || {};
                req.session.message = 'Coupon usage limit reached';
                req.session.type = 'error';
                return res.status(400).render('client/layout/booking', {
                    error: 'Coupon usage limit reached',
                    user: userData,
                    message: req.session.message,
                    stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
                    type: req.session.type,
                    isShow: true,
                    cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')
                });
            }
            if (coupon.usedBy.some(entry => entry.userId.equals(userId))) {
                console.log('Coupon already used by user:', appliedCouponCode);
                req.session = req.session || {};
                req.session.message = 'You have already used this coupon';
                req.session.type = 'error';
                return res.status(400).render('client/layout/booking', {
                    error: 'You have already used this coupon',
                    user: userData,
                    message: req.session.message,
                    stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
                    type: req.session.type,
                    isShow: true,
                    cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')
                });
            }
            if (coupon.restrictToUser && !coupon.restrictToUser.equals(userId)) {
                console.log('Coupon not assigned to user:', appliedCouponCode);
                req.session = req.session || {};
                req.session.message = 'This coupon is not assigned to you';
                req.session.type = 'error';
                return res.status(400).render('client/layout/booking', {
                    error: 'This coupon is not assigned to you',
                    user: userData,
                    message: req.session.message,
                    stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
                    type: req.session.type,
                    isShow: true,
                    cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')
                });
            }
            if (subtotal >= coupon.minPurchase) {
                if (coupon.discountType === 'percentage') {
                    discount = subtotal * (coupon.discountValue / 100);
                    if (coupon.maxDiscount > 0) {
                        discount = Math.min(discount, coupon.maxDiscount);
                    }
                } else {
                    discount = coupon.discountValue;
                }
                // Update coupon usage
                await couponSchema.updateOne({ _id: coupon._id }, {
                    $inc: { usedCount: 1 },
                    $push: { usedBy: { userId, usedAt: new Date() } }
                });

                const couponCheckLimit = await couponSchema.findById({ _id: coupon._id })

                if (couponCheckLimit.usedCount >= couponCheckLimit.usageLimit) {
                    await couponSchema.updateOne({ _id: couponCheckLimit._id }, {
                        isActive: false
                    });

                }
            } else {
                console.log('Minimum purchase requirement not met:', coupon.minPurchase);
                req.session = req.session || {};
                req.session.message = 'Minimum purchase requirement not met';
                req.session.type = 'error';
                return res.status(400).render('client/layout/booking', {
                    error: 'Minimum purchase requirement not met',
                    user: userData,
                    message: req.session.message,
                    stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
                    type: req.session.type,
                    isShow: true,
                    cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')
                });
            }
        }

        // Calculate expected total
        const expectedTax = (subtotal - discount) * 0.13;
        const expectedTotal = subtotal - discount + 34 + 34 + expectedTax;

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
                stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
                type: req.session.type,
                isShow: true,
                cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')
            });
        }

        // Validate payment intent amount
        if (Math.round(expectedTotal * 100) !== paymentIntent.amount) {
            console.log('Payment amount mismatch:', { expected: Math.round(expectedTotal * 100), actual: paymentIntent.amount });
            req.session = req.session || {};
            req.session.message = 'Payment amount does not match expected total';
            req.session.type = 'error';
            return res.status(400).render('client/layout/booking', {
                error: 'Payment amount does not match expected total',
                user: userData,
                message: req.session.message,
                stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
                type: req.session.type,
                isShow: true,
                cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')
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
            total: paymentIntent.amount / 100,
            discount, // Store discount
            couponCode: appliedCouponCode || null // Store coupon code
        };

        // Save booking to database
        console.log('Saving booking:', bookingDetails);
        const bookingData = await packageBookingSchema.create(bookingDetails);

        // Clear cart after booking
        const cart = await packageCartSchema.findOne({ userId });
        if (cart) {
            cart.items = [];
            cart.coupon = null; // Clear coupon
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
        res.status(500).redirect('/error')
    }
};

// Updated confirmSinglePackageBooking to handle coupon
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
            street_1, street_2, city, state, postal_code, notes, firstname_booking, client_secret, appliedCouponCode
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
                stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
                type: req.session.type,
                isShow: false,
                cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')

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
                stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
                type: req.session.type,
                isShow: false,
                cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')
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
                stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
                type: req.session.type,
                isShow: false,
                cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')
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
                type: req.session.type,
                stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
                isShow: false,
                cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')
            });
        }

        // Calculate subtotal
        const price = packageData.salePrice || packageData.regularPrice;
        let subtotal = parseInt(quantity) * price;

        // Apply coupon if provided
        let discount = 0;
        let coupon = null;
        if (appliedCouponCode) {
            coupon = await couponSchema.findOne({ code: appliedCouponCode, isActive: true });
            if (!coupon) {
                console.log('Invalid or inactive coupon:', appliedCouponCode);
                req.session = req.session || {};
                req.session.message = 'Invalid or inactive coupon';
                req.session.type = 'error';
                return res.status(400).render('client/layout/booking', {
                    error: 'Invalid or inactive coupon',
                    user: userData,
                    message: req.session.message,
                    stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
                    type: req.session.type,
                    isShow: false,
                    cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')

                });
            }
            if (coupon.expiryDate < new Date()) {
                console.log('Coupon expired:', appliedCouponCode);
                req.session = req.session || {};
                req.session.message = 'Coupon has expired';
                req.session.type = 'error';
                return res.status(400).render('client/layout/booking', {
                    error: 'Coupon has expired',
                    user: userData,
                    message: req.session.message,
                    stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
                    type: req.session.type,
                    isShow: false,
                    cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')

                });
            }
            if (coupon.usedCount >= coupon.usageLimit) {
                console.log('Coupon usage limit reached:', appliedCouponCode);
                req.session = req.session || {};
                req.session.message = 'Coupon usage limit reached';
                req.session.type = 'error';
                return res.status(400).render('client/layout/booking', {
                    error: 'Coupon usage limit reached',
                    user: userData,
                    message: req.session.message,
                    type: req.session.type,
                    stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
                    isShow: false,
                    cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')
                });
            }
            if (coupon.usedBy.some(entry => entry.userId.equals(userId))) {
                console.log('Coupon already used by user:', appliedCouponCode);
                req.session = req.session || {};
                req.session.message = 'You have already used this coupon';
                req.session.type = 'error';
                return res.status(400).render('client/layout/booking', {
                    error: 'You have already used this coupon',
                    user: userData,
                    message: req.session.message,
                    type: req.session.type,
                    isShow: false,
                    cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')

                });
            }
            if (coupon.restrictToUser && !coupon.restrictToUser.equals(userId)) {
                console.log('Coupon not assigned to user:', appliedCouponCode);
                req.session = req.session || {};
                req.session.message = 'This coupon is not assigned to you';
                req.session.type = 'error';
                return res.status(400).render('client/layout/booking', {
                    error: 'This coupon is not assigned to you',
                    user: userData,
                    message: req.session.message,
                    stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
                    type: req.session.type,
                    isShow: false,
                    cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')

                });
            }
            if (subtotal >= coupon.minPurchase) {
                if (coupon.discountType === 'percentage') {
                    discount = subtotal * (coupon.discountValue / 100);
                    if (coupon.maxDiscount > 0) {
                        discount = Math.min(discount, coupon.maxDiscount);
                    }
                } else {
                    discount = coupon.discountValue;
                }
                // Update coupon usage
                await couponSchema.updateOne({ _id: coupon._id }, {
                    $inc: { usedCount: 1 },
                    $push: { usedBy: { userId, usedAt: new Date() } }
                });
                const couponCheckLimit = await couponSchema.findById({ _id: coupon._id })

                if (couponCheckLimit.usedCount >= couponCheckLimit.usageLimit) {
                    await couponSchema.updateOne({ _id: couponCheckLimit._id }, {
                        isActive: false
                    });

                }
            } else {
                console.log('Minimum purchase requirement not met:', coupon.minPurchase);
                req.session = req.session || {};
                req.session.message = 'Minimum purchase requirement not met';
                req.session.type = 'error';
                return res.status(400).render('client/layout/booking', {
                    error: 'Minimum purchase requirement not met',
                    user: userData,
                    message: req.session.message,
                    stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
                    type: req.session.type,
                    isShow: false,
                    cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')
                });
            }
        }

        // Calculate expected total
        const expectedTax = (subtotal - discount) * 0.13;
        const expectedTotal = subtotal - discount + 34 + 34 + expectedTax;

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
                stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
                type: req.session.type,
                isShow: false,
                cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')
            });
        }

        // Validate payment intent amount
        if (Math.round(expectedTotal * 100) !== paymentIntent.amount) {
            console.log('Payment amount mismatch:', { expected: Math.round(expectedTotal * 100), actual: paymentIntent.amount });
            req.session = req.session || {};
            req.session.message = 'Payment amount does not match expected total';
            req.session.type = 'error';
            return res.status(400).render('client/layout/booking', {
                error: 'Payment amount does not match expected total',
                user: userData,
                message: req.session.message,
                stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
                type: req.session.type,
                isShow: false,
                cart: await packageCartSchema.findOne({ userId }).populate('items.packageId')
            });
        }

        // Prepare booking details
        const bookingDetails = {
            userId,
            items: [{
                packageId,
                quantity: parseInt(quantity),
                price
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
            total: paymentIntent.amount / 100,
            discount, // Store discount
            couponCode: appliedCouponCode || null // Store coupon code
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
        res.status(500).redirect('/error')
    }
};

export const getAvailableCoupons = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            return res.redirect('/')
        }
        const coupons = await couponSchema.find({
            isActive: true,
            expiryDate: { $gte: new Date() },
            $expr: { $lt: ["$usedCount", "$usageLimit"] },
            $or: [
                { restrictToUser: null },
                { restrictToUser: userId }
            ],
            'usedBy.userId': { $ne: userId }
        }).select('code discountType discountValue').lean();
        res.json({ success: true, coupons });
    } catch (error) {
        console.error('Error fetching available coupons:', error);
        res.status(500).redirect('/error')
    }
};


export const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        };

        if (!couponCode) {
            return res.status(400).json({ success: false, message: 'Coupon code is required' });
        }

        const coupon = await couponSchema.findOne({ code: couponCode.toUpperCase(), isActive: true });

        if (!coupon) {
            return res.status(400).json({ success: false, message: 'Invalid or inactive coupon' });
        }

        if (coupon.expiryDate < new Date()) {
            return res.status(400).json({ success: false, message: 'Coupon has expired' });
        }

        if (coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
        }

        if (coupon.usedBy.some(entry => entry.userId.toString() === userId.toString())) {
            return res.status(400).json({ success: false, message: 'You have already used this coupon' });
        }

        if (coupon.restrictToUser && coupon.restrictToUser.toString() !== userId.toString()) {
            return res.status(400).json({ success: false, message: 'This coupon is not assigned to you' });
        }

        return res.json({
            success: true,
            coupon: {
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                minPurchase: coupon.minPurchase,
                maxDiscount: coupon.maxDiscount
            }
        });
    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).redirect('/error')
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
        res.status(500).redirect('/error')
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
            stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Get booking details error:', error);
        req.session = req.session || {};
        req.session.message = error.type === 'StripeInvalidRequestError' ? `Payment error: ${error.message}` : 'Error fetching booking details';
        req.session.type = 'error';
        res.status(500).redirect('/error')
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
        res.status(500).redirect('/error')
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
        res.status(500).redirect('/error')
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
        res.status(500).redirect('/error')
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
        res.status(500).redirect('/error')
    }
};


// Get all active careers for Career page
export const getCareers = async (req, res) => {
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

        const careers = await CareerSchema.find({ isActive: true });
        res.render('client/layout/career', {
            careers,
            user,
            message: req.session?.message,
            type: req.session?.type
        });

    } catch (error) {
        console.error('Error fetching careers:', error);
        req.session.message = 'Server error fetching careers';
        req.session.type = 'error';
        res.status(500).redirect('/error')
    }
};


export const getCareerById = async (req, res) => {
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

        const career = await CareerSchema.findById(req.params.id).populate({
            path: 'createdBy',
            select: 'firstName lastName email',
        });
        if (!career || !career.isActive) {
            req.session.message = 'Career not found or inactive';
            req.session.type = 'error';
            return res.redirect('/careers');
        }

        const application = await ApplicationSchema.findOne({
            careerId: req.params.id,
            userId
        });

        res.render('client/layout/career-detail', {
            career,
            application,
            user,
            message: req.session?.message,
            type: req.session?.type
        });

    } catch (error) {
        console.error('Error fetching career:', error);
        req.session.message = 'Server error fetching career';
        req.session.type = 'error';
        res.status(500).redirect('/error')
    }
};



// Submit application for a career
export const applyForCareer = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            req.session.message = 'Please log in to apply';
            req.session.type = 'error';
            return res.redirect('/careers');
        }

        const user = await userModel.findById(userId);
        if (!user) {
            req.session = req.session || {};
            req.session.message = 'No such user exists in the database';
            req.session.type = 'error';
            return res.redirect('/')
        }


        const { careerId } = req.body;
        const career = await CareerSchema.findById(careerId || req.params.id);
        if (!career || !career.isActive) {
            req.session.message = 'Career not found or inactive';
            req.session.type = 'error';
            return res.redirect('/careers');
        }

        if (!req.file) {
            req.session.message = 'CV is required';
            req.session.type = 'error';
            return res.redirect(`/careers/${career._id}`);
        }

        // Check for duplicate application
        const existingApplication = await ApplicationSchema.findOne({ careerId: career._id, userId });
        if (existingApplication) {
            req.session.message = 'You have already applied for this career';
            req.session.type = 'error';
            return res.redirect(`/careers/${career._id}`);
        }

        // Create application
        await ApplicationSchema.create({
            careerId: career._id,
            userId,
            cvFileName: req.file.filename,
            status: 'pending'
        });

        req.session.message = 'Application submitted successfully';
        req.session.type = 'success';
        res.redirect(`/careers/${career._id}`);
    } catch (error) {
        console.error('Error applying for career:', error);
        req.session.message = 'Error submitting application';
        req.session.type = 'error';
        res.status(500).redirect('/error')
    }
}


export const getAppliedCareers = async (req, res) => {
    try {
        const userId = req.id;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const search = req.query.search || '';

        // Validate user
        const user = await userModel.findById(userId);
        if (!user) {
            req.session = req.session || {};
            req.session.message = 'No such user exists in the database';
            req.session.type = 'error';
            return res.redirect('/');
        }


        // Fetch applications with populated career data
        const applications = await ApplicationSchema.find({ userId })
            .populate({
                path: 'careerId',
                match: {
                    title: { $regex: search, $options: 'i' },
                    isActive: true // Only include active careers
                },
                select: 'title employmentType shortDescription salary'
            })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        // Filter out applications where careerId didn't match the populate criteria
        const filteredApplications = applications.filter(app => app.careerId);

        // Count total matching applications
        const totalApplications = await ApplicationSchema.find({ userId })
            .populate({
                path: 'careerId',
                match: {
                    title: { $regex: search, $options: 'i' },
                    isActive: true
                },
                select: 'title'
            })
            .then(apps => apps.filter(app => app.careerId).length);

        const totalPages = Math.ceil(totalApplications / limit);

        res.render('client/layout/applied-careers', {
            applications: filteredApplications,
            currentPage: page,
            totalPages,
            user,
            limit,
            search,
            message: req.session?.message,
            type: req.session?.type
        });
    } catch (error) {
        console.error('Error fetching applied careers:', error);
        req.session = req.session || {};
        req.session.message = 'Error loading applications';
        req.session.type = 'error';
        res.status(500).redirect('/error')
    }
};


// Get all tour guides 
export const getTourGuides = async (req, res) => {
    try {
        const userId = req.id;

        const user = await userModel.findById(userId);
        if (!user) {
            req.session = req.session || {};
            req.session.message = 'No such user exists in the database';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const tourGuides = await GuideSchema.find({ isActive: true }).sort({ createdAt: -1 });
        res.render('client/layout/tour-guide', {
            tourGuides,
            user,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching tour guides:', error);
        req.session.message = 'Error fetching tour guides';
        req.session.type = 'error';
        res.status(500).redirect('/error')
    }
};



export const getGallery = async (req, res) => {
    try {
        const userId = req.id;

        const user = await userModel.findById(userId);
        if (!user) {
            req.session = req.session || {};
            req.session.message = 'No such user exists in the database';
            req.session.type = 'error';
            return res.redirect('/');
        }

        const galleryItems = await GallerySchema.find({ isActive: true })
            .sort({ createdAt: -1 })
            .lean();

        res.render('client/layout/gallery', {
            galleryItems,
            user,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching gallery items:', error);
        req.session = req.session || {};
        req.session.message = 'Error fetching gallery items';
        req.session.type = 'error';
        res.status(500).redirect('/error?status=500&message=Error fetching gallery items');
    }
};

export const getContinueReadingPage = async (req, res) => {
    try {
        const userId = req.id;

        const user = await userModel.findById(userId);
        if (!user) {
            req.session = req.session || {};
            req.session.message = 'No such user exists in the database';
            req.session.type = 'error';
            return res.redirect('/');
        }

        res.render('client/layout/continueReading', {
            user,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching continueReading page:', error);
        req.session = req.session || {};
        req.session.message = 'Error fetching continueReading page';
        req.session.type = 'error';
        res.status(500).redirect('/error?status=500&message=Error fetching continueReading page');
    }
};



// GET: Render FAQ page
export const getFaqPage = async (req, res) => {
    try {
        const userId = req.id;

        let user = null;
        if (userId) {
            user = await userModel.findById(userId);
            if (!user) {
                req.session = req.session || {};
                req.session.message = 'No such user exists in the database';
                req.session.type = 'error';
                return res.redirect('/');
            }
        }

        // Fetch answered questions with populated answeredBy
        const answeredQuestions = await faqSchema.find({ answer: { $ne: null } })
            .sort({ answeredAt: -1 })
            .lean();

        res.render('client/layout/faq', {
            user,
            answeredQuestions,
            message: req.session?.message || null,
            type: req.session?.type || null
        });
    } catch (error) {
        console.error('Error fetching FAQ page:', error);
        req.session = req.session || {};
        req.session.message = 'Error fetching FAQ page';
        req.session.type = 'error';
        res.status(500).redirect('/error?status=500&message=Error fetching FAQ page');

    }
};



// POST: Handle form submission
export const submitQuestion = async (req, res) => {
    try {
        const { name, email, number, message } = req.body;
        const userId = req.id;

        // Basic validation
        if (!name || !email || !message || !number) {
            req.session = req.session || {};
            req.session.message = 'Please fill in all required fields';
            req.session.type = 'error';
            return res.redirect('/faq');
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            req.session = req.session || {};
            req.session.message = 'Please provide a valid email address';
            req.session.type = 'error';
            return res.redirect('/faq');
        }

        // Create new question
        const question = new faqSchema({
            name,
            email,
            number: number || null,
            message,
            questionBy: userId,
            questionAt: Date.now()
        });

        await question.save();

        req.session = req.session || {};
        req.session.message = 'Your question has been submitted successfully';
        req.session.type = 'success';
        res.redirect('/faq');
    } catch (error) {
        console.error('Error submitting question:', error);
        req.session = req.session || {};
        req.session.message = 'Error submitting question';
        req.session.type = 'error';
        res.redirect('/faq');
    }
};

