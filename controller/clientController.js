import userModel from "../models/userModel";

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

        return res.render('client/layout/index',{
            user:userData,
        })
    } catch (error) {
        
    }
}