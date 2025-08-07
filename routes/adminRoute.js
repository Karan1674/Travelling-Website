const express = require('express');
const { AdminDashboard, getAllAgents, getNewAgentPage, newAgent, editAgent, editAgentPage, deleteAgent, getAgentDetails, getSignedInUsers, getUserDetails, addPackagePage, addPackage, editPackagePage, editPackage, getAllPackages, deletePackage, getPackagesByStatus, getUserDashboard, getPackageDashboard, getAdminAgentProfile, updateAdminAgentProfile, getBookings, getEditBooking, editBooking, deleteBooking, packagePreview } = require('../controller/adminController');
const { isAuthenticated } = require('../middleware/isAuthenticated');
const { isAdminCheck } = require('../middleware/checkAdmin');
const { uploadProfilePic, uploadGallery } = require('../middleware/multer');
const router = express.Router();



router.get('/AdminDashboard', isAuthenticated, isAdminCheck, AdminDashboard)

router.get('/db-admin-created-agents', isAuthenticated, isAdminCheck, getAllAgents)
router.get('/new-agent', isAuthenticated, isAdminCheck, getNewAgentPage);
router.post('/new-agent', isAuthenticated, isAdminCheck, newAgent)

router.get('/edit-agent', isAuthenticated, isAdminCheck, editAgentPage)
router.post('/edit-agent/:editAgentId', uploadProfilePic.single('profilePic'), isAuthenticated, isAdminCheck, editAgent);
router.get('/viewAgent', isAuthenticated, isAdminCheck, getAgentDetails);
router.get('/delete-agent/:agentId', isAuthenticated, isAdminCheck, deleteAgent)

router.get('/db-signed-in-users', isAuthenticated, isAdminCheck, getSignedInUsers);
router.get('/user-details', isAuthenticated, isAdminCheck, getUserDetails);


router.get('/db-add-package', isAuthenticated, isAdminCheck, addPackagePage);
router.post('/add-package', isAuthenticated, isAdminCheck, uploadGallery.fields([{ name: 'gallery' }, { name: 'featuredImage', maxCount: 1 }]), addPackage);
router.get('/db-all-packages', isAuthenticated, isAdminCheck, getAllPackages);
router.get('/edit-package/:id', isAuthenticated, isAdminCheck, editPackagePage);

router.post('/edit-package/:id', isAuthenticated, isAdminCheck, uploadGallery.fields([{ name: 'gallery' }, { name: 'featuredImage', maxCount: 1 }]), editPackage);
router.get('/delete-package/:id', isAuthenticated, isAdminCheck, deletePackage);

router.get('/db-active-packages', isAuthenticated, isAdminCheck, (req, res) => getPackagesByStatus({ ...req, query: { ...req.query, status: 'Active' } }, res));
router.get('/db-pending-packages', isAuthenticated, isAdminCheck, (req, res) => getPackagesByStatus({ ...req, query: { ...req.query, status: 'Pending' } }, res));
router.get('/db-expired-packages', isAuthenticated, isAdminCheck, (req, res) => getPackagesByStatus({ ...req, query: { ...req.query, status: 'Expired' } }, res));

router.get('/db-user-dashboard', isAuthenticated, isAdminCheck, getUserDashboard);
router.get('/db-package-dashboard', isAuthenticated, isAdminCheck, getPackageDashboard);



router.get('/admin-agent-profile',isAuthenticated, isAdminCheck, getAdminAgentProfile);
router.post('/admin-agent-profile/update',isAuthenticated,isAdminCheck, uploadProfilePic.single('profilePic'), updateAdminAgentProfile);


router.get('/admin/bookings', isAuthenticated, isAdminCheck, getBookings);
router.get('/admin/bookings/edit/:bookingId', isAuthenticated, isAdminCheck, getEditBooking);
router.post('/admin/bookings/edit/:bookingId', isAuthenticated, isAdminCheck, editBooking);
router.get('/admin/bookings/delete/:bookingId', isAuthenticated, isAdminCheck,deleteBooking);


router.get('/package-preview/:packageId' ,isAuthenticated,isAdminCheck,packagePreview)

module.exports = router;
