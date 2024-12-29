import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Wallet } from "lucide-react";
import { authService } from '../lib/security';
import { SeedPhrase } from './SeedPhrase';
import { validateSeedPhrase, storeSeedPhrase, getSeedPhrase } from '../lib/security/seedPhrase';

export const Login: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [seedPhraseMode, setSeedPhraseMode] = useState<'create' | 'verify'>('create');
  const navigate = useNavigate();

  useEffect(() => {
    if (authService.isAuthenticated()) {
      navigate('/wallet');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const existingSeedPhrase = await getSeedPhrase(password);
      
      if (existingSeedPhrase) {
        // If seed phrase exists, verify it and login
        if (validateSeedPhrase(existingSeedPhrase)) {
          const success = await authService.login(password);
          if (success) {
            navigate('/wallet');
          } else {
            setError('Invalid password');
          }
        } else {
          setError('Invalid seed phrase detected');
        }
      } else {
        // If no seed phrase exists, show seed phrase creation UI
        setShowSeedPhrase(true);
        setSeedPhraseMode('create');
      }
    } catch (err) {
      setError('An error occurred during login');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedPhraseComplete = async (seedPhrase: string) => {
    try {
      setIsLoading(true);
      setError('');

      if (!validateSeedPhrase(seedPhrase)) {
        setError('Invalid seed phrase format');
        return;
      }

      await storeSeedPhrase(seedPhrase, password);
      const success = await authService.login(password);
      
      if (success) {
        navigate('/wallet');
      } else {
        setError('Failed to initialize wallet');
      }
    } catch (err) {
      setError('Failed to store seed phrase');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-darkBg p-2 sm:p-4">
      <Card className="max-w-md mx-auto bg-white dark:bg-darkCard">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <Wallet className="text-brandPurple h-8 w-8" />
            <span className="text-2xl sm:text-3xl dark:text-white">Solvio Wallet</span>
          </CardTitle>
          <CardDescription className="text-center dark:text-gray-400">
            {!showSeedPhrase 
              ? 'Enter your password to access your wallet'
              : seedPhraseMode === 'create'
                ? 'Create your 12-word seed phrase'
                : 'Verify your seed phrase'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showSeedPhrase ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 dark:bg-darkBg/50 dark:text-white dark:border-gray-700"
                autoFocus
              />
              <Button 
                type="submit"
                className="w-full h-12 text-base bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          ) : (
            <SeedPhrase
              mode={seedPhraseMode}
              onComplete={handleSeedPhraseComplete}
            />
          )}
        </CardContent>
        <CardFooter>
          {error && (
            <Alert variant="destructive" className="w-full animate-in fade-in-0 slide-in-from-top-1">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
