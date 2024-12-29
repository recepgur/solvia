import { useState, useEffect } from 'react';
import { authService } from './lib/security';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Send, History, Settings, Loader2 } from "lucide-react";
import { getPublicKey } from './lib/solanaWallet';
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Keypair } from '@solana/web3.js';
import { ChainType, getChainWallet, getTokenSymbol } from './lib/chains';
import { Login } from './components/Login';
import { TokenManager } from './components/TokenManager';
import { ThemeProvider } from './components/ui/theme-provider';
import { ThemeToggle } from './components/ui/theme-toggle';

interface ChainWallet {
  address?: string;
  publicKey?: string;
  privateKey?: string;
}

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  return <>{children}</>;
};

function App() {
  const { toast } = useToast();
  const [selectedChain, setSelectedChain] = useState<ChainType>("solana");
  const [wallet, setWallet] = useState<ChainWallet | Keypair | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleChainChange = (chain: ChainType) => {
    setSelectedChain(chain);
    setWallet(null);
    setBalance(0);
    setRecipient("");
    setAmount("");
    setError("");
    setSuccess("");
  };

  const createNewWallet = async () => {
    try {
      const chainWallet = getChainWallet(selectedChain);
      const newWallet = await chainWallet.createWallet();
      setWallet(newWallet);
      setError("");
      setSuccess("New wallet created successfully!");
    } catch (error) {
      if (error instanceof Error && error.message.includes("not implemented")) {
        setError(`${selectedChain.toUpperCase()} wallet creation not implemented yet`);
      } else {
        setError("Failed to create wallet");
      }
      setSuccess("");
      console.error("Wallet creation error:", error);
    }
  };

  const checkBalance = async () => {
    if (!wallet) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please create a wallet first",
        className: "bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800",
      });
      return;
    }

    try {
      setIsRefreshing(true);
      const chainWallet = getChainWallet(selectedChain);
      const address = selectedChain === "solana" ? 
        getPublicKey(wallet as Keypair) : 
        (wallet as ChainWallet).address || "";
      const balance = await chainWallet.getBalance(address);
      setBalance(balance);
      setError("");
    } catch (error) {
      if (error instanceof Error && error.message.includes("not implemented")) {
        setError(`${selectedChain.toUpperCase()} balance check not implemented yet`);
      } else {
        setError("Failed to fetch balance");
      }
      console.error("Balance check error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
        className: "bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    if (success) {
      toast({
        title: "Success",
        description: success,
        className: "bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800",
      });
    }
  }, [success, toast]);

  const handleSend = async () => {
    if (!wallet) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please create a wallet first",
        className: "bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800",
      });
      return;
    }

    const chainWallet = getChainWallet(selectedChain);
    if (!chainWallet.validateAddress(recipient)) {
      setError(`Invalid ${selectedChain} address`);
      return;
    }

    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid amount",
        className: "bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800",
      });
      return;
    }

    try {
      setIsLoading(true);
      const txHash = await chainWallet.sendTransaction(recipient, Number(amount));
      setSuccess(`Transaction successful! Hash: ${txHash}`);
      setError("");
      // Refresh balance
      await checkBalance();
      // Reset form
      setRecipient("");
      setAmount("");
    } catch (error) {
      if (error instanceof Error && error.message.includes("not implemented")) {
        setError(`${selectedChain.toUpperCase()} transactions not implemented yet`);
      } else {
        setError(`Failed to send ${getTokenSymbol(selectedChain)}`);
      }
      setSuccess("");
      console.error("Send transaction error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemeProvider defaultTheme="dark">
      <Toaster />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/wallet" />} />
          <Route
            path="/wallet"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800 p-2 sm:p-4 transition-all duration-300">
                  <div className="fixed top-0 right-4 mt-4 z-50">
                    <ThemeToggle />
                  </div>
                  <Card className="max-w-md mx-auto bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 animate-in fade-in-50 slide-in-from-bottom-8">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 sm:gap-2 dark:text-white">
            <div className="flex items-center gap-2">
              <Wallet className="text-brandPurple h-6 w-6" />
              <span className="text-xl sm:text-2xl">Solvio Wallet</span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-end items-center">
              <Select value={selectedChain} onValueChange={(value: ChainType) => handleChainChange(value)}>
                <SelectTrigger className="w-[120px] dark:border-gray-700 dark:bg-darkBg/50">
                  <SelectValue placeholder="Select chain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solana">Solana</SelectItem>
                  <SelectItem value="ethereum">Ethereum</SelectItem>
                  <SelectItem value="bitcoin">Bitcoin</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="dark:text-gray-400 dark:hover:text-white dark:hover:bg-darkBg/50">
                <History className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="dark:text-gray-400 dark:hover:text-white dark:hover:bg-darkBg/50"
                onClick={() => {
                  authService.logout();
                  window.location.href = '/login';
                }}
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </CardTitle>
          <CardDescription className="dark:text-gray-400">
            Manage your {selectedChain === "solana" ? "SOLV" : selectedChain === "ethereum" ? "ETH" : "BTC"} tokens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TokenManager />
          <div className="space-y-4 mt-6">
            {!wallet ? (
              <Button 
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                onClick={createNewWallet}
              >
                Create New Wallet
              </Button>
            ) : (
              <>
                <div className="p-4 bg-gray-50 dark:bg-darkBg/50 rounded-lg">
                  <p className="text-sm font-medium dark:text-gray-300">Wallet Address:</p>
                  <p className="text-xs break-all dark:text-gray-400">
                    {selectedChain === "solana" ? 
                      getPublicKey(wallet as Keypair) : 
                      (wallet as ChainWallet).address}
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <p className="text-lg font-semibold dark:text-white">
                    Balance: {balance} {getTokenSymbol(selectedChain)}
                  </p>
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
                    className="w-full h-12 sm:h-10 text-base bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                    onClick={() => setIsConfirmDialogOpen(true)}
                    disabled={isLoading}
                  >
                    <span className="flex items-center">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 sm:h-4 sm:w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-5 w-5 sm:h-4 sm:w-4" />
                          Send {getTokenSymbol(selectedChain)}
                        </>
                      )}
                    </span>
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {/* Toast notifications are now handled via useEffect */}
        </CardFooter>
      </Card>
              </div>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/wallet" />} />
      </Routes>

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="dark:bg-darkCard backdrop-blur-sm bg-white/90 dark:bg-gray-800/90">
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
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
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
    </Router>
    </ThemeProvider>
  );
}

export default App;
