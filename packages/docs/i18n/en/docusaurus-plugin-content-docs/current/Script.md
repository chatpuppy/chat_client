---
id: script
title: Script
sidebar_label: Script
---

ChatPuppy has a built-in command line tool to manage the server. Execute `ChatPuppy` to view the tool

**Note!** Most of these scripts will directly modify the database. It is recommended (but not necessary) to backup the database in advance and stop the server before executing

## deleteMessages

`ChatPuppy deleteMessages`

Delete all historical message records, if the message pictures and files are stored on the server, they can also be deleted together

## deleteTodayRegisteredUsers

`ChatPuppy deleteTodayRegisteredUsers`

Delete all newly registered users on the day (based on server time)

## deleteUser

`ChatPuppy deleteUser [userId]`

Delete the specified user, delete its historical messages, exit the group that it has joined, and delete all its friends

## doctor

`ChatPuppy doctor`

Check the server configuration and status, which can be used to locate the cause of the server startup failure

## fixUsersAvatar

`ChatPuppy fixUsersAvatar`

Fix user error avatar path, please modify the script judgment logic according to your actual situation

## getUserId

`ChatPuppy getUserId [username]`

Get the userId of the specified user name

## register

`ChatPuppy register [username] [password]`

Register new users, when registration is prohibited, the administrator can register new users through it

## updateDefaultGroupName

`ChatPuppy updateDefaultGroupName [newName]`

Update default group name