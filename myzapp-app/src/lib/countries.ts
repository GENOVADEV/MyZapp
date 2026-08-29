export interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  // Afrique
  { name: "Côte d'Ivoire", code: "CI", dialCode: "+225", flag: "🇨🇮" },
  { name: "Sénégal", code: "SN", dialCode: "+221", flag: "🇸🇳" },
  { name: "Cameroun", code: "CM", dialCode: "+237", flag: "🇨🇲" },
  { name: "Mali", code: "ML", dialCode: "+223", flag: "🇲🇱" },
  { name: "Burkina Faso", code: "BF", dialCode: "+226", flag: "🇧🇫" },
  { name: "Bénin", code: "BJ", dialCode: "+229", flag: "🇧🇯" },
  { name: "Togo", code: "TG", dialCode: "+228", flag: "🇹🇬" },
  { name: "Guinée", code: "GN", dialCode: "+224", flag: "🇬🇳" },
  { name: "Gabon", code: "GA", dialCode: "+241", flag: "🇬🇦" },
  { name: "Congo-Brazzaville", code: "CG", dialCode: "+242", flag: "🇨🇬" },
  { name: "RD Congo", code: "CD", dialCode: "+243", flag: "🇨🇩" },
  { name: "Niger", code: "NE", dialCode: "+227", flag: "🇳🇪" },
  { name: "Tchad", code: "TD", dialCode: "+235", flag: "🇹🇩" },
  { name: "Madagascar", code: "MG", dialCode: "+261", flag: "🇲🇬" },
  { name: "Maroc", code: "MA", dialCode: "+212", flag: "🇲🇦" },
  { name: "Algérie", code: "DZ", dialCode: "+213", flag: "🇩🇿" },
  { name: "Tunisie", code: "TN", dialCode: "+216", flag: "🇹🇳" },
  { name: "Ghana", code: "GH", dialCode: "+233", flag: "🇬🇭" },
  { name: "Nigeria", code: "NG", dialCode: "+234", flag: "🇳🇬" },
  { name: "Rwanda", code: "RW", dialCode: "+250", flag: "🇷🇼" },
  { name: "Kenya", code: "KE", dialCode: "+254", flag: "🇰🇪" },
  { name: "Afrique du Sud", code: "ZA", dialCode: "+27", flag: "🇿🇦" },

  // Europe
  { name: "France", code: "FR", dialCode: "+33", flag: "🇫🇷" },
  { name: "Belgique", code: "BE", dialCode: "+32", flag: "🇧🇪" },
  { name: "Suisse", code: "CH", dialCode: "+41", flag: "🇨🇭" },
  { name: "Allemagne", code: "DE", dialCode: "+49", flag: "🇩🇪" },
  { name: "Royaume-Uni", code: "GB", dialCode: "+44", flag: "🇬🇧" },
  { name: "Espagne", code: "ES", dialCode: "+34", flag: "🇪🇸" },
  { name: "Italie", code: "IT", dialCode: "+39", flag: "🇮🇹" },
  { name: "Portugal", code: "PT", dialCode: "+351", flag: "🇵🇹" },
  { name: "Pays-Bas", code: "NL", dialCode: "+31", flag: "🇳🇱" },

  // Amériques
  { name: "Canada", code: "CA", dialCode: "+1", flag: "🇨🇦" },
  { name: "États-Unis", code: "US", dialCode: "+1", flag: "🇺🇸" },
  { name: "Brésil", code: "BR", dialCode: "+55", flag: "🇧🇷" },
  { name: "Haïti", code: "HT", dialCode: "+509", flag: "🇭🇹" },

  // Asie & Moyen Orient
  { name: "Émirats Arabes Unis", code: "AE", dialCode: "+971", flag: "🇦🇪" },
  { name: "Arabie Saoudite", code: "SA", dialCode: "+966", flag: "🇸🇦" },
  { name: "Chine", code: "CN", dialCode: "+86", flag: "🇨🇳" },
  { name: "Inde", code: "IN", dialCode: "+91", flag: "🇮🇳" },
  { name: "Turquie", code: "TR", dialCode: "+90", flag: "🇹🇷" },
];
