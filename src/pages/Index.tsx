import VoiceBot from '@/components/VoiceBot';
import GoogleAuthComponent from '@/components/GoogleLogin';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* Authentication Component */}
      <div className="mb-8 w-full max-w-md">
        <GoogleAuthComponent />
      </div>

      {/* Voice Bot - Only show if authenticated */}
      {isAuthenticated && <VoiceBot />}
    </div>
  );
};

export default Index;
