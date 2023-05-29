const { Groups, GroupMembers, Users } = require("../models");
const { apiResponse } = require('../helpers/apiResponse.helper');
const { encryptPassword, validatePassword } = require('../helpers/password-encryption.helper');
const constant = require('../config/constant');
const HttpStatus = require('../config/httpStatus');
const { Op } = require("sequelize");

module.exports.createGroup = (req, res) => {
    try {
        (async () => {
            let { group_name, group_users } = req.body;
            let groupIcon = (req.file) ? req.file.filename : null;

            let groupObject = {
                name: group_name,
                icon: groupIcon
            };

            let group = await Groups.create(groupObject);

            if (group) {
                let groupId = group.id;
                group_users = group_users + ',' + req.user.userId;

                if (group_users && group_users.split(",").length > 0) {
                    let userGroup = group_users.split(",").map((userId) => {
                        let element = {
                            groupId,
                            userId: Number(userId)
                        };
                        return element;
                    });

                    let checkUser = userGroup.find(data => data.userId != req.user.userId);

                    if (!checkUser && checkUser == undefined) {
                        userGroup.push({ groupId, userId: req.user.userId });
                    }

                    let isCreated = await GroupMembers.bulkCreate(userGroup);

                    if (isCreated && isCreated.length > 0) {
                        return res.json(apiResponse(HttpStatus.OK, 'Woohoo! Your group has been successfully created', {}, true));
                    } else {
                        return res.json(apiResponse(HttpStatus.OK, 'Oops, something went wrong while adding the members in group.', {}, false));
                    }
                } else {
                    return res.json(apiResponse(HttpStatus.OK, 'Woohoo! Your group has been successfully created', {}, true));
                }
            } else {
                return res.json(apiResponse(HttpStatus.OK, 'Oops, something went wrong while creating the group.', {}, false));
            }
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.getAllGroups = (req, res) => {
    try {
        (async () => {
            let getGroups = await GroupMembers.findAll({
                attributes: ['groupId'],
                where: { userId: req.user.userId }
            });

            if (getGroups && getGroups.length > 0) {
                let groupIds = getGroups.map(data => data.groupId);

                let groups = await Groups.findAll({
                    where: { id: { [Op.in]: groupIds } },
                    attributes: ['id', 'name', 'icon'],
                    include: [{
                        model: GroupMembers, // Use 'model' instead of 'Model'
                        // as: 'groupMembers',
                        attributes: ['userId'],
                        include: [{
                            model: Users, // Use 'model' instead of 'Model'
                            // as: 'user',
                            attributes: ['id', 'firstName', 'lastName', 'email', 'profilePicture']
                        }]
                    }],
                });

                return res.json(apiResponse(HttpStatus.OK, 'Success', groups, true));
            } else {
                return res.json(apiResponse(HttpStatus.NOT_FOUND, 'No data', [], false));
            }
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}