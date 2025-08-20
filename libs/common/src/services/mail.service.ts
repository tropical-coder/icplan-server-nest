import nodemailer from "nodemailer";
import * as handlebars from "handlebars";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SubdomainMap } from "../constants/subdomain.constant";
import { ReadHTMLTemplate } from "../helpers/misc.helper";

@Injectable()
export class MailService {
  // smtp configuration for nodemailer
  public transporter: nodemailer.Transporter;

  constructor(
    private configService: ConfigService,
  ) {
    handlebars.registerHelper('currentYear', function() {
      return new Date().getFullYear();
    });
    this.transporter = nodemailer.createTransport({
      host: this.configService.get("SMTP_SERVER", "mail.icplan.com"),
      port: this.configService.get("SMTP_PORT", 465),
      secure: true,
      auth: {
        user: this.configService.get("SMTP_EMAIL_USER", "AKIAXED4ANL5DKJAJGPD"),
        pass: this.configService.get("SMPT_EMAIL_PASSWORD", "BI/QJJptski2LCKoBkhD/lvhe4lJwq8rV4kJMaYWmLpx"),
      },
    });
  }

  public async SendMail(templateName: string, model: any, mailOptions: any, subdomain: string) {
    subdomain = SubdomainMap[subdomain] || "default";
    let html = ReadHTMLTemplate(templateName, subdomain);
    const template = handlebars.compile(html);
    const htmlToSend = template(model);

    mailOptions.from = mailOptions.from
      ? mailOptions.from
      : this.configService.get("SMTP_EMAIL_USER", "AKIAXED4ANL5DKJAJGPD");
    mailOptions.html = htmlToSend;
    try {
      if (
        this.configService.get("SMTP_ENABLED", false) &&
        mailOptions.to.indexOf("@demoaccount.com") == -1
      ) {
        let info = await this.transporter.sendMail(mailOptions);
        console.log(info);
      }
    } catch (e) {
      console.log(e.stack);
      console.log(e.message);
    }
  }
}
