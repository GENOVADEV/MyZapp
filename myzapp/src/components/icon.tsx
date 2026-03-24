// src/app/icon.tsx
import { ImageResponse } from 'next/og';
import { BotMessageSquare } from 'lucide-react';



// Génération de l'icône
export default function Icon() {
  return (
      // Ce code JSX va être "dessiné" et transformé en véritable image PNG
      <div
        style={{
          background: '#008069', // Notre vert primaire WhatsApp
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px', // Le côté carré-arrondi de l'application
        }}
      >
        <BotMessageSquare color="white" size={22} strokeWidth={2.5} />
      </div>
  );
}