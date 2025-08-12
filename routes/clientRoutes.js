const express = require('express');
const { destinationPage, tourPackagesPage, signInUserDashboard, packageDetailPage, submitReview, addToWishlist, removeFromWishlist, getWishlist, packageOfferPage, addToPackageCart, updatePackageCart, removeFromPackageCart, getpackageCart, checkoutPackageCart, confirmPackageBooking, createPackagePaymentIntent, bookSinglePackage, createSinglePackagePaymentIntent, confirmSinglePackageBooking, getUserBookings, getBookingDetails, getUserProfile, updateUserProfile, getAboutPage, getServicePage, getAvailableCoupons, applyCoupon, getCareers, getCareerById, applyForCareer, getAppliedCareers, getTourGuides, getGallery, getContinueReadingPage } = require('../controller/clientController');
const { isAuthenticated } = require('../middleware/isAuthenticated');
const { uploadProfilePic, uploadCareerCv } = require('../middleware/multer');

const router = express.Router();

router.get('/UserDashboard',isAuthenticated,signInUserDashboard)

router.get('/destination', isAuthenticated, destinationPage);
router.get('/tour-packages', isAuthenticated, tourPackagesPage);
router.get('/package-detail/:id', isAuthenticated, packageDetailPage);

router.post('/review/:packageId', isAuthenticated, submitReview);

router.post('/wishlist/add/:packageId', isAuthenticated, addToWishlist);
router.post('/wishlist/remove/:packageId', isAuthenticated, removeFromWishlist);
router.get('/wishlist', isAuthenticated, getWishlist);


router.get('/package-offer', isAuthenticated, packageOfferPage);

router.post('/packageCart/add',isAuthenticated, addToPackageCart);
router.get('/packageCart',isAuthenticated, getpackageCart);
router.post('/packageCart/update',isAuthenticated, updatePackageCart);
router.post('/packageCart/remove',isAuthenticated, removeFromPackageCart);
router.post('/packageCart/checkout',isAuthenticated, checkoutPackageCart);
router.post('/packageCart/confirm', isAuthenticated, confirmPackageBooking);
router.post('/packageCart/create-payment-intent', isAuthenticated, createPackagePaymentIntent)

router.get('/bookPackage/:packageId',isAuthenticated, bookSinglePackage);
router.post('/bookPackage/create-payment-intent', isAuthenticated, createSinglePackagePaymentIntent);
router.post('/bookPackage/confirm', isAuthenticated, confirmSinglePackageBooking);


router.get('/user-bookings', isAuthenticated, getUserBookings);
router.get('/user-booking/:bookingId', isAuthenticated, getBookingDetails);



router.get('/user-profile',isAuthenticated, getUserProfile);
router.post('/user-profile/update',isAuthenticated, uploadProfilePic.single('profilePic'), updateUserProfile);


router.get('/about',isAuthenticated, getAboutPage);
router.get('/services',isAuthenticated, getServicePage);

router.get('/available-coupons', isAuthenticated, getAvailableCoupons);
router.post('/packageCart/applyCoupon', isAuthenticated, applyCoupon);


router.get('/careers', isAuthenticated, getCareers);
router.get('/careers/:id',  isAuthenticated, getCareerById);
router.post('/careers/apply', isAuthenticated, uploadCareerCv.single('cv'), applyForCareer);
router.post('/careers/:id/apply', isAuthenticated, uploadCareerCv.single('cv'), applyForCareer);

router.get('/applied-careers', isAuthenticated, getAppliedCareers);

router.get('/tour-guide', isAuthenticated, getTourGuides);

router.get('/gallery', isAuthenticated, getGallery);

router.get('/continue-reading', isAuthenticated, getContinueReadingPage);

module.exports = router;