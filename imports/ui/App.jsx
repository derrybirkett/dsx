import React from 'react';
import { Hello } from './Hello.jsx';
import { Info } from './Info.jsx';
import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { ActivityLogs } from './ActivityLogs.jsx';
import { Profile } from './Profile.jsx';
import { Preview } from './Preview.jsx';
import { Theme, Button, Text, Container, Flex, Heading, Card, Box, Tabs, Grid, Avatar, DropdownMenu, Tooltip } from '@radix-ui/themes';
import { GitHubLogoIcon, ExitIcon, CodeIcon, PersonIcon, MapPinIcon, ChevronDownIcon, HomeIcon, ActivityLogIcon, InfoCircledIcon } from '@radix-ui/react-icons';

export const App = () => {
  const user = useTracker(() => Meteor.user());
  const userId = useTracker(() => Meteor.userId());
  const isLoading = useTracker(() => Meteor.loggingIn());
  const [activeTab, setActiveTab] = React.useState('preview');
  const [isDark, setIsDark] = React.useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  React.useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('theme')) {
        setIsDark(e.matches);
      }
    };
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const handleGitHubLogin = () => {
    Meteor.loginWithGithub({
      requestPermissions: [
        'user:email',
        'repo',
        'read:user',
        'user:follow'
      ]
    }, (err) => {
      if (err) {
        console.error('GitHub login failed:', err);
      }
    });
  };

  const handleLogout = () => {
    Meteor.logout((err) => {
      if (err) {
        console.error('Logout failed:', err);
      }
    });
  };

  if (isLoading) {
    return (
      <Theme appearance={isDark ? "dark" : "light"} accentColor="gray" radius="medium" panelBackground="solid">
        <Container size="4">
          <Card style={{ textAlign: 'center', padding: '20px' }}>
            <Text>Loading...</Text>
          </Card>
        </Container>
      </Theme>
    );
  }

  const NavButton = ({ icon: Icon, label, value, isActive }) => (
    <Tooltip content={label}>
      <Button 
        variant={isActive ? "solid" : "ghost"} 
        onClick={() => setActiveTab(value)}
        style={{ width: '44px', height: '44px', padding: 0 }}
      >
        <Icon width="20" height="20" />
      </Button>
    </Tooltip>
  );

  return (
    <Theme appearance={isDark ? "dark" : "light"} accentColor="gray" radius="medium" panelBackground="solid">
      <Box>
        <Container size="4">
          <Flex justify="between" align="center" py="3">
            <Flex align="center" gap="6">
              <Heading size="4" style={{ margin: 0 }}>Gitsu</Heading>
              {userId && (
                <Flex gap="2">
                  <NavButton 
                    icon={HomeIcon} 
                    label="Preview" 
                    value="preview" 
                    isActive={activeTab === 'preview'} 
                  />
                  <NavButton 
                    icon={PersonIcon} 
                    label="Profile" 
                    value="profile" 
                    isActive={activeTab === 'profile'} 
                  />
                  <NavButton 
                    icon={ActivityLogIcon} 
                    label="Activity" 
                    value="activity" 
                    isActive={activeTab === 'activity'} 
                  />
                  <NavButton 
                    icon={InfoCircledIcon} 
                    label="Info" 
                    value="info" 
                    isActive={activeTab === 'info'} 
                  />
                </Flex>
              )}
            </Flex>
            {userId ? (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  <Button variant="ghost">
                    <Flex align="center" gap="2">
                      <Avatar 
                        size="2" 
                        src={user?.profile?.avatar} 
                        fallback={user?.profile?.name?.[0] || 'U'} 
                        radius="full"
                      />
                      <ChevronDownIcon />
                    </Flex>
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                  <DropdownMenu.Item 
                    onClick={() => setIsDark(!isDark)}
                  >
                    <Flex gap="2" align="center">
                      {isDark ? '☀️' : '🌙'}
                      {isDark ? 'Light mode' : 'Dark mode'}
                    </Flex>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item color="red" onClick={handleLogout}>
                    <Flex gap="2" align="center">
                      <ExitIcon />
                      Logout
                    </Flex>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            ) : (
              <Button 
                onClick={handleGitHubLogin}
                variant="soft"
                size="2"
              >
                <GitHubLogoIcon width="16" height="16" />
                Login with GitHub
              </Button>
            )}
          </Flex>
        </Container>
      </Box>

      {userId ? (
        <Container size="4" style={{ padding: '20px' }}>
          <Box pt="4">
            {activeTab === 'activity' && (
              <Card style={{ padding: '20px' }}>
                <ActivityLogs />
              </Card>
            )}
            {activeTab === 'profile' && <Profile />}
            {activeTab === 'preview' && <Preview />}
            {activeTab === 'info' && (
              <Card style={{ padding: '20px' }}>
                <Info />
              </Card>
            )}
          </Box>
        </Container>
      ) : (
        <Container size="4" style={{ padding: '20px' }}>
          <Flex direction="column" gap="8" align="center" justify="center" style={{ minHeight: 'calc(100vh - 200px)' }}>
            <Heading 
              size="9" 
              align="center"
              style={{ 
                maxWidth: '800px',
                lineHeight: '1.2'
              }}
            >
              Digital Product Designer: UX, UI, Art Direction & Front-end
            </Heading>
            <Button 
              size="4"
              onClick={handleGitHubLogin}
              style={{
                padding: '24px 48px',
                fontSize: '18px',
                backgroundColor: isDark ? 'white' : 'black',
                color: isDark ? 'black' : 'white'
              }}
            >
              <GitHubLogoIcon width="24" height="24" />
              Connect with GitHub
            </Button>
          </Flex>
        </Container>
      )}
    </Theme>
  );
};
