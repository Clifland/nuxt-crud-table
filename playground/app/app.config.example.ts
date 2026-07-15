export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'slate',
    },
  },
  crud: {
    tableHiddenFields: {
      default: ['updated_at'],
    },
    formHiddenFields: {
      resources: {
        orderitems: ['price'],
      },
    },
    formReadOnlyFields: {
      resources: {
        orders: ['num'],
      },
    },
    aggregates: {
      orderitems: {
        columns: [
          { name: 'linetotal', label: 'Line total', fn: 'multiply', args: ['price', 'quantity'] },
        ],
        footer: [
          { name: 'total_amount', label: 'Total Amount', fn: 'sum', args: ['linetotal'] },
        ],
      },
    },

    // Export specific settings
    exports: {
      pdf: {
        // Excluded from ALL resources in PDF
        globalExclude: ['avatar', 'resetToken', 'resetExpires'],
        // Resource specific overrides
        resourceExclude: {
          users: ['password', 'googleId', 'githubId'],
        },
      },
      excel: {
        globalExclude: [],
        resourceExclude: {
          users: ['password'],
        },
      },
    },
  },
})
