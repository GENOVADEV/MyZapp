// src/app/dashboard/settings/page.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  User,
  Bell,
  Shield,
  Globe,
  Palette,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsSection {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("profile");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    language: "fr",
    theme: "light",
    notifications: {
      email: true,
      push: true,
      sms: false,
    },
    security: {
      twoFactor: false,
      loginAlerts: true,
    },
  });

  const sections: SettingsSection[] = [
    {
      id: "profile",
      label: "Profil",
      icon: User,
      color: "from-blue-500 to-blue-600",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      color: "from-purple-500 to-purple-600",
    },
    {
      id: "security",
      label: "Sécurité",
      icon: Shield,
      color: "from-red-500 to-pink-500",
    },
    {
      id: "preferences",
      label: "Préférences",
      icon: Palette,
      color: "from-yellow-500 to-orange-500",
    },
  ];

  const handleSave = async () => {
    setSaveStatus("saving");
    // Simuler un appel API
    setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 1000);
  };

  const renderProfileSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-text-main mb-4">
          Informations Personnelles
        </h3>

        <div className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-bold">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <button className="px-4 py-2 bg-panel-hover rounded-lg text-sm font-semibold hover:bg-border-main transition-colors">
                Changer la photo
              </button>
              <p className="text-xs text-text-subtle mt-1">
                JPG, PNG ou GIF (Max. 2MB)
              </p>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-text-main mb-2">
              Nom complet
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-subtle" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full pl-10 pr-4 py-3 bg-background-app border border-border-main rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-text-main mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-subtle" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full pl-10 pr-4 py-3 bg-background-app border border-border-main rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-text-main mb-2">
              Téléphone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-subtle" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+237 6XX XX XX XX"
                className="w-full pl-10 pr-4 py-3 bg-background-app border border-border-main rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-text-main mb-4">
          Préférences de Notifications
        </h3>

        <div className="space-y-4">
          {[
            {
              id: "email",
              label: "Notifications par Email",
              description: "Recevoir les alertes importantes par email",
            },
            {
              id: "push",
              label: "Notifications Push",
              description: "Recevoir des notifications sur votre appareil",
            },
            {
              id: "sms",
              label: "Notifications SMS",
              description: "Recevoir des alertes par SMS",
            },
          ].map((option) => (
            <div
              key={option.id}
              className="flex items-center justify-between p-4 rounded-lg bg-background-app border border-border-main"
            >
              <div className="flex-1">
                <h4 className="font-semibold text-text-main">{option.label}</h4>
                <p className="text-sm text-text-subtle mt-1">
                  {option.description}
                </p>
              </div>

              <button
                onClick={() =>
                  setFormData({
                    ...formData,
                    notifications: {
                      ...formData.notifications,
                      [option.id]: !formData.notifications[option.id as keyof typeof formData.notifications],
                    },
                  })
                }
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  formData.notifications[option.id as keyof typeof formData.notifications]
                    ? "bg-green-500"
                    : "bg-gray-300 dark:bg-gray-600"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    formData.notifications[option.id as keyof typeof formData.notifications]
                      ? "translate-x-6"
                      : "translate-x-1"
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSecuritySection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-text-main mb-4">
          Sécurité du Compte
        </h3>

        <div className="space-y-4">
          {/* 2FA */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-background-app border border-border-main">
            <div className="flex-1">
              <h4 className="font-semibold text-text-main">
                Authentification à deux facteurs
              </h4>
              <p className="text-sm text-text-subtle mt-1">
                Sécurisez votre compte avec un code supplémentaire
              </p>
            </div>

            <button
              onClick={() =>
                setFormData({
                  ...formData,
                  security: {
                    ...formData.security,
                    twoFactor: !formData.security.twoFactor,
                  },
                })
              }
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                formData.security.twoFactor
                  ? "bg-green-500"
                  : "bg-gray-300 dark:bg-gray-600"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  formData.security.twoFactor ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          {/* Change Password */}
          <div className="p-4 rounded-lg bg-background-app border border-border-main">
            <h4 className="font-semibold text-text-main mb-4">
              Changer le Mot de Passe
            </h4>

            <div className="space-y-3">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-subtle" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Ancien mot de passe"
                  className="w-full pl-10 pr-12 py-3 bg-panel border border-border-main rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-text-subtle" />
                  ) : (
                    <Eye className="w-5 h-5 text-text-subtle" />
                  )}
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-subtle" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Nouveau mot de passe"
                  className="w-full pl-10 pr-4 py-3 bg-panel border border-border-main rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-subtle" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirmer le mot de passe"
                  className="w-full pl-10 pr-4 py-3 bg-panel border border-border-main rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <button className="w-full px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-darker transition-colors">
                Mettre à jour le mot de passe
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreferencesSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-text-main mb-4">
          Préférences de l'Application
        </h3>

        <div className="space-y-4">
          {/* Language */}
          <div>
            <label className="block text-sm font-semibold text-text-main mb-2">
              Langue
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-subtle" />
              <select
                value={formData.language}
                onChange={(e) =>
                  setFormData({ ...formData, language: e.target.value })
                }
                className="w-full pl-10 pr-4 py-3 bg-background-app border border-border-main rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-sm font-semibold text-text-main mb-2">
              Thème
            </label>
            <div className="grid grid-cols-3 gap-3">
              {["light", "dark", "auto"].map((theme) => (
                <button
                  key={theme}
                  onClick={() => setFormData({ ...formData, theme })}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all",
                    formData.theme === theme
                      ? "border-primary bg-primary/10"
                      : "border-border-main hover:border-primary/50"
                  )}
                >
                  <Palette className="w-6 h-6 mx-auto mb-2 text-text-subtle" />
                  <p className="text-sm font-semibold text-text-main capitalize">
                    {theme === "auto" ? "Système" : theme === "light" ? "Clair" : "Sombre"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-main">
          Paramètres
        </h1>
        <p className="text-text-subtle mt-1">
          Gérez vos préférences et votre compte
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-panel rounded-xl border border-border-main p-2 space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left",
                  activeSection === section.id
                    ? "bg-primary text-white shadow-lg"
                    : "text-text-main hover:bg-panel-hover"
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    activeSection === section.id
                      ? "bg-white/20"
                      : `bg-gradient-to-br ${section.color}`
                  )}
                >
                  <section.icon
                    className={cn(
                      "w-5 h-5",
                      activeSection === section.id ? "text-white" : "text-white"
                    )}
                  />
                </div>
                <span className="font-semibold">{section.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-panel rounded-xl border border-border-main p-6">
            {activeSection === "profile" && renderProfileSection()}
            {activeSection === "notifications" && renderNotificationsSection()}
            {activeSection === "security" && renderSecuritySection()}
            {activeSection === "preferences" && renderPreferencesSection()}

            {/* Save Button */}
            <div className="mt-8 pt-6 border-t border-border-main flex items-center justify-end gap-3">
              <button
                onClick={handleSave}
                disabled={saveStatus === "saving"}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all",
                  saveStatus === "saved"
                    ? "bg-green-500 text-white"
                    : "bg-gradient-to-r from-primary to-accent text-white hover:shadow-lg"
                )}
              >
                {saveStatus === "saving" ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : saveStatus === "saved" ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Enregistré</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Enregistrer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}