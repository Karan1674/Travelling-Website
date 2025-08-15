const express = require('express');
const { AdminDashboard, getAllAgents, getNewAgentPage, newAgent, editAgent, editAgentPage, deleteAgent, getAgentDetails, getSignedInUsers, getUserDetails, addPackagePage, addPackage, editPackagePage, editPackage, getAllPackages, deletePackage, getPackagesByStatus, getUserDashboard, getPackageDashboard, getAdminAgentProfile, updateAdminAgentProfile, getBookings, getEditBooking, editBooking, deleteBooking, packagePreview, renderCouponList, renderAddCoupon, createCoupon, renderEditCoupon, updateCoupon, deleteCoupon, renderCouponDetails, getAddCareerPage, getCareerList, addCareer, getEditCareerPage, editCareer, getCareerDetail, updateApplicationStatus, getApplicationDetail, deleteCareer, getApplicationList, getTourGuides, getAddTourGuide, addTourGuide, getEditTourGuide, updateTourGuide, deleteTourGuide, getTourGuideDetail, getGalleryDashboard, addGalleryItem, editGalleryItem, deleteGalleryItem, getEnquiryDashboard, getFaqEnquiry, editFaqEnquiry, deleteFaqEnquiry, getContactEnquiries, updateContactEnquiryStatus, deleteContactEnquiry, getProductList, getAddProduct, postAddProduct, getEditProduct, postEditProduct, deleteProduct, getProductDetail } = require('../controller/adminController');
const { isAuthenticated } = require('../middleware/isAuthenticated');
const { isAdminCheck } = require('../middleware/checkAdmin');
const { uploadProfilePic, uploadGallery, uploadCareerPic, uploadTourGuideImage, uploadMediaGalleryImage, uploadShopImages } = require('../middleware/multer');
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

router.get('/db-package-dashboard', isAuthenticated, isAdminCheck, getPackageDashboard);
router.get('/package-preview/:packageId' ,isAuthenticated,isAdminCheck,packagePreview)



router.get('/db-user-dashboard', isAuthenticated, isAdminCheck, getUserDashboard);
router.get('/admin-agent-profile',isAuthenticated, isAdminCheck, getAdminAgentProfile);
router.post('/admin-agent-profile/update',isAuthenticated,isAdminCheck, uploadProfilePic.single('profilePic'), updateAdminAgentProfile);


router.get('/admin/bookings', isAuthenticated, isAdminCheck, getBookings);
router.get('/admin/bookings/edit/:bookingId', isAuthenticated, isAdminCheck, getEditBooking);
router.post('/admin/bookings/edit/:bookingId', isAuthenticated, isAdminCheck, editBooking);
router.get('/admin/bookings/delete/:bookingId', isAuthenticated, isAdminCheck,deleteBooking);




router.get('/coupon-list', isAuthenticated,isAdminCheck,renderCouponList);
router.get('/new-coupon', isAuthenticated,isAdminCheck, renderAddCoupon);
router.post('/new-coupon', isAuthenticated,isAdminCheck, createCoupon);
router.get('/edit-coupon/:couponId', isAuthenticated, isAdminCheck, renderEditCoupon);
router.post('/edit-coupon/:couponId',  isAuthenticated, isAdminCheck, updateCoupon);
router.get('/delete-coupon/:couponId', isAuthenticated, isAdminCheck, deleteCoupon);
router.get('/coupon-details/:couponId', isAuthenticated, isAdminCheck, renderCouponDetails);



router.get('/career-list', isAuthenticated, isAdminCheck, getCareerList);
router.get('/add-career', isAuthenticated, isAdminCheck, getAddCareerPage);
router.post('/add-career',isAuthenticated, isAdminCheck, uploadCareerPic.single('careerPic'), addCareer);
router.get('/edit-career/:id', isAuthenticated, isAdminCheck, getEditCareerPage);
router.post('/edit-career/:id', isAuthenticated, isAdminCheck, uploadCareerPic.single('careerPic'),  editCareer);
router.get('/career-detail/:id',  isAuthenticated, isAdminCheck, getCareerDetail);
router.get('/delete-career/:id', isAuthenticated, isAdminCheck, deleteCareer);


router.get('/application-list', isAuthenticated, isAdminCheck, getApplicationList);
router.get('/application-detail/:id',  isAuthenticated, isAdminCheck, getApplicationDetail);
router.post('/application-detail/:id/update',  isAuthenticated, isAdminCheck, updateApplicationStatus);


router.get('/tour-guide-list', isAuthenticated, isAdminCheck, getTourGuides);
router.get('/add-tour-guide', isAuthenticated, isAdminCheck, getAddTourGuide);
router.post('/add-tour-guide', isAuthenticated, isAdminCheck, uploadTourGuideImage.single('guideImage'), addTourGuide);
router.get('/edit-tour-guide/:id', isAuthenticated, isAdminCheck, getEditTourGuide);
router.post('/edit-tour-guide/:id', isAuthenticated, isAdminCheck, uploadTourGuideImage.single('guideImage'), updateTourGuide);
router.get('/delete-tour-guide/:id', isAuthenticated, isAdminCheck, deleteTourGuide);
router.get('/tour-guide-detail/:id', isAuthenticated, isAdminCheck, getTourGuideDetail);


router.get('/galleryDashboard', isAuthenticated, isAdminCheck, getGalleryDashboard);
router.post('/add-gallery-item', isAuthenticated, isAdminCheck, uploadMediaGalleryImage.single('image'), addGalleryItem);
router.post('/edit-gallery-item',  isAuthenticated, isAdminCheck, uploadMediaGalleryImage.single('image'), editGalleryItem);
router.get('/delete-gallery-item/:id', isAuthenticated, isAdminCheck, deleteGalleryItem);


router.get('/enquiryDashboard',  isAuthenticated, isAdminCheck, getEnquiryDashboard);
router.get('/faqEnquiry', isAuthenticated, isAdminCheck, getFaqEnquiry);
router.post('/faqEnquiry/edit/:id', isAuthenticated, isAdminCheck, editFaqEnquiry);
router.get('/faqEnquiry/delete/:id', isAuthenticated, isAdminCheck, deleteFaqEnquiry);


router.get('/contactEnquiry', isAuthenticated, isAdminCheck, getContactEnquiries);
router.post('/contactEnquiry/update/:id', isAuthenticated, isAdminCheck, updateContactEnquiryStatus);
router.get('/contactEnquiry/delete/:id', isAuthenticated, isAdminCheck, deleteContactEnquiry);


router.get('/product-list', isAuthenticated, isAdminCheck, getProductList);
router.get('/product-add',isAuthenticated, isAdminCheck, getAddProduct);
router.post('/product-add', isAuthenticated, isAdminCheck, uploadShopImages.array('images'), postAddProduct);
router.get('/product-edit/:id', isAuthenticated, isAdminCheck, getEditProduct);
router.post('/product-edit/:id', isAuthenticated, isAdminCheck, uploadShopImages.array('images'), postEditProduct);
router.get('/delete-product/:id', isAuthenticated, isAdminCheck, deleteProduct);
router.get('/product-detail/:id', isAuthenticated, isAdminCheck, getProductDetail);


module.exports = router;
