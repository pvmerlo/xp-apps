var graphQl = require('/lib/graphql');

var principals = require('principals');

var graphQlEnums = require('../enums');

var graphQlUserItem = require('./userItem');

var UserStoreAccessControlEntryType = graphQl.createObjectType({
    name: 'UserStoreAccessControlEntry',
    description: 'Domain representation of user store access control entry',
    fields: {
        principal: {
            type: graphQl.reference('Principal'),
            resolve: function(env) {
                return principals.getByKeys(env.source.principal);
            }
        },
        access: {
            type: graphQlEnums.UserStoreAccessEnum
        }
    }
});

exports.AuthConfig = graphQl.createObjectType({
    name: 'AuthConfig',
    description: 'Domain representation of auth config for user store',
    fields: {
        applicationKey: {
            type: graphQl.GraphQLString
        },
        config: {
            type: graphQl.GraphQLString,
            resolve: function(env) {
                return JSON.stringify(env.source.config);
                //TODO Create object type for property array
            }
        }
    }
});

exports.UserStoreType = graphQl.createObjectType({
    name: 'UserStore',
    description: 'Domain representation of a user store',
    interfaces: [graphQlUserItem.UserItemType],
    fields: {
        id: { //TODO Remove
            type: graphQl.GraphQLID,
            resolve: function(env) {
                return env.source._id; 
            }
        },
        key: {
            type: graphQl.GraphQLString,
            resolve: function(env) {
                return env.source.key;
            }
        },
        name: { //TODO Remove
            type: graphQl.GraphQLString,
            resolve: function(env) {
                return env.source._name;
            }
        },
        path: { //TODO Remove
            type: graphQl.GraphQLString,
            resolve: function(env) {
                return env.source._path;
            }
        },
        displayName: {
            type: graphQl.GraphQLString
        },
        description: {
            type: graphQl.GraphQLString
        },
        authConfig: {
            type: exports.AuthConfig
        },
        idProviderMode: {
            type: graphQlEnums.IdProviderModeEnum
        },
        permissions: {
            type: graphQl.list(UserStoreAccessControlEntryType),
            resolve: function(env) {
                return env.source.access;
            }
        },
        modifiedTime: {
            type: graphQl.GraphQLString,
            resolve: function(env) {
                return env.source._timestamp;
            }
        }
    }
});
graphQlUserItem.typeResolverMap.userStoreType = exports.UserStoreType;

exports.UserStoreDeleteType = graphQl.createObjectType({
    name: 'UserStoreDelete',
    description: 'Result of a userStore delete operation',
    fields: {
        userStoreKey: {
            type: graphQl.GraphQLString,
            resolve: function(env) {
                return env.source.key;
            }
        },
        deleted: {
            type: graphQl.GraphQLBoolean
        },
        reason: {
            type: graphQl.GraphQLString
        }
    }
});
