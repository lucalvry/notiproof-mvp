import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Signup = () => {
  const { user, signUp } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [websiteName, setWebsiteName] = useState('');
  const [domain, setDomain] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  // Redirect if already authenticated
  if (user) {
    return <Navigate to={from} replace />;
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signUp(email, password, name, { websiteName, domain, businessType });
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Join NotiProof to create social proof notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  minLength={2}
                  required
                />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password (min 6 characters)"
                  required
                  minLength={6}
                />
            </div>
            
            <div className="space-y-4 pt-2 border-t">
              <h3 className="text-lg font-medium">Website Information</h3>
              
              <div>
                <Label htmlFor="websiteName">Website Name</Label>
                <Input
                  id="websiteName"
                  type="text"
                  value={websiteName}
                  onChange={(e) => setWebsiteName(e.target.value)}
                  placeholder="My Awesome Website"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="example.com"
                  required
                />
              </div>
              
              <div>
                <Label>Business Type</Label>
                <Select value={businessType} onValueChange={setBusinessType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your business type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                    <SelectItem value="saas">SaaS</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                    <SelectItem value="events">Events</SelectItem>
                    <SelectItem value="blog">Blog/Content</SelectItem>
                    <SelectItem value="marketing_agency">Marketing Agency</SelectItem>
                    <SelectItem value="ngo">Non-Profit</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/auth/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;