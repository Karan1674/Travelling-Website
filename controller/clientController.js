import userModel from '../models/userModel.js';
import packageModel from "../models/packageModel.js";
import destinations from '../data/destinations.js';
import reviewSchema from '../models/reviewSchema.js';
import wishlistSchema from '../models/wishlistSchema.js';
import packageCartSchema from '../models/packageCartSchema.js';
import packageBookingSchema from '../models/packageBookingSchema.js';
import Stripe from 'stripe';

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);


export const signInUserDashboard =async(req,res)=>{
    try {
        const userId = req.id;
        if(!userId){
            console.log("UserId not Available ")
            return res.redirect('/loginPage')
        }

        const userData = await userModel.findById(userId);

        if(!userData){
            console.log('No such User Exist in The DataBase')
            return res.redirect('/loginPage')
        }

        return res.render('client/layout/Home',{
            user:userData,
        })
    } catch (error) {
        
    }
}


// Destination page controller
export const destinationPage = async (req, res) => {
    try {
        const userId = req.id;
        let userData = null;


        if (!userId) {
            console.log('No User ID Available ');
            return res.redirect('/loginPage');    
        }
        
        userData = await userModel.findById(userId);
        if (!userData) {
            console.log('No such User Exist in The DataBase');
            return res.redirect('/loginPage');
        }

        res.render('client/layout/destination', {
            user: userData,
            destinations
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};



// Tour packages page controller
export const tourPackagesPage = async (req, res) => {
    try {
        const userId = req.id;
        let userData = null;

        if (!userId) {
            console.log('No User id Available');
            return res.redirect('/loginPage');
        }
        
        userData = await userModel.findById(userId);
        if (!userData) {
            console.log('No such User Exist in The DataBase');
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
            packages: packagesWithReviews
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};


export const packageDetailPage = async (req, res) => {
    try {
        const userId = req.id;
        let userData = null;

        if (!userId) {
            console.log('No User Id');
            return res.redirect('/loginPage');
        }

        userData = await userModel.findById(userId);
        if (!userData) {
            console.log('No such User Exist in The DataBase');
            return res.redirect('/loginPage');
        }
        const packageId = req.params.id;
    
        const packageData = await packageModel.findOne({ _id: packageId, status: 'Active' });

        const reviews = await reviewSchema.find({ packageId }).sort({ date: -1 });
       const reviewCount= reviews.length
  
        if (!packageData) {
            return res.render('client/layout/package-detail', {
                user: userData,
                package: null,
                reviewCount:0,
                message: 'No package available or the package is not active.'
            });
        }

        res.render('client/layout/package-detail', {
            user: userData,
            package: packageData,
            reviewCount,
              reviews  
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};



// Submit a new review
export const submitReview = async (req, res) => {
    try {
      const { packageId, name, email, rating, subject, comment } = req.body;
  
      console.log(name)
      // Validate input
      if (!packageId || !name || !email || !rating || !subject || !comment) {
        return res.status(400).json({ message: 'All fields are required' });
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
  
  
      res.status(201).json({ message: 'Review submitted successfully' ,review});
    } catch (error) {
      console.error('Error submitting review:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };




export const addToWishlist = async (req, res) => {
    try {
        const userId = req.id;
        const packageId = req.params.packageId;

        if (!userId) {
            console.log('No User ID Available');
            return res.redirect('/');
        }

        const user = await userModel.findById(userId);
        if (!user) {
            console.log('No such User Exists in the Database');
            return res.redirect('/');
        }

        const packageData = await packageModel.findOne({ _id: packageId, status: 'Active' });
        if (!packageData) {
            return res.status(404).json({ message: 'Package not found or not active' });
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
        res.status(200).json({ message: 'Package added to wishlist successfully' });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


export const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.id;
        const packageId = req.params.packageId;

        if (!userId) {
            console.log('No User ID Available');
            return res.redirect('/');
        }

        const user = await userModel.findById(userId);
        if (!user) {
            console.log('No such User Exists in the Database');
            return res.redirect('/');
        }

        const wishlist = await wishlistSchema.findOne({ userId });
        if (!wishlist) {
            return res.status(404).json({ message: 'Wishlist not found' });
        }

        wishlist.packages = wishlist.packages.filter(id => id.toString() !== packageId);
        await wishlist.save();

        res.status(200).json({ message: 'Package removed from wishlist successfully' });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


export const getWishlist = async (req, res) => {
    try {
        const userId = req.id;

        if (!userId) {
            console.log('No User ID Available');
            return res.redirect('/loginPage');
        }

        const user = await userModel.findById(userId);
        if (!user) {
            console.log('No such User Exists in the Database');
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
            packages: packagesWithReviews
        });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).send('Server Error');
    }
};



export const packageOfferPage = async (req, res) => {
    try {
        const userId = req.id;
        let userData = null;

        if (!userId) {
            console.log('No User ID Available');
            return res.redirect('/');
        }

        userData = await userModel.findById(userId);
        if (!userData) {
            console.log('No such User Exists in the Database');
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

        // Attach reviews and wishlist status to each package
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
            packages: packagesWithReviews
        });
    } catch (error) {
        console.error('Error fetching package offer page:', error);
        res.status(500).send('Server Error');
    }
};





export const addToPackageCart = async (req, res) => {
    try {
        const { packageId, quantity } = req.body;
        const userId = req.id
        if(!userId){
            return res.redirect('/')
        }
        let cart = await packageCartSchema.findOne({ userId });

        if (!cart) {
            cart = new packageCartSchema({ userId, items: [] });
        }

        const packageDetail = await packageModel.findById(packageId);
        if (!packageDetail) {
            return res.status(404).json({ success: false, message: 'Package not found' });
        }

        const existingItemIndex = cart.items.findIndex(item => item.packageId.toString() === packageId);
        if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            cart.items.push({ packageId, quantity});
        }

        await cart.save();
        res.json({ success: true, message: 'Package added to cart' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};



export const getpackageCart = async (req, res) => {
    try {
        const userId = req.id
        if(!userId){
            return res.redirect('/')
        }

       const userData = await userModel.findById(userId);

        if (!userData) {
            console.log('No such User Exists in the Database');
            return res.redirect('/');
        }


        const cart = await packageCartSchema.findOne({ userId }).populate('items.packageId');
    

        if (!cart) {
            return res.render('client/layout/tour-cart', { cart: { items: [] }, user: userData  });
        }
        res.render('client/layout/tour-cart', { cart, user: userData });
    } catch (error) {
        res.status(500).send('Error retrieving cart');
        console.log(error)
    }
};


export const updatePackageCart = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            return res.redirect('/');
        }

        const cart = await packageCartSchema.findOne({ userId });

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
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
                return res.status(404).json({ success: false, message: 'Item not found in cart' });
            }
        } else {
            return res.status(400).json({ success: false, message: 'Invalid request data' });
        }

        await cart.save();
        res.json({ success: true, message: 'Cart updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};



export const removeFromPackageCart = async (req, res) => {
    try {
        const { packageId } = req.body;
        const userId = req.id;
        if (!userId) {
            return res.redirect('/');
        }

        const cart = await packageCartSchema.findOne({ userId });

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        cart.items = cart.items.filter(item => item.packageId.toString() !== packageId);
        await cart.save();
        res.json({ success: true, message: 'Item removed from cart' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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
            return res.redirect('/');
        }

        const userData = await userModel.findById(userId);
        if (!userData) {
            console.log('No such User Exists in the Database');
            return res.redirect('/');
        }

        const cart = await packageCartSchema.findOne({ userId }).populate('items.packageId');
        if (!cart || cart.items.length === 0) {
            console.log('Cart is empty or not found for user:', userId);
            return res.redirect('/packageCart');
        }

        if (!process.env.STRIPE_PUBLISHABLE_KEY || !process.env.STRIPE_SECRET_KEY) {
            console.error('Stripe keys are not set in environment');
            return res.status(500).send('Server configuration error: Missing Stripe keys');
        }

        console.log('Rendering booking with STRIPE_PUBLISHABLE_KEY:', process.env.STRIPE_PUBLISHABLE_KEY);
        res.render('client/layout/booking', { 
            cart, 
            user: userData, 
            stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
            isShow: true
        });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).send('Error during checkout');
    }
};

export const createPackagePaymentIntent = async (req, res) => {
    try {
        console.log('Starting createPaymentIntent for user:', req.id);
        const userId = req.id;
        if (!userId) {
            console.log('Unauthorized: No user ID');
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const cart = await packageCartSchema.findOne({ userId }).populate('items.packageId');
        if (!cart || cart.items.length === 0) {
            console.log('Cart is empty for user:', userId);
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }

        console.log('Cart found:', cart.items);
        const total = cart.items.reduce((sum, item) => sum + item.quantity * (item.packageId.salePrice || item.packageId.regularPrice), 0) + 34 + 34 + (cart.items.reduce((sum, item) => sum + item.quantity * (item.packageId.salePrice || item.packageId.regularPrice), 0) * 0.13);
        console.log('Calculated total:', total);

        const paymentIntent = await stripeInstance.paymentIntents.create({
            amount: Math.round(total * 100), // Convert to cents
            currency: 'usd',
            metadata: { userId: userId.toString() },
            receipt_email: req.body.email || (await userModel.findById(userId)).email,
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'never'
            }
        });
        console.log('Payment intent created:', paymentIntent.id);

        res.json({ success: true, clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error('Create payment intent error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const confirmPackageBooking = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            console.log('No user ID in request');
            return res.redirect('/');
        }

        const userData = await userModel.findById(userId);
        if (!userData) {
            console.log('No such User Exists in the Database');
            return res.redirect('/');
        }

        const cart = await packageCartSchema.findOne({ userId }).populate('items.packageId');
        if (!cart || cart.items.length === 0) {
            console.log('Cart is empty or not found for user:', userId);
            return res.redirect('/packageCart');
        }

        const { 
            firstname, lastname, email, phone, country, street_1, street_2, city, state, postal_code, notes,
            firstname_booking, client_secret
        } = req.body;

        // Validate required fields
        if (!firstname_booking || !client_secret) {
            console.log('Missing required fields');
            return res.status(400).send('Name on card and payment details are required');
        }

        // Convert country to ISO 3166-1 alpha-2 code
        const isoCountry = countryToIsoCode[country] || country;
        if (!isoCountry || isoCountry.length !== 2) {
            console.log('Invalid country code:', isoCountry);
            return res.status(400).send('Invalid country code. Please select a valid country.');
        }

        // Retrieve and verify payment intent
        const paymentIntent = await stripeInstance.paymentIntents.retrieve(client_secret.split('_secret_')[0]);
        if (paymentIntent.status !== 'succeeded') {
            console.log('Payment not completed:', paymentIntent.status);
            return res.status(400).send('Payment not completed: ' + paymentIntent.status);
        }

        const bookingDetails = {
            userId,
            items: cart.items,
            userDetails: {
                firstname,
                lastname,
                email,
                phone,
                country: isoCountry,
                street_1,
                street_2,
                city,
                state,
                postal_code: postal_code || '',
                notes
            },
            payment: {
                stripePaymentIntentId: paymentIntent.id,
                paymentStatus: paymentIntent.status
            },
            total: paymentIntent.amount / 100 // Convert back to dollars
        };

        // Save booking to database
        console.log('Saving booking:', bookingDetails);
        const bookingData = await new packageBookingSchema(bookingDetails).save();

        // Clear cart after booking
        cart.items = [];
        await cart.save();
        console.log('Cart cleared for user:', userId);

        // Fetch payment details for display
        const paymentMethod = await stripeInstance.paymentMethods.retrieve(paymentIntent.payment_method);
        const paymentDetails = {
            cardBrand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4
        };

        res.render('client/layout/confirmation', { 
            booking: bookingData, 
            user: userData, 
            paymentDetails,
            isShow: true
        });
    } catch (error) {
        console.error('Confirm booking error:', error);
        if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).send(`Payment error: ${error.message}`);
        }
        res.status(500).send(`Error confirming booking: ${error.message}`);
    }
};

export const bookSinglePackage = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            console.log('No user ID in request');
            return res.redirect('/');
        }

        const userData = await userModel.findById(userId);
        if (!userData) {
            console.log('No such User Exists in the Database');
            return res.redirect('/');
        }

        const packageId = req.params.packageId;
        const packageData = await packageModel.findById(packageId);
        if (!packageData) {
            console.log('Package not found or not active:', packageId);
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
            return res.status(500).send('Server configuration error: Missing Stripe keys');
        }

        console.log('Rendering booking for package:', packageId);
        res.render('client/layout/booking', {
            cart,
            user: userData,
            stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
            isShow: false
        });
    } catch (error) {
        console.error('Book package error:', error);
        res.status(500).send('Error loading booking page');
    }
};

export const createSinglePackagePaymentIntent = async (req, res) => {
    try {
        console.log('Starting createPaymentIntent for user:', req.id);
        const userId = req.id;
        if (!userId) {
            console.log('Unauthorized: No user ID');
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { packageId, quantity = 1 } = req.body;
        const packageData = await packageModel.findById(packageId);
        if (!packageData) {
            console.log('Package not found or not active:', packageId);
            return res.status(400).json({ success: false, message: 'Package not found or not active' });
        }

        // Calculate total: package price + fixed fees ($34 + $34) + 13% tax
        const packagePrice = packageData.salePrice || packageData.regularPrice;
        const total = (packagePrice * quantity) + 34 + 34 + (packagePrice * quantity * 0.13);
        console.log('Calculated total for package:', total);

        const paymentIntent = await stripeInstance.paymentIntents.create({
            amount: Math.round(total * 100), // Convert to cents
            currency: 'usd',
            metadata: { userId: userId.toString(), packageId: packageId.toString() },
            receipt_email: req.body.email || (await userModel.findById(userId)).email,
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'never'
            }
        });
        console.log('Payment intent created:', paymentIntent.id);

        res.json({ success: true, clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error('Create payment intent error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const confirmSinglePackageBooking = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) {
            console.log('No user ID in request');
            return res.redirect('/');
        }

        const userData = await userModel.findById(userId);
        if (!userData) {
            console.log('No such User Exists in the Database');
            return res.redirect('/');
        }

        const { 
            packageId, quantity = 1, firstname, lastname, email, phone, country, 
            street_1, street_2, city, state, postal_code, notes, firstname_booking, client_secret 
        } = req.body;

        // Validate required fields
        if (!packageId || !firstname_booking || !client_secret) {
            console.log('Missing required fields');
            return res.status(400).send('Package ID, name on card, and payment details are required');
        }

        const packageData = await packageModel.findById(packageId);
        if (!packageData) {
            console.log('Package not found:', packageId);
            return res.status(400).send('Package not found or not active');
        }

        // Convert country to ISO 3166-1 alpha-2 code
        const isoCountry = countryToIsoCode[country] || country;
        if (!isoCountry || isoCountry.length !== 2) {
            console.log('Invalid country code:', isoCountry);
            return res.status(400).send('Invalid country code. Please select a valid country.');
        }

        // Retrieve and verify payment intent
        const paymentIntent = await stripeInstance.paymentIntents.retrieve(client_secret.split('_secret_')[0]);
        if (paymentIntent.status !== 'succeeded') {
            console.log('Payment not completed:', paymentIntent.status);
            return res.status(400).send('Payment not completed: ' + paymentIntent.status);
        }

        // Prepare booking details
        const bookingDetails = {
            userId,
            items: [{
                packageId,
                quantity,
                price: packageData.salePrice || packageData.regularPrice
            }],
            userDetails: {
                firstname,
                lastname,
                email,
                phone,
                country: isoCountry,
                street_1,
                street_2,
                city,
                state,
                postal_code: postal_code || '',
                notes
            },
            payment: {
                stripePaymentIntentId: paymentIntent.id,
                paymentStatus: paymentIntent.status
            },
            total: paymentIntent.amount / 100 // Convert back to dollars
        };

        // Save booking to database
        console.log('Saving booking:', bookingDetails);
        const bookingData = await new packageBookingSchema(bookingDetails).save();

        // Fetch payment details for display
        const paymentMethod = await stripeInstance.paymentMethods.retrieve(paymentIntent.payment_method);
        const paymentDetails = {
            cardBrand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4
        };

        // Populate package details for confirmation page
        const populatedBooking = await packageBookingSchema.findById(bookingData._id).populate('items.packageId');

        res.render('client/layout/confirmation', { 
            booking: populatedBooking, 
            user: userData, 
            paymentDetails,
            isShow: false
        });
    } catch (error) {
        console.error('Confirm booking error:', error);
        if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).send(`Payment error: ${error.message}`);
        }
        res.status(500).send(`Error confirming booking: ${error.message}`);
    }
};

