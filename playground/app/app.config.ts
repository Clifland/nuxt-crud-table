export default defineAppConfig({
  crud: {
    globalHide: ['updated_at'],
    aggregates: {
      orderitems: {
        // row-level virtual columns (runs for each row)
        columns: [
          // dot-paths into each row
          { name: 'subtotal', label: 'Subtotal', fn: 'multiply', args: ['price', 'quantity'] },
        ],
        // column-level footer reductions (runs over the array of rows)
        footer: [
          { name: 'total_amount', label: 'Total', column: 'subtotal', fn: 'sum', args: ['subtotal'] },
        ],
      },
    },
  },
})
