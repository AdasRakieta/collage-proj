import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { User } from './User';
import { TransportAttachment } from './TransportAttachment';
import { Attachment } from './Attachment';

export interface StopAttributes {
  id?: number;
  journeyId?: number;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  arrivalDate: Date;
  departureDate: Date;
  accommodationName?: string;
  accommodationUrl?: string;
  accommodationPrice?: number;
  accommodationCurrency?: string;
  notes?: string;
  isPaid?: boolean;
  orderIndex?: number; // for sorting within journey
}

export interface TransportAttributes {
  id?: number;
  journeyId?: number;
  type: 'flight' | 'train' | 'bus' | 'car' | 'other';
  fromLocation: string;
  toLocation: string;
  departureDate: Date;
  arrivalDate: Date;
  price: number;
  currency: string;
  bookingUrl?: string;
  notes?: string;
  flightNumber?: string;
  trainNumber?: string;
  isPaid?: boolean;
}

export interface AttractionAttributes {
  id?: number;
  stopId?: number;
  name: string;
  description?: string;
  estimatedCost?: number;
  duration?: number; // in hours
  isPaid?: boolean;
  orderIndex?: number; // for sorting within stop
  priority?: 'must' | 'should' | 'could' | 'skip'; // priority level
  plannedDate?: Date; // scheduled date
  plannedTime?: string; // HH:MM format
  visitTime?: string; // HH:MM format for planned visit time
  openingTime?: string; // HH:MM format for opening time
  closingTime?: string; // HH:MM format for closing time
  tag?: 'beauty' | 'cafe' | 'must_see' | 'accommodation' | 'nature' | 'airport' | 'food' | 'attraction' | 'train_station'; // category tag
}

export interface JourneyShareAttributes {
  id?: number;
  journeyId: number;
  sharedWithUserId?: number;
  sharedByUserId: number;
  status: 'pending' | 'accepted' | 'rejected';
  invitedEmail?: string;
  invitationToken?: string;
  createdAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
}

export interface JourneyAttributes {
  id?: number;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  totalEstimatedCost?: number;
  currency: string;
  createdBy?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface JourneyCreationAttributes extends Optional<JourneyAttributes, 'id' | 'createdAt' | 'updatedAt'> {}
interface StopCreationAttributes extends Optional<StopAttributes, 'id'> {}
interface TransportCreationAttributes extends Optional<TransportAttributes, 'id'> {}
interface AttractionCreationAttributes extends Optional<AttractionAttributes, 'id'> {}
interface JourneyShareCreationAttributes extends Optional<JourneyShareAttributes, 'id' | 'createdAt' | 'acceptedAt' | 'rejectedAt'> {}

// Journey Model
export class Journey extends Model<JourneyAttributes, JourneyCreationAttributes> implements JourneyAttributes {
  public id!: number;
  public title!: string;
  public description?: string;
  public startDate!: Date;
  public endDate!: Date;
  public totalEstimatedCost?: number;
  public currency!: string;
  public createdBy?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Journey.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'start_date', // Map to snake_case column
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'end_date', // Map to snake_case column
    },
    totalEstimatedCost: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'total_estimated_cost', // Map to snake_case column
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'PLN',
    },
    createdBy: {
      type: DataTypes.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      field: 'created_by', // Map to snake_case column
    },
  },
  {
    sequelize,
    tableName: 'journeys',
    timestamps: true,
    underscored: true, // Automatically convert camelCase to snake_case
  }
);

// Stop Model
export class Stop extends Model<StopAttributes, StopCreationAttributes> implements StopAttributes {
  public id!: number;
  public journeyId!: number;
  public city!: string;
  public country!: string;
  public latitude!: number;
  public longitude!: number;
  public arrivalDate!: Date;
  public departureDate!: Date;
  public accommodationName?: string;
  public accommodationUrl?: string;
  public accommodationPrice?: number;
  public accommodationCurrency?: string;
  public notes?: string;
  public isPaid?: boolean;
  public orderIndex?: number;
}

Stop.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    journeyId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'journeys',
        key: 'id',
      },
      onDelete: 'CASCADE',
      field: 'journey_id', // Map to snake_case column
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false,
    },
    arrivalDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'arrival_date', // Map to snake_case column
    },
    departureDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'departure_date', // Map to snake_case column
    },
    accommodationName: {
      type: DataTypes.STRING,
      field: 'accommodation_name', // Map to snake_case column
    },
    accommodationUrl: {
      type: DataTypes.TEXT,
      field: 'accommodation_url', // Map to snake_case column
    },
    accommodationPrice: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'accommodation_price', // Map to snake_case column
    },
    accommodationCurrency: {
      type: DataTypes.STRING(3),
      field: 'accommodation_currency', // Map to snake_case column
    },
    notes: {
      type: DataTypes.TEXT,
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_paid', // Map to snake_case column
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'order_index',
    },
  },
  {
    sequelize,
    tableName: 'stops',
    timestamps: false,
    underscored: true, // Automatically convert camelCase to snake_case
  }
);

// Transport Model
export class Transport extends Model<TransportAttributes, TransportCreationAttributes> implements TransportAttributes {
  public id!: number;
  public journeyId!: number;
  public type!: 'flight' | 'train' | 'bus' | 'car' | 'other';
  public fromLocation!: string;
  public toLocation!: string;
  public departureDate!: Date;
  public arrivalDate!: Date;
  public price!: number;
  public currency!: string;
  public bookingUrl?: string;
  public notes?: string;
  public flightNumber?: string;
  public trainNumber?: string;
  public isPaid?: boolean;
}

Transport.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    journeyId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'journeys',
        key: 'id',
      },
      onDelete: 'CASCADE',
      field: 'journey_id', // Map to snake_case column
    },
    type: {
      type: DataTypes.ENUM('flight', 'train', 'bus', 'car', 'other'),
      allowNull: false,
    },
    fromLocation: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'from_location', // Map to snake_case column
    },
    toLocation: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'to_location', // Map to snake_case column
    },
    departureDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'departure_date', // Map to snake_case column
    },
    arrivalDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'arrival_date', // Map to snake_case column
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'PLN',
    },
    bookingUrl: {
      type: DataTypes.TEXT,
      field: 'booking_url', // Map to snake_case column
    },
    notes: {
      type: DataTypes.TEXT,
    },
    flightNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'flight_number', // Map to snake_case column
    },
    trainNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'train_number', // Map to snake_case column
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_paid', // Map to snake_case column
    },
  },
  {
    sequelize,
    tableName: 'transports',
    timestamps: false,
    underscored: true, // Automatically convert camelCase to snake_case
  }
);

// Attraction Model
export class Attraction extends Model<AttractionAttributes, AttractionCreationAttributes> implements AttractionAttributes {
  public id!: number;
  public stopId!: number;
  public name!: string;
  public description?: string;
  public estimatedCost?: number;
  public duration?: number;
  public isPaid?: boolean;
  public orderIndex?: number;
  public priority?: 'must' | 'should' | 'could' | 'skip';
  public plannedDate?: Date;
  public plannedTime?: string;
  public visitTime?: string;
  public openingTime?: string;
  public closingTime?: string;
  public tag?: 'beauty' | 'cafe' | 'must_see' | 'accommodation' | 'nature' | 'airport' | 'food' | 'attraction' | 'train_station';
}

Attraction.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    stopId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'stops',
        key: 'id',
      },
      onDelete: 'CASCADE',
      field: 'stop_id', // Map to snake_case column
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    estimatedCost: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'estimated_cost', // Map to snake_case column
    },
    duration: {
      type: DataTypes.INTEGER, // in hours
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_paid', // Map to snake_case column
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'order_index',
    },
    priority: {
      type: DataTypes.STRING(10),
      defaultValue: 'should',
      validate: {
        isIn: [['must', 'should', 'could', 'skip']],
      },
    },
    plannedDate: {
      type: DataTypes.DATEONLY,
      field: 'planned_date',
    },
    plannedTime: {
      type: DataTypes.TIME,
      field: 'planned_time',
    },
    visitTime: {
      type: DataTypes.TIME,
      field: 'visit_time',
    },
    openingTime: {
      type: DataTypes.TIME,
      field: 'opening_time',
    },
    closingTime: {
      type: DataTypes.TIME,
      field: 'closing_time',
    },
    tag: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [['beauty', 'cafe', 'must_see', 'accommodation', 'nature', 'airport', 'food', 'attraction', 'train_station']],
      },
    },
  },
  {
    sequelize,
    tableName: 'attractions',
    timestamps: false,
    underscored: true, // Automatically convert camelCase to snake_case
  }
);

// JourneyShare Model
export class JourneyShare extends Model<JourneyShareAttributes, JourneyShareCreationAttributes> implements JourneyShareAttributes {
  public id!: number;
  public journeyId!: number;
  public sharedWithUserId?: number;
  public sharedByUserId!: number;
  public status!: 'pending' | 'accepted' | 'rejected';
  public invitedEmail?: string;
  public invitationToken?: string;
  public readonly createdAt!: Date;
  public acceptedAt?: Date;
  public rejectedAt?: Date;
}

JourneyShare.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    journeyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'journeys',
        key: 'id',
      },
      onDelete: 'CASCADE',
      field: 'journey_id',
    },
    sharedWithUserId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      field: 'shared_with_user_id',
    },
    sharedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      field: 'shared_by_user_id',
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
      defaultValue: 'pending',
      allowNull: false,
    },
    invitedEmail: {
      type: DataTypes.STRING(255),
      field: 'invited_email',
    },
    invitationToken: {
      type: DataTypes.TEXT,
      unique: true,
      field: 'invitation_token',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    acceptedAt: {
      type: DataTypes.DATE,
      field: 'accepted_at',
    },
    rejectedAt: {
      type: DataTypes.DATE,
      field: 'rejected_at',
    },
  },
  {
    sequelize,
    tableName: 'journey_shares',
    timestamps: false,
    underscored: true,
  }
);

// Define associations
Journey.hasMany(Stop, { foreignKey: 'journeyId', as: 'stops' });
Stop.belongsTo(Journey, { foreignKey: 'journeyId' });

Journey.hasMany(Transport, { foreignKey: 'journeyId', as: 'transports' });
Transport.belongsTo(Journey, { foreignKey: 'journeyId' });

Stop.hasMany(Attraction, { foreignKey: 'stopId', as: 'attractions' });
Attraction.belongsTo(Stop, { foreignKey: 'stopId' });

// User associations
Journey.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(Journey, { foreignKey: 'createdBy', as: 'journeys' });

// JourneyShare associations
Journey.hasMany(JourneyShare, { foreignKey: 'journeyId', as: 'shares' });
JourneyShare.belongsTo(Journey, { foreignKey: 'journeyId', as: 'journey' });

JourneyShare.belongsTo(User, { foreignKey: 'sharedWithUserId', as: 'sharedWithUser' });
JourneyShare.belongsTo(User, { foreignKey: 'sharedByUserId', as: 'sharedByUser' });

User.hasMany(JourneyShare, { foreignKey: 'sharedWithUserId', as: 'sharedJourneys' });
User.hasMany(JourneyShare, { foreignKey: 'sharedByUserId', as: 'journeysSharedByMe' });

// Transport attachment associations
Transport.hasMany(TransportAttachment, { foreignKey: 'transportId', as: 'attachments' });
TransportAttachment.belongsTo(Transport, { foreignKey: 'transportId', as: 'transport' });

TransportAttachment.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });
User.hasMany(TransportAttachment, { foreignKey: 'uploadedBy', as: 'uploadedAttachments' });

// Generic attachments (can belong to journey, stop or transport)
Journey.hasMany(Attachment, { foreignKey: 'journeyId', as: 'attachments' });
Attachment.belongsTo(Journey, { foreignKey: 'journeyId', as: 'journey' });

Stop.hasMany(Attachment, { foreignKey: 'stopId', as: 'attachments' });
Attachment.belongsTo(Stop, { foreignKey: 'stopId', as: 'stop' });

Transport.hasMany(Attachment, { foreignKey: 'transportId', as: 'attachments' });
Attachment.belongsTo(Transport, { foreignKey: 'transportId', as: 'transport' });

Attachment.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });
User.hasMany(Attachment, { foreignKey: 'uploadedBy', as: 'uploadedAttachments' });

export default Journey;

