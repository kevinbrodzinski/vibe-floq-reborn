import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import { Loader2, Check, X } from 'lucide-react';
import { debounce } from 'lodash-es';

export default function UsernameSettings() {
  const { profile } = useCurrentProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [value, setValue] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  // Initialize with current username
  useEffect(() => {
    if (profile?.username) {
      setValue(profile.username);
    }
  }, [profile?.username]);

  // Update username mutation
  const mutation = useMutation({
    mutationFn: async (newName: string) => {
      const { data, error } = await supabase
        .rpc('update_username', { p_username: newName });
      
      console.debug('RPC result', data);
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Username update failed');
      
      return data.username as string;
    },
    onSuccess: (newUsername) => {
      toast({
        title: "Username updated!",
        description: `@${newUsername} is now yours`,
      });
      queryClient.invalidateQueries({ queryKey: ['profile', profile?.id] });
      setValue(newUsername);
      setIsAvailable(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update username",
        description: error.message || "Please try a different username",
        variant: "destructive",
      });
    }
  });

  // Check availability
  const checkAvailability = debounce(async (candidate: string) => {
    if (candidate.length < 3 || candidate === profile?.username) {
      setIsAvailable(null);
      return;
    }
    
    // Validate format
    if (!/^[a-z0-9_]{3,32}$/.test(candidate.toLowerCase())) {
      setIsAvailable(false);
      return;
    }

    setIsCheckingAvailability(true);
    try {
      const { data, error } = await supabase
        .rpc('username_available', { username: candidate.toLowerCase() });
      
      if (error) throw error;
      
      setIsAvailable(data); // username_available returns true if available
    } catch (error) {
      setIsAvailable(false);
    } finally {
      setIsCheckingAvailability(false);
    }
  }, 350);

  // Handle input change
  const handleChange = (newValue: string) => {
    setValue(newValue);
    checkAvailability(newValue.toLowerCase());
  };

  const canUpdate = value !== profile?.username && 
                   isAvailable === true && 
                   !mutation.isPending &&
                   value.length >= 3;

  const ValidationIcon = () => {
    if (value === profile?.username) return null;
    if (isCheckingAvailability) return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
    if (isAvailable === true) return <Check className="w-4 h-4 text-green-600" />;
    if (isAvailable === false) return <X className="w-4 h-4 text-destructive" />;
    return null;
  };

  const getValidationMessage = () => {
    if (value === profile?.username) return 'This is your current username';
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (!/^[a-z0-9_]{3,32}$/.test(value.toLowerCase())) return 'Username can only contain letters, numbers, and underscores';
    if (isCheckingAvailability) return 'Checking availability...';
    if (isAvailable === true) return 'Username is available!';
    if (isAvailable === false) return 'Username is already taken';
    return '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Username</CardTitle>
        <CardDescription>
          Choose a unique username that others can find you by. You can change this anytime.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              @
            </div>
            <Input
              id="username"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="your_username"
              className="pl-8 pr-10"
              maxLength={32}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <ValidationIcon />
            </div>
          </div>
          
          <p className={`text-sm ${
            isAvailable === true ? 'text-green-600' : 
            isAvailable === false ? 'text-destructive' : 
            'text-muted-foreground'
          }`}>
            {getValidationMessage()}
          </p>
          
          {value && value !== value.toLowerCase() && (
            <p className="text-xs text-muted-foreground">
              Will be stored as: <span className="font-mono">@{value.toLowerCase()}</span>
            </p>
          )}
        </div>

        <Button
          disabled={!canUpdate}
          onClick={() => mutation.mutate(value.toLowerCase())}
          className="w-full"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            'Update Username'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}