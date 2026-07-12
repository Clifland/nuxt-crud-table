export default defineAppConfig({
  crud: {
    tableHiddenFields: {
      default: ['updated_at'],
    },
    formHiddenFields: {
      // nct's built-in defaults (id, timestamps, etc.) still apply unless
      // you set `default` explicitly here — this only adds a per-resource
      // extra, on top of the built-in default.
      resources: {
        orderitems: ['price'],
      },
    },
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