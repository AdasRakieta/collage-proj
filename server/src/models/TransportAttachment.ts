import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface TransportAttachmentAttributes {
  id?: number;
  transportId: number;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy?: number;
  uploadedAt?: Date;
}

interface TransportAttachmentCreationAttributes extends Optional<TransportAttachmentAttributes, 'id' | 'uploadedAt'> {}

// TransportAttachment Model
export class TransportAttachment extends Model<TransportAttachmentAttributes, TransportAttachmentCreationAttributes> implements TransportAttachmentAttributes {
  public id!: number;
  public transportId!: number;
  public filename!: string;
  public originalFilename!: string;
  public filePath!: string;
  public fileSize!: number;
  public mimeType!: string;
  public uploadedBy?: number;
  public readonly uploadedAt!: Date;
}

TransportAttachment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    transportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'transports',
        key: 'id',
      },
      onDelete: 'CASCADE',
      field: 'transport_id', // Map to snake_case column
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    originalFilename: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'original_filename', // Map to snake_case column
    },
    filePath: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'file_path', // Map to snake_case column
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'file_size', // Map to snake_case column
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'mime_type', // Map to snake_case column
    },
    uploadedBy: {
      type: DataTypes.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      field: 'uploaded_by', // Map to snake_case column
    },
  },
  {
    sequelize,
    tableName: 'transport_attachments',
    timestamps: false,
    underscored: true, // Automatically convert camelCase to snake_case
  }
);

// Define associations
// Note: Associations are defined in Journey.ts to avoid circular dependencies
// TransportAttachment.belongsTo(require('./Journey').Transport, {
//   foreignKey: 'transportId',
//   as: 'transport'
// });

export default TransportAttachment;