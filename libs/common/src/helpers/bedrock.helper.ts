import { BedrockRuntimeClient, ConversationRole, ConverseCommand, ConverseStreamCommand } from "@aws-sdk/client-bedrock-runtime";
import { appEnv } from "./env.helper";

const client = new BedrockRuntimeClient({
  region: appEnv("AWS_REGION", "eu-west-1"),
  credentials: {
    secretAccessKey: appEnv("AWS_SECRET_ACCESS_KEY"),
    accessKeyId: appEnv("AWS_ACCESS_KEY_ID"),
  },
});

export async function Converse(system: string, message: string): Promise<string> {
  const modelId = appEnv("AWS_BEDROCK_MODEL_ID", "meta.llama3-2-3b-instruct-v1:0");
  const command = new ConverseCommand({
    modelId,
    system: [{ text: system }],
    messages: [
      {
        role: ConversationRole.USER,
        content: [{ text: message }],
      },
    ]
  });

  const response = await client.send(command);

  const responseText = response.output?.message?.content?.[0]?.text ?? "";
  return responseText;
}

export async function* ConverseWithStream(system: string, message: string) {
  const modelId = appEnv("AWS_BEDROCK_MODEL_ID", "meta.llama3-2-3b-instruct-v1:0");
  const command = new ConverseStreamCommand({
    modelId,
    system: [{ text: system }],
    messages: [
      {
        role: "user",
        content: [{ text: message }],
      },
    ]
  });

  const response = await client.send(command);

  if (!response.stream) {
    throw new Error("No response stream from AWS Bedrock");
  }

  for await (const item of response.stream) {
    if (item.contentBlockDelta) {
      yield item.contentBlockDelta.delta?.text;
    }
  }
}