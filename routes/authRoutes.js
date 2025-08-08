const express = require('express');
const { adminRegister, loginPage,signupUser,getSignupPage, loginUserOrAdmin, logoutUser, forgetPasswordPage, forgetPassword, resetPasswordPage, resetPassword, homePage, clearSessionMessage } = require('../controller/authController');
const { isAuthenticated } = require('../middleware/isAuthenticated');
const { uploadProfilePic } = require('../middleware/multer');

const router = express.Router();


router.get('/', homePage)
router.post('/adminRegister', adminRegister)

router.get('/signupUser',getSignupPage);
router.post('/signupUser', uploadProfilePic.single('profilePic'),signupUser);

router.get('/loginPage', loginPage)
router.post('/loginUserOrAdmin', loginUserOrAdmin)
router.get('/logout', isAuthenticated, logoutUser)
router.get('/forgetPasswordPage', forgetPasswordPage);
router.post('/forgetPassword', forgetPassword);
router.get('/reset-password', resetPasswordPage);
router.post('/reset-password', resetPassword);




router.post('/clear-session-message', clearSessionMessage);

module.exports = router;