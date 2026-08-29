import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "myzapp_super_secret_jwt_key_2026_raganork";

export interface DecodedToken {
  userId: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export function signJwt(payload: { userId: string; email: string; role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyJwt(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, JWT_SECRET) as DecodedToken;
  } catch (error) {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getAuthUser(req?: Request) {
  try {
    let token = "";
    if (req) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) return null;

    const decoded = verifyJwt(token);
    if (!decoded || !decoded.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isVerified: true,
        activeSession: true,
        botConfig: true,
        createdAt: true
      }
    });

    return user;
  } catch (error) {
    console.error("getAuthUser error:", error);
    return null;
  }
}
