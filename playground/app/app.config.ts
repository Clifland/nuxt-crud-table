export default defineAppConfig({
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
    exports: {
      pdfHiddenFields: {
        default: ['avatar', 'resetToken', 'resetExpires'],
        resources: {
          users: ['password', 'googleId', 'githubId'],
        },
      },
      excelHiddenFields: {
        resources: {
          users: ['password'],
        },
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
  },
})
