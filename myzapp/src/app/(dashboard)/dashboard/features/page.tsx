// src/app/dashboard/features/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useBot } from "@/contexts/BotContext";
import {
  Zap,
  Shield,
  Filter,
  MessageSquare,
  Users,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronRight,
  Settings,
  Save,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AutomationFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
  count?: number;
  color: string;
}

interface FilterRule {
  id: string;
  trigger: string;
  response: string;
  enabled: boolean;
  created: string;
}

export default function FeaturesPage() {
  const { stats, refreshStats } = useBot();
  const [features, setFeatures] = useState<AutomationFeature[]>([
    {
      id: "auto-reply",
      name: "Réponses Automatiques",
      description: "Répondez automatiquement aux messages entrants",
      icon: MessageSquare,
      enabled: true,
      count: 12,
      color: "from-blue-500 to-blue-600",
    },
    {
      id: "anti-spam",
      name: "Anti-Spam",
      description: "Protégez vos groupes contre le spam",
      icon: Shield,
      enabled: true,
      count: stats?.antilinks || 0,
      color: "from-green-500 to-emerald-600",
    },
    {
      id: "word-filter",
      name: "Filtres de Mots",
      description: "Modérez le contenu automatiquement",
      icon: Filter,
      enabled: true,
      count: stats?.filters || 0,
      color: "from-purple-500 to-purple-600",
    },
    {
      id: "welcome-msg",
      name: "Messages de Bienvenue",
      description: "Accueillez automatiquement les nouveaux membres",
      icon: Users,
      enabled: false,
      count: 0,
      color: "from-yellow-500 to-orange-500",
    },
    {
      id: "auto-warn",
      name: "Avertissements Auto",
      description: "Gérez les infractions automatiquement",
      icon: AlertTriangle,
      enabled: true,
      count: stats?.warnings || 0,
      color: "from-red-500 to-pink-500",
    },
  ]);

  const [filters, setFilters] = useState<FilterRule[]>([
    {
      id: "1",
      trigger: "!help",
      response: "Comment puis-je vous aider ?",
      enabled: true,
      created: "2025-04-20",
    },
    {
      id: "2",
      trigger: "!ping",
      response: "Pong! 🏓",
      enabled: true,
      created: "2025-04-19",
    },
  ]);

  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingFilter, setIsAddingFilter] = useState(false);

  useEffect(() => {
    refreshStats();
  }, []);

  const toggleFeature = (id: string) => {
    setFeatures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
  };

  const filteredFeatures = features.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-main">
            Automatisations
          </h1>
          <p className="text-text-subtle mt-1">
            Gérez vos fonctionnalités automatiques
          </p>
        </div>

        <button
          onClick={() => setIsAddingFilter(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-lg font-semibold hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Nouveau Filtre</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-subtle" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher une fonctionnalité..."
          className="w-full pl-10 pr-4 py-3 bg-panel border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all"
        />
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFeatures.map((feature) => (
          <div
            key={feature.id}
            className={cn(
              "group relative overflow-hidden rounded-xl border p-6 transition-all",
              feature.enabled
                ? "bg-panel border-border-main shadow-sm hover:shadow-lg"
                : "bg-background-app border-border-main/50 opacity-75"
            )}
          >
            {/* Status Indicator */}
            <div className="absolute top-4 right-4">
              <button
                onClick={() => toggleFeature(feature.id)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  feature.enabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    feature.enabled ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Icon */}
            <div
              className={cn(
                "inline-flex p-3 rounded-xl bg-gradient-to-br mb-4",
                feature.color
              )}
            >
              <feature.icon className="w-6 h-6 text-white" />
            </div>

            {/* Content */}
            <h3 className="text-lg font-bold text-text-main mb-1">
              {feature.name}
            </h3>
            <p className="text-sm text-text-subtle mb-4">{feature.description}</p>

            {/* Stats */}
            {feature.count !== undefined && (
              <div className="flex items-center justify-between pt-4 border-t border-border-main">
                <span className="text-sm text-text-subtle">Actifs</span>
                <span className="text-lg font-bold text-text-main">
                  {feature.count}
                </span>
              </div>
            )}

            {/* Configure Button */}
            <button
              onClick={() => setSelectedFeature(feature.id)}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-background-app hover:bg-panel-hover border border-border-main transition-colors text-sm font-semibold"
            >
              <Settings className="w-4 h-4" />
              <span>Configurer</span>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </button>
          </div>
        ))}
      </div>

      {/* Active Filters Section */}
      <div className="bg-panel rounded-2xl border border-border-main p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-text-main">
              Filtres Actifs
            </h2>
            <p className="text-sm text-text-subtle mt-1">
              {filters.length} règle(s) configurée(s)
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {filters.map((filter) => (
            <div
              key={filter.id}
              className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-background-app border border-border-main hover:shadow-md transition-all"
            >
              {/* Status Toggle */}
              <button
                onClick={() => {
                  setFilters((prev) =>
                    prev.map((f) =>
                      f.id === filter.id ? { ...f, enabled: !f.enabled } : f
                    )
                  );
                }}
                className={cn(
                  "w-10 h-6 rounded-full transition-colors flex-shrink-0",
                  filter.enabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 bg-white rounded-full transition-transform",
                    filter.enabled ? "translate-x-5" : "translate-x-1"
                  )}
                />
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <code className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-mono">
                    {filter.trigger}
                  </code>
                  <ChevronRight className="w-4 h-4 text-text-subtle" />
                </div>
                <p className="text-sm text-text-subtle truncate">
                  {filter.response}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg hover:bg-panel-hover transition-colors">
                  <Edit className="w-4 h-4 text-text-subtle hover:text-primary" />
                </button>
                <button className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 className="w-4 h-4 text-text-subtle hover:text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Filter Modal */}
      {isAddingFilter && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-panel rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border-main">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-text-main">
                Nouveau Filtre
              </h3>
              <button
                onClick={() => setIsAddingFilter(false)}
                className="p-2 rounded-lg hover:bg-panel-hover transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-main mb-2">
                  Déclencheur
                </label>
                <input
                  type="text"
                  placeholder="!commande"
                  className="w-full px-4 py-3 bg-background-app border border-border-main rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-main mb-2">
                  Réponse
                </label>
                <textarea
                  rows={4}
                  placeholder="Texte de la réponse automatique..."
                  className="w-full px-4 py-3 bg-background-app border border-border-main rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button className="flex-1 px-4 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-lg font-semibold hover:shadow-lg transition-all">
                  <div className="flex items-center justify-center gap-2">
                    <Save className="w-5 h-5" />
                    <span>Enregistrer</span>
                  </div>
                </button>
                <button
                  onClick={() => setIsAddingFilter(false)}
                  className="px-4 py-3 border border-border-main rounded-lg font-semibold hover:bg-panel-hover transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}