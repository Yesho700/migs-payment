module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('webhook_logs', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      transaction_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      payload: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      signature: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      processed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('webhook_logs', ['transaction_id']);
    await queryInterface.addIndex('webhook_logs', ['processed']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('webhook_logs');
  },
};