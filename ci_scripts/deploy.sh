#!/bin/bash
    
if [ "$DEPLOYMENT_GROUP_NAME" == "dev" ]
then
    pm2 stop /var/www/dev/icplan-server/build/api/Server.js --name "ICPLAN_API_Dev"
    pm2 stop /var/www/dev/icplan-server/build/admin/Server.js --name "Admin_API_Dev"
    pm2 stop /var/www/dev/icplan-server/build/schedule/MainScheduler.js --name "Scheduler_Dev"
    pm2 stop /var/www/dev/icplan-server/build/sso/Server.js --name "SSO_Dev"
    sudo rm -rf /var/www/dev/icplan-server/*
    sudo rm -rf /var/www/dev/icplan-server/.env
    sudo cp -R /var/www/temp/* /var/www/dev/icplan-server
    sudo cp -R /var/www/temp/dev-env /var/www/dev/icplan-server/.env
    sudo chmod 755 /var/www/dev/icplan-server/ci_scripts/start_server
    #sudo cp /var/www/dev/icplan-server/ci_scripts/dev-redis-cli.conf /etc/stunnel/redis-cli.conf
    cd /var/www/dev/icplan-server/
    pm2 start ./build/api/Server.js --name="ICPLAN_API_Dev" -i max
    pm2 start ./build/admin/Server.js --name "Admin_API_Dev"
    pm2 start ./build/schedule/MainScheduler.js --name "Scheduler_Dev"
    pm2 start ./build/sso/Server.js --name "SSO_Dev"
    sudo kill -9 $(sudo lsof -t -i:6379)
    sudo rm /var/www/dev/icplan-server/dev-env
    sudo rm /var/www/dev/icplan-server/qa-env
    sudo rm /var/www/dev/icplan-server/stg-env
    sudo rm /var/www/dev/icplan-server/prod-env

fi

if [ "$DEPLOYMENT_GROUP_NAME" == "devtfl" ]
then
    mkdir -p /var/www/devtfl/icplan-server/
    pm2 stop /var/www/devtfl/icplan-server/build/api/Server.js --name "ICPLAN_API_DevTfl"
    pm2 stop /var/www/devtfl/icplan-server/build/admin/Server.js --name "Admin_API_DevTfl"
    pm2 stop /var/www/devtfl/icplan-server/build/schedule/MainScheduler.js --name "Scheduler_DevTfl"
    pm2 stop /var/www/devtfl/icplan-server/build/sso/Server.js --name "SSO_DevTfl"
    sudo rm -rf /var/www/devtfl/icplan-server/*
    sudo rm -rf /var/www/devtfl/icplan-server/.env
    sudo cp -R /var/www/temp/* /var/www/devtfl/icplan-server
    sudo cp -R /var/www/temp/devtfl-env /var/www/devtfl/icplan-server/.env
    sudo chmod 755 /var/www/devtfl/icplan-server/ci_scripts/start_server
    #sudo cp /var/www/devtfl/icplan-server/ci_scripts/dev-redis-cli.conf /etc/stunnel/redis-cli.conf
    cd /var/www/devtfl/icplan-server/
    pm2 start ./build/api/Server.js --name="ICPLAN_API_DevTfl" -i max
    pm2 start ./build/admin/Server.js --name "Admin_API_DevTfl"
    pm2 start ./build/schedule/MainScheduler.js --name "Scheduler_DevTfl"
    pm2 start ./build/sso/Server.js --name "SSO_DevTfl"
    sudo kill -9 $(sudo lsof -t -i:6379)
    sudo rm /var/www/devtfl/icplan-server/dev-env
    sudo rm /var/www/devtfl/icplan-server/devtfl-env
    sudo rm /var/www/devtfl/icplan-server/qa-env
    sudo rm /var/www/devtfl/icplan-server/stg-env
    sudo rm /var/www/devtfl/icplan-server/prod-env

fi

if [ "$DEPLOYMENT_GROUP_NAME" == "qa" ]
then
    pm2 stop /var/www/qa/icplan-server/build/api/Server.js --name "ICPLAN_API_QA"
    pm2 stop /var/www/qa/icplan-server/build/admin/Server.js --name "Admin_API_QA"
    pm2 stop /var/www/qa/icplan-server/build/schedule/MainScheduler.js --name "Scheduler_QA"
    pm2 stop /var/www/qa/icplan-server/build/sso/Server.js --name "SSO_QA"
    sudo rm -rf /var/www/qa/icplan-server/*
    sudo rm -rf /var/www/qa/icplan-server/.env
    sudo cp -R /var/www/temp/* /var/www/qa/icplan-server
    sudo cp -R /var/www/temp/qa-env /var/www/qa/icplan-server/.env
    sudo chmod 755 /var/www/qa/icplan-server/ci_scripts/start_server
    #sudo cp /var/www/qa/icplan-server/ci_scripts/dev-redis-cli.conf /etc/stunnel/redis-cli.conf
    cd /var/www/qa/icplan-server/
    pm2 start ./build/api/Server.js --name="ICPLAN_API_QA" -i max
    pm2 start ./build/admin/Server.js --name "Admin_API_QA"
    pm2 start ./build/schedule/MainScheduler.js --name "Scheduler_QA"
    pm2 start ./build/sso/Server.js --name "SSO_QA"
    sudo kill -9 $(sudo lsof -t -i:6379)
    sudo rm /var/www/qa/icplan-server/dev-env
    sudo rm /var/www/qa/icplan-server/qa-env
    sudo rm /var/www/qa/icplan-server/stg-env
    sudo rm /var/www/qa/icplan-server/prod-env

fi



if [ "$DEPLOYMENT_GROUP_NAME" == "stg" ]
then
    
    pm2 stop /var/www/stg/icplan-server/build/api/Server.js --name "ICPLAN_API_Stg"
    pm2 stop /var/www/stg/icplan-server/build/admin/Server.js --name "Admin_API_Stg"
    pm2 stop /var/www/stg/icplan-server/build/schedule/MainScheduler.js --name "Scheduler_Stg"
    pm2 stop /var/www/stg/icplan-server/build/sso/Server.js --name "SSO_Stg"
    sudo rm -rf /var/www/stg/icplan-server/*
    sudo rm -rf /var/www/stg/icplan-server/.env
    sudo cp -R /var/www/temp/* /var/www/stg/icplan-server
    sudo cp -R /var/www/temp/stg-env /var/www/stg/icplan-server/.env
    sudo chmod 755 /var/www/stg/icplan-server/ci_scripts/start_server
    #sudo cp /var/www/stg/icplan-server/ci_scripts/stg-redis-cli.conf /etc/stunnel/redis-cli.conf
    cd /var/www/stg/icplan-server/
    sudo source 
    pm2 start ./build/api/Server.js --name="ICPLAN_API_Stg" -i max
    pm2 start ./build/admin/Server.js --name "Admin_API_Stg"
    pm2 start ./build/schedule/MainScheduler.js --name "Scheduler_Stg"
    pm2 start ./build/sso/Server.js --name "SSO_Stg"
    sudo kill -9 $(sudo lsof -t -i:6379)
    sudo rm /var/www/stg/icplan-server/dev-env
    sudo rm /var/www/devtfl/icplan-server/devtfl-env
    sudo rm /var/www/stg/icplan-server/qa-env
    sudo rm /var/www/stg/icplan-server/stg-env
    sudo rm /var/www/stg/icplan-server/prod-env

fi

if [ "$DEPLOYMENT_GROUP_NAME" == "prod" ]
then
    pm2 stop /var/www/prod/icplan-server/build/api/Server.js --name "ICPLAN_API_Prod"
    pm2 stop /var/www/prod/icplan-server/build/admin/Server.js --name "Admin_API_Prod"
    pm2 stop /var/www/prod/icplan-server/build/schedule/MainScheduler.js --name "Scheduler_Prod"
    pm2 stop /var/www/prod/icplan-server/build/sso/Server.js --name "SSO_Prod"
    sudo rm -rf /var/www/prod/icplan-server/*
    sudo rm -rf /var/www/prod/icplan-server/.env
    sudo cp -R /var/www/temp/* /var/www/prod/icplan-server
    sudo cp -R /var/www/temp/prod-env /var/www/prod/icplan-server/.env
    sudo chmod 755 /var/www/prod/icplan-server/ci_scripts/start_server
    #sudo cp /var/www/prod/icplan-server/ci_scripts/prod-redis-cli.conf /etc/stunnel/redis-cli.conf
    cd /var/www/prod/icplan-server/
    pm2 start ./build/api/Server.js --name="ICPLAN_API_Prod" -i max
    pm2 start ./build/admin/Server.js --name "Admin_API_Prod"
    pm2 start ./build/schedule/MainScheduler.js --name "Scheduler_Prod"
    pm2 start ./build/sso/Server.js --name "SSO_Prod"
    sudo kill -9 $(sudo lsof -t -i:6379)
    sudo rm /var/www/prod/icplan-server/dev-env
    sudo rm /var/www/devtfl/icplan-server/devtfl-env
    sudo rm /var/www/prod/icplan-server/qa-env
    sudo rm /var/www/prod/icplan-server/stg-env
    sudo rm /var/www/prod/icplan-server/prod-env

fi
