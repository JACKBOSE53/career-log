import { useState, useEffect } from 'react';
import { subscribeToUserProfile, type UserProfile } from '../db/firestore';
import { getUserById } from '../db/store';

export function useUserProfile(uid: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(!!uid);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToUserProfile(uid, (data) => {
      if (data) {
        setProfile(data);
      } else {
        const mockUser = getUserById(uid);
        if (mockUser) {
          setProfile({
            id: mockUser.id,
            name: mockUser.name,
            email: mockUser.email || '',
            university: mockUser.university || '',
            grade: mockUser.grade || '26卒',
            avatar: mockUser.avatar,
            targetIndustry: '',
            bio: '',
            profileVisibility: 'public',
            followersCount: mockUser.followersCount || 0,
            followingCount: mockUser.followingCount || 0,
            joinedAt: new Date(),
          });
        } else {
          setProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  return { profile, loading, error };
}

