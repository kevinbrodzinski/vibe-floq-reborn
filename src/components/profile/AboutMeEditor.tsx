import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, Plus, Instagram, Twitter, ChevronDown } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';

// Popular interests for the picker
const POPULAR_INTERESTS = [
  'Music', 'Art', 'Technology', 'Sports', 'Travel', 'Food', 'Photography',
  'Gaming', 'Reading', 'Movies', 'Fitness', 'Fashion', 'Design', 'Nature',
  'Coffee', 'Cooking', 'Dancing', 'Writing', 'Yoga', 'Cycling', 'Hiking',
  'Meditation', 'Volunteering', 'Entrepreneurship', 'Learning', 'Networking'
];

const aboutMeSchema = z.object({
  bio: z.string().max(160, 'Bio must be 160 characters or less').optional(),
  interests: z.array(z.string()).max(10, 'Maximum 10 interests allowed'),
  instagram: z.string().optional(),
  twitter: z.string().optional(),
  lens: z.string().optional(),
});

type AboutMeForm = z.infer<typeof aboutMeSchema>;

export function AboutMeEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile(user?.id);
  
  const [isSaving, setIsSaving] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<AboutMeForm>({
    resolver: zodResolver(aboutMeSchema),
    defaultValues: {
      bio: '',
      interests: [],
      instagram: '',
      twitter: '',
      lens: '',
    },
  });

  const watchedBio = watch('bio');
  const watchedInterests = watch('interests');

  // Update character count
  useEffect(() => {
    setCharCount(watchedBio?.length || 0);
  }, [watchedBio]);

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setValue('bio', profile.bio || '');
      setValue('interests', profile.interests || []);
      // TODO: Add social links when added to database schema
    }
  }, [profile, setValue]);

  // Debounced auto-save
  const debouncedFormData = useDebounce(watch(), 1000);
  
  useEffect(() => {
    if (isDirty && profile && debouncedFormData) {
      handleAutoSave(debouncedFormData);
    }
  }, [debouncedFormData, isDirty, profile]);

  const handleAutoSave = async (formData: AboutMeForm) => {
    if (!user?.id || isSaving) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          bio: formData.bio || null,
          interests: formData.interests.length > 0 ? formData.interests : null,
        })
        .eq('id', user.id);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addInterest = (interest: string) => {
    const currentInterests = watchedInterests || [];
    if (!currentInterests.includes(interest) && currentInterests.length < 10) {
      setValue('interests', [...currentInterests, interest], { shouldDirty: true });
    }
  };

  const removeInterest = (interest: string) => {
    const currentInterests = watchedInterests || [];
    setValue('interests', currentInterests.filter(i => i !== interest), { shouldDirty: true });
  };

  const onSubmit = async (data: AboutMeForm) => {
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          bio: data.bio || null,
          interests: data.interests.length > 0 ? data.interests : null,
        })
        .eq('id', user.id);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      
      toast({
        title: "Profile updated",
        description: "Your about me section has been saved.",
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        title: "Update failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Bio Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="bio">Bio</Label>
          <span className={`text-xs ${charCount > 160 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {charCount}/160
          </span>
        </div>
        <Textarea
          id="bio"
          placeholder="Tell people about yourself..."
          className="min-h-[80px] resize-none"
          {...register('bio')}
        />
        {errors.bio && (
          <p className="text-xs text-destructive">{errors.bio.message}</p>
        )}
      </div>

      {/* Interests Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Interests</Label>
          <span className="text-xs text-muted-foreground">
            {watchedInterests?.length || 0}/10
          </span>
        </div>
        
        {/* Interest Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-between" disabled={watchedInterests?.length >= 10}>
              Add an interest...
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput placeholder="Search interests..." />
              <CommandList>
                <CommandEmpty>No interests found.</CommandEmpty>
                <CommandGroup>
                  {POPULAR_INTERESTS
                    .filter(interest => !watchedInterests?.includes(interest))
                    .map((interest) => (
                      <CommandItem
                        key={interest}
                        onSelect={() => addInterest(interest)}
                      >
                        {interest}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {/* Selected Interests */}
        {watchedInterests && watchedInterests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {watchedInterests.map((interest) => (
              <Badge key={interest} variant="secondary" className="pr-1">
                {interest}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 hover:bg-destructive/20"
                  onClick={() => removeInterest(interest)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
        
        {errors.interests && (
          <p className="text-xs text-destructive">{errors.interests.message}</p>
        )}
      </div>

      {/* Social Links Section */}
      <div className="space-y-4">
        <Label>Social Links</Label>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Instagram className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Instagram username"
              {...register('instagram')}
              className="flex-1"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Twitter className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="X (Twitter) username"
              {...register('twitter')}
              className="flex-1"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center">
              <span className="text-xs font-bold text-white">L</span>
            </div>
            <Input
              placeholder="Lens handle"
              {...register('lens')}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Save Status */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {isSaving ? 'Saving...' : isDirty ? 'Auto-saving in 1 second...' : 'All changes saved'}
        </div>
        
        <Button type="submit" disabled={isSaving || !isDirty} size="sm">
          Save Changes
        </Button>
      </div>
    </form>
  );
}