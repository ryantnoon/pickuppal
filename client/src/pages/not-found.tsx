import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PackageOpen } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center space-y-4">
        <PackageOpen className="w-12 h-12 text-muted-foreground mx-auto" />
        <h1 className="text-xl font-semibold" data-testid="text-not-found">Page not found</h1>
        <p className="text-muted-foreground max-w-xs mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button asChild data-testid="link-home">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
