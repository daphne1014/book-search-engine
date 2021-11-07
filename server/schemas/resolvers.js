const { User } = require('../models');
const { AuthenticationError } = require('apollo-server-express');
const { signToken } = require('../utils/auth');

const resolvers = {
  Query: {
    me: async (parent, args, context) => {
      if (context.user) {
        const userData = await User.findOne({ _id: context.user._id })
          .select('-__v -password')
          .populate('thoughts')
          .populate('friends');

        return userData;
      }
      throw new AuthenticationError('Not logged in');
    }
  },
  Mutation: {
    createUser: async (parent, args) => {
      const user = await User.create(args);
      const token = signToken(user);

      return { token, user };
    },
    login: async (parent, { email, password }) => {
      const user = await User.findOne({ email });

      if (!user) {
        throw new AuthenticationError('Incorrect credentials');
      }

      const correctPw = await user.isCorrectPassword(password);

      if (!correctPw) {
        throw new AuthenticationError('Incorrect credentials');
      }

      const token = signToken(user);
      return { token, user };
    },
    saveBook: async (parent, {bookId, authors, description, title, image, link}, context) => {
        if (!context.user) {
            const book = await User.findOneAndUpdate(
                {  _id: context.user._id },
                { $push: { savedBooks: { bookId, authors, description, title, image, link } } },
                { new: true, runValidators: true }
            );
            return book;
        }
        throw new AuthenticationError('Not logged in');
    },
    removeBook: async (parent, {bookId}, context) => {
        if (!context.user) {
            const book = await User.findOneAndUpdate(
                {  _id: context.user._id },
                { $pull: { savedBooks: { bookId } } },
                { new: true, runValidators: true }
            );
            return book;
        }
        throw new AuthenticationError('Not logged in');
    }
  }
};

module.exports = resolvers;
