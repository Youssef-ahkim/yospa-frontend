import { Loader2 } from "lucide-react";

interface SpinnerProps {
  className?: string;
}

export function Spinner({ className = "w-4 h-4" }: SpinnerProps) {
  return <Loader2 className={`animate-spin ${className}`} />;
}
