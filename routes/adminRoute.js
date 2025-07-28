const express = require('express');
const { adminRegister ,loginPage , loginUserOrAdmin, logoutUser, dashboard, getAllUsers, getNewUserPage, newUser, editUserPost, editUserPage, deleteUser } = require('../controller/adminController');
const { isAuthenicated } = require('../middleware/isAuthenicated');
const { isAdminCheck } = require('../middleware/checkAdmin');
const { upload } = require('../middleware/multer');
const router = express.Router();


router.post('/adminRegister',adminRegister)
router.get('/loginPage',loginPage)
router.post('/loginUserOrAdmin',loginUserOrAdmin)
router.get('/logout',isAuthenicated,logoutUser)

router.get('/dashboard',isAuthenicated,isAdminCheck, dashboard)

router.get('/users',isAuthenicated,isAdminCheck,getAllUsers)
router.get('/new-user',isAuthenicated,isAdminCheck,getNewUserPage);
router.post('/new-user',isAuthenicated,isAdminCheck,newUser)

router.get('/edit-user',isAuthenicated,isAdminCheck,editUserPage)
router.post('/edit-user/:editUserId',upload.single('profilePic'), isAuthenicated, isAdminCheck, editUserPost);
router.get('/delete-user/:userId', isAuthenicated, isAdminCheck, deleteUser)


module.exports = router;
