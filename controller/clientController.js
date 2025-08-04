import userModel from '../models/userModel.js';
import packageModel from "../models/packageModel.js";
import destinations from '../data/destinations.js';
import reviewSchema from '../models/reviewSchema.js';
import wishlistSchema from '../models/wishlistSchema.js';

export const signInUserDashboard =async(req,res)=>{
    try {
        const userId = req.id;
        if(!userId){
            console.log("UserId not Available ")
            return res.redirect('/loginPage')
        }

        const userData = await userModel.findById(userId);

        if(!userData){
            console.log('No such User Exist in The DataBase')
            return res.redirect('/loginPage')
        }

        return res.render('client/layout/Home',{
            user:userData,
        })
    } catch (error) {
        
    }
}


// Destination page controller
export const destinationPage = async (req, res) => {
    try {
        const userId = req.id;
        let userData = null;


        if (!userId) {
            console.log('No User ID Available ');
            return res.redirect('/loginPage');    
        }
        
        userData = await userModel.findById(userId);
        if (!userData) {
            console.log('No such User Exist in The DataBase');
            return res.redirect('/loginPage');
        }

        res.render('client/layout/destination', {
            user: userData,
            destinations
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};






// Tour packages page controller
export const tourPackagesPage = async (req, res) => {
    try {
        const userId = req.id;
        let userData = null;

        if (!userId) {
            console.log('No User id Available');
            return res.redirect('/loginPage');
        }
        
        userData = await userModel.findById(userId);
        if (!userData) {
            console.log('No such User Exist in The DataBase');
            return res.redirect('/loginPage');
        }

        const destination = req.query.destination;
        let query = { status: 'Active' };

        if (destination) {
            query.destinationCountry = new RegExp(destination, 'i');
        }

        const packages = await packageModel.find(query);
        
        // Fetch reviews for all packages
        const packageIds = packages.map(pkg => pkg._id);
        const reviews = await reviewSchema.find({ packageId: { $in: packageIds } }).sort({ date: -1 });
       
        const wishlist = await wishlistSchema.findOne({ userId });
        const wishlistPackageIds = wishlist ? wishlist.packages.map(id => id.toString()) : [];
        // Attach reviews to each package
        const packagesWithReviews = packages.map(pkg => {
            const pkgReviews = reviews.filter(review => review.packageId.toString() === pkg._id.toString());
            return {
                ...pkg._doc, 
                reviews: pkgReviews,
                reviewCount: pkgReviews.length,
                isWishlisted: wishlistPackageIds.includes(pkg._id.toString()),
                averageRating: pkgReviews.length > 0 
                    ? (pkgReviews.reduce((sum, review) => sum + review.rating, 0) / pkgReviews.length).toFixed(1)
                    : '0'
            };
        });

        res.render('client/layout/tour-packages', {
            user: userData,
            packages: packagesWithReviews
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};


export const packageDetailPage = async (req, res) => {
    try {
        const userId = req.id;
        let userData = null;

        if (!userId) {
            console.log('No User Id');
            return res.redirect('/loginPage');
        }

        userData = await userModel.findById(userId);
        if (!userData) {
            console.log('No such User Exist in The DataBase');
            return res.redirect('/loginPage');
        }
        const packageId = req.params.id;
    
        const packageData = await packageModel.findOne({ _id: packageId, status: 'Active' });

        const reviews = await reviewSchema.find({ packageId }).sort({ date: -1 });
       const reviewCount= reviews.length
  
        if (!packageData) {
            return res.render('client/layout/package-detail', {
                user: userData,
                package: null,
                reviewCount:0,
                message: 'No package available or the package is not active.'
            });
        }

        res.render('client/layout/package-detail', {
            user: userData,
            package: packageData,
            reviewCount,
              reviews  
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};



// Submit a new review
export const submitReview = async (req, res) => {
    try {
      const { packageId, name, email, rating, subject, comment } = req.body;
  
      console.log(name)
      // Validate input
      if (!packageId || !name || !email || !rating || !subject || !comment) {
        return res.status(400).json({ message: 'All fields are required' });
      }
  
      // Create new review
      const review = new reviewSchema({
        packageId,
        name,
        email,
        rating,
        subject,
        comment,
      });
  
      await review.save();
  
  
      res.status(201).json({ message: 'Review submitted successfully' ,review});
    } catch (error) {
      console.error('Error submitting review:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };




export const addToWishlist = async (req, res) => {
    try {
        const userId = req.id;
        const packageId = req.params.packageId;

        if (!userId) {
            console.log('No User ID Available');
            return res.redirect('/');
        }

        const user = await userModel.findById(userId);
        if (!user) {
            console.log('No such User Exists in the Database');
            return res.redirect('/');
        }

        const packageData = await packageModel.findOne({ _id: packageId, status: 'Active' });
        if (!packageData) {
            return res.status(404).json({ message: 'Package not found or not active' });
        }

        let wishlist = await wishlistSchema.findOne({ userId });
        if (!wishlist) {
            wishlist = new wishlistSchema({ userId, packages: [packageId] });
        } else {
            if (!wishlist.packages.includes(packageId)) {
                wishlist.packages.push(packageId);
            }
        }

        await wishlist.save();
        res.status(200).json({ message: 'Package added to wishlist successfully' });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.id;
        const packageId = req.params.packageId;

        if (!userId) {
            console.log('No User ID Available');
            return res.redirect('/');
        }

        const user = await userModel.findById(userId);
        if (!user) {
            console.log('No such User Exists in the Database');
            return res.redirect('/');
        }

        const wishlist = await wishlistSchema.findOne({ userId });
        if (!wishlist) {
            return res.status(404).json({ message: 'Wishlist not found' });
        }

        wishlist.packages = wishlist.packages.filter(id => id.toString() !== packageId);
        await wishlist.save();

        res.status(200).json({ message: 'Package removed from wishlist successfully' });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
export const getWishlist = async (req, res) => {
    try {
        const userId = req.id;

        if (!userId) {
            console.log('No User ID Available');
            return res.redirect('/loginPage');
        }

        const user = await userModel.findById(userId);
        if (!user) {
            console.log('No such User Exists in the Database');
            return res.redirect('/loginPage');
        }

        const wishlist = await wishlistSchema.findOne({ userId }).populate({
            path: 'packages',
            match: { status: 'Active' } 
        });
        const packages = wishlist ? wishlist.packages : [];


        const packageIds = packages.map(pkg => pkg._id);
        const reviews = await reviewSchema.find({ packageId: { $in: packageIds } }).sort({ date: -1 });


        const packagesWithReviews = packages.map(pkg => {
            const pkgReviews = reviews.filter(review => review.packageId.toString() === pkg._id.toString());
            return {
                ...pkg._doc,
                reviewCount: pkgReviews.length,
                averageRating: pkgReviews.length > 0 
                    ? (pkgReviews.reduce((sum, review) => sum + review.rating, 0) / pkgReviews.length).toFixed(1)
                    : '0'
            };
        });

        res.render('client/layout/wishlist', {
            user,
            packages: packagesWithReviews
        });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).send('Server Error');
    }
};



export const packageOfferPage = async (req, res) => {
    try {
        const userId = req.id;
        let userData = null;

        if (!userId) {
            console.log('No User ID Available');
            return res.redirect('/');
        }

        userData = await userModel.findById(userId);
        if (!userData) {
            console.log('No such User Exists in the Database');
            return res.redirect('/');
        }

        
        const packages = await packageModel.find({ 
            status: 'Active',
            salePrice: { $exists: true, $ne: null }, 
            regularPrice: { $exists: true, $ne: null }, 
            discount: { $exists: true, $ne: null }, 
            $expr: { $lt: ['$salePrice', '$regularPrice'] } 
        });
    
        const packageIds = packages.map(pkg => pkg._id);
        const reviews = await reviewSchema.find({ packageId: { $in: packageIds } }).sort({ date: -1 });

      
        const wishlist = await wishlistSchema.findOne({ userId });
        const wishlistPackageIds = wishlist ? wishlist.packages.map(id => id.toString()) : [];

        // Attach reviews and wishlist status to each package
        const packagesWithReviews = packages.map(pkg => {
            const pkgReviews = reviews.filter(review => review.packageId.toString() === pkg._id.toString());
            return {
                ...pkg._doc,
                reviewCount: pkgReviews.length,
                averageRating: pkgReviews.length > 0 
                    ? (pkgReviews.reduce((sum, review) => sum + review.rating, 0) / pkgReviews.length).toFixed(1)
                    : '0',
                isWishlisted: wishlistPackageIds.includes(pkg._id.toString())
            };
        });

        res.render('client/layout/package-offer', {
            user: userData,
            packages: packagesWithReviews
        });
    } catch (error) {
        console.error('Error fetching package offer page:', error);
        res.status(500).send('Server Error');
    }
};