interface LogoProps {
  className?: string;
  variant?: 'default' | 'admin';
}

export const Logo = ({ className = "", variant = 'default' }: LogoProps) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src="/lovable-uploads/52fd160a-f892-4bca-b76d-1f7ca7c2cf97.png" 
        alt="NotiProof" 
        className="h-8 w-auto"
      />
      {variant === 'admin' && (
        <span className="text-sm font-medium text-destructive">Admin Panel</span>
      )}
    </div>
  );
};