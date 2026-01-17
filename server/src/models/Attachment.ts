import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface AttachmentAttributes {
  id?: number;
  journeyId?: number | null;
  stopId?: number | null;
  transportId?: number | null;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy?: number | null;
  isEncrypted?: boolean;
  iv?: string | null;
  authTag?: string | null;
  parsedJson?: object | null;
  createdAt?: Date;
}

interface AttachmentCreationAttributes extends Optional<AttachmentAttributes, 'id' | 'createdAt' | 'isEncrypted'> {}

export class Attachment extends Model<AttachmentAttributes, AttachmentCreationAttributes> implements AttachmentAttributes {
  public id!: number;
  public journeyId?: number | null;
  public stopId?: number | null;
  public transportId?: number | null;
  public filename!: string;
  public originalFilename!: string;
  public filePath!: string;
  public fileSize!: number;
  public mimeType!: string;
  public uploadedBy?: number | null;
  public isEncrypted?: boolean;
  public iv?: string | null;
  public authTag?: string | null;
  public parsedJson?: object | null;
  public readonly createdAt!: Date;
}

Attachment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    journeyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'journey_id',
    },
    stopId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'stop_id',
    },
    transportId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'transport_id',
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    originalFilename: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'original_filename',
    },
    filePath: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'file_path',
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'file_size',
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'mime_type',
    },
    uploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'uploaded_by',
    },
    isEncrypted: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: 'is_encrypted',
    },
    iv: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    authTag: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'auth_tag',
    },
    parsedJson: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'parsed_json',
    }
  },
  {
    sequelize,
    tableName: 'attachments',
    timestamps: false,
    underscored: true,
  }
);

export default Attachment;
