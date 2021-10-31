const { User, Book } = require('../models');
const { AuthenticationError } = require('apollo-server-express');
const { signToken } = require('../utils/auth');

const resolvers = {
    Query: {
        me: async (parent, args, context) => {
            if (context.user) {
                const userData = await User.findOne({ _id: context.user._id }
                    .select('-__v -password')
                    .populate('books'));
                return userData;
            }
            throw new AuthenticationError('You must be logged in to view this data');
        },
        users: async () => {
            return User.find()
                .select('-__v -password')
                .populate('books');
        },
        user: async (parent, { username }) => {
            return User.findOne({ username })
                .select('-__v -password')
                .populate('books');
        },
        books: async (parent, { username }) => {
            const params = username ? { username } : {};
            return Book.find(params)
        },
        book: async (parent, { bookId }) => {
            return Book.findOne({ bookId })
        }
    },
    Mutation: {
        addUser: async (parent, args) => {
            const user = await User.create(args);
            const token = signToken(user);
            return {
                token,
                user
            };
        },
        login: async (parent, { email, password }) => {
            const user = await User.findOne({email});
            if (!user) {
                throw new AuthenticationError('Invalid credentials');
            }
            const correctPassword = await user.isCorrectPassword(password);

            if (!correctPassword) {
                throw new AuthenticationError('Invalid credentials');
            }
            const token = signToken(user);
            return {token, user};
        },
        addBook: async (parent, args, context) => {
            if (context.user) {
                const book = await Book.create({ ...args, username: context.user.username});
                await User.findOneAndUpdate(
                    { _id: context.user._id },
                    { $push: { books: book.bookId } },
                    { new: true }
                );
                return book;
            }
            throw new AuthenticationError('You must be logged in to add a book');
        },
        deleteBook: async (parent, { bookId }, context) => {
            if (context.user) {
                const book = await Book.findOneAndDelete({ bookId });
                await User.findOneAndUpdate(
                    { _id: context.user._id },
                    { $pull: { books: bookId } },
                    { new: true }
                );
                return book;
            }
            throw new AuthenticationError('You must be logged in to delete a book');
        }
    }
};