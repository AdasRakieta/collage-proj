import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Add visitTime, openingTime, closingTime columns to attractions table
    await queryInterface.addColumn('attractions', 'visit_time', {
      type: DataTypes.TIME,
      allowNull: true,
    });
    
    await queryInterface.addColumn('attractions', 'opening_time', {
      type: DataTypes.TIME,
      allowNull: true,
    });
    
    await queryInterface.addColumn('attractions', 'closing_time', {
      type: DataTypes.TIME,
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Remove the columns on rollback
    await queryInterface.removeColumn('attractions', 'visit_time');
    await queryInterface.removeColumn('attractions', 'opening_time');
    await queryInterface.removeColumn('attractions', 'closing_time');
  },
};
