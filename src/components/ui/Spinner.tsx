import { Loader2 } from "lucide-react";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-6 h-6",
};

export function Spinner({ className = "", size = "md" }: SpinnerProps) {
  const sizeClass = sizeClasses[size] || "w-4 h-4";
  return <Loader2 className={`animate-spin ${sizeClass} ${className}`.trim()} />;
}
