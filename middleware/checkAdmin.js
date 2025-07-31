import adminModel from '../models/adminModel.js';

import agentModel from '../models/agentModel.js';


export const isAdminCheck = async (req, res, next) => {
    const userId = req.id;
    if (userId) {
        const AdminData = await adminModel.findById(userId);

        if (AdminData) {
            req.isAdmin = true
        }
        // else {
        //     const userData = await agentModel.findById(userId)
        //     if (userData) {
        //         req.isAdmin = false
        //     }
        // }
    } else {
        req.isAdmin = false;
    }
    next();
};
