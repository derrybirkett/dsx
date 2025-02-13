import React, { useState, useEffect } from 'react';
import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { UserProfiles } from '../api/userProfiles';
import { Card, Text, Flex, TextField, Button, TextArea, Avatar, Link, Grid } from '@radix-ui/themes';
import { GitHubLogoIcon, UpdateIcon } from '@radix-ui/react-icons';

export const Profile = () => {
  const { profile, user, isLoading } = useTracker(() => {
    const handle = Meteor.subscribe('userProfile');
    return {
      profile: UserProfiles.findOne({ userId: Meteor.userId() }) || {},
      user: Meteor.user(),
      isLoading: !handle.ready()
    };
  });

  const [bio, setBio] = useState(profile.bio || '');
  const [location, setLocation] = useState(profile.location || '');
  const [company, setCompany] = useState(profile.company || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState('');
  const [repoInput, setRepoInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Update local state when profile changes
  useEffect(() => {
    setBio(profile.bio || '');
    setLocation(profile.location || '');
    setCompany(profile.company || '');
  }, [profile.bio, profile.location, profile.company]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await Meteor.callAsync('userProfiles.update', bio, location, company);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGitHubSync = async () => {
    setIsSyncing(true);
    setError('');
    try {
      await Meteor.callAsync('userProfiles.syncGithub');
      console.log('Sync completed');
    } catch (error) {
      console.error('Failed to sync with GitHub:', error);
      setError(error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectRepo = async () => {
    setIsConnecting(true);
    setError('');
    try {
      await Meteor.callAsync('userProfiles.connectRepo', repoInput);
      setRepoInput('');
    } catch (error) {
      console.error('Failed to connect repository:', error);
      setError(error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return <Text>Loading profile...</Text>;
  }

  return (
    <Flex direction="column" gap="4">
      {/* GitHub Profile Card */}
      <Card>
        <Flex direction="column" gap="3">
          <Flex justify="between" align="center">
            <Flex gap="3" align="center">
              <Avatar 
                size="5" 
                src={user?.profile?.avatar} 
                fallback={user?.profile?.name?.[0] || 'U'} 
                radius="full"
              />
              <Flex direction="column">
                <Text size="5" weight="bold">{user?.profile?.name}</Text>
                {profile.githubUsername && (
                  <Link 
                    size="2" 
                    href={profile.githubUrl} 
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Flex gap="1" align="center">
                      <GitHubLogoIcon />
                      @{profile.githubUsername}
                    </Flex>
                  </Link>
                )}
              </Flex>
            </Flex>
            <Button 
              onClick={handleGitHubSync} 
              disabled={isSyncing}
              variant="soft"
              size="2"
            >
              <UpdateIcon />
              {isSyncing ? 'Syncing...' : 'Sync with GitHub'}
            </Button>
          </Flex>

          {/* Connected Repository */}
          {profile.connectedRepo ? (
            <Card>
              <Flex direction="column" gap="2">
                <Text size="3" weight="bold">Connected Repository</Text>
                <Link 
                  href={profile.repoData?.url} 
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {profile.connectedRepo}
                </Link>
                <Text size="2">{profile.repoData?.description}</Text>
                <Flex gap="4">
                  <Text size="2">⭐️ {profile.repoData?.stars || 0} stars</Text>
                  <Text size="2">🔀 {profile.repoData?.forks || 0} forks</Text>
                </Flex>
              </Flex>
            </Card>
          ) : (
            <Card>
              <Flex direction="column" gap="2">
                <Text size="3" weight="bold">Connect Repository</Text>
                <Flex gap="2">
                  <TextField.Root style={{ flex: 1 }}>
                    <TextField.Input 
                      placeholder="username/repository"
                      value={repoInput}
                      onChange={(e) => setRepoInput(e.target.value)}
                    />
                  </TextField.Root>
                  <Button 
                    onClick={handleConnectRepo}
                    disabled={isConnecting}
                  >
                    {isConnecting ? 'Connecting...' : 'Connect'}
                  </Button>
                </Flex>
              </Flex>
            </Card>
          )}

          {/* GitHub Stats */}
          {profile.githubUsername && (
            <Grid columns="3" gap="3" mt="3">
              <Card>
                <Flex direction="column" align="center" gap="1">
                  <Text size="5" weight="bold">{profile.githubFollowers}</Text>
                  <Text size="1" color="gray">Followers</Text>
                </Flex>
              </Card>
              <Card>
                <Flex direction="column" align="center" gap="1">
                  <Text size="5" weight="bold">{profile.githubFollowing}</Text>
                  <Text size="1" color="gray">Following</Text>
                </Flex>
              </Card>
              <Card>
                <Flex direction="column" align="center" gap="1">
                  <Text size="5" weight="bold">{profile.githubRepos}</Text>
                  <Text size="1" color="gray">Repositories</Text>
                </Flex>
              </Card>
            </Grid>
          )}
        </Flex>
      </Card>

      {/* Profile Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <Flex direction="column" gap="3">
            <Text size="5" weight="bold">Profile Information</Text>
            
            <Flex direction="column" gap="2">
              <Text as="label" size="2" weight="bold">Bio</Text>
              <TextArea 
                placeholder="Tell us about yourself"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </Flex>

            <Flex direction="column" gap="2">
              <Text as="label" size="2" weight="bold">Location</Text>
              <TextField.Root>
                <TextField.Input 
                  placeholder="Where are you based?"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </TextField.Root>
            </Flex>

            <Flex direction="column" gap="2">
              <Text as="label" size="2" weight="bold">Company</Text>
              <TextField.Root>
                <TextField.Input 
                  placeholder="Where do you work?"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </TextField.Root>
            </Flex>

            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Profile'}
            </Button>
          </Flex>
        </Card>
      </form>
    </Flex>
  );
}; 