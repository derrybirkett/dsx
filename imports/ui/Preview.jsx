import React from 'react';
import { Text, Card, Flex, Grid, Heading } from '@radix-ui/themes';
import { PersonIcon, StarIcon, HomeIcon } from '@radix-ui/react-icons';
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
    return <Text>Loading preview...</Text>;
  }

  const cardStyle = {
    padding: '32px',
    backgroundColor: 'var(--color-page-background)',
    color: 'var(--gray-12)',
    transition: 'transform 0.2s ease-in-out, background-color 0.2s ease-in-out',
    ':hover': {
      transform: 'translateY(-2px)',
      backgroundColor: 'var(--accent-2)'
    }
  };

  return (
    <Flex direction="column" gap="8" align="center" justify="center" style={{ 
      minHeight: 'calc(100vh - 200px)',
      backgroundColor: 'var(--color-background)',
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
    </Flex>
  );
}; 