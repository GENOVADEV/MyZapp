// src/components/ui/LoadingSpinner.tsx
import React from 'react';

interface LoadingSpinnerProps {
    loading: boolean;
    fullScreen?: boolean;
    time?: number; // Temps en secondes pour une rotation complète
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
    loading = false,
    fullScreen = false, 
    time = 1 
}) => {
    // Classes pour le conteneur
    const containerClasses = fullScreen 
        ? "flex items-center justify-center h-screen w-screen bg-white/70 dark:bg-gray-900/70 fixed top-0 left-0 z-50"
        : "flex items-center justify-center";

    // Styles pour le spinner
    const spinnerStyle: React.CSSProperties = {
        width: fullScreen ? '40px' : '16px',
        height: fullScreen ? '40px' : '16px',
        border: fullScreen 
            ? '4px solid #e5e7eb' 
            : '2px solid #e5e7eb',
        borderTop: fullScreen 
            ? '4px solid #31bbf1' 
            : '2px solid #3b82f6',
        borderRadius: '50%',
        animation: `spin ${time}s linear infinite`,
    };

    // Keyframes CSS
    const keyframes = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;

    return (
        <>
            <style>{keyframes}</style>
            {!loading && (
            <div className={containerClasses } >
                <div style={spinnerStyle} />
            </div>)}
        </>
    );
};

export default LoadingSpinner;
