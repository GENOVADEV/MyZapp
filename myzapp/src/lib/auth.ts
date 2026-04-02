import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export interface AuthUser {
  userId: string;
  username: string;
  plan: string;
}

export async function getUserIdFromToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      console.log("❌ Aucun token trouvé");
      return null;
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET!)
    );

    if (!payload.userId ) {
      console.log("❌ Token sans userId ");
      return null;
    }

    return payload.userId  as string;

  } catch (err) {
    console.log("❌ Erreur JWT:", err);
    return null;
  }
}

export async function getUserFromToken(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      console.log("❌ Aucun token trouvé");
      return null;
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET!)
    );

    if (!payload.userId) {
      console.log("❌ Token sans userId");
      return null;
    }

    // 3. On retourne un véritable objet JavaScript
    return {
      userId: payload.userId as string, 
      username: payload.username as string,
      plan: payload.plan as string
    };

  } catch (err) {
    console.log("❌ Erreur JWT:", err);
    return null;
  }
}