import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Wallet, Send, AlertCircle, History, Settings, Loader2 } from "lucide-react";
import { getSolvioBalance, sendSolvioToken, isValidSolanaAddress, createWallet, getPublicKey } from './lib/solanaWallet';
import { Keypair } from '@solana/web3.js';

function App() {
  const [wallet, setWallet] = useState<Keypair | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const createNewWallet = () => {
    try {
      const newWallet = createWallet();
      setWallet(newWallet);
      setError("");
      setSuccess("New wallet created successfully!");
    } catch {
      setError("Failed to create wallet");
      setSuccess("");
    }
  };

  const checkBalance = async () => {
    if (!wallet) {
      setError("Please create a wallet first");
      return;
    }

    try {
      setIsRefreshing(true);
      const mintAddress = "7bsVvXbR3524sgms6zjCF2BN3vHxuLePfb5CrqrPt4MQ";
      const balance = await getSolvioBalance(getPublicKey(wallet), mintAddress);
      setBalance(balance);
      setError("");
    } catch {
      setError("Failed to fetch balance");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSend = async () => {
    if (!wallet) {
      setError("Please create a wallet first");
      return;
    }

    if (!isValidSolanaAddress(recipient)) {
      setError("Invalid recipient address");
      return;
    }

    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Invalid amount");
      return;
    }

    try {
      setIsLoading(true);
      const mintAddress = "7bsVvXbR3524sgms6zjCF2BN3vHxuLePfb5CrqrPt4MQ";
      const signature = await sendSolvioToken(wallet, recipient, Number(amount), mintAddress);
      setSuccess(`Transaction successful! Signature: ${signature}`);
      setError("");
      // Refresh balance
      await checkBalance();
      // Reset form
      setRecipient("");
      setAmount("");
    } catch {
      setError("Failed to send tokens");
      setSuccess("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-darkBg p-2 sm:p-4">
      <Card className="max-w-md mx-auto bg-white dark:bg-darkCard">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 sm:gap-2 dark:text-white">
            <div className="flex items-center gap-2">
              <Wallet className="text-brandPurple h-6 w-6" />
              <span className="text-xl sm:text-2xl">Solvio Wallet</span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button variant="ghost" size="icon" className="dark:text-gray-400 dark:hover:text-white dark:hover:bg-darkBg/50">
                <History className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="dark:text-gray-400 dark:hover:text-white dark:hover:bg-darkBg/50">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </CardTitle>
          <CardDescription className="dark:text-gray-400">
            Manage your SOLV tokens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!wallet ? (
              <Button 
                className="w-full bg-brandPurple hover:bg-brandPurple/90"
                onClick={createNewWallet}
              >
                Create New Wallet
              </Button>
            ) : (
              <>
                <div className="p-4 bg-gray-50 dark:bg-darkBg/50 rounded-lg">
                  <p className="text-sm font-medium dark:text-gray-300">Wallet Address:</p>
                  <p className="text-xs break-all dark:text-gray-400">{getPublicKey(wallet)}</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <p className="text-lg font-semibold dark:text-white">Balance: {balance} SOLV</p>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={checkBalance}
                    disabled={isRefreshing}
                    className="w-full sm:w-auto dark:border-gray-700 dark:text-gray-300 dark:hover:bg-darkCard/80 transition-colors"
                  >
                    {isRefreshing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Refreshing
                      </>
                    ) : (
                      "Refresh"
                    )}
                  </Button>
                </div>

                <div className="space-y-3 sm:space-y-2">
                  <Input
                    placeholder="Recipient Address"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="h-12 sm:h-10 dark:bg-darkBg/50 dark:text-white dark:border-gray-700"
                  />
                  <Input
                    placeholder="Amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-12 sm:h-10 dark:bg-darkBg/50 dark:text-white dark:border-gray-700"
                  />
                  <Button 
                    className="w-full h-12 sm:h-10 text-base bg-brandPurple hover:bg-brandPurple/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    onClick={() => setIsConfirmDialogOpen(true)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 sm:h-4 sm:w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-5 w-5 sm:h-4 sm:w-4" />
                        Send SOLV
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {error && (
            <Alert variant="destructive" className="animate-in fade-in-0 slide-in-from-top-1">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="animate-in fade-in-0 slide-in-from-top-1">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </CardFooter>
      </Card>

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="dark:bg-darkCard">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Confirm Transaction</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              You are about to send {amount} SOLV tokens to:
              <div className="mt-2 p-2 bg-gray-50 dark:bg-darkBg/50 rounded break-all text-xs">
                {recipient}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmDialogOpen(false)}
              className="dark:border-gray-700 dark:text-gray-300"
            >
              Cancel
            </Button>
            <Button
              className="bg-brandPurple hover:bg-brandPurple/90"
              onClick={() => {
                setIsConfirmDialogOpen(false);
                handleSend();
              }}
            >
              Confirm Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
