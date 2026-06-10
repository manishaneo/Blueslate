import jwt from "jsonwebtoken";

const secret  = () => process.env.JWT_SECRET;
const expires = () => process.env.JWT_EXPIRES_IN ?? "7d";

export function signToken({ userId, role }) {
    return jwt.sign({ userId, role }, secret(), { expiresIn: expires() });
}

export function verifyToken(token) {
    return jwt.verify(token, secret());
}
