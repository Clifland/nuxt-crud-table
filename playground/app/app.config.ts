export default defineAppConfig({
  crud: {
    globalHide: ['updated_at'],
    aggregates: {
      orderitems: {
        // row-level virtual columns
        columns: [
          {
            name: 'subtotal',
            label: 'Subtotal',
            fn: 'multiply',
            args: ['price', 'quantity'], // dot-paths into each row
          },
        ],
        // column-level footer reductions (runs over the array of rows)
        footer: [
          { column: 'subtotal', fn: 'sum' },
        ],
      },
    },
  },
})
