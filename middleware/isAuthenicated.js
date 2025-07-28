import jwt from 'jsonwebtoken';

export const isAuthenicated = (req, res, next) => {
    const token = req.cookies?.authToken;
    if (!token) return res.redirect('/loginPage');

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        req.id = decoded.userId;
        next();
    } catch (error) {
        res.clearCookie('authToken');
        return res.redirect('/loginPage');
    }
};
