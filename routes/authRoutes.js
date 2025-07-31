const express = require('express');
const { adminRegister, loginPage,signupUser,getSignupPage, loginUserOrAdmin, logoutUser, forgetPasswordPage, forgetPassword, resetPasswordPage, resetPassword } = require('../controller/authController');
const { isAuthenicated } = require('../middleware/isAuthenicated');
const { uploadProfilePic } = require('../middleware/multer');

const router = express.Router();



router.post('/adminRegister', adminRegister)

router.get('/signupUser',getSignupPage);
router.post('/signupUser', uploadProfilePic.single('profilePic'),signupUser);

router.get('/loginPage', loginPage)
router.post('/loginUserOrAdmin', loginUserOrAdmin)
router.get('/logout', isAuthenicated, logoutUser)
router.get('/forgetPasswordPage', forgetPasswordPage);
router.post('/forgetPassword', forgetPassword);
router.get('/reset-password', resetPasswordPage);
router.post('/reset-password', resetPassword);





module.exports = router;