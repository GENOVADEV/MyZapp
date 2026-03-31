import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export async function getUserFromToken(): Promise<string | null> {
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