import { FloqApp } from "@/components/FloqApp";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { useAuth } from "@/providers/AuthProvider";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <FloqApp />;
};

export default Index;
