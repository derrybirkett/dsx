import { Meteor } from 'meteor/meteor';
import { LinksCollection } from '/imports/api/links';
import { ServiceConfiguration } from 'meteor/service-configuration';
import { ActivityLogsCollection } from '/imports/api/activityLogs';
import { Accounts } from 'meteor/accounts-base';
import '../imports/api/userProfiles.js';
import '../imports/api/activityLogs.js';
import { UserProfiles } from '../imports/api/userProfiles.js';

async function insertLink({ title, url }) {
  await LinksCollection.insertAsync({ title, url, createdAt: new Date() });
}

async function logActivity(userId, action, details = {}) {
  await ActivityLogsCollection.insertAsync({
    userId,
    action,
    details,
    createdAt: new Date(),
  });
}

Meteor.startup(async () => {
  // Configure GitHub OAuth
  const githubConfig = Meteor.settings.private?.github;

  if (!githubConfig?.clientId || !githubConfig?.secret) {
    console.error('GitHub OAuth credentials not found in settings!');
    console.log('Please check your settings.development.json file.');
    return;
  }

  // Remove any existing configuration
  await ServiceConfiguration.configurations.removeAsync({ service: 'github' });

  // Add new configuration
  await ServiceConfiguration.configurations.insertAsync({
    service: 'github',
    clientId: githubConfig.clientId,
    secret: githubConfig.secret,
    loginStyle: 'popup'
  });

  console.log('GitHub OAuth configured successfully');

  // Log some debug information
  console.log('Server started');
  const userCount = await Meteor.users.find().countAsync();
  const profileCount = await UserProfiles.find().countAsync();
  console.log('Number of users:', userCount);
  console.log('Number of profiles:', profileCount);

  // If the Links collection is empty, add some data.
  if (await LinksCollection.find().countAsync() === 0) {
    await insertLink({
      title: 'Do the Tutorial',
      url: 'https://www.meteor.com/tutorials/react/creating-an-app',
    });

    await insertLink({
      title: 'Follow the Guide',
      url: 'https://guide.meteor.com',
    });

    await insertLink({
      title: 'Read the Docs',
      url: 'https://docs.meteor.com',
    });

    await insertLink({
      title: 'Discussions',
      url: 'https://forums.meteor.com',
    });
  }

  // We publish the entire Links collection to all clients.
  // In order to be fetched in real-time to the clients
  Meteor.publish("links", function () {
    return LinksCollection.find();
  });

  // Set up login/logout hooks
  Accounts.onLogin(async (attempt) => {
    const userId = attempt.user._id;
    const service = attempt.type;
    await logActivity(userId, 'login', {
      service,
      userAgent: attempt.connection?.httpHeaders['user-agent'],
      loginAt: new Date(),
    });
  });

  Accounts.onLogout(async (attempt) => {
    if (attempt.user) {
      const userId = attempt.user._id;
      await logActivity(userId, 'logout', {
        logoutAt: new Date(),
      });
    }
  });
});
