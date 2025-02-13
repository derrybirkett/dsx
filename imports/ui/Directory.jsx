import React from 'react';
import { Text, Card, Flex, Grid, Avatar, Link } from '@radix-ui/themes';
import { GitHubLogoIcon, PersonIcon, HomeIcon } from '@radix-ui/react-icons';
import { useTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { UserProfiles } from '../api/userProfiles';

export const Directory = ({ onSelectDeveloper }) => {
  const { profiles, users, isLoading } = useTracker(() => {
    console.log('Setting up Directory subscription');
    
    try {
      // Create a stable subscription
      const handle = Meteor.subscribe('allUserProfiles');
      
      if (!handle.ready()) {
        console.log('Subscription not ready');
        return { profiles: [], users: [], isLoading: true };
      }

      console.log('Subscription ready, fetching data');
      
      // Create stable cursors
      const profilesCursor = UserProfiles.find({}, { 
        sort: { updatedAt: -1 },
        fields: {
          userId: 1,
          bio: 1,
          location: 1,
          company: 1,
          githubUsername: 1,
          githubUrl: 1
        }
      });
      
      const usersCursor = Meteor.users.find({}, {
        fields: {
          'profile': 1,
          'services.github.username': 1,
          'services.github.avatar_url': 1
        }
      });
      
      // Fetch the data
      const profiles = profilesCursor.fetch();
      const users = usersCursor.fetch();
      
      console.log('Data fetched:', {
        profilesCount: profiles.length,
        usersCount: users.length,
        sampleProfile: profiles[0] ? { 
          id: profiles[0].userId,
          username: profiles[0].githubUsername 
        } : null,
        profileIds: profiles.map(p => p.userId),
        userIds: users.map(u => u._id)
      });
      
      return {
        profiles,
        users,
        isLoading: false
      };
    } catch (error) {
      console.error('Error in Directory subscription:', error);
      return { profiles: [], users: [], isLoading: false };
    }
  }, []);

  // Debug logging
  React.useEffect(() => {
    console.log('Directory component state:', {
      profilesCount: profiles?.length || 0,
      usersCount: users?.length || 0,
      isLoading,
      profileIds: profiles?.map(p => p.userId),
      userIds: users?.map(u => u._id)
    });
  }, [profiles, users, isLoading]);

  if (isLoading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <Text size="3">Loading directory...</Text>
      </Flex>
    );
  }

  if (!profiles?.length) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <Text size="3">No profiles found. Be the first to join!</Text>
      </Flex>
    );
  }

  const cardStyle = {
    padding: '32px',
    backgroundColor: 'var(--gray-2)',
    color: 'var(--gray-12)',
    transition: 'all 0.2s ease-in-out',
    cursor: 'pointer',
    ':hover': {
      transform: 'translateY(-2px)',
      backgroundColor: 'var(--gray-3)'
    }
  };

  // Create a map of users by ID for easier lookup
  const userMap = new Map(users.map(user => [user._id, user]));

  const getAvatarUrl = (user, profile) => {
    if (!user) return `https://github.com/${profile.githubUsername}.png`;
    
    // Debug logging for avatar resolution
    console.log('Resolving avatar for user:', {
      userId: user._id,
      githubUsername: profile.githubUsername,
      hasGithubService: !!user.services?.github,
      hasProfile: !!user.profile
    });

    return user.services?.github?.avatar_url || // GitHub service avatar
           user.profile?.avatar || // Profile avatar
           `https://github.com/${profile.githubUsername}.png`; // Fallback to GitHub default avatar
  };

  return (
    <Flex direction="column" gap="6" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <Text size="8" weight="bold" align="center">Developer Directory</Text>
      
      <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="4">
        {profiles.map(profile => {
          const user = userMap.get(profile.userId);
          const avatarUrl = getAvatarUrl(user, profile);
          
          return (
            <Card 
              key={profile.userId} 
              style={cardStyle}
              onClick={() => onSelectDeveloper(profile.userId)}
            >
              <Flex direction="column" gap="3">
                <Flex gap="3" align="center">
                  <Avatar 
                    size="5" 
                    src={avatarUrl}
                    fallback={user?.profile?.name?.[0] || profile.githubUsername?.[0] || 'U'} 
                    radius="full"
                  />
                  <Flex direction="column">
                    <Text size="4" weight="bold">{user?.profile?.name || profile.githubUsername}</Text>
                    {profile.githubUsername && (
                      <Link 
                        size="2" 
                        href={profile.githubUrl} 
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Flex gap="1" align="center">
                          <GitHubLogoIcon />
                          @{profile.githubUsername}
                        </Flex>
                      </Link>
                    )}
                  </Flex>
                </Flex>

                <Text size="2" style={{ minHeight: '3em' }}>
                  {profile.bio || 'No bio available'}
                </Text>

                <Grid columns="2" gap="3">
                  <Flex align="center" gap="1">
                    <HomeIcon />
                    <Text size="2">{profile.location || 'Location'}</Text>
                  </Flex>
                  <Flex align="center" gap="1">
                    <PersonIcon />
                    <Text size="2">{profile.company || 'Company'}</Text>
                  </Flex>
                </Grid>
              </Flex>
            </Card>
          );
        })}
      </Grid>
    </Flex>
  );
}; 