const express = require('express');
const { AdminDashboard, getAllAgents, getNewAgentPage, newAgent, editAgent, editAgentPage, deleteAgent, getAgentDetails, getSignedInUsers, getUserDetails, addPackagePage, addPackage, editPackagePage, editPackage, getAllPackages, deletePackage, getPackagesByStatus, getUserDashboard, getPackageDashboard } = require('../controller/adminController');
const { isAuthenicated } = require('../middleware/isAuthenicated');
const { isAdminCheck } = require('../middleware/checkAdmin');
const { uploadProfilePic, uploadGallery } = require('../middleware/multer');
const router = express.Router();



router.get('/AdminDashboard', isAuthenicated, isAdminCheck, AdminDashboard)

router.get('/db-admin-created-agents', isAuthenicated, isAdminCheck, getAllAgents)
router.get('/new-agent', isAuthenicated, isAdminCheck, getNewAgentPage);
router.post('/new-agent', isAuthenicated, isAdminCheck, newAgent)

router.get('/edit-agent', isAuthenicated, isAdminCheck, editAgentPage)
router.post('/edit-agent/:editAgentId', uploadProfilePic.single('profilePic'), isAuthenicated, isAdminCheck, editAgent);
router.get('/viewAgent', isAuthenicated, isAdminCheck, getAgentDetails);
router.get('/delete-agent/:agentId', isAuthenicated, isAdminCheck, deleteAgent)

router.get('/db-signed-in-users', isAuthenicated, isAdminCheck, getSignedInUsers);
router.get('/user-details', isAuthenicated, isAdminCheck, getUserDetails);


router.get('/db-add-package', isAuthenicated, isAdminCheck, addPackagePage);
router.post('/add-package', isAuthenicated, isAdminCheck, uploadGallery.fields([{ name: 'gallery' }, { name: 'featuredImage', maxCount: 1 }]), addPackage);
router.get('/db-all-packages', isAuthenicated, isAdminCheck, getAllPackages);
router.get('/edit-package/:id', isAuthenicated, isAdminCheck, editPackagePage);

router.post('/edit-package/:id', isAuthenicated, isAdminCheck, uploadGallery.fields([{ name: 'gallery' }, { name: 'featuredImage', maxCount: 1 }]), editPackage);
router.get('/delete-package/:id', isAuthenicated, isAdminCheck, deletePackage);

router.get('/db-active-packages', isAuthenicated, isAdminCheck, (req, res) => getPackagesByStatus({ ...req, query: { ...req.query, status: 'Active' } }, res));
router.get('/db-pending-packages', isAuthenicated, isAdminCheck, (req, res) => getPackagesByStatus({ ...req, query: { ...req.query, status: 'Pending' } }, res));
router.get('/db-expired-packages', isAuthenicated, isAdminCheck, (req, res) => getPackagesByStatus({ ...req, query: { ...req.query, status: 'Expired' } }, res));

router.get('/db-user-dashboard', isAuthenicated, isAdminCheck, getUserDashboard);
router.get('/db-package-dashboard', isAuthenicated, isAdminCheck, getPackageDashboard);


module.exports = router;
