import { FileRepository } from "../../repository/file/FileRepository";

import { FileModel } from "../../model/file/FileModel";
import { DeleteAWSFile } from "../aws/MediaService";
import { IRedisUserModel } from "../../model/user/UserModel";

@Injectable()
export class FileService {
  constructor(private fileRepository: FileRepository) {}

  public async Create(file, user: IRedisUserModel): Promise<FileModel> {
    let fileObject = new FileModel();
    fileObject.size = file.size || null;
    fileObject.mime_type = file.mime_type || null;
    fileObject.company_id = user.company_id;
    fileObject.path = file.path || `${file.location}`;
    fileObject.name = file.name || file.originalname;
    fileObject.is_aws = file.is_aws || false;
    fileObject.created_by = user.Id;

    let fileModel = await this.fileRepository.Create(fileObject);
    return fileModel;
  }

  public async Update(fileId: number, data) {
    await this.fileRepository.Update({ Id: fileId }, data);
    return true;
  }

  public async CreateMultiple(
    files,
    user: IRedisUserModel
  ): Promise<Array<FileModel>> {
    const filePromises = files.map((file) => this.Create(file, user));
    const fileObjects = await Promise.all(filePromises);
    return fileObjects;
  }

  public async DeleteFile(file) {
    if (file.is_aws) {
      DeleteAWSFile(file.path.substr(file.path.lastIndexOf("/") + 1));
    }
    await this.fileRepository.Delete({ Id: file.Id }, false);
  }

  public async GetFilesByCommunicationId(communicationId: number, select?: Array<string>) {
    return await this.fileRepository.GetFilesByCommunicationId(communicationId, select);
  }
}
