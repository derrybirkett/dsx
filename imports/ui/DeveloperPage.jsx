import React from 'react';
import { useTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { UserProfiles } from '../api/userProfiles';
import { Theme, Button, Text, Container, Flex, Heading, Card, Box, Grid, Avatar, Link } from '@radix-ui/themes';
import { GitHubLogoIcon, PersonIcon, HomeIcon, CodeIcon, ActivityLogIcon, ReloadIcon } from '@radix-ui/react-icons';

export const DeveloperPage = ({ userId }) => {
  const [timeoutError, setTimeoutError] = React.useState(false);

  const { profile, user, isLoading, error } = useTracker(() => {
    console.log('Setting up DeveloperPage subscriptions for userId:', userId);

    const handles = [
      Meteor.subscribe('userProfile', userId),
      Meteor.subscribe('userData', userId)
    ];

    // Log subscription status
    handles.forEach((handle, index) => {
      console.log(`Subscription ${index + 1} ready:`, handle.ready());
    });

    const isLoading = !handles.every(handle => handle.ready());

    if (isLoading) {
      console.log('DeveloperPage subscriptions still loading');
      return { profile: null, user: null, isLoading: true };
    }

    console.log('DeveloperPage subscriptions ready, fetching data');

    const profile = UserProfiles.findOne({ userId });
    const user = Meteor.users.findOne(userId);

    console.log('DeveloperPage data fetched:', {
      hasProfile: !!profile,
      hasUser: !!user,
      profileId: profile?.userId,
      username: profile?.githubUsername
    });

    return {
      profile,
      user,
      isLoading: false
    };
  }, [userId]);

  // Reset timeout when userId changes
  React.useEffect(() => {
    setTimeoutError(false);
    const timeoutId = setTimeout(() => {
      setTimeoutError(true);
    }, 120000); // 2 minutes

    return () => clearTimeout(timeoutId);
  }, [userId]);

  if (timeoutError) {
    return (
      <Container size="2">
        <Card style={{ padding: '32px', textAlign: 'center' }}>
          <Flex direction="column" gap="4" align="center">
            <Heading size="5">Profile Not Found</Heading>
            <Text size="2" color="gray">The profile took too long to load or doesn't exist.</Text>
          </Flex>
        </Card>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <Flex direction="column" gap="4" align="center">
          <ReloadIcon className="spin" width="32" height="32" style={{
            animation: 'spin 1s linear infinite',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' }
            }
          }} />
          <Text size="2" color="gray">Loading profile...</Text>
        </Flex>
      </Flex>
    );
  }

  if (!profile) {
    return (
      <Container size="2">
        <Card style={{ padding: '32px', textAlign: 'center' }}>
          <Flex direction="column" gap="4" align="center">
            <Heading size="5">Profile Not Found</Heading>
            <Text size="2" color="gray">This developer profile doesn't exist or has been removed.</Text>
          </Flex>
        </Card>
      </Container>
    );
  }

  const getAvatarUrl = () => {
    return user?.services?.github?.avatar_url || 
           user?.profile?.avatar || 
           `https://github.com/${profile.githubUsername}.png`;
  };

  return (
    <Container size="3">
      <Flex direction="column" gap="6">
        {/* Header Section */}
        <Card style={{ padding: '32px' }}>
          <Flex direction="column" gap="4">
            <Flex gap="4" align="start">
              <Avatar
                size="8"
                src={getAvatarUrl()}
                fallback={user?.profile?.name?.[0] || profile.githubUsername?.[0] || 'U'}
                radius="full"
              />
              <Flex direction="column" gap="2" style={{ flex: 1 }}>
                <Heading size="6">{user?.profile?.name || profile.githubUsername}</Heading>
                <Link
                  size="3"
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Flex gap="1" align="center">
                    <GitHubLogoIcon />
                    @{profile.githubUsername}
                  </Flex>
                </Link>
                <Text size="3" style={{ maxWidth: '600px' }}>
                  {profile.bio || 'No bio available'}
                </Text>
                <Grid columns="3" gap="4" mt="2">
                  {profile.location && (
                    <Flex align="center" gap="1">
                      <HomeIcon />
                      <Text size="2">{profile.location}</Text>
                    </Flex>
                  )}
                  {profile.company && (
                    <Flex align="center" gap="1">
                      <PersonIcon />
                      <Text size="2">{profile.company}</Text>
                    </Flex>
                  )}
                </Grid>
              </Flex>
            </Flex>
          </Flex>
        </Card>

        {/* GitHub Stats */}
        <Grid columns="3" gap="4">
          <Card>
            <Flex direction="column" align="center" gap="1" p="4">
              <Text size="6" weight="bold">{profile.githubFollowers || 0}</Text>
              <Text size="2">Followers</Text>
            </Flex>
          </Card>
          <Card>
            <Flex direction="column" align="center" gap="1" p="4">
              <Text size="6" weight="bold">{profile.githubFollowing || 0}</Text>
              <Text size="2">Following</Text>
            </Flex>
          </Card>
          <Card>
            <Flex direction="column" align="center" gap="1" p="4">
              <Text size="6" weight="bold">{profile.githubRepos || 0}</Text>
              <Text size="2">Repositories</Text>
            </Flex>
          </Card>
        </Grid>

        {/* Top Repositories */}
        {profile.topRepositories?.length > 0 && (
          <Box>
            <Heading size="4" mb="3">Top Repositories</Heading>
            <Grid columns="2" gap="4">
              {profile.topRepositories.map((repo) => (
                <Card key={repo.fullName}>
                  <Flex direction="column" gap="2" p="4">
                    <Link
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Flex gap="2" align="center">
                        <CodeIcon />
                        <Text weight="bold">{repo.name}</Text>
                      </Flex>
                    </Link>
                    <Text size="2">{repo.description || 'No description available'}</Text>
                    <Flex gap="3">
                      {repo.language && (
                        <Text size="1">
                          <Box as="span" style={{ 
                            display: 'inline-block',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#6e40c9',
                            marginRight: '4px'
                          }} />
                          {repo.language}
                        </Text>
                      )}
                      <Text size="1">⭐ {repo.stars}</Text>
                      <Text size="1">🍴 {repo.forks}</Text>
                    </Flex>
                  </Flex>
                </Card>
              ))}
            </Grid>
          </Box>
        )}
      </Flex>
    </Container>
  );
}; 