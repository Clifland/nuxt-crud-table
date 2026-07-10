export default defineAppConfig({
  crud: {
    globalHide: ['updated_at'],
    aggregates: {
      orderitems: {
        // row-level virtual columns (runs for each row)
        columns: [
          // dot-paths into each row
          { name: 'linetotal', label: 'Line total', fn: 'multiply', args: ['price', 'quantity'] },
        ],
        // column-level footer reductions (runs over the array of rows)
        footer: [
          { name: 'total_amount', label: 'Total Amount', fn: 'sum', args: ['linetotal'] },
        ],
      },
    },
  },
})
