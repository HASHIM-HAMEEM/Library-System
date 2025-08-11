import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const LoadingSpinner = ({ size = 'md', text = 'Loading...' }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-black">
      <Loader2 className={`animate-spin ${sizeClasses[size]} text-gray-900 dark:text-white`} />
      <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">{text}</p>
    </div>
  );
};

export default LoadingSpinner;