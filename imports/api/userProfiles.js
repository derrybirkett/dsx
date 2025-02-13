import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { HTTP } from 'meteor/http';
import { Accounts } from 'meteor/accounts-base';

// Create the collection
export const UserProfiles = new Mongo.Collection('userProfiles');

if (Meteor.isServer) {
  // Ensure publications are registered at startup
  Meteor.startup(() => {
    console.log('Registering publications');
    
    Meteor.publish('userProfile', function (targetUserId) {
      console.log('Publishing userProfile for userId:', targetUserId);
      
      const userId = targetUserId || this.userId;
      
      if (!userId) {
        console.log('No userId, returning empty publication');
        return this.ready();
      }
      
      const profile = UserProfiles.find(
        { userId },
        {
          fields: {
            userId: 1,
            bio: 1,
            location: 1,
            company: 1,
            githubUsername: 1,
            githubUrl: 1,
            githubFollowers: 1,
            githubFollowing: 1,
            githubRepos: 1,
            topRepositories: 1,
            updatedAt: 1
          }
        }
      );
      console.log('Found profile:', profile.fetch());
      return profile;
    });

    // Publish all user profiles
    Meteor.publish('allUserProfiles', function () {
      console.log('Publishing all user profiles');
      
      try {
        // Create stable cursors with specific fields
        const profilesCursor = UserProfiles.find(
          {},
          {
            fields: {
              userId: 1,
              bio: 1,
              location: 1,
              company: 1,
              githubUsername: 1,
              githubUrl: 1,
              updatedAt: 1
            }
          }
        );

        const usersCursor = Meteor.users.find(
          {},
          {
            fields: {
              'profile': 1,
              'services.github.username': 1,
              'services.github.avatar_url': 1,
              'services.github.profile.avatar_url': 1
            }
          }
        );

        // Log data asynchronously without blocking publication
        Promise.resolve().then(async () => {
          try {
            const profileCount = await profilesCursor.countAsync();
            const userCount = await usersCursor.countAsync();
            const profiles = await profilesCursor.fetchAsync();
            
            console.log('Publishing data:', {
              profileCount,
              userCount,
              profiles: profiles.map(p => ({
                userId: p.userId,
                username: p.githubUsername
              }))
            });
          } catch (error) {
            console.error('Error logging publication data:', error);
          }
        });

        // Set up observer to log changes
        profilesCursor.observe({
          added: (doc) => console.log('Profile added:', doc.userId),
          removed: (doc) => console.log('Profile removed:', doc.userId),
          changed: (newDoc, oldDoc) => console.log('Profile changed:', newDoc.userId)
        });

        return [profilesCursor, usersCursor];
      } catch (error) {
        console.error('Error in allUserProfiles publication:', error);
        return this.ready();
      }
    });

    // Publish single user data
    Meteor.publish('userData', function(targetUserId) {
      console.log('Publishing userData for:', targetUserId);
      
      const userId = targetUserId || this.userId;
      
      if (!userId) {
        console.log('No userId provided for userData publication');
        return this.ready();
      }

      return Meteor.users.find(
        { _id: userId },
        {
          fields: {
            'profile': 1,
            'services.github.username': 1,
            'services.github.avatar_url': 1,
            'services.github.profile.avatar_url': 1,
            'services.github.email': 1,
            'services.github.name': 1
          }
        }
      );
    });
    
    console.log('Publications registered');
  });

  // Ensure indexes
  Meteor.startup(async () => {
    await UserProfiles.createIndexAsync({ userId: 1 }, { unique: true });
  });

  // Function to fetch GitHub profile data
  const fetchGitHubProfile = async (accessToken) => {
    console.log('Fetching GitHub profile with token:', accessToken?.slice(0, 4) + '...');
    try {
      const result = await HTTP.get('https://api.github.com/user', {
        headers: {
          'User-Agent': 'Meteor App',
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      // Fetch user's repositories
      const reposResult = await HTTP.get('https://api.github.com/user/repos', {
        headers: {
          'User-Agent': 'Meteor App',
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        params: {
          sort: 'updated',
          per_page: 100,
          direction: 'desc'
        }
      });

      // Sort repositories by stars and get top 4
      const topRepos = reposResult.data
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 4)
        .map(repo => ({
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          url: repo.html_url
        }));

      console.log('GitHub profile data:', {
        login: result.data.login,
        name: result.data.name,
        bio: result.data.bio,
        location: result.data.location,
        company: result.data.company,
        avatar_url: result.data.avatar_url,
        topReposCount: topRepos.length
      });

      return {
        ...result.data,
        topRepositories: topRepos
      };
    } catch (error) {
      console.error('Error fetching GitHub profile:', {
        statusCode: error.response?.statusCode,
        message: error.message,
        response: error.response?.content
      });
      throw new Meteor.Error('github.fetch-failed', 'Failed to fetch GitHub profile: ' + error.message);
    }
  };

  // Function to fetch repository data
  const fetchGitHubRepo = async (accessToken, repoName) => {
    console.log('Fetching GitHub repo:', repoName);
    try {
      const result = await HTTP.get(`https://api.github.com/repos/${repoName}`, {
        headers: {
          'User-Agent': 'Meteor App',
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      console.log('GitHub Repo API response status:', result.statusCode);
      console.log('Repo data:', {
        name: result.data.name,
        description: result.data.description,
        stars: result.data.stargazers_count,
        forks: result.data.forks_count
      });
      return result.data;
    } catch (error) {
      console.error('Error fetching GitHub repo:', {
        statusCode: error.response?.statusCode,
        message: error.message,
        response: error.response?.content
      });
      throw new Meteor.Error('github.repo-fetch-failed', 'Failed to fetch repository: ' + error.message);
    }
  };

  // Create or update profile when user logs in with GitHub
  Accounts.onCreateUser(async (options, user) => {
    console.log('Creating new user with GitHub data:', {
      id: user._id,
      username: user.services?.github?.username,
      hasToken: !!user.services?.github?.accessToken
    });

    if (user.services?.github) {
      const { github } = user.services;
      const accessToken = github.accessToken;
      
      // Set basic profile data from GitHub
      user.profile = {
        name: github.name || github.username,
        email: github.email,
        avatar: github.avatar_url,
      };

      try {
        // Fetch full GitHub profile
        const githubProfile = await fetchGitHubProfile(accessToken);
        console.log('Successfully fetched initial GitHub profile');

        // Create initial profile document with GitHub data
        const profileData = {
          userId: user._id,
          bio: githubProfile.bio || '',
          location: githubProfile.location || '',
          company: githubProfile.company || '',
          githubUsername: githubProfile.login,
          githubUrl: githubProfile.html_url,
          githubFollowers: githubProfile.followers,
          githubFollowing: githubProfile.following,
          githubRepos: githubProfile.public_repos,
          topRepositories: githubProfile.topRepositories || [],
          createdAt: new Date(),
          updatedAt: new Date(),
          lastGithubSync: new Date()
        };

        // Use upsert instead of insert to handle potential race conditions
        await UserProfiles.upsertAsync(
          { userId: user._id },
          { $set: profileData }
        );
        
        console.log('Created/updated initial user profile:', {
          userId: user._id,
          username: githubProfile.login
        });
      } catch (error) {
        console.error('Error during user creation:', error);
        // Create basic profile even if GitHub fetch fails
        await UserProfiles.upsertAsync(
          { userId: user._id },
          {
            $set: {
              userId: user._id,
              bio: '',
              location: '',
              company: '',
              githubUsername: github.username,
              githubUrl: `https://github.com/${github.username}`,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }
        );
        console.log('Created fallback user profile');
      }
    }
    return user;
  });

  // Update profile with GitHub data after login
  Accounts.onLogin(async ({ user, type }) => {
    console.log('Login event:', { userId: user._id, type, hasGithub: !!user.services?.github });
    
    if (type !== 'github') {
      console.log('Skipping non-GitHub login');
      return;
    }

    const accessToken = user.services?.github?.accessToken;
    if (!accessToken) {
      console.error('No GitHub access token found for user:', user._id);
      return;
    }

    try {
      const githubProfile = await fetchGitHubProfile(accessToken);
      console.log('Successfully fetched GitHub profile on login');

      const updateResult = await UserProfiles.upsertAsync(
        { userId: user._id },
        {
          $set: {
            bio: githubProfile.bio || '',
            location: githubProfile.location || '',
            company: githubProfile.company || '',
            githubUsername: githubProfile.login,
            githubUrl: githubProfile.html_url,
            githubFollowers: githubProfile.followers,
            githubFollowing: githubProfile.following,
            githubRepos: githubProfile.public_repos,
            topRepositories: githubProfile.topRepositories || [],
            updatedAt: new Date(),
            lastGithubSync: new Date()
          }
        }
      );
      
      console.log('Profile update result:', updateResult);
      
      // Verify the update
      const updatedProfile = await UserProfiles.findOneAsync({ userId: user._id });
      if (!updatedProfile) {
        console.error('Failed to find updated profile after upsert');
        // If profile doesn't exist, create it
        await UserProfiles.insertAsync({
          userId: user._id,
          bio: githubProfile.bio || '',
          location: githubProfile.location || '',
          company: githubProfile.company || '',
          githubUsername: githubProfile.login,
          githubUrl: githubProfile.html_url,
          githubFollowers: githubProfile.followers,
          githubFollowing: githubProfile.following,
          githubRepos: githubProfile.public_repos,
          topRepositories: githubProfile.topRepositories || [],
          createdAt: new Date(),
          updatedAt: new Date(),
          lastGithubSync: new Date()
        });
      }
      
      console.log('Verified updated profile:', {
        userId: updatedProfile?.userId,
        username: updatedProfile?.githubUsername,
        lastSync: updatedProfile?.lastGithubSync
      });
    } catch (error) {
      console.error('Error syncing GitHub profile on login:', error);
      // If error occurs, ensure basic profile exists
      const existingProfile = await UserProfiles.findOneAsync({ userId: user._id });
      if (!existingProfile) {
        await UserProfiles.insertAsync({
          userId: user._id,
          bio: '',
          location: '',
          company: '',
          githubUsername: user.services?.github?.username,
          githubUrl: `https://github.com/${user.services?.github?.username}`,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
  });
}

Meteor.methods({
  async 'userProfiles.update'(bio, location, company) {
    check(bio, String);
    check(location, String);
    check(company, String);

    if (!this.userId) {
      throw new Meteor.Error('Not authorized.');
    }

    return await UserProfiles.upsertAsync(
      { userId: this.userId },
      {
        $set: {
          bio,
          location,
          company,
          updatedAt: new Date()
        }
      }
    );
  },

  async 'userProfiles.syncGithub'() {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in to sync GitHub profile.');
    }

    console.log('Manual GitHub sync requested for user:', this.userId);

    const user = await Meteor.users.findOneAsync(this.userId);
    const accessToken = user.services?.github?.accessToken;
    
    if (!accessToken) {
      console.error('No GitHub access token found for manual sync:', this.userId);
      throw new Meteor.Error('github.no-token', 'No GitHub access token available. Please try logging out and back in.');
    }

    try {
      const githubProfile = await fetchGitHubProfile(accessToken);
      console.log('Successfully fetched GitHub profile for manual sync');

      const updateResult = await UserProfiles.upsertAsync(
        { userId: this.userId },
        {
          $set: {
            bio: githubProfile.bio || '',
            location: githubProfile.location || '',
            company: githubProfile.company || '',
            githubUsername: githubProfile.login,
            githubUrl: githubProfile.html_url,
            githubFollowers: githubProfile.followers,
            githubFollowing: githubProfile.following,
            githubRepos: githubProfile.public_repos,
            topRepositories: githubProfile.topRepositories || [],
            updatedAt: new Date(),
            lastGithubSync: new Date()
          }
        }
      );

      console.log('Manual sync update result:', updateResult);
      return updateResult;
    } catch (error) {
      console.error('Error during manual GitHub sync:', error);
      throw new Meteor.Error('github.sync-failed', 'Failed to sync with GitHub: ' + error.message);
    }
  }
}); 