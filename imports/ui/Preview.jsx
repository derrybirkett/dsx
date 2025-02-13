import React from 'react';
import { Text, Card, Flex, Grid, Heading, Link } from '@radix-ui/themes';
import { PersonIcon, StarIcon, HomeIcon, GitHubLogoIcon } from '@radix-ui/react-icons';
import { useTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { UserProfiles } from '../api/userProfiles';

export const Preview = () => {
  const { profile, user, isLoading } = useTracker(() => {
    const handle = Meteor.subscribe('userProfile');
    return {
      profile: UserProfiles.findOne({ userId: Meteor.userId() }) || {},
      user: Meteor.user(),
      isLoading: !handle.ready()
    };
  });

  if (isLoading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <Text size="3">Loading preview...</Text>
      </Flex>
    );
  }

  const cardStyle = {
    padding: '32px',
    backgroundColor: 'var(--gray-2)',
    color: 'var(--gray-12)',
    transition: 'all 0.2s ease-in-out',
    ':hover': {
      transform: 'translateY(-2px)',
      backgroundColor: 'var(--gray-3)'
    }
  };

  const repoCardStyle = {
    padding: '24px',
    backgroundColor: 'var(--gray-2)',
    color: 'var(--gray-12)',
    transition: 'all 0.2s ease-in-out',
    ':hover': {
      transform: 'translateY(-2px)',
      backgroundColor: 'var(--gray-3)'
    }
  };

  return (
    <Flex direction="column" gap="8" align="center" justify="center" style={{ 
      minHeight: 'calc(100vh - 200px)',
      margin: '-20px',
      padding: '20px'
    }}>
      <Heading 
        size="9" 
        align="center"
        style={{ 
          maxWidth: '800px',
          lineHeight: '1.2'
        }}
      >
        {profile.bio || 'Add your bio in the Profile tab'}
      </Heading>

      <Grid columns="3" gap="6" style={{ maxWidth: '800px', width: '100%' }}>
        <Card style={cardStyle}>
          <Flex direction="column" gap="3" align="center">
            <PersonIcon width="24" height="24" />
            <Text size="5" weight="bold" align="center">
              {profile.githubUsername || 'Username'}
            </Text>
            <Text size="2" align="center" style={{ opacity: 0.8 }}>
              {profile.company || 'Company'}
            </Text>
          </Flex>
        </Card>

        <Card style={cardStyle}>
          <Flex direction="column" gap="3" align="center">
            <StarIcon width="24" height="24" />
            <Text size="5" weight="bold" align="center">
              {profile.githubRepos || '0'}
            </Text>
            <Text size="2" align="center" style={{ opacity: 0.8 }}>
              Repositories
            </Text>
          </Flex>
        </Card>

        <Card style={cardStyle}>
          <Flex direction="column" gap="3" align="center">
            <HomeIcon width="24" height="24" />
            <Text size="5" weight="bold" align="center">
              {profile.location || 'Location'}
            </Text>
            <Text size="2" align="center" style={{ opacity: 0.8 }}>
              Based in
            </Text>
          </Flex>
        </Card>
      </Grid>

      {profile.topRepositories?.length > 0 && (
        <Flex direction="column" gap="4" style={{ width: '100%', maxWidth: '1000px' }}>
          <Text size="6" weight="bold" align="center">Top Repositories</Text>
          <Grid columns="2" gap="4">
            {profile.topRepositories.map((repo) => (
              <Link
                key={repo.fullName}
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <Card style={repoCardStyle}>
                  <Flex direction="column" gap="3">
                    <Flex gap="2" align="center">
                      <GitHubLogoIcon width="20" height="20" />
                      <Text size="4" weight="bold" style={{ color: 'var(--gray-12)' }}>
                        {repo.name}
                      </Text>
                    </Flex>
                    
                    <Text size="2" style={{ 
                      opacity: 0.8,
                      minHeight: '3em',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {repo.description || 'No description available'}
                    </Text>
                    
                    <Flex gap="4" align="center">
                      {repo.language && (
                        <Text size="2">
                          <span style={{ 
                            display: 'inline-block',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--accent-9)',
                            marginRight: '6px'
                          }}></span>
                          {repo.language}
                        </Text>
                      )}
                      <Text size="2">⭐️ {repo.stars}</Text>
                      <Text size="2">🔀 {repo.forks}</Text>
                    </Flex>
                  </Flex>
                </Card>
              </Link>
            ))}
          </Grid>
        </Flex>
      )}
    </Flex>
  );
}; 