const express = require('express');
const { destinationPage, tourPackagesPage, signInUserDashboard, packageDetailPage } = require('../controller/clientController');
const { isAuthenicated } = require('../middleware/isAuthenicated');

const router = express.Router();

router.get('/UserDashboard',isAuthenicated,signInUserDashboard)

router.get('/destination', isAuthenicated, destinationPage);
router.get('/tour-packages', isAuthenicated, tourPackagesPage);
router.get('/package-detail/:id', isAuthenicated, packageDetailPage);

module.exports = router;