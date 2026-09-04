import { useState, useEffect } from 'react';
import { subscribeToUserProfile, subscribeToPublicProfile, type UserProfile } from '../db/firestore';
import { getUserById } from '../db/store';

/**
 * @param isSelf 本人のプロフィールかどうか。true なら users + publicProfiles を
 *   結合した完全な情報（email含む）を、false なら publicProfiles のみを購読する。
 */
export function useUserProfile(uid: string | undefined, isSelf: boolean = false) {
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
    const subscribe = isSelf ? subscribeToUserProfile : subscribeToPublicProfile;
    const unsubscribe = subscribe(uid, (data) => {
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
  }, [uid, isSelf]);

  return { profile, loading, error };
}

