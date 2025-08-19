import { ChangeResourceRecordSetsCommandInput, Route53 } from "@aws-sdk/client-route-53";
import { appEnv } from "./env.helper";
import { BadRequestException } from "@nestjs/common";

const route53 = new Route53({
  region: appEnv("AWS_REGION", "eu-west-1"),
  credentials: {
    secretAccessKey: appEnv("AWS_SECRET_ACCESS_KEY"),
    accessKeyId: appEnv("AWS_ACCESS_KEY_ID"),
  },
});

export async function CreateSubdomain(subdomain: string) {
  const params: ChangeResourceRecordSetsCommandInput = {
    ChangeBatch: {
      Changes: [
        {
          Action: "CREATE",
          ResourceRecordSet: {
            AliasTarget: {
              DNSName: appEnv("CLOUDFRONT_DISTRIBUTION", "dy4cl6np639k1.cloudfront.net"),
              EvaluateTargetHealth: false,
              HostedZoneId: "Z2FDTNDATAQYW2", // Cloudfront zone id is same for all
            },
            Name: `${subdomain}.icplan.com`,
            Type: "A",
          },
        },
      ],
      Comment: "Subdomain created by admin",
    },
    HostedZoneId: appEnv("HOSTED_ZONE_ID", "Z3I587SNVUSAF1") // icplan.com zone id,
  };

  try {
    await route53.changeResourceRecordSets(params);
  } catch (error) {
    console.log(error)
    throw new BadRequestException(error.message);
  }
  return true;
}

export async function DeleteSubdomain(subdomain: string) {
  const params: ChangeResourceRecordSetsCommandInput = {
    ChangeBatch: {
      Changes: [
        {
          Action: "DELETE", 
          ResourceRecordSet: {
            Name: `${subdomain}.icplan.com`,
            Type: "A",
            AliasTarget: {
              DNSName: appEnv("CLOUDFRONT_DISTRIBUTION", "dy4cl6np639k1.cloudfront.net"),
              EvaluateTargetHealth: false,
              HostedZoneId: "Z2FDTNDATAQYW2", // Cloudfront zone id is same for all
            },
          }
        }
      ]
    },
    HostedZoneId: appEnv("HOSTED_ZONE_ID", "Z3I587SNVUSAF1")
  };

  try {
    await route53.changeResourceRecordSets(params);
  } catch (error) {
    console.log(error);
    throw new BadRequestException(error.message);
  }
  return true;
}