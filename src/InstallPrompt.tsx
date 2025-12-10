import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Listen for the install prompt event
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            const promptEvent = e as BeforeInstallPromptEvent;
            setDeferredPrompt(promptEvent);

            // Check if user has dismissed before (stored in localStorage)
            const dismissed = localStorage.getItem('installPromptDismissed');
            if (!dismissed) {
                setShowPrompt(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Detect if app was installed
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowPrompt(false);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }

        // Clear the deferredPrompt
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('installPromptDismissed', 'true');
    };

    // Don't show if already installed or prompt not available
    if (isInstalled || !showPrompt || !deferredPrompt) {
        return null;
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            maxWidth: '90%',
            width: '420px'
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #800000 0%, #990000 100%)',
                color: '#FFF8E7',
                padding: '16px 20px',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                animation: 'slideUp 0.3s ease-out'
            }}>
                <style>
                    {`
                        @keyframes slideUp {
                            from {
                                transform: translateY(100px);
                                opacity: 0;
                            }
                            to {
                                transform: translateY(0);
                                opacity: 1;
                            }
                        }
                    `}
                </style>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '32px' }}>📱</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
                            Install Calculator App
                        </div>
                        <div style={{ fontSize: '13px', opacity: 0.9 }}>
                            Use offline, faster access from your home screen
                        </div>
                    </div>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '10px',
                    marginTop: '4px'
                }}>
                    <button
                        onClick={handleInstallClick}
                        style={{
                            flex: 1,
                            background: '#D4AF37',
                            color: '#222',
                            border: 'none',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#A67C00'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#D4AF37'}
                    >
                        Install Now
                    </button>
                    <button
                        onClick={handleDismiss}
                        style={{
                            background: 'transparent',
                            color: '#FFF8E7',
                            border: '1px solid rgba(255, 248, 231, 0.5)',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 248, 231, 0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        Later
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstallPrompt;
