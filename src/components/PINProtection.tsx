import React, { useState, useEffect } from 'react';
import { Card } from '../ui';

interface PINProtectionProps {
  children: React.ReactNode;
  correctPIN?: string;
}

const PINProtection: React.FC<PINProtectionProps> = ({
  children,
  correctPIN = '0312'
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if already unlocked in this session
    const sessionUnlocked = sessionStorage.getItem('admin_unlocked');
    if (sessionUnlocked === 'true') {
      setIsUnlocked(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === correctPIN) {
      setIsUnlocked(true);
      sessionStorage.setItem('admin_unlocked', 'true');
      setError('');
    } else {
      setError('Falsche PIN. Bitte erneut versuchen.');
      setPin('');
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);
    setError('');
  };

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card>
        <div className="w-96 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Admin-Bereich
            </h1>
            <p className="text-sm text-slate-600">
              Bitte geben Sie die 4-stellige PIN ein
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={handlePinChange}
                placeholder="••••"
                autoFocus
                className="w-full text-center text-3xl font-mono tracking-widest border-2 border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 text-center bg-red-50 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={pin.length !== 4}
              className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              Entsperren
            </button>
          </form>

          <div className="text-center">
            <a
              href="/projects"
              className="text-sm text-blue-600 hover:underline"
            >
              Zurück zum Dashboard
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PINProtection;
