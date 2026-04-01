import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AdminAuthProps {
  onSuccess: () => void;
}

export function AdminAuth({ onSuccess }: AdminAuthProps) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/verify", { pin });
      onSuccess();
    } catch {
      toast({ title: "Incorrect PIN", variant: "destructive" });
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="text-lg" data-testid="text-auth-title">Admin Access</CardTitle>
          <CardDescription>Enter your PIN to manage listings</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="text-center text-lg tracking-widest"
              maxLength={10}
              data-testid="input-pin"
            />
            <Button type="submit" className="w-full" disabled={loading || !pin} data-testid="button-login">
              {loading ? "Verifying..." : "Enter"}
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  );
}
