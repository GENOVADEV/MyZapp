// Example: src/app/(auth)/login/page-with-signIn.tsx
// Ceci est un exemple montrant comment utiliser signIn directement
// Si vous voulez utiliser cette approche, renommez ce fichier en page.tsx

"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

interface LoginCredentials {
  email: string;
  password: string;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  
  const [formData, setFormData] = useState<LoginCredentials>({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Redirection si authentifié
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email || !formData.password) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    setIsLoading(true);

    // Utiliser signIn directement de NextAuth
    const result = await signIn("credentials", {
      email: formData.email,
      password: formData.password,
      redirect: false,
    });

    if (!result?.ok) {
      setError(result?.error || "Identifiants incorrects");
      setIsLoading(false);
    } else {
      // Succès - la redirection se fait via le useEffect
      router.push("/dashboard");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background-app flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-app via-panel to-background-app flex items-center justify-center p-4">
      <div className="panel-card p-8 rounded-2xl shadow-2xl border-2 border-border-main max-w-md w-full">
        <h2 className="text-3xl font-bold text-text-main mb-2">Connexion</h2>
        <p className="text-text-subtle mb-6">Connectez-vous avec votre compte</p>

        {error && (
          <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg text-sm text-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-text-main mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input-whatsapp w-full px-4 py-2 text-base"
              placeholder="vous@exemple.com"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-text-main mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input-whatsapp w-full px-4 py-2 text-base"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-2 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin inline" /> : "Se connecter"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-text-subtle">Pas de compte ? </span>
          <Link href="/register" className="text-primary hover:text-primary-darker font-semibold">
            S'inscrire
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background-app flex items-center justify-center"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
