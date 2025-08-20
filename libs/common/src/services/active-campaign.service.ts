import axios, { AxiosInstance } from "axios";
import * as Sentry from "@sentry/node";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ActiveCampaignService {
  private client: AxiosInstance;

  constructor(private configService: ConfigService) {
    const accountUrl = this.configService.get("AC_ACCOUNT_URL");
    const apiKey = this.configService.get("AC_API_KEY");

    this.client = axios.create({
      baseURL: `${accountUrl}/api/3`,
      headers: {
        "Api-Token": apiKey
      }
    });
  }

  public async CreateContact(
    email: string,
    fullName: string,
    companyName: string
  ) {
    if (!this.configService.get("AC_ENABLED")) return;
    try {
      const { data } = await this.client.post("/contact/sync", {
        contact: {
          email,
          firstName: fullName,
          fieldValues: [
            {
              field: this.configService.get("AC_FIELD_COMPANY"),
              value: companyName,
            },
          ],
        },
      });

      return data.contact;
    } catch (error: any) {
      error.name = "ActiveCampaign Error";
      error.message = error.response?.data?.message;
      console.error(error.response?.data);
      throw new error;
    }
  }

  public async AddContactToList(contactId: number, listId: number) {
    if (!this.configService.get("AC_ENABLED")) return;
    try {
      await this.client.post("/contactLists", {
        contactList: { contact: contactId, list: listId, status: 1 },
      });
    } catch (error: any) {
      error.name = "ActiveCampaign Error";
      console.error(error.response?.data);
      Sentry.captureException(error);
      return;
    }
  }

  public async RemoveContactFromList(contactId: number, listId: number) {
    if (!this.configService.get("AC_ENABLED")) return;
    try {
      await this.client.post("/contactLists", {
        contactList: { contact: contactId, list: listId, status: 2 },
      });
    } catch (error: any) {
      error.name = "ActiveCampaign Error";
      console.error(error.response?.data);
      Sentry.captureException(error);
      return;
    }
  }

  public async SubscribeContactToPaidList(contactId: number) {
    if (!this.configService.get("AC_ENABLED")) return;

    await this.RemoveContactFromList(contactId, this.configService.get("AC_LIST_FREE_TRIAL")!);
    await this.RemoveContactFromList(contactId, this.configService.get("AC_LIST_EXTENDED_TRIAL")!);
    await this.AddContactToList(contactId, this.configService.get("AC_LIST_PAID")!);
  }

  public async UpdateCustomFieldValue(
    contactEmail: string,
    fieldValues: Array<{ field: number; value }>
  ) {
    if (!this.configService.get("AC_ENABLED")) return;
    try {
      await this.client.post("/contact/sync", {
        contact: { email: contactEmail, fieldValues },
      });
    } catch (error: any) {
      error.name = "ActiveCampaign Error";
      console.error(error.response?.data);
      Sentry.captureException(error);
      return;
    }
  }

  public async AddTagToContact(contactId: number, tagId: number) {
    if (!this.configService.get("AC_ENABLED")) return;
    try {
      await this.client.post("/contactTags", {
        contactTag: { contact: contactId, tag: tagId },
      });
    } catch (error: any) {
      error.name = "ActiveCampaign Error";
      console.error(error.response?.data);
      Sentry.captureException(error);
      return;
    }
  }

  public async RemoveTagFromContact(contactId: number, tagId: number) {
    if (!this.configService.get("AC_ENABLED")) return;
    try {
      // fetch the contact tags
      const { data } = await this.client.get(`/contacts/${contactId}/contactTags`);

      const contactTagId = data.contactTags.find(ct => ct.tag == tagId)?.id;
      if (contactTagId) {
        await this.client.delete(`/contactTags/${contactTagId}`);
      }
    } catch (error: any) {
      error.name = "ActiveCampaign Error";
      console.error(error.response?.data);
      Sentry.captureException(error);
      return;
    }
  }

  public async DeleteContact(contactId: number) {
    if (!this.configService.get("AC_ENABLED")) return;
    try {
      await this.client.delete(`/contacts/${contactId}`);
    } catch (error: any) {
      error.name = "ActiveCampaign Error";
      console.error(error.response?.data);
      Sentry.captureException(error);
      return;
    }
  }
}