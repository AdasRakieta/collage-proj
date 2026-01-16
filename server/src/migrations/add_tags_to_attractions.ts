import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    // Add tag column to attractions table
    await queryInterface.addColumn('attractions', 'tag', {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Category tag for the attraction'
    });

    // Add CHECK constraint for valid tag values
    await queryInterface.sequelize.query(`
      ALTER TABLE attractions
      ADD CONSTRAINT attractions_tag_check
      CHECK (tag IN (
        'beauty',
        'cafe',
        'must_see',
        'accommodation',
        'nature',
        'airport',
        'food',
        'attraction',
        'train_station'
      ));
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    // Remove CHECK constraint first
    await queryInterface.sequelize.query(`
      ALTER TABLE attractions
      DROP CONSTRAINT IF EXISTS attractions_tag_check;
    `);

    // Remove the tag column
    await queryInterface.removeColumn('attractions', 'tag');
  }
};
