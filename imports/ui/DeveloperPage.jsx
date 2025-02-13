import React from 'react';
import { useTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { UserProfiles } from '../api/userProfiles';
import { Theme, Button, Text, Container, Flex, Heading, Card, Box, Grid, Avatar, Link, Badge, ScrollArea, Tabs, Select } from '@radix-ui/themes';
import { GitHubLogoIcon, PersonIcon, HomeIcon, CodeIcon, ActivityLogIcon, ReloadIcon, StarIcon, GitBranchIcon, HeartIcon, HeartFilledIcon } from '@radix-ui/react-icons';

export const DeveloperPage = ({ userId }) => {
  const [timeoutError, setTimeoutError] = React.useState(false);
  const [isFollowing, setIsFollowing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('overview');
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [repositories, setRepositories] = React.useState([]);
  const [languageFilter, setLanguageFilter] = React.useState('');

  const { profile, user, currentUserProfile, isLoading, error } = useTracker(() => {
    console.log('Setting up DeveloperPage subscriptions for userId:', userId);

    const handles = [
      Meteor.subscribe('userProfile', userId),
      Meteor.subscribe('userData', userId)
    ];

    if (Meteor.userId()) {
      handles.push(Meteor.subscribe('userProfile', Meteor.userId()));
    }

    // Log subscription status
    handles.forEach((handle, index) => {
      console.log(`Subscription ${index + 1} ready:`, handle.ready());
    });

    const isLoading = !handles.every(handle => handle.ready());

    if (isLoading) {
      console.log('DeveloperPage subscriptions still loading');
      return { profile: null, user: null, currentUserProfile: null, isLoading: true };
    }

    console.log('DeveloperPage subscriptions ready, fetching data');

    const profile = UserProfiles.findOne({ userId });
    const user = Meteor.users.findOne(userId);
    const currentUserProfile = Meteor.userId() ? UserProfiles.findOne({ userId: Meteor.userId() }) : null;

    console.log('DeveloperPage data fetched:', {
      hasProfile: !!profile,
      hasUser: !!user,
      profileId: profile?.userId,
      username: profile?.githubUsername,
      hasCurrentUserProfile: !!currentUserProfile
    });

    return {
      profile,
      user,
      currentUserProfile,
      isLoading: false
    };
  }, [userId]);

  // Check if current user is following this profile
  React.useEffect(() => {
    if (currentUserProfile && profile) {
      const following = currentUserProfile.following || [];
      setIsFollowing(following.includes(userId));
      console.log('Following status:', {
        currentUserId: currentUserProfile.userId,
        targetUserId: userId,
        following,
        isFollowing: following.includes(userId)
      });
    }
  }, [currentUserProfile, profile, userId]);

  const handleFollowToggle = async () => {
    if (!Meteor.userId()) {
      // Trigger GitHub login
      Meteor.loginWithGithub({
        requestPermissions: ['user:email', 'repo', 'read:user', 'user:follow']
      });
      return;
    }

    try {
      const result = await Meteor.callAsync('userProfiles.toggleFollow', userId);
      setIsFollowing(result);
      console.log('Follow toggle result:', result);
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  // Reset timeout when userId changes
  React.useEffect(() => {
    setTimeoutError(false);
    let timeoutId;

    // Only set timeout if still loading
    if (isLoading) {
      timeoutId = setTimeout(() => {
        // Only set timeout error if still loading after 2 minutes
        if (isLoading) {
          setTimeoutError(true);
        }
      }, 120000); // 2 minutes
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [userId, isLoading]);

  // Initialize repositories when profile changes or when switching to repositories tab
  React.useEffect(() => {
    console.log('Repository effect triggered:', {
      hasProfile: !!profile,
      hasAllRepositories: !!profile?.allRepositories,
      repoCount: profile?.allRepositories?.length,
      activeTab,
      currentRepoCount: repositories.length
    });

    if (profile?.allRepositories) {
      const sortedRepos = [...profile.allRepositories].sort((a, b) => 
        new Date(b.updatedAt) - new Date(a.updatedAt)
      );
      console.log('Setting repositories:', {
        count: sortedRepos.length,
        firstRepo: sortedRepos[0]
      });
      setRepositories(sortedRepos);
    }
  }, [profile?.allRepositories, activeTab]);

  // Add debug logging for profile data
  React.useEffect(() => {
    if (profile) {
      console.log('Profile data:', {
        hasAllRepositories: !!profile.allRepositories,
        allRepositoriesCount: profile.allRepositories?.length,
        hasTopRepositories: !!profile.topRepositories,
        topRepositoriesCount: profile.topRepositories?.length,
        stats: profile.stats,
        hasRecentActivity: !!profile.stats?.recentActivity,
        recentActivityCount: profile.stats?.recentActivity?.length,
        firstActivity: profile.stats?.recentActivity?.[0],
        firstRepo: profile.allRepositories?.[0]
      });
    }
  }, [profile]);

  // Add debug logging for repositories state changes
  React.useEffect(() => {
    console.log('Repositories state changed:', {
      count: repositories.length,
      firstRepo: repositories[0]
    });
  }, [repositories]);

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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'PushEvent':
        return <GitBranchIcon />;
      case 'WatchEvent':
        return <StarIcon />;
      case 'CreateEvent':
        return <CodeIcon />;
      case 'ForkEvent':
        return <GitBranchIcon />;
      case 'IssuesEvent':
        return <ActivityLogIcon />;
      case 'PullRequestEvent':
        return <GitBranchIcon />;
      case 'IssueCommentEvent':
        return <ActivityLogIcon />;
      default:
        return <ActivityLogIcon />;
    }
  };

  const getActivityDescription = (activity) => {
    switch (activity.type) {
      case 'PushEvent':
        return `Pushed to ${activity.repo}`;
      case 'WatchEvent':
        return `Starred ${activity.repo}`;
      case 'CreateEvent':
        return activity.payload?.ref_type === 'repository' 
          ? `Created repository ${activity.repo}`
          : `Created ${activity.payload?.ref_type} in ${activity.repo}`;
      case 'ForkEvent':
        return `Forked ${activity.repo}`;
      case 'IssuesEvent':
        return `${activity.payload?.action} issue in ${activity.repo}`;
      case 'PullRequestEvent':
        return `${activity.payload?.action} pull request in ${activity.repo}`;
      case 'IssueCommentEvent':
        return `Commented on issue in ${activity.repo}`;
      default:
        return `${activity.type.replace('Event', '')} on ${activity.repo}`;
    }
  };

  return (
    <Container size="3">
      <Flex direction="column" gap="6">
        {/* Header Section */}
        <Card style={{ padding: '32px' }}>
          <Flex direction="column" gap="4">
            <Flex gap="4" align="start" justify="between">
              <Flex gap="4" style={{ flex: 1 }}>
                <Avatar
                  size="8"
                  src={getAvatarUrl()}
                  fallback={user?.profile?.name?.[0] || profile.githubUsername?.[0] || 'U'}
                  radius="full"
                />
                <Flex direction="column" gap="2" style={{ flex: 1 }}>
                  <Flex justify="between" align="center">
                    <Heading size="6">{user?.profile?.name || profile.githubUsername}</Heading>
                    {userId === Meteor.userId() ? (
                      <Flex gap="2">
                        <Button 
                          variant="soft" 
                          disabled
                          size="2"
                        >
                          <Flex gap="1" align="center">
                            <PersonIcon />
                            This is you
                          </Flex>
                        </Button>
                        <Button
                          variant="soft"
                          size="2"
                          disabled={isSyncing}
                          onClick={async () => {
                            try {
                              setIsSyncing(true);
                              await Meteor.callAsync('userProfiles.syncGithub');
                            } catch (error) {
                              console.error('Error syncing GitHub data:', error);
                            } finally {
                              setIsSyncing(false);
                            }
                          }}
                        >
                          <Flex gap="1" align="center">
                            <ReloadIcon
                              className={isSyncing ? "spin" : ""}
                              style={isSyncing ? {
                                animation: 'spin 1s linear infinite',
                                '@keyframes spin': {
                                  '0%': { transform: 'rotate(0deg)' },
                                  '100%': { transform: 'rotate(360deg)' }
                                }
                              } : undefined}
                            />
                            {isSyncing ? 'Syncing...' : 'Sync GitHub'}
                          </Flex>
                        </Button>
                      </Flex>
                    ) : (
                      <Button 
                        variant={isFollowing ? "soft" : "solid"} 
                        onClick={handleFollowToggle}
                        size="2"
                      >
                        <Flex gap="1" align="center">
                          {isFollowing ? <HeartFilledIcon /> : <HeartIcon />}
                          {isFollowing ? 'Following' : 'Follow'}
                        </Flex>
                      </Button>
                    )}
                  </Flex>
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
          </Flex>
        </Card>

        {/* Stats Grid */}
        <Grid columns="4" gap="4">
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
          <Card>
            <Flex direction="column" align="center" gap="1" p="4">
              <Text size="6" weight="bold">{profile.stats?.totalStars || 0}</Text>
              <Text size="2">Total Stars</Text>
            </Flex>
          </Card>
        </Grid>

        {/* Tabs for different sections */}
        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
            <Tabs.Trigger value="repositories">Repositories</Tabs.Trigger>
            <Tabs.Trigger value="activity">Activity</Tabs.Trigger>
          </Tabs.List>

          <Box pt="4">
            <Tabs.Content value="overview">
              {console.log('Overview tab data:', {
                hasLanguages: !!profile.stats?.languages,
                languagesCount: Object.keys(profile.stats?.languages || {}).length,
                hasTopRepos: !!profile.topRepositories,
                topReposCount: profile.topRepositories?.length
              })}
              
              {/* Languages */}
              {profile.stats?.languages && (
                <Card mb="4">
                  <Box p="4">
                    <Heading size="4" mb="3">Languages</Heading>
                    <Flex gap="2" wrap="wrap">
                      {Object.entries(profile.stats.languages)
                        .sort(([,a], [,b]) => b - a)
                        .map(([language, count]) => (
                          <Badge key={language} variant="soft">
                            {language} ({count})
                          </Badge>
                        ))
                      }
                    </Flex>
                  </Box>
                </Card>
              )}

              {/* Top Repositories */}
              {profile.topRepositories && profile.topRepositories.length > 0 && (
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
                          <Flex gap="3" wrap="wrap">
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
                            <Text size="1">Updated {formatDate(repo.updatedAt)}</Text>
                          </Flex>
                          {repo.topics?.length > 0 && (
                            <Flex gap="1" wrap="wrap" mt="1">
                              {repo.topics.map(topic => (
                                <Badge key={topic} size="1" variant="soft">
                                  {topic}
                                </Badge>
                              ))}
                            </Flex>
                          )}
                        </Flex>
                      </Card>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* Show message if no content */}
              {(!profile.stats?.languages || Object.keys(profile.stats.languages).length === 0) && 
               (!profile.topRepositories || profile.topRepositories.length === 0) && (
                <Card>
                  <Box p="4">
                    <Text size="2" color="gray">No overview information available</Text>
                  </Box>
                </Card>
              )}
            </Tabs.Content>

            <Tabs.Content value="repositories">
              {profile.allRepositories?.length > 0 ? (
                <Card>
                  <Box p="4">
                    <Flex direction="column" gap="4">
                      {/* Stats Summary */}
                      <Grid columns="4" gap="3">
                        <Card>
                          <Flex direction="column" align="center" gap="1" p="3">
                            <Text size="5" weight="bold">{profile.allRepositories.length}</Text>
                            <Text size="2">Total Repos</Text>
                          </Flex>
                        </Card>
                        <Card>
                          <Flex direction="column" align="center" gap="1" p="3">
                            <Text size="5" weight="bold">
                              {profile.allRepositories.filter(repo => !repo.isFork).length}
                            </Text>
                            <Text size="2">Original</Text>
                          </Flex>
                        </Card>
                        <Card>
                          <Flex direction="column" align="center" gap="1" p="3">
                            <Text size="5" weight="bold">
                              {profile.allRepositories.filter(repo => repo.isFork).length}
                            </Text>
                            <Text size="2">Forked</Text>
                          </Flex>
                        </Card>
                        <Card>
                          <Flex direction="column" align="center" gap="1" p="3">
                            <Text size="5" weight="bold">
                              {profile.allRepositories.filter(repo => repo.isPrivate).length}
                            </Text>
                            <Text size="2">Private</Text>
                          </Flex>
                        </Card>
                      </Grid>

                      {/* Filters and Sort */}
                      <Flex justify="between" align="center">
                        <Heading size="4">Repositories</Heading>
                        <Flex gap="2">
                          <Select.Root
                            defaultValue="updatedAt-desc"
                            onValueChange={(value) => {
                              const [field, direction] = value.split('-');
                              const sorted = [...profile.allRepositories].sort((a, b) => {
                                if (direction === 'asc') {
                                  return field === 'name' ? 
                                    a[field].localeCompare(b[field]) : 
                                    a[field] - b[field];
                                }
                                return field === 'name' ? 
                                  b[field].localeCompare(a[field]) : 
                                  b[field] - a[field];
                              });
                              setRepositories(sorted);
                            }}
                          >
                            <Select.Trigger />
                            <Select.Content>
                              <Select.Item value="updatedAt-desc">Recently updated</Select.Item>
                              <Select.Item value="stars-desc">Most stars</Select.Item>
                              <Select.Item value="forks-desc">Most forks</Select.Item>
                              <Select.Item value="name-asc">Name (A-Z)</Select.Item>
                              <Select.Item value="name-desc">Name (Z-A)</Select.Item>
                            </Select.Content>
                          </Select.Root>
                          <Select.Root
                            defaultValue=""
                            onValueChange={(value) => setLanguageFilter(value)}
                          >
                            <Select.Trigger />
                            <Select.Content>
                              <Select.Item value="">All languages</Select.Item>
                              {Object.keys(profile.stats.languages || {}).map(lang => (
                                <Select.Item key={lang} value={lang}>{lang}</Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
                        </Flex>
                      </Flex>

                      {/* Repository List */}
                      <Grid gap="3">
                        {repositories
                          .filter(repo => !languageFilter || repo.language === languageFilter)
                          .map((repo) => (
                            <Card key={repo.fullName}>
                              <Flex direction="column" gap="2" p="4">
                                <Flex justify="between" align="start">
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
                                  <Flex gap="2">
                                    {repo.isPrivate && (
                                      <Badge color="red" variant="soft">Private</Badge>
                                    )}
                                    {repo.archived && (
                                      <Badge color="yellow" variant="soft">Archived</Badge>
                                    )}
                                    {repo.isFork && (
                                      <Badge color="blue" variant="soft">Fork</Badge>
                                    )}
                                    {repo.hasPages && (
                                      <Badge color="green" variant="soft">Pages</Badge>
                                    )}
                                  </Flex>
                                </Flex>
                                <Text size="2">{repo.description || 'No description available'}</Text>
                                <Grid columns="2" gap="3">
                                  <Flex direction="column" gap="2">
                                    <Flex gap="3" wrap="wrap">
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
                                      {repo.openIssues > 0 && (
                                        <Text size="1">🔴 {repo.openIssues} issues</Text>
                                      )}
                                    </Flex>
                                    <Text size="1" color="gray">
                                      Created {formatDate(repo.createdAt)}
                                    </Text>
                                    <Text size="1" color="gray">
                                      Last updated {formatDate(repo.updatedAt)}
                                    </Text>
                                  </Flex>
                                  {repo.topics?.length > 0 && (
                                    <Flex gap="1" wrap="wrap" justify="end">
                                      {repo.topics.map(topic => (
                                        <Badge key={topic} size="1" variant="soft">
                                          {topic}
                                        </Badge>
                                      ))}
                                    </Flex>
                                  )}
                                </Grid>
                              </Flex>
                            </Card>
                          ))}
                      </Grid>
                    </Flex>
                  </Box>
                </Card>
              ) : (
                <Card>
                  <Box p="4">
                    <Text size="2" color="gray">No repositories found</Text>
                  </Box>
                </Card>
              )}
            </Tabs.Content>

            <Tabs.Content value="activity">
              {profile.stats?.recentActivity?.length > 0 ? (
                <Card>
                  <ScrollArea style={{ height: '500px' }}>
                    <Box p="4">
                      <Heading size="4" mb="3">Recent Activity</Heading>
                      <Flex direction="column" gap="3">
                        {profile.stats.recentActivity.map((activity, index) => (
                          <Card key={index} variant="soft">
                            <Flex gap="3" align="start" p="3">
                              <Box style={{ 
                                padding: '8px', 
                                borderRadius: '6px',
                                backgroundColor: 'var(--gray-3)'
                              }}>
                                {getActivityIcon(activity.type)}
                              </Box>
                              <Box style={{ flex: 1 }}>
                                <Text size="2" weight="bold">
                                  {getActivityDescription(activity)}
                                </Text>
                                <Flex gap="3" mt="1">
                                  <Text size="1" color="gray">
                                    {formatDate(activity.createdAt)}
                                  </Text>
                                  <Link 
                                    href={`https://github.com/${activity.repo}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    size="1"
                                  >
                                    View on GitHub
                                  </Link>
                                </Flex>
                                {activity.payload?.commits && (
                                  <Box mt="2">
                                    <Text size="1" color="gray" mb="1">
                                      {activity.payload.commits.length} commit{activity.payload.commits.length !== 1 ? 's' : ''}
                                    </Text>
                                    {activity.payload.commits.slice(0, 3).map((commit, i) => (
                                      <Text key={i} size="1" style={{ 
                                        display: 'block',
                                        fontFamily: 'monospace',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                      }}>
                                        {commit.message}
                                      </Text>
                                    ))}
                                    {activity.payload.commits.length > 3 && (
                                      <Text size="1" color="gray" mt="1">
                                        and {activity.payload.commits.length - 3} more...
                                      </Text>
                                    )}
                                  </Box>
                                )}
                              </Box>
                            </Flex>
                          </Card>
                        ))}
                      </Flex>
                    </Box>
                  </ScrollArea>
                </Card>
              ) : (
                <Card>
                  <Box p="4">
                    <Text size="2" color="gray">No recent activity</Text>
                  </Box>
                </Card>
              )}
            </Tabs.Content>
          </Box>
        </Tabs.Root>
      </Flex>
    </Container>
  );
}; 