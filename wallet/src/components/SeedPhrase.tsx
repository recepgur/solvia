import React, { useState } from 'react';
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { AlertCircle } from "lucide-react";
import { generateSeedPhrase, validateSeedPhrase } from '../lib/security/seedPhrase';

interface SeedPhraseProps {
  onComplete: (seedPhrase: string) => void;
  mode: 'create' | 'verify';
  existingSeedPhrase?: string;
}

export const SeedPhrase: React.FC<SeedPhraseProps> = ({ onComplete, mode, existingSeedPhrase }) => {
  const [seedPhrase, setSeedPhrase] = useState<string>(mode === 'create' ? generateSeedPhrase() : '');
  const [inputPhrase, setInputPhrase] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(seedPhrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputPhrase(e.target.value);
    setError('');
  };

  const handleVerify = () => {
    const phraseToVerify = mode === 'verify' ? inputPhrase : seedPhrase;
    
    if (!validateSeedPhrase(phraseToVerify)) {
      setError('Invalid seed phrase format');
      return;
    }

    if (mode === 'verify' && phraseToVerify !== existingSeedPhrase) {
      setError('Seed phrase does not match');
      return;
    }

    onComplete(phraseToVerify);
  };

  const words = seedPhrase.split(' ');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {words.map((word, index) => (
          <div key={index} className="p-2 bg-gray-100 dark:bg-darkBg rounded-md">
            <span className="text-gray-500 mr-2">{index + 1}.</span>
            <span className="text-gray-900 dark:text-white">{word}</span>
          </div>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {mode === 'create' && !confirmed && (
        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              Please write down these 12 words in order and keep them safe. 
              You will need them to recover your wallet.
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button 
              onClick={copyToClipboard}
              variant="outline"
              className="flex-1"
            >
              {copied ? 'Copied!' : 'Copy Seed Phrase'}
            </Button>
            <Button 
              onClick={() => {
                setSeedPhrase(generateSeedPhrase());
                setCopied(false);
              }}
              variant="outline"
              className="flex-1"
            >
              Generate New
            </Button>
          </div>
          <Button 
            onClick={() => setConfirmed(true)}
            className="w-full"
          >
            I have written down my seed phrase
          </Button>
        </div>
      )}

      {mode === 'verify' && (
        <div className="space-y-4">
          <textarea
            className="w-full p-2 border rounded-md bg-gray-100 dark:bg-darkBg"
            placeholder="Enter your seed phrase..."
            value={inputPhrase}
            onChange={handleInputChange}
            rows={3}
          />
          <Button 
            onClick={handleVerify}
            className="w-full"
          >
            Verify Seed Phrase
          </Button>
        </div>
      )}
      
      {mode === 'create' && confirmed && (
        <Button 
          onClick={handleVerify}
          className="w-full"
        >
          Continue
        </Button>
      )}
    </div>
  );
};

export default SeedPhrase;
