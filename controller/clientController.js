import userModel from '../models/userModel.js';
import packageModel from "../models/packageModel.js";
import destinations from '../data/destinations.js';

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

        res.render('client/layout/tour-packages', {
            user: userData,
            packages
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

        if (!packageData) {
            return res.render('client/layout/package-detail', {
                user: userData,
                package: null,
                message: 'No package available or the package is not active.'
            });
        }

        res.render('client/layout/package-detail', {
            user: userData,
            package: packageData,
            reviewCount: [],
                averageRating: 0,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};