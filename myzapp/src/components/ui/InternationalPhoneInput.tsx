'use client';

import React, { forwardRef } from 'react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { cn } from "@/lib/utils";
import { parsePhoneNumberWithError } from 'libphonenumber-js';

interface InternationalPhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onCountryChange?: (countryCode: string) => void;
  error?: string;
  className?: string;
}

const InternationalPhoneInput = forwardRef<HTMLDivElement, InternationalPhoneInputProps>(
  ({ value, onChange, onCountryChange, error, className }, ref) => {
    
    const handleChange = (newValue: string | undefined) => {
      const phoneNumber = newValue || '';
      
      // On envoie la valeur brute au parent
      onChange?.(phoneNumber);

      // 1. Validation de format en console pour debug (Optionnel)
      if (phoneNumber) {
        const isComplete = isValidPhoneNumber(phoneNumber);
        console.log(`Numéro: ${phoneNumber} | Complet: ${isComplete}`);
      }

      // 2. Extraction intelligente du pays
      if (onCountryChange && phoneNumber.startsWith('+')) {
        try {
          const parsed = parsePhoneNumberWithError(phoneNumber);
          if (parsed && parsed.country) {
            onCountryChange(parsed.country as string);
          }
        } catch (e) {
          // On ignore l'erreur pendant que l'utilisateur tape le début du code
        }
      }
    };

    return (
      <div className={cn("flex flex-col gap-1.5", className)} ref={ref}>
        <div 
          className={cn(
            "flex h-10 w-full items-center rounded-md border bg-background px-3 py-2 text-sm ring-offset-background transition-all duration-200 focus-within:ring-2",
            // Style d'erreur subtil : bordure rosée et ombre légère rouge très claire
            error 
              ? "border-red-200 bg-red-50/20 focus-within:ring-red-100/50" 
              : "border-input focus-within:ring-ring"
          )}
        >
          <PhoneInput
            international
            countryCallingCodeEditable={false}
            defaultCountry="CM"
            value={value}
            onChange={handleChange}
            // Mise à jour du pays quand on change le drapeau manuellement
            onCountryChange={(country : any) => onCountryChange?.(country as string)}
            placeholder="Entrez votre numéro"
            className="flex w-full items-center gap-2 phone-input-container"
          />
        </div>

        {/* Message d'erreur plus doux */}
        {error && (
          <p className="text-[11px] font-medium text-red-500/70 ml-1 mt-0.5 italic">
            {error}
          </p>
        )}

        {/* Styles globaux pour injecter le design Shadcn dans la librairie */}
        <style jsx global>{`
          /* Conteneur du drapeau */
          .phone-input-container .PhoneInputCountry {
            margin-right: 2px;
            display: flex;
            align-items: center;
            gap: 4px;
          }

          /* La ligne de séparation verticale subtile */
          .phone-input-container .PhoneInputCountry::after {
            content: "";
            height: 18px;
            width: 1px;
            background-color: #e2e8f0; /* slate-200 */
            margin-left: 8px;
            margin-right: 4px;
          }

          /* Le champ de saisie lui-même */
          .phone-input-container .PhoneInputInput {
            outline: none;
            background: transparent;
            border: none;
            width: 100%;
            font-size: 14px;
            color: inherit;
          }

          /* Ajustement de la flèche du sélecteur */
          .phone-input-container .PhoneInputCountrySelectArrow {
            opacity: 0.3;
            width: 6px;
            height: 6px;
          }

          /* Placeholder */
          .phone-input-container .PhoneInputInput::placeholder {
            color: #94a3b8; /* slate-400 */
          }
        `}</style>
      </div>
    );
  }
);

InternationalPhoneInput.displayName = "InternationalPhoneInput";

export default InternationalPhoneInput;