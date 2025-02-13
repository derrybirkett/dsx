import React from 'react';
import { useTracker } from 'meteor/react-meteor-data';
import { ActivityLogsCollection } from '/imports/api/activityLogs';
import { Card, Text, Heading, Flex, Box, ScrollArea } from '@radix-ui/themes';
import { PersonIcon, GitHubLogoIcon, ExitIcon } from '@radix-ui/react-icons';

export const ActivityLogs = () => {
  const { logs, isLoading } = useTracker(() => {
    const handle = Meteor.subscribe('activityLogs');
    
    return {
      logs: ActivityLogsCollection.find({}, { sort: { createdAt: -1 } }).fetch(),
      isLoading: !handle.ready(),
    };
  });

  if (isLoading) {
    return (
      <Card style={{ padding: '20px', textAlign: 'center' }}>
        <Text>Loading activity logs...</Text>
      </Card>
    );
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'login':
        return <GitHubLogoIcon width="16" height="16" />;
      case 'logout':
        return <ExitIcon width="16" height="16" />;
      default:
        return <PersonIcon width="16" height="16" />;
    }
  };

  return (
    <Card style={{ padding: '20px' }}>
      <Heading size="4" mb="4">Activity Log</Heading>
      {logs.length === 0 ? (
        <Text color="gray">No activity recorded yet.</Text>
      ) : (
        <ScrollArea style={{ height: '400px' }}>
          <Flex direction="column" gap="2">
            {logs.map((log) => (
              <Card key={log._id} variant="surface">
                <Flex gap="2" align="center">
                  <Box>
                    {getActionIcon(log.action)}
                  </Box>
                  <Box grow="1">
                    <Flex justify="between" align="center">
                      <Text weight="bold" size="2">
                        {log.action.toUpperCase()}
                      </Text>
                      <Text size="1" color="gray">
                        {formatDate(log.createdAt)}
                      </Text>
                    </Flex>
                    {log.details.service && (
                      <Text size="1" color="gray">
                        Service: {log.details.service}
                      </Text>
                    )}
                  </Box>
                </Flex>
              </Card>
            ))}
          </Flex>
        </ScrollArea>
      )}
    </Card>
  );
}; 