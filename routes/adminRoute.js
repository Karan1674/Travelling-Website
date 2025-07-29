const express = require('express');
const { adminRegister ,loginPage , loginUserOrAdmin, logoutUser, dashboard, getAllUsers, getNewUserPage, newUser, editUserPost, editUserPage, deleteUser, forgetPasswordPage, forgetPassword, resetPasswordPage, resetPassword, addPackagePage, addPackage, editPackagePage, editPackage, allPackages } = require('../controller/adminController');
const { isAuthenicated } = require('../middleware/isAuthenicated');
const { isAdminCheck } = require('../middleware/checkAdmin');
const { uploadProfilePic, uploadGallery } = require('../middleware/multer');
const router = express.Router();


router.post('/adminRegister',adminRegister)
router.get('/loginPage',loginPage)
router.post('/loginUserOrAdmin',loginUserOrAdmin)
router.get('/logout',isAuthenicated,logoutUser)
router.get('/forgetPasswordPage', forgetPasswordPage);
router.post('/forgetPassword', forgetPassword);
router.get('/reset-password', resetPasswordPage);
router.post('/reset-password', resetPassword);

router.get('/dashboard',isAuthenicated,isAdminCheck, dashboard)

router.get('/users',isAuthenicated,isAdminCheck,getAllUsers)
router.get('/new-user',isAuthenicated,isAdminCheck,getNewUserPage);
router.post('/new-user',isAuthenicated,isAdminCheck,newUser)

router.get('/edit-user',isAuthenicated,isAdminCheck,editUserPage)
router.post('/edit-user/:editUserId',uploadProfilePic.single('profilePic'), isAuthenicated, isAdminCheck, editUserPost);
router.get('/delete-user/:userId', isAuthenicated, isAdminCheck, deleteUser)


router.get('/db-add-package', isAuthenicated, isAdminCheck, addPackagePage);
router.post('/add-package', isAuthenicated, isAdminCheck, uploadGallery.fields([{ name: 'gallery'},{ name: 'featuredImage', maxCount: 1 }]), addPackage);
router.get('/db-all-packages', isAuthenicated, isAdminCheck, allPackages);
router.get('/edit-package/:id', isAuthenicated, isAdminCheck, editPackagePage);
router.post('/edit-package/:id', isAuthenicated, isAdminCheck, uploadGallery.fields([{ name: 'gallery' },{ name: 'featuredImage', maxCount: 1 }]), editPackage);



module.exports = router;
