import { useState } from "react";
import { Button } from "../ui/button";
import { userSchema, type UserLogin } from "@/types";

interface LoginFormProps {
  onSubmit: (data: UserLogin) => void;
  onRegisterClick: () => void;
}

export function LoginForm({ onSubmit, onRegisterClick }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const data = { email, password };
      const validated = userSchema.parse(data);
      onSubmit(validated);
    } catch (err) {
      setError("Invalid email or password format");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>
        <Button type="submit" className="w-full">
          Login
        </Button>
        <div className="text-center">
          <button
            type="button"
            onClick={onRegisterClick}
            className="text-blue-500 hover:underline"
          >
            Don't have an account? Register
          </button>
        </div>
      </form>
    </div>
  );
}
