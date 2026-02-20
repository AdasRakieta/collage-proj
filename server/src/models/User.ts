import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface UserAttributes {
  id?: number;
  username: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  emailVerified?: boolean;
  verificationToken?: string;
  resetToken?: string;
  resetTokenExpires?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'role' | 'emailVerified' | 'createdAt' | 'updatedAt'> {}

// User Model
export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public username!: string;
  public email!: string;
  public passwordHash!: string;
  public role!: 'admin' | 'user';
  public emailVerified?: boolean;
  public verificationToken?: string;
  public resetToken?: string;
  public resetTokenExpires?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    passwordHash: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'password_hash', // Map to snake_case column
    },
    role: {
      type: DataTypes.ENUM('admin', 'user'),
      defaultValue: 'user',
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'email_verified', // Map to snake_case column
    },
    verificationToken: {
      type: DataTypes.TEXT,
      field: 'verification_token', // Map to snake_case column
    },
    resetToken: {
      type: DataTypes.TEXT,
      field: 'reset_token', // Map to snake_case column
    },
    resetTokenExpires: {
      type: DataTypes.DATE,
      field: 'reset_token_expires', // Map to snake_case column
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    underscored: true, // Automatically convert camelCase to snake_case
  }
);

export default User;