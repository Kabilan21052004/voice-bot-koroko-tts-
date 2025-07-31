import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const GoogleAuthComponent: React.FC = () => {
  const { user, isAuthenticated, login, logout } = useAuth();

  const handleSuccess = (credentialResponse: any) => {
    if (credentialResponse.credential) {
      // Decode the JWT token to get user info
      const payload = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
      
      const userData = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      };
      
      login(userData);
    }
  };

  const handleError = () => {
    console.error('Login Failed');
  };

  if (isAuthenticated && user) {
    return (
      <Card className="p-4 bg-gradient-card border-border/50 shadow-card">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.picture} alt={user.name} />
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="flex items-center space-x-1"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-card border-border/50 shadow-card">
      <div className="text-center space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Sign in to continue
          </h3>
          <p className="text-sm text-muted-foreground">
            Please sign in with your Google account to use the voice assistant
          </p>
        </div>
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={handleError}
            useOneTap
            theme="filled_blue"
            size="large"
            text="signin_with"
            shape="rectangular"
          />
        </div>
      </div>
    </Card>
  );
};

export default GoogleAuthComponent; 