import { Mongo } from 'meteor/mongo';

export const ActivityLogsCollection = new Mongo.Collection('activityLogs');

// Define allowed fields and operations if needed
if (Meteor.isServer) {
  Meteor.publish('activityLogs', function () {
    return ActivityLogsCollection.find(
      { userId: this.userId },
      { sort: { createdAt: -1 }, limit: 50 }
    );
  });
} 