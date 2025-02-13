import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { HTTP } from 'meteor/http';
import { Accounts } from 'meteor/accounts-base';

export const UserProfiles = new Mongo.Collection('userProfiles');

if (Meteor.isServer) {
  Meteor.publish('userProfile', function () {
    console.log('Publishing userProfile for userId:', this.userId);
    
    if (!this.userId) {
      console.log('No userId, returning empty publication');
      return this.ready();
    }
    
    const profile = UserProfiles.find({ userId: this.userId });
    console.log('Found profile:', profile.fetch());
    return profile;
  });

  // Ensure indexes
  Meteor.startup(async () => {
    await UserProfiles.createIndexAsync({ userId: 1 }, { unique: true });
  });

  // Function to fetch GitHub profile data
  const fetchGitHubProfile = async (accessToken) => {
    try {
      const result = await HTTP.get('https://api.github.com/user', {
        headers: {
          'User-Agent': 'Meteor App',
          'Authorization': `Bearer ${accessToken}`
        }
      });
      console.log('GitHub API response:', result.data);
      return result.data;
    } catch (error) {
      console.error('Error fetching GitHub profile:', error);
      return null;
    }
  };

  // Function to fetch repository data
  const fetchGitHubRepo = async (accessToken, repoName) => {
    try {
      const result = await HTTP.get(`https://api.github.com/repos/${repoName}`, {
        headers: {
          'User-Agent': 'Meteor App',
          'Authorization': `Bearer ${accessToken}`
        }
      });
      console.log('GitHub Repo response:', result.data);
      return result.data;
    } catch (error) {
      console.error('Error fetching GitHub repo:', error);
      return null;
    }
  };

  // Create or update profile when user logs in with GitHub
  Accounts.onCreateUser(async (options, user) => {
    console.log('Creating new user:', user);
    if (user.services?.github) {
      const { github } = user.services;
      const accessToken = github.accessToken;
      
      // Set basic profile data from GitHub
      user.profile = {
        name: github.name || github.username,
        email: github.email,
        avatar: github.avatar_url,
      };

      // Fetch full GitHub profile
      const githubProfile = await fetchGitHubProfile(accessToken);
      console.log('Initial GitHub profile fetch:', githubProfile);

      // Create initial profile document with GitHub data
      if (githubProfile) {
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
          createdAt: new Date(),
          updatedAt: new Date(),
          lastGithubSync: new Date()
        });
      } else {
        // Fallback if GitHub profile fetch fails
        await UserProfiles.insertAsync({
          userId: user._id,
          bio: '',
          location: '',
          company: '',
          createdAt: new Date()
        });
      }
    }
    return user;
  });

  // Update profile with GitHub data after login
  Accounts.onLogin(async ({ user, type }) => {
    console.log('User logged in:', type, user._id);
    if (type !== 'github') return;

    const accessToken = user.services?.github?.accessToken;
    if (!accessToken) {
      console.log('No access token found');
      return;
    }

    const githubProfile = await fetchGitHubProfile(accessToken);
    if (!githubProfile) {
      console.log('Failed to fetch GitHub profile');
      return;
    }

    console.log('GitHub profile data:', {
      bio: githubProfile.bio,
      location: githubProfile.location,
      company: githubProfile.company
    });

    console.log('Updating profile with GitHub data');
    // Update or create user profile with GitHub data
    try {
      await UserProfiles.upsertAsync(
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
            updatedAt: new Date(),
            lastGithubSync: new Date()
          }
        }
      );
      
      // Verify the update
      const updatedProfile = await UserProfiles.findOneAsync({ userId: user._id });
      console.log('Updated profile:', updatedProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
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
      throw new Meteor.Error('Not authorized.');
    }

    if (Meteor.isServer) {
      const user = await Meteor.users.findOneAsync(this.userId);
      const accessToken = user.services?.github?.accessToken;
      
      if (!accessToken) {
        throw new Meteor.Error('No GitHub access token available.');
      }

      const githubProfile = await fetchGitHubProfile(accessToken);
      if (!githubProfile) {
        throw new Meteor.Error('Failed to fetch GitHub profile.');
      }

      return await UserProfiles.upsertAsync(
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
            updatedAt: new Date(),
            lastGithubSync: new Date()
          }
        }
      );
    }
  },

  async 'userProfiles.connectRepo'(repoName) {
    if (!this.userId) {
      throw new Meteor.Error('Not authorized.');
    }

    check(repoName, String);

    if (Meteor.isServer) {
      const user = await Meteor.users.findOneAsync(this.userId);
      const accessToken = user.services?.github?.accessToken;
      
      if (!accessToken) {
        throw new Meteor.Error('No GitHub access token available.');
      }

      const repoData = await fetchGitHubRepo(accessToken, repoName);
      if (!repoData) {
        throw new Meteor.Error('Failed to fetch repository data.');
      }

      return await UserProfiles.updateAsync(
        { userId: this.userId },
        {
          $set: {
            connectedRepo: repoName,
            repoData: {
              name: repoData.name,
              description: repoData.description,
              stars: repoData.stargazers_count,
              forks: repoData.forks_count,
              url: repoData.html_url,
              updatedAt: new Date()
            }
          }
        }
      );
    }
  }
}); 