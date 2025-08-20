import { ConverseRequest } from "./AIRequest";
import type { Response } from "express";
import { ApiTags } from "@nestjs/swagger";
import { Body, Controller, Post, Res } from "@nestjs/common";
import { Authorized } from "@app/common/decorators/authorized.decorator";
import { Converse, ConverseWithStream } from "@app/common/helpers/bedrock.helper";

@ApiTags('AI')
@Controller()
export class AIController {
  @Authorized()
  @Post("/ai/converse")
  async ConverseAI(
    @Body() data: ConverseRequest,
  ) {
    const { system, message } = data;

    const responseText = await Converse(system, message);

    return responseText;
  }

  @Authorized()
  @Post("/ai/converse-stream")
  async ConverseAIStream(
    @Body() data: ConverseRequest,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    
    try {
      res.flushHeaders?.();

      const { system, message } = data;

      const tokenGenerator = ConverseWithStream(system, message);


      for await (const token of tokenGenerator) {
        res.write("event: message\n")
        res.write(`data: ${token}\n\n`);
        res.flushHeaders?.();
      }

      res.write("data: [END]\n\n");
      res.end();
    } catch (error) {
      // Send error as SSE event since headers are already sent
      console.error(error);
      res.write("event: error\n");
      res.write("data: Internal Server Error\n\n");
      res.status(500).end();
    }
  }
}
