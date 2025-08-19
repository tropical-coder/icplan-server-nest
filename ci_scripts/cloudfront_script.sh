#!/usr/bin/env bash
configFilePath=cf_tag.json
distributionId=E2N4D8202MWPPW
distributionToPushPath="cloudfront_config.json"
aws cloudfront get-distribution-config --id E2N4D8202MWPPW --output json > cf_tag.json
etag=$(cat $configFilePath | python3 -c "import sys, json; print(json.load(sys.stdin)['ETag'])")
echo $etag
aws cloudfront update-distribution --distribution-config file://./ci_scripts/$distributionToPushPath --id $distributionId --if-match $etag
rm cf_tag.json