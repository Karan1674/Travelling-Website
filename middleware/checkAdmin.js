import adminModel from '../models/adminModel.js';

import userModel from '../models/userModel.js';


export const isAdminCheck = async (req, res, next) => {
    const userId = req.id;
    if (userId) {
        const AdminData = await adminModel.findById(userId);

        if (AdminData) {
            req.isAdmin = true
        }
        else {
            const userData = await userModel.findById(userId)
            if (userData) {
                req.isAdmin = false
            }
        }
    } else {
        req.isAdmin = false;
    }
    next();
};
