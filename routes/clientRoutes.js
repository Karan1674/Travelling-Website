const express = require('express');
const { destinationPage, tourPackagesPage, signInUserDashboard, packageDetailPage, submitReview, addToWishlist, removeFromWishlist, getWishlist, packageOfferPage, addToPackageCart, updatePackageCart, removeFromPackageCart, getpackageCart, checkoutPackageCart, confirmPackageBooking, createPackagePaymentIntent, bookSinglePackage, createSinglePackagePaymentIntent, confirmSinglePackageBooking } = require('../controller/clientController');
const { isAuthenticated } = require('../middleware/isAuthenticated');

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

module.exports = router;