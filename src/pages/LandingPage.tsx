import React from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, MapPin, Users, Calendar, ArrowRight, Zap, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-6 text-center"
  >
    <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-primary flex items-center justify-center">
      {icon}
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
  </motion.div>
);

export default function LandingPage() {
  const { user, loading } = useAuth();

  // Redirect authenticated users to floqs
  if (!loading && user) {
    return <Navigate to="/floqs" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-field flex items-center justify-center">
        <div className="animate-pulse">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-field text-foreground overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-gradient-vibe opacity-20" />
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary shadow-glow-primary flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent leading-tight">
              Connect in the Moment
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Real-time social coordination that brings people together through shared experiences and spontaneous connections.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Button size="lg" className="group px-8 py-3 text-lg">
                Get Started
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
                Learn More
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-4 h-4 bg-primary/20 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.2, 0.8, 0.2],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Discover, connect, and coordinate with your circle in real-time
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<MapPin className="w-6 h-6 text-primary-foreground" />}
              title="Live Location Sharing"
              description="See where your friends are and coordinate spontaneous meetups with privacy controls you can trust."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6 text-primary-foreground" />}
              title="Floqs & Groups"
              description="Create circles for different contexts - work friends, college buddies, family, or special events."
            />
            <FeatureCard
              icon={<Calendar className="w-6 h-6 text-primary-foreground" />}
              title="Smart Planning"
              description="AI-powered suggestions for meetups based on everyone's location, schedule, and preferences."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6 text-primary-foreground" />}
              title="Rally System"
              description="Start instant rallies to gather your crew for spontaneous adventures and shared experiences."
            />
            <FeatureCard
              icon={<Heart className="w-6 h-6 text-primary-foreground" />}
              title="Vibe Matching"
              description="Share your current mood and energy to find friends who are on the same wavelength."
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6 text-primary-foreground" />}
              title="Moments"
              description="Capture and share special moments that build lasting memories with your community."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center space-y-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold">Ready to Connect?</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Join the future of social coordination and never miss a moment with your friends again.
          </p>
          <Button size="lg" className="px-12 py-4 text-lg">
            Start Your Journey
            <Sparkles className="ml-2 w-5 h-5" />
          </Button>
        </motion.div>
      </section>
    </div>
  );
}