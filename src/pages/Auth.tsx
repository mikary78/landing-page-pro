import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthForm } from '@/components/AuthForm';
import { useAuth } from '@/hooks/useAuth';

const Auth = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = (email: string, password: string, displayName?: string) => {
    if (mode === 'signin') {
      signIn(email, password);
    } else {
      signUp(email, password, displayName);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <AuthForm
        mode={mode}
        onSubmit={handleSubmit}
        onGoogleSignIn={signInWithGoogle}
        onToggleMode={toggleMode}
      />
    </div>
  );
};

export default Auth;
