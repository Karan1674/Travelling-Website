const express = require('express');
const { destinationPage, tourPackagesPage, signInUserDashboard, packageDetailPage, submitReview, addToWishlist, removeFromWishlist, getWishlist, packageOfferPage } = require('../controller/clientController');
const { isAuthenicated } = require('../middleware/isAuthenicated');

const router = express.Router();

router.get('/UserDashboard',isAuthenicated,signInUserDashboard)

router.get('/destination', isAuthenicated, destinationPage);
router.get('/tour-packages', isAuthenicated, tourPackagesPage);
router.get('/package-detail/:id', isAuthenicated, packageDetailPage);

router.post('/review/:packageId', isAuthenicated, submitReview);

router.post('/wishlist/add/:packageId', isAuthenicated, addToWishlist);
router.post('/wishlist/remove/:packageId', isAuthenicated, removeFromWishlist);
router.get('/wishlist', isAuthenicated, getWishlist);


router.get('/package-offer', isAuthenicated, packageOfferPage);

module.exports = router;